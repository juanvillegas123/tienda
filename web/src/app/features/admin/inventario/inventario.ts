import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
    AbstractControl,
    ValidationErrors,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { InventarioService } from '../../../core/inventario.service';
import { ProductosService } from '../../../core/productos.service';
import { ProveedoresService } from '../../../core/proveedores.service';
import {
    MovimientoInventario,
    ProductoAdmin,
    Proveedor,
    TipoMovimientoInventario,
} from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';

function parsearBsACentavos(valor: unknown): number | null {
    if (valor === null || valor === undefined || String(valor).trim() === '') return null;
    const normalizado = String(valor).trim().replace(',', '.');
    const num = Number(normalizado);
    if (!Number.isFinite(num) || num < 0) return null;
    return Math.round(num * 100);
}

function validadorCosto(control: AbstractControl): ValidationErrors | null {
    if (control.value === null || control.value === undefined || String(control.value).trim() === '') {
        return { requerido: true };
    }
    return parsearBsACentavos(control.value) === null ? { costoInvalido: true } : null;
}

@Component({
    selector: 'app-inventario-admin',
    standalone: true,
    imports: [ReactiveFormsModule, DatePipe, BsPipe],
    templateUrl: './inventario.html',
})
export class InventarioAdminComponent implements OnInit {
    private readonly inventarioService = inject(InventarioService);
    private readonly productosService = inject(ProductosService);
    private readonly proveedoresService = inject(ProveedoresService);
    private readonly fb = inject(FormBuilder);

    readonly movimientos = signal<MovimientoInventario[]>([]);
    readonly productos = signal<ProductoAdmin[]>([]);
    readonly proveedores = signal<Proveedor[]>([]);

    readonly cargando = signal(true);
    readonly guardando = signal(false);

    // Filtros del historial
    readonly filtroProductoId = signal<number | null>(null);
    readonly filtroTipo = signal<'TODOS' | TipoMovimientoInventario>('TODOS');

    // Modales
    readonly modalEntradaAbierto = signal(false);
    readonly modalAjusteAbierto = signal(false);

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly formEntrada = this.fb.group({
        productoId: [null as number | null, [Validators.required]],
        proveedorId: [null as number | null],
        cantidad: [1, [Validators.required, Validators.min(1)]],
        costoBs: ['', [Validators.required, validadorCosto]],
        nota: ['', [Validators.maxLength(500)]],
    });

    readonly formAjuste = this.fb.group({
        productoId: [null as number | null, [Validators.required]],
        nuevoStock: [0, [Validators.required, Validators.min(0)]],
        nota: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    });

    readonly productoSeleccionadoEntrada = signal<ProductoAdmin | null>(null);
    readonly productoSeleccionadoAjuste = signal<ProductoAdmin | null>(null);
    readonly nuevoStockPreview = signal<number>(0);

