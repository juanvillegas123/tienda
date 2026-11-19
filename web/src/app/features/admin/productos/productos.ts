import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ProductosService } from '../../../core/productos.service';
import { CategoriasService } from '../../../core/categorias.service';
import { ProveedoresService } from '../../../core/proveedores.service';
import { ProductoAdmin, Categoria, Proveedor } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { HttpErrorResponse } from '@angular/common/http';

function convertirBsACentavos(valor: unknown): number {
    if (valor === null || valor === undefined || valor === '') return 0;
    if (typeof valor === 'number') {
        return isNaN(valor) ? 0 : Math.round(valor * 100);
    }
    if (typeof valor === 'string') {
        const normalizado = valor.trim().replace(',', '.');
        const num = parseFloat(normalizado);
        return isNaN(num) ? 0 : Math.round(num * 100);
    }
    return 0;
}

function validadorDinero(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (v === null || v === undefined || v === '') return null;
    const num = typeof v === 'number' ? v : parseFloat(String(v).trim().replace(',', '.'));
    if (isNaN(num) || num < 0) {
        return { dineroInvalido: true };
    }
    return null;
}

@Component({
    selector: 'app-productos-admin',
    standalone: true,
    imports: [ReactiveFormsModule, BsPipe],
    templateUrl: './productos.html',
})
export class ProductosAdminComponent implements OnInit {
    private readonly productosService = inject(ProductosService);
    private readonly categoriasService = inject(CategoriasService);
    private readonly proveedoresService = inject(ProveedoresService);
    private readonly fb = inject(FormBuilder);

