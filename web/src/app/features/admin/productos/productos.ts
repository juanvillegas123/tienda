import { Component, inject, signal, computed, OnInit, HostListener, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, FormArray, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Subject, merge, of } from 'rxjs';
import { debounceTime, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ProductosService } from '../../../core/productos.service';
import { CategoriasService } from '../../../core/categorias.service';
import { ProveedoresService } from '../../../core/proveedores.service';
import { ProductoAdmin, Categoria, Proveedor, PaginatedResult } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { AppSelectComponent, OpcionSelect } from '../../../shared/ui/app-select/app-select';
import { parsearBsACentavosEstricto } from '../../../shared/dinero.utils';
import { HttpErrorResponse } from '@angular/common/http';

function convertirBsACentavos(valor: unknown): number {
    return parsearBsACentavosEstricto(valor) ?? 0;
}

function validadorDinero(control: AbstractControl): ValidationErrors | null {
    const v = control.value;
    if (v === null || v === undefined || String(v).trim() === '') return null;
    return parsearBsACentavosEstricto(v) === null ? { dineroInvalido: true } : null;
}

@Component({
    selector: 'app-productos-admin',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, BsPipe, AppSelectComponent],
    templateUrl: './productos.html',
})
export class ProductosAdminComponent implements OnInit {
    private readonly productosService = inject(ProductosService);
    private readonly categoriasService = inject(CategoriasService);
    private readonly proveedoresService = inject(ProveedoresService);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private readonly busquedaTexto$ = new Subject<void>();
    private readonly recargar$ = new Subject<void>();