    readonly diferenciaAjuste = computed(() => {
        const prod = this.productoSeleccionadoAjuste();
        if (!prod) return null;
        return this.nuevoStockPreview() - prod.stock;
    });

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.modalEntradaAbierto()) {
            this.cerrarModalEntrada();
        } else if (this.modalAjusteAbierto()) {
            this.cerrarModalAjuste();
        }
    }

    ngOnInit(): void {
        this.cargarCatalogos();
        this.cargarMovimientos();
    }

    cargarCatalogos(): void {
        this.productosService
            .listarAdmin({ activo: 'todos', limite: 100, ordenCampo: 'nombre', ordenDir: 'asc' })
            .subscribe({
                next: (res) => this.productos.set(res.items),
            });
        this.proveedoresService.listarActivos().subscribe({
            next: (provs) => this.proveedores.set(provs),
        });
    }

    cargarMovimientos(): void {
        this.cargando.set(true);
        const tipoSel = this.filtroTipo();
        const tipo: TipoMovimientoInventario | undefined = tipoSel === 'TODOS' ? undefined : tipoSel;
        const productoId = this.filtroProductoId() ?? undefined;

        this.inventarioService.listarMovimientos({ productoId, tipo, limite: 150 }).subscribe({
            next: (lista) => {
                this.movimientos.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
                this.mensajeError.set('No se pudo cargar el historial de movimientos.');
            },
        });
    }

    actualizarFiltroProducto(event: Event): void {
        const valor = (event.target as HTMLSelectElement).value;
        this.filtroProductoId.set(valor ? Number(valor) : null);
        this.cargarMovimientos();
    }

    actualizarFiltroTipo(event: Event): void {
        this.filtroTipo.set(
            (event.target as HTMLSelectElement).value as 'TODOS' | TipoMovimientoInventario,
        );
        this.cargarMovimientos();
    }

    // --- Modal Entrada de Mercadería ---

    abrirModalEntrada(): void {
        this.mensajeError.set(null);
        this.productoSeleccionadoEntrada.set(null);
        this.formEntrada.reset({
            productoId: null,
            proveedorId: null,
            cantidad: 1,
            costoBs: '',
            nota: '',
        });
        this.modalEntradaAbierto.set(true);
    }

    cerrarModalEntrada(): void {
        this.modalEntradaAbierto.set(false);
        this.productoSeleccionadoEntrada.set(null);
        this.mensajeError.set(null);
    }

    onCambioProductoEntrada(event: Event): void {
        const id = Number((event.target as HTMLSelectElement).value);
        const prod = this.productos().find((p) => p.id === id) ?? null;
        this.productoSeleccionadoEntrada.set(prod);
        if (prod) {
            this.formEntrada.patchValue({
                proveedorId: prod.proveedorId,
                costoBs: (prod.costoCentavos / 100).toFixed(2).replace('.', ','),
            });
        }
    }

    guardarEntrada(): void {
        if (this.formEntrada.invalid) {
            this.formEntrada.markAllAsTouched();
            return;
        }

        const v = this.formEntrada.getRawValue();
        const costoCentavos = parsearBsACentavos(v.costoBs);
        if (costoCentavos === null || !v.productoId) return;

        this.guardando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.inventarioService
            .registrarEntrada({
                productoId: Number(v.productoId),
                proveedorId: v.proveedorId ? Number(v.proveedorId) : null,
                cantidad: Math.trunc(Number(v.cantidad)),
                costoCentavos,
                nota: v.nota?.trim() || null,
            })
            .subscribe({
                next: (mov) => {
                    this.guardando.set(false);
                    this.cerrarModalEntrada();
                    this.mensajeExito.set(
                        `Entrada registrada: +${mov.cantidad} unid. de "${mov.productoNombre}".`,
                    );
                    this.cargarCatalogos();
                    this.cargarMovimientos();
                },
                error: (err: unknown) => {
                    this.guardando.set(false);
                    this.manejarError(err, 'No se pudo registrar la entrada de mercadería.');
                },
            });
    }

    // --- Modal Ajuste Manual ---

    abrirModalAjuste(): void {
        this.mensajeError.set(null);
        this.productoSeleccionadoAjuste.set(null);
        this.nuevoStockPreview.set(0);
        this.formAjuste.reset({
            productoId: null,
            nuevoStock: 0,
            nota: '',
        });
        this.modalAjusteAbierto.set(true);
    }

    cerrarModalAjuste(): void {
        this.modalAjusteAbierto.set(false);
        this.productoSeleccionadoAjuste.set(null);
        this.mensajeError.set(null);
    }

    onCambioProductoAjuste(event: Event): void {
        const id = Number((event.target as HTMLSelectElement).value);
        const prod = this.productos().find((p) => p.id === id) ?? null;
        this.productoSeleccionadoAjuste.set(prod);
        const stockActual = prod?.stock ?? 0;
        this.nuevoStockPreview.set(stockActual);
        this.formAjuste.patchValue({ nuevoStock: stockActual });
    }

    onInputNuevoStock(event: Event): void {
        const val = Number((event.target as HTMLInputElement).value);
        this.nuevoStockPreview.set(Number.isFinite(val) ? Math.trunc(val) : 0);
    }

    guardarAjuste(): void {
        if (this.formAjuste.invalid) {
            this.formAjuste.markAllAsTouched();
            return;
        }

        const v = this.formAjuste.getRawValue();
        if (!v.productoId) return;

        this.guardando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.inventarioService
            .registrarAjuste({
                productoId: Number(v.productoId),
                nuevoStock: Math.trunc(Number(v.nuevoStock)),
                nota: v.nota!.trim(),
            })
            .subscribe({
                next: (mov) => {
                    this.guardando.set(false);
                    this.cerrarModalAjuste();
                    this.mensajeExito.set(
                        `Ajuste registrado para "${mov.productoNombre}".`,
                    );
                    this.cargarCatalogos();
                    this.cargarMovimientos();
                },
                error: (err: unknown) => {
                    this.guardando.set(false);
                    this.manejarError(err, 'No se pudo registrar el ajuste de stock.');
                },
            });
    }

    campoInvalido(form: 'entrada' | 'ajuste', campo: string): boolean {
        const ctrl =
            form === 'entrada' ? this.formEntrada.get(campo) : this.formAjuste.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    etiquetaTipo(tipo: TipoMovimientoInventario): string {
        switch (tipo) {
            case 'ENTRADA':
                return 'Entrada';
            case 'SALIDA':
                return 'Salida';
            case 'AJUSTE':
                return 'Ajuste';
            case 'DEVOLUCION':
                return 'Devolución';
        }
    }

    claseTipo(tipo: TipoMovimientoInventario): string {
        switch (tipo) {
            case 'ENTRADA':
                return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
            case 'SALIDA':
                return 'bg-slate-100 text-slate-700 border border-slate-200';
            case 'AJUSTE':
                return 'bg-amber-50 text-amber-800 border border-amber-200';
            case 'DEVOLUCION':
                return 'bg-rose-50 text-rose-700 border border-rose-200';
        }
    }

    private manejarError(err: unknown, fallback: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            this.mensajeError.set((body?.['mensaje'] as string) || fallback);
        } else {
            this.mensajeError.set(fallback);
        }
    }
}