    // Listas y estados de carga
    readonly productos = signal<ProductoAdmin[]>([]);
    readonly categorias = signal<Categoria[]>([]);
    readonly proveedores = signal<Proveedor[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly dandoDeBaja = signal(false);

    // Filtros
    readonly filtroTexto = signal('');
    readonly filtroCategoriaId = signal<number | null>(null);
    readonly filtroEstado = signal<'todos' | 'true' | 'false'>('todos');

    // Modales y estados
    readonly modalAbierto = signal(false);
    readonly productoEnEdicion = signal<ProductoAdmin | null>(null);
    readonly productoParaBaja = signal<ProductoAdmin | null>(null);

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly form = this.fb.group({
        categoriaId: [null as number | null, [Validators.required]],
        proveedorId: [null as number | null],
        nombre: ['', [Validators.required, Validators.maxLength(200)]],
        descripcion: [''],
        precioBs: [null as number | string | null, [Validators.required, validadorDinero]],
        costoBs: [null as number | string | null, [validadorDinero]],
        stock: [0, [Validators.required, Validators.min(0)]],
        escala: [''],
        notaTalla: [''],
        imagenPrincipal: [''],
        imagenesAdicionales: this.fb.array<string>([]),
    });

    get imagenesAdicionalesArray(): FormArray {
        return this.form.get('imagenesAdicionales') as FormArray;
    }

    readonly categoriasActivas = computed(() => {
        return this.categorias().filter((c) => c.activa);
    });

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.modalAbierto()) {
            this.cerrarModal();
        } else if (this.productoParaBaja()) {
            this.cerrarModalBaja();
        }
    }

    ngOnInit(): void {
        this.cargarDependencias();
        this.cargarProductos();
    }

    cargarDependencias(): void {
        this.categoriasService.listarAdmin().subscribe({
            next: (cats) => this.categorias.set(cats),
        });
        this.proveedoresService.listarActivos().subscribe({
            next: (provs) => this.proveedores.set(provs),
        });
    }

    cargarProductos(): void {
        this.cargando.set(true);
        const catId = this.filtroCategoriaId();
        const q = this.filtroTexto().trim();
        const est = this.filtroEstado();

        this.productosService
            .listarAdmin({
                categoriaId: catId ?? undefined,
                q: q.length > 0 ? q : undefined,
                activo: est,
            })
            .subscribe({
                next: (prods) => {
                    this.productos.set(prods);
                    this.cargando.set(false);
                },
                error: () => {
                    this.mensajeError.set('No se pudo cargar la lista de productos.');
                    this.cargando.set(false);
                },
            });
    }

    actualizarBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.filtroTexto.set(valor);
        this.cargarProductos();
    }

    actualizarCategoria(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value;
        this.filtroCategoriaId.set(valor ? Number(valor) : null);
        this.cargarProductos();
    }

    actualizarEstado(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value as 'todos' | 'true' | 'false';
        this.filtroEstado.set(valor);
        this.cargarProductos();
    }

    campoInvalido(campo: string): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    agregarImagenAdicional(urlInicial = ''): void {
        if (this.imagenesAdicionalesArray.length >= 10) return;
        this.imagenesAdicionalesArray.push(this.fb.control(urlInicial));
    }

    eliminarImagenAdicional(index: number): void {
        this.imagenesAdicionalesArray.removeAt(index);
    }

    abrirModalCrear(): void {
        this.productoEnEdicion.set(null);
        this.mensajeError.set(null);
        this.form.reset({
            categoriaId: this.categoriasActivas().length > 0 ? this.categoriasActivas()[0].id : null,
            proveedorId: null,
            nombre: '',
            descripcion: '',
            precioBs: null,
            costoBs: null,
            stock: 0,
            escala: '',
            notaTalla: '',
            imagenPrincipal: '',
        });
        this.imagenesAdicionalesArray.clear();
        this.modalAbierto.set(true);
    }

    abrirModalEditar(prod: ProductoAdmin): void {
        this.productoEnEdicion.set(prod);
        this.mensajeError.set(null);
        this.imagenesAdicionalesArray.clear();

        this.form.reset({
            categoriaId: prod.categoriaId,
            proveedorId: prod.proveedorId,
            nombre: prod.nombre,
            descripcion: prod.descripcion ?? '',
            precioBs: prod.precioCentavos / 100,
            costoBs: prod.costoCentavos ? prod.costoCentavos / 100 : 0,
            stock: prod.stock,
            escala: prod.escala ?? '',
            notaTalla: prod.notaTalla ?? '',
            imagenPrincipal: prod.imagenPrincipal ?? '',
        });

        if (prod.imagenes && prod.imagenes.length > 0) {
            for (const img of prod.imagenes) {
                this.agregarImagenAdicional(img.url);
            }
        }

        this.modalAbierto.set(true);
    }

    cerrarModal(): void {
        this.modalAbierto.set(false);
        this.productoEnEdicion.set(null);
        this.mensajeError.set(null);
        this.form.reset();
        this.imagenesAdicionalesArray.clear();
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.guardando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        const v = this.form.getRawValue();
        const categoriaId = Number(v.categoriaId);
        const proveedorId = v.proveedorId ? Number(v.proveedorId) : null;
        const precioCentavos = convertirBsACentavos(v.precioBs);
        const costoCentavos = convertirBsACentavos(v.costoBs);
        const stock = Math.trunc(Number(v.stock) || 0);

        const imagenesFiltradas = (v.imagenesAdicionales as string[])
            .map((url) => (url ? url.trim() : ''))
            .filter((url) => url.length > 0);

        const prodActual = this.productoEnEdicion();

        if (prodActual) {
            this.productosService
                .editar(prodActual.id, {
                    categoriaId: categoriaId || undefined,
                    proveedorId: proveedorId,
                    nombre: v.nombre?.trim(),
                    descripcion: v.descripcion?.trim() || null,
                    precioCentavos,
                    costoCentavos,
                    stock,
                    escala: v.escala?.trim() || null,
                    notaTalla: v.notaTalla?.trim() || null,
                    imagenPrincipal: v.imagenPrincipal?.trim() || null,
                    imagenesAdicionales: imagenesFiltradas,
                })
                .subscribe({
                    next: (actualizado) => {
                        this.productos.update((lista) =>
                            lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
                        );
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Producto "${actualizado.nombre}" actualizado.`);
                    },
                    error: (err: unknown) => {
                        this.guardando.set(false);
                        this.manejarError(err, 'Error al actualizar producto');
                    },
                });
        } else {
            this.productosService
                .crear({
                    categoriaId: categoriaId,
                    proveedorId: proveedorId,
                    nombre: v.nombre!.trim(),
                    descripcion: v.descripcion?.trim() || null,
                    precioCentavos,
                    costoCentavos,
                    stockInicial: stock,
                    escala: v.escala?.trim() || null,
                    notaTalla: v.notaTalla?.trim() || null,
                    imagenPrincipal: v.imagenPrincipal?.trim() || null,
                    imagenesAdicionales: imagenesFiltradas,
                })
                .subscribe({
                    next: (creado) => {
                        this.productos.update((lista) => [creado, ...lista]);
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Producto "${creado.nombre}" registrado exitosamente.`);
                    },
                    error: (err: unknown) => {
                        this.guardando.set(false);
                        this.manejarError(err, 'Error al crear producto');
                    },
                });
        }
    }

    confirmarDarDeBaja(prod: ProductoAdmin): void {
        this.productoParaBaja.set(prod);
    }

    cerrarModalBaja(): void {
        this.productoParaBaja.set(null);
    }

    confirmarBaja(): void {
        const prod = this.productoParaBaja();
        if (!prod) return;

        this.dandoDeBaja.set(true);
        this.productosService.darDeBaja(prod.id).subscribe({
            next: (actualizado) => {
                this.productos.update((lista) =>
                    lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
                );
                this.dandoDeBaja.set(false);
                this.cerrarModalBaja();
                this.mensajeExito.set(`Producto "${actualizado.nombre}" dado de baja.`);
            },
            error: () => {
                this.dandoDeBaja.set(false);
                this.cerrarModalBaja();
                this.mensajeError.set('No se pudo dar de baja el producto.');
            },
        });
    }

    private manejarError(err: unknown, defaultMsg: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            const msg = (body?.['mensaje'] as string) || defaultMsg;
            this.mensajeError.set(msg);
        } else {
            this.mensajeError.set(defaultMsg);
        }
    }
}