    // Listas y estados de carga
    readonly productos = signal<ProductoAdmin[]>([]);
    readonly categorias = signal<Categoria[]>([]);
    readonly proveedores = signal<Proveedor[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly dandoDeBaja = signal(false);
    readonly reactivandoId = signal<number | null>(null);
    readonly subiendoImagen = signal(false);
    readonly subiendoImagenAdicional = signal(false);
    readonly arrastrandoPrincipal = signal(false);
    readonly arrastrandoAdicional = signal(false);

    // Filtros y ordenamiento
    readonly filtroTexto = signal('');
    readonly filtroCategoriaId = signal<number | null>(null);
    readonly filtroEstado = signal<'true' | 'agotados' | 'false' | 'todos'>('true');
    readonly filtroOrden = signal<'fecha-desc' | 'fecha-asc' | 'nombre-asc' | 'nombre-desc'>('fecha-desc');

    // Paginación
    readonly pagina = signal(1);
    readonly limite = signal(15);
    readonly totalProductos = signal(0);
    readonly totalPaginas = signal(1);

    readonly rangoInicio = computed(() =>
        this.totalProductos() === 0 ? 0 : (this.pagina() - 1) * this.limite() + 1,
    );
    readonly rangoFin = computed(() =>
        Math.min(this.pagina() * this.limite(), this.totalProductos()),
    );
    readonly paginasVisibles = computed(() => {
        const total = this.totalPaginas();
        const actual = this.pagina();
        const maxBotones = 5;
        let inicio = Math.max(1, actual - Math.floor(maxBotones / 2));
        const fin = Math.min(total, inicio + maxBotones - 1);
        inicio = Math.max(1, fin - maxBotones + 1);
        const paginas: number[] = [];
        for (let i = inicio; i <= fin; i++) {
            paginas.push(i);
        }
        return paginas;
    });

    // Modales y estados
    readonly modalAbierto = signal(false);
    readonly modalDescuentoAbierto = signal(false);
    readonly aplicandoDescuentoMasivo = signal(false);
    readonly alcanceDescuento = signal<'TIENDA' | 'CATEGORIA'>('TIENDA');
    readonly categoriaDescuentoId = signal<number | null>(null);
    readonly porcentajeDescuentoMasivo = signal<number>(10);
    readonly alertaDescuentoBajoCosto = signal<string | null>(null);
    readonly productoEnEdicion = signal<ProductoAdmin | null>(null);
    readonly productoParaBaja = signal<ProductoAdmin | null>(null);
    readonly requiereTalla = signal(false);
    readonly atajosTalla = ['S, M, L', 'S, M, L, XL', 'M, L, XL', 'Talla única'];

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly form = this.fb.group({
        categoriaId: [null as number | null, [Validators.required]],
        proveedorId: [null as number | null],
        nombre: ['', [Validators.required, Validators.maxLength(200)]],
        descripcion: [''],
        precioBs: [null as number | string | null, [Validators.required, validadorDinero]],
        descuentoPorcentaje: [0, [Validators.min(0), Validators.max(99)]],
        costoBs: [null as number | string | null, [validadorDinero]],
        stock: [0, [Validators.required, Validators.min(0)]],
        escala: [''],
        notaTalla: [''],
        imagenPrincipal: [''],
        imagenesAdicionales: this.fb.array<string>([]),
        activo: [true],
    });

    get imagenesAdicionalesArray(): FormArray {
        return this.form.get('imagenesAdicionales') as FormArray;
    }

    readonly categoriasActivas = computed(() => {
        return this.categorias().filter((c) => c.activa);
    });

    readonly opcionesCategoriasFiltro = computed<OpcionSelect[]>(() => [
        { valor: null, etiqueta: 'Todas las categorías' },
        ...this.categorias().map((c) => ({ valor: c.id, etiqueta: c.nombre })),
    ]);

    readonly opcionesCategoriasModal = computed<OpcionSelect[]>(() =>
        this.categoriasActivas().map((c) => ({ valor: c.id, etiqueta: c.nombre })),
    );

    readonly opcionesProveedoresModal = computed<OpcionSelect[]>(() => [
        { valor: null, etiqueta: 'Sin proveedor asignado' },
        ...this.proveedores().map((p) => ({ valor: p.id, etiqueta: p.nombre })),
    ]);

    readonly opcionesEstado: OpcionSelect[] = [
        { valor: 'true', etiqueta: 'Solo activos' },
        { valor: 'agotados', etiqueta: 'Solo agotados (stock 0)' },
        { valor: 'false', etiqueta: 'Solo dados de baja' },
        { valor: 'todos', etiqueta: 'Todos los estados' },
    ];

    readonly opcionesOrden: OpcionSelect[] = [
        { valor: 'fecha-desc', etiqueta: 'Más recientes' },
        { valor: 'fecha-asc', etiqueta: 'Más antiguos' },
        { valor: 'nombre-asc', etiqueta: 'Nombre (A - Z)' },
        { valor: 'nombre-desc', etiqueta: 'Nombre (Z - A)' },
    ];

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.modalDescuentoAbierto()) {
            this.cerrarModalDescuento();
        } else if (this.modalAbierto()) {
            this.cerrarModal();
        } else if (this.productoParaBaja()) {
            this.cerrarModalBaja();
        }
    }

    precioFinalFormularioCentavos(): number {
        const precioCentavos = convertirBsACentavos(this.form.get('precioBs')?.value);
        const rawPct = Number(this.form.get('descuentoPorcentaje')?.value ?? 0);
        const pct = isNaN(rawPct) ? 0 : Math.max(0, Math.min(99, Math.trunc(rawPct)));
        if (pct === 0 || precioCentavos === 0) return precioCentavos;
        return Math.max(0, precioCentavos - Math.round((precioCentavos * pct) / 100));
    }

    descuentoFormularioNoBeneficioso(): boolean {
        const costoCentavos = convertirBsACentavos(this.form.get('costoBs')?.value);
        const rawPct = Number(this.form.get('descuentoPorcentaje')?.value ?? 0);
        if (costoCentavos <= 0 || isNaN(rawPct) || rawPct <= 0) return false;
        return this.precioFinalFormularioCentavos() <= costoCentavos;
    }

    costoFormularioCentavos(): number {
        return convertirBsACentavos(this.form.get('costoBs')?.value);
    }

    abrirModalDescuento(): void {
        this.mensajeError.set(null);
        this.alcanceDescuento.set('TIENDA');
        this.categoriaDescuentoId.set(
            this.categoriasActivas().length > 0 ? this.categoriasActivas()[0].id : null,
        );
        this.porcentajeDescuentoMasivo.set(10);
        this.modalDescuentoAbierto.set(true);
    }

    cerrarModalDescuento(): void {
        this.modalDescuentoAbierto.set(false);
    }

    actualizarPorcentajeMasivo(event: Event): void {
        const num = Math.trunc(Number((event.target as HTMLInputElement).value));
        this.porcentajeDescuentoMasivo.set(isNaN(num) ? 0 : Math.max(0, Math.min(99, num)));
    }

    actualizarCategoriaDescuento(valor: string | number | null): void {
        this.categoriaDescuentoId.set(valor !== null && valor !== '' ? Number(valor) : null);
    }

    aplicarDescuentoMasivo(): void {
        if (this.aplicandoDescuentoMasivo()) return;
        const alcance = this.alcanceDescuento();
        const catId = this.categoriaDescuentoId();
        if (alcance === 'CATEGORIA' && !catId) {
            this.mensajeError.set('Selecciona una categoría para aplicar el descuento.');
            return;
        }

        const pct = Math.max(0, Math.min(99, Math.trunc(this.porcentajeDescuentoMasivo())));
        this.aplicandoDescuentoMasivo.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);
        this.alertaDescuentoBajoCosto.set(null);

        this.productosService
            .aplicarDescuentoMasivo({
                alcance,
                categoriaId: alcance === 'CATEGORIA' ? catId ?? undefined : undefined,
                descuentoPorcentaje: pct,
            })
            .subscribe({
                next: (res) => {
                    this.aplicandoDescuentoMasivo.set(false);
                    this.cerrarModalDescuento();
                    const destino =
                        alcance === 'TIENDA'
                            ? 'toda la tienda'
                            : `la categoría "${this.categorias().find((c) => c.id === catId)?.nombre ?? ''}"`;
                    if (pct === 0) {
                        this.mensajeExito.set(
                            `Se quitó el descuento en ${res.actualizados} producto(s) de ${destino}.`,
                        );
                    } else {
                        this.mensajeExito.set(
                            `Descuento del ${pct}% aplicado a ${res.actualizados} producto(s) de ${destino}.`,
                        );
                    }
                    if (res.bajoCosto > 0) {
                        this.alertaDescuentoBajoCosto.set(
                            `Atención: ${res.bajoCosto} producto(s) quedaron con precio con descuento menor o igual a su costo de compra (margen no beneficioso).`,
                        );
                    }
                    this.recargar$.next();
                },
                error: (err: unknown) => {
                    this.aplicandoDescuentoMasivo.set(false);
                    this.manejarError(err, 'No se pudo aplicar el descuento masivo.');
                },
            });
    }

    ngOnInit(): void {
        this.cargarDependencias();

        // Flujo reactivo: búsqueda por texto con debounce y recargas inmediatas para selects/paginación
        merge(this.busquedaTexto$.pipe(debounceTime(250)), this.recargar$)
            .pipe(
                tap(() => this.cargando.set(true)),
                switchMap(() => {
                    const catId = this.filtroCategoriaId();
                    const q = this.filtroTexto().trim();
                    const est = this.filtroEstado();
                    const [ordenCampo, ordenDir] = this.filtroOrden().split('-') as [
                        'nombre' | 'fecha',
                        'asc' | 'desc',
                    ];

                    const activoParam = est === 'agotados' ? 'true' : est;
                    const agotadoParam = est === 'agotados' ? true : undefined;

                    return this.productosService
                        .listarAdmin({
                            categoriaId: catId ?? undefined,
                            q: q.length > 0 ? q : undefined,
                            activo: activoParam,
                            agotado: agotadoParam,
                            pagina: this.pagina(),
                            limite: this.limite(),
                            ordenCampo,
                            ordenDir,
                        })
                        .pipe(
                            catchError(() => {
                                this.mensajeError.set('No se pudo cargar la lista de productos.');
                                const vacio: PaginatedResult<ProductoAdmin> = {
                                    items: [],
                                    total: 0,
                                    pagina: 1,
                                    limite: this.limite(),
                                    totalPaginas: 1,
                                };
                                return of(vacio);
                            }),
                        );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((res) => {
                this.productos.set(res.items);
                this.totalProductos.set(res.total);
                this.totalPaginas.set(res.totalPaginas);
                if (this.pagina() > res.totalPaginas && res.totalPaginas >= 1) {
                    this.pagina.set(res.totalPaginas);
                }
                this.cargando.set(false);
            });

        // Carga inicial
        this.recargar$.next();
    }

    cargarDependencias(): void {
        this.categoriasService.listarAdmin().subscribe({
            next: (cats) => this.categorias.set(cats),
        });
        this.proveedoresService.listarActivos().subscribe({
            next: (provs) => this.proveedores.set(provs),
        });
    }

    actualizarBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.filtroTexto.set(valor);
        this.pagina.set(1);
        this.busquedaTexto$.next();
    }

    actualizarCategoriaValor(valor: string | number | null): void {
        this.filtroCategoriaId.set(valor !== null && valor !== '' ? Number(valor) : null);
        this.pagina.set(1);
        this.recargar$.next();
    }

    actualizarEstadoValor(valor: string | number | null): void {
        this.filtroEstado.set((valor as 'true' | 'agotados' | 'false' | 'todos') || 'true');
        this.pagina.set(1);
        this.recargar$.next();
    }

    actualizarOrdenValor(valor: string | number | null): void {
        this.filtroOrden.set(
            (valor as 'fecha-desc' | 'fecha-asc' | 'nombre-asc' | 'nombre-desc') || 'fecha-desc',
        );
        this.pagina.set(1);
        this.recargar$.next();
    }

    alternarOrdenNombre(): void {
        const actual = this.filtroOrden();
        this.filtroOrden.set(actual === 'nombre-asc' ? 'nombre-desc' : 'nombre-asc');
        this.pagina.set(1);
        this.recargar$.next();
    }

    irAPagina(p: number): void {
        if (p < 1 || p > this.totalPaginas() || p === this.pagina()) return;
        this.pagina.set(p);
        this.recargar$.next();
    }

    campoInvalido(campo: string): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    // Subida de imagen principal (clic o arrastrar y soltar)
    subirArchivoPrincipal(event: Event): void {
        const input = event.target as HTMLInputElement;
        const archivo = input.files?.[0];
        if (!archivo) return;
        this.procesarArchivoPrincipal(archivo);
        input.value = '';
    }

    onDragOverPrincipal(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.subiendoImagen()) {
            this.arrastrandoPrincipal.set(true);
        }
    }

    onDragLeavePrincipal(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.arrastrandoPrincipal.set(false);
    }

    onDropPrincipal(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.arrastrandoPrincipal.set(false);
        if (this.subiendoImagen()) return;

        const archivo = event.dataTransfer?.files?.[0];
        if (archivo) {
            this.procesarArchivoPrincipal(archivo);
        }
    }

    private procesarArchivoPrincipal(archivo: File): void {
        if (!this.esTipoImagenPermitido(archivo)) {
            this.mensajeError.set('Formato no permitido. Usa imágenes JPG, PNG, WEBP o GIF.');
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            this.mensajeError.set('La imagen supera el límite de 5 MB.');
            return;
        }

        this.subiendoImagen.set(true);
        this.mensajeError.set(null);
        this.productosService.subirImagen(archivo).subscribe({
            next: (res) => {
                this.form.patchValue({ imagenPrincipal: res.url });
                this.subiendoImagen.set(false);
            },
            error: (err: unknown) => {
                this.subiendoImagen.set(false);
                this.manejarError(err, 'No se pudo subir la imagen.');
            },
        });
    }

    // Subida de imagen adicional (clic o arrastrar y soltar)
    subirArchivoAdicional(event: Event): void {
        const input = event.target as HTMLInputElement;
        const archivo = input.files?.[0];
        if (!archivo) return;
        this.procesarArchivoAdicional(archivo);
        input.value = '';
    }

    onDragOverAdicional(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        if (!this.subiendoImagenAdicional() && this.imagenesAdicionalesArray.length < 10) {
            this.arrastrandoAdicional.set(true);
        }
    }

    onDragLeaveAdicional(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.arrastrandoAdicional.set(false);
    }

    onDropAdicional(event: DragEvent): void {
        event.preventDefault();
        event.stopPropagation();
        this.arrastrandoAdicional.set(false);
        if (this.subiendoImagenAdicional()) return;

        const archivo = event.dataTransfer?.files?.[0];
        if (archivo) {
            this.procesarArchivoAdicional(archivo);
        }
    }

    private procesarArchivoAdicional(archivo: File): void {
        if (!this.esTipoImagenPermitido(archivo)) {
            this.mensajeError.set('Formato no permitido. Usa imágenes JPG, PNG, WEBP o GIF.');
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            this.mensajeError.set('La imagen supera el límite de 5 MB.');
            return;
        }
        if (this.imagenesAdicionalesArray.length >= 10) {
            this.mensajeError.set('Máximo 10 imágenes adicionales permitidas.');
            return;
        }

        this.subiendoImagenAdicional.set(true);
        this.mensajeError.set(null);
        this.productosService.subirImagen(archivo).subscribe({
            next: (res) => {
                this.imagenesAdicionalesArray.push(this.fb.control(res.url));
                this.subiendoImagenAdicional.set(false);
            },
            error: (err: unknown) => {
                this.subiendoImagenAdicional.set(false);
                this.manejarError(err, 'No se pudo subir la imagen adicional.');
            },
        });
    }

    private esTipoImagenPermitido(archivo: File): boolean {
        return ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(archivo.type);
    }

    eliminarImagenPrincipal(): void {
        this.form.patchValue({ imagenPrincipal: '' });
    }

    eliminarImagenAdicional(index: number): void {
        this.imagenesAdicionalesArray.removeAt(index);
    }

    alternarRequiereTalla(): void {
        const nuevoEstado = !this.requiereTalla();
        this.requiereTalla.set(nuevoEstado);
        const ctrl = this.form.get('notaTalla');
        if (!nuevoEstado) {
            ctrl?.setValue('');
            ctrl?.clearValidators();
            ctrl?.updateValueAndValidity();
        } else {
            ctrl?.setValidators([Validators.required, Validators.maxLength(120)]);
            ctrl?.updateValueAndValidity();
        }
    }

    aplicarAtajoTalla(texto: string): void {
        this.requiereTalla.set(true);
        const ctrl = this.form.get('notaTalla');
        ctrl?.setValidators([Validators.required, Validators.maxLength(120)]);
        ctrl?.setValue(texto);
        ctrl?.markAsDirty();
        ctrl?.updateValueAndValidity();
    }

    abrirModalCrear(): void {
        this.productoEnEdicion.set(null);
        this.mensajeError.set(null);
        this.arrastrandoPrincipal.set(false);
        this.arrastrandoAdicional.set(false);
        this.requiereTalla.set(false);
        this.form.get('notaTalla')?.clearValidators();
        this.form.get('notaTalla')?.updateValueAndValidity();
        this.form.reset({
            categoriaId: this.categoriasActivas().length > 0 ? this.categoriasActivas()[0].id : null,
            proveedorId: null,
            nombre: '',
            descripcion: '',
            precioBs: null,
            descuentoPorcentaje: 0,
            costoBs: null,
            stock: 0,
            escala: '',
            notaTalla: '',
            imagenPrincipal: '',
            activo: true,
        });
        this.imagenesAdicionalesArray.clear();
        this.modalAbierto.set(true);
    }

    abrirModalEditar(prod: ProductoAdmin): void {
        this.productoEnEdicion.set(prod);
        this.mensajeError.set(null);
        this.arrastrandoPrincipal.set(false);
        this.arrastrandoAdicional.set(false);
        this.imagenesAdicionalesArray.clear();

        const tieneTalla = Boolean(prod.notaTalla && prod.notaTalla.trim().length > 0);
        this.requiereTalla.set(tieneTalla);
        const ctrlTalla = this.form.get('notaTalla');
        if (tieneTalla) {
            ctrlTalla?.setValidators([Validators.required, Validators.maxLength(120)]);
        } else {
            ctrlTalla?.clearValidators();
        }
        ctrlTalla?.updateValueAndValidity();

        this.form.reset({
            categoriaId: prod.categoriaId,
            proveedorId: prod.proveedorId,
            nombre: prod.nombre,
            descripcion: prod.descripcion ?? '',
            precioBs: prod.precioCentavos / 100,
            descuentoPorcentaje: prod.descuentoPorcentaje ?? 0,
            costoBs: prod.costoCentavos ? prod.costoCentavos / 100 : 0,
            stock: prod.stock,
            escala: prod.escala ?? '',
            notaTalla: prod.notaTalla ?? '',
            imagenPrincipal: prod.imagenPrincipal ?? '',
            activo: prod.activo,
        });

        if (prod.imagenes && prod.imagenes.length > 0) {
            for (const img of prod.imagenes) {
                this.imagenesAdicionalesArray.push(this.fb.control(img.url));
            }
        }

        this.modalAbierto.set(true);
    }

    cerrarModal(): void {
        this.modalAbierto.set(false);
        this.productoEnEdicion.set(null);
        this.requiereTalla.set(false);
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
        const descuentoPorcentaje = Math.max(
            0,
            Math.min(99, Math.trunc(Number(v.descuentoPorcentaje) || 0)),
        );
        const costoCentavos = convertirBsACentavos(v.costoBs);
        const stock = Math.trunc(Number(v.stock) || 0);
        const notaTallaFinal = this.requiereTalla() ? v.notaTalla?.trim() || null : null;

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
                    descuentoPorcentaje,
                    costoCentavos,
                    escala: v.escala?.trim() || null,
                    notaTalla: notaTallaFinal,
                    imagenPrincipal: v.imagenPrincipal?.trim() || null,
                    imagenesAdicionales: imagenesFiltradas,
                    activo: Boolean(v.activo),
                })
                .subscribe({
                    next: (actualizado) => {
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Producto "${actualizado.nombre}" actualizado.`);
                        this.recargar$.next();
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
                    descuentoPorcentaje,
                    costoCentavos,
                    stockInicial: stock,
                    escala: v.escala?.trim() || null,
                    notaTalla: notaTallaFinal,
                    imagenPrincipal: v.imagenPrincipal?.trim() || null,
                    imagenesAdicionales: imagenesFiltradas,
                })
                .subscribe({
                    next: (creado) => {
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Producto "${creado.nombre}" registrado exitosamente.`);
                        this.pagina.set(1);
                        this.recargar$.next();
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
                this.dandoDeBaja.set(false);
                this.cerrarModalBaja();
                this.mensajeExito.set(`Producto "${actualizado.nombre}" dado de baja.`);
                this.recargar$.next();
            },
            error: () => {
                this.dandoDeBaja.set(false);
                this.cerrarModalBaja();
                this.mensajeError.set('No se pudo dar de baja el producto.');
            },
        });
    }

    reactivarProducto(prod: ProductoAdmin): void {
        if (this.reactivandoId() !== null) return;
        this.reactivandoId.set(prod.id);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.productosService.reactivar(prod.id).subscribe({
            next: (actualizado) => {
                this.reactivandoId.set(null);
                this.mensajeExito.set(`Producto "${actualizado.nombre}" reactivado exitosamente.`);
                this.recargar$.next();
            },
            error: (err: unknown) => {
                this.reactivandoId.set(null);
                this.manejarError(err, 'No se pudo reactivar el producto.');
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
