import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators } from '@angular/forms';
import { ProductosService } from '../../../core/productos.service';
import { CategoriasService } from '../../../core/categorias.service';
import { ProveedoresService } from '../../../core/proveedores.service';
import { ProductoAdmin, Categoria, Proveedor } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { HttpErrorResponse } from '@angular/common/http';

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

    readonly productos = signal<ProductoAdmin[]>([]);
    readonly categorias = signal<Categoria[]>([]);
    readonly proveedores = signal<Proveedor[]>([]);

    readonly cargando = signal(true);
    readonly guardando = signal(false);

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
        precioBs: [null as number | null, [Validators.required, Validators.min(0)]],
        costoBs: [null as number | null, [Validators.min(0)]],
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

    actualizarTextoBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.filtroTexto.set(valor);
        this.cargarProductos();
    }

    cambiarCategoriaFiltro(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value;
        this.filtroCategoriaId.set(valor ? parseInt(valor, 10) : null);
        this.cargarProductos();
    }

    cambiarEstadoFiltro(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value as 'todos' | 'true' | 'false';
        this.filtroEstado.set(valor);
        this.cargarProductos();
    }

    campoInvalido(campo: string): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    agregarImagenAdicional(url = ''): void {
        if (this.imagenesAdicionalesArray.length >= 10) return;
        this.imagenesAdicionalesArray.push(this.fb.control(url));
    }

    quitarImagenAdicional(index: number): void {
        this.imagenesAdicionalesArray.removeAt(index);
    }

    abrirModalCrear(): void {
        this.productoEnEdicion.set(null);
        this.form.reset({
            categoriaId: null,
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
        const precioCentavos = Math.round((v.precioBs ?? 0) * 100);
        const costoCentavos = Math.round((v.costoBs ?? 0) * 100);
        const stock = Math.trunc(v.stock ?? 0);

        const imagenesFiltradas = (v.imagenesAdicionales as string[])
            .map((url) => (url ? url.trim() : ''))
            .filter((url) => url.length > 0);

        const prodActual = this.productoEnEdicion();

        if (prodActual) {
            this.productosService
                .editar(prodActual.id, {
                    categoriaId: v.categoriaId ?? undefined,
                    proveedorId: v.proveedorId ?? null,
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
                    categoriaId: v.categoriaId!,
                    proveedorId: v.proveedorId ?? null,
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

    ejecutarBaja(): void {
        const prod = this.productoParaBaja();
        if (!prod) return;

        this.productosService.darDeBaja(prod.id).subscribe({
            next: (actualizado) => {
                this.productos.update((lista) =>
                    lista.map((p) => (p.id === actualizado.id ? actualizado : p)),
                );
                this.productoParaBaja.set(null);
                this.mensajeExito.set(`Producto "${actualizado.nombre}" dado de baja.`);
            },
            error: () => {
                this.productoParaBaja.set(null);
                this.mensajeError.set('No se pudo dar de baja el producto.');
            },
        });
    }

    private manejarError(err: unknown, defaultMsg: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            const msg = (body?.['mensaje'] as string) ?? defaultMsg;
            this.mensajeError.set(msg);
        } else {
            this.mensajeError.set(defaultMsg);
        }
    }
}
