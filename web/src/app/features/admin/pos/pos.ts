import {
    Component,
    inject,
    signal,
    computed,
    OnInit,
    AfterViewInit,
    HostListener,
    DestroyRef,
    ElementRef,
    viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of } from 'rxjs';
import { debounceTime, switchMap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CajasService } from '../../../core/cajas.service';
import { ProductosService } from '../../../core/productos.service';
import { VentasService } from '../../../core/ventas.service';
import { DevolucionesService } from '../../../core/devoluciones.service';
import {
    CajaResumen,
    CanalVenta,
    MetodoPago,
    ProductoAdmin,
    Venta,
} from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { PdfService } from '../../../shared/pdf.service';

interface ItemTicketPos {
    productoId: number;
    nombre: string;
    precioCentavos: number;
    precioOriginalCentavos: number;
    descuentoPorcentaje: number;
    stockMaximo: number;
    cantidad: number;
}

@Component({
    selector: 'app-pos-admin',
    standalone: true,
    imports: [RouterLink, DatePipe, BsPipe],
    templateUrl: './pos.html',
})
export class PosAdminComponent implements OnInit, AfterViewInit {
    private readonly route = inject(ActivatedRoute);
    private readonly cajasService = inject(CajasService);
    private readonly productosService = inject(ProductosService);
    private readonly ventasService = inject(VentasService);
    private readonly devolucionesService = inject(DevolucionesService);
    private readonly pdfService = inject(PdfService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly inputBusquedaRef = viewChild<ElementRef<HTMLInputElement>>('inputBusqueda');
    private readonly busqueda$ = new Subject<string>();

    // Pestaña activa
    readonly pestana = signal<'pos' | 'historial'>('pos');

    // Estado de caja
    readonly cajaActual = signal<CajaResumen | null>(null);
    readonly cargandoCaja = signal(true);

    // POS: buscador y ticket
    readonly textoBusqueda = signal('');
    readonly resultados = signal<ProductoAdmin[]>([]);
    readonly buscandoProductos = signal(false);
    readonly indiceResaltado = signal(0);

    readonly ticket = signal<ItemTicketPos[]>([]);
    readonly metodoPago = signal<MetodoPago>('EFECTIVO');
    readonly cobrando = signal(false);
    readonly efectivoRecibidoTexto = signal('');
    readonly billetesRapidos = [20, 50, 100, 200];

    // Historial de ventas
    readonly ventas = signal<Venta[]>([]);
    readonly cargandoVentas = signal(false);
    readonly filtroCanal = signal<'TODOS' | CanalVenta>('TODOS');

    // Modal de devolución
    readonly ventaParaDevolver = signal<Venta | null>(null);
    readonly cantidadesDevolucion = signal<Record<number, number>>({});
    readonly motivoDevolucion = signal('');
    readonly registrandoDevolucion = signal(false);

    // Mensajes
    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);
    readonly ultimaVentaRegistrada = signal<Venta | null>(null);

    readonly totalTicketCentavos = computed(() =>
        this.ticket().reduce((acc, item) => acc + item.precioCentavos * item.cantidad, 0),
    );

    readonly totalUnidadesTicket = computed(() =>
        this.ticket().reduce((acc, item) => acc + item.cantidad, 0),
    );

    readonly efectivoRecibidoCentavos = computed<number | null>(() => {
        const raw = this.efectivoRecibidoTexto().trim().replace(',', '.');
        if (!raw) return null;
        const num = Number(raw);
        if (isNaN(num) || num < 0) return null;
        return Math.round(num * 100);
    });

    readonly cambioCentavos = computed<number>(() => {
        const recibido = this.efectivoRecibidoCentavos();
        const total = this.totalTicketCentavos();
        if (recibido === null || total <= 0) return 0;
        return Math.max(0, recibido - total);
    });

    readonly faltaEfectivoCentavos = computed<number>(() => {
        const recibido = this.efectivoRecibidoCentavos();
        const total = this.totalTicketCentavos();
        if (recibido === null || total <= 0) return 0;
        return Math.max(0, total - recibido);
    });

    readonly efectivoInsuficiente = computed<boolean>(
        () =>
            this.metodoPago() === 'EFECTIVO' &&
            this.efectivoRecibidoCentavos() !== null &&
            this.faltaEfectivoCentavos() > 0,
    );

    readonly montoDevolucionCentavos = computed(() => {
        const venta = this.ventaParaDevolver();
        if (!venta) return 0;
        const cants = this.cantidadesDevolucion();
        let total = 0;
        for (const item of venta.items) {
            const c = cants[item.productoId] ?? 0;
            total += item.precioCentavos * c;
        }
        return total;
    });

    readonly unidadesDevolucion = computed(() => {
        const cants = this.cantidadesDevolucion();
        return Object.values(cants).reduce((acc, n) => acc + (n || 0), 0);
    });

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.ventaParaDevolver()) {
            this.cerrarModalDevolucion();
            return;
        }

        if (this.pestana() !== 'pos' || !this.cajaActual() || this.ventaParaDevolver()) {
            return;
        }

        if (event.key === 'F2') {
            event.preventDefault();
            this.metodoPago.set('EFECTIVO');
        } else if (event.key === 'F3') {
            event.preventDefault();
            this.metodoPago.set('QR');
        } else if (event.key === 'F4') {
            event.preventDefault();
            this.enfocarBuscador();
        } else if (event.key === 'F9') {
            event.preventDefault();
            if (this.ticket().length > 0 && !this.cobrando()) {
                this.cobrar();
            }
        }
    }

    ngOnInit(): void {
        this.route.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const tab = params.get('tab');
                if (tab === 'historial') {
                    this.pestana.set('historial');
                    this.cargarHistorialVentas();
                } else {
                    this.pestana.set('pos');
                    setTimeout(() => this.enfocarBuscador(), 50);
                }
            });

        this.cargarCaja();

        this.busqueda$
            .pipe(
                debounceTime(180),
                switchMap((q) => {
                    this.buscandoProductos.set(true);
                    return this.productosService
                        .listarAdmin({
                            activo: 'true',
                            q: q.trim().length > 0 ? q.trim() : undefined,
                            limite: 30,
                            ordenCampo: 'nombre',
                            ordenDir: 'asc',
                        })
                        .pipe(
                            catchError(() =>
                                of({ items: [], total: 0, pagina: 1, limite: 30, totalPaginas: 1 }),
                            ),
                        );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((res) => {
                this.resultados.set(res.items);
                this.indiceResaltado.set(0);
                this.buscandoProductos.set(false);
            });

        this.busqueda$.next('');
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.enfocarBuscador(), 150);
    }

    enfocarBuscador(): void {
        const input = this.inputBusquedaRef()?.nativeElement;
        if (input) {
            input.focus();
            input.select();
        }
    }

    cargarCaja(): void {
        this.cargandoCaja.set(true);
        this.cajasService.obtenerActual().subscribe({
            next: (caja) => {
                this.cajaActual.set(caja);
                this.cargandoCaja.set(false);
                if (caja && this.pestana() === 'pos') {
                    setTimeout(() => this.enfocarBuscador(), 50);
                }
            },
            error: () => {
                this.cargandoCaja.set(false);
                this.mensajeError.set('No se pudo verificar el estado de la caja.');
            },
        });
    }

    cambiarPestana(tab: 'pos' | 'historial'): void {
        this.pestana.set(tab);
        this.mensajeError.set(null);
        if (tab === 'historial') {
            this.cargarHistorialVentas();
        } else {
            setTimeout(() => this.enfocarBuscador(), 50);
        }
    }

    actualizarBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.textoBusqueda.set(valor);
        this.busqueda$.next(valor);
    }

    onKeydownBuscador(event: KeyboardEvent): void {
        const lista = this.resultados();
        if (lista.length === 0) return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.indiceResaltado.update((i) => Math.min(lista.length - 1, i + 1));
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.indiceResaltado.update((i) => Math.max(0, i - 1));
        } else if (event.key === 'Enter') {
            event.preventDefault();
            const seleccionado = lista[this.indiceResaltado()];
            if (seleccionado) {
                this.agregarAlTicket(seleccionado);
            }
        }
    }

    cantidadEnTicket(productoId: number): number {
        return this.ticket().find((i) => i.productoId === productoId)?.cantidad ?? 0;
    }

    agregarAlTicket(prod: ProductoAdmin): void {
        this.mensajeError.set(null);

        if (prod.stock <= 0) {
            this.mensajeError.set(`"${prod.nombre}" está agotado y no puede venderse.`);
            return;
        }

        const actual = this.ticket();
        const existente = actual.find((i) => i.productoId === prod.id);

        if (existente) {
            if (existente.cantidad + 1 > prod.stock) {
                this.mensajeError.set(
                    `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}.`,
                );
                return;
            }
            this.ticket.set(
                actual.map((i) =>
                    i.productoId === prod.id
                        ? { ...i, cantidad: i.cantidad + 1, stockMaximo: prod.stock }
                        : i,
                ),
            );
        } else {
            const precioVigente = prod.precioFinalCentavos ?? prod.precioCentavos;
            this.ticket.set([
                ...actual,
                {
                    productoId: prod.id,
                    nombre: prod.nombre,
                    precioCentavos: precioVigente,
                    precioOriginalCentavos: prod.precioCentavos,
                    descuentoPorcentaje: prod.descuentoPorcentaje ?? 0,
                    stockMaximo: prod.stock,
                    cantidad: 1,
                },
            ]);
        }

        this.enfocarBuscador();
    }

    cambiarCantidadTicket(productoId: number, delta: number): void {
        this.mensajeError.set(null);
        const lista = this.ticket();
        const item = lista.find((i) => i.productoId === productoId);
        if (!item) return;

        const nueva = item.cantidad + delta;
        if (nueva <= 0) {
            this.quitarDelTicket(productoId);
            return;
        }
        if (nueva > item.stockMaximo) {
            this.mensajeError.set(`Stock máximo disponible para "${item.nombre}": ${item.stockMaximo}.`);
            return;
        }

        this.ticket.set(
            lista.map((i) => (i.productoId === productoId ? { ...i, cantidad: nueva } : i)),
        );
    }

    quitarDelTicket(productoId: number): void {
        this.ticket.set(this.ticket().filter((i) => i.productoId !== productoId));
    }

    limpiarTicket(): void {
        this.ticket.set([]);
        this.efectivoRecibidoTexto.set('');
        this.mensajeError.set(null);
        this.enfocarBuscador();
    }

    seleccionarMetodoPago(metodo: MetodoPago): void {
        this.metodoPago.set(metodo);
        if (metodo === 'QR') {
            this.efectivoRecibidoTexto.set('');
        }
    }

    actualizarEfectivoRecibido(event: Event): void {
        this.efectivoRecibidoTexto.set((event.target as HTMLInputElement).value);
    }

    aplicarBilleteRapido(bolivianos: number): void {
        this.efectivoRecibidoTexto.set(String(bolivianos));
    }

    aplicarPagoExacto(): void {
        const total = this.totalTicketCentavos();
        if (total <= 0) return;
        this.efectivoRecibidoTexto.set((total / 100).toFixed(2).replace('.', ','));
    }

    cobrar(): void {
        if (!this.cajaActual() || this.ticket().length === 0 || this.cobrando()) return;
        if (this.efectivoInsuficiente()) {
            this.mensajeError.set('El efectivo recibido es menor al total a cobrar.');
            return;
        }

        const cambioCalculado = this.metodoPago() === 'EFECTIVO' ? this.cambioCentavos() : 0;

        this.cobrando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.ventasService
            .crear({
                metodoPago: this.metodoPago(),
                items: this.ticket().map((i) => ({
                    productoId: i.productoId,
                    cantidad: i.cantidad,
                })),
            })
            .subscribe({
                next: (venta) => {
                    this.cobrando.set(false);
                    this.ticket.set([]);
                    this.efectivoRecibidoTexto.set('');
                    this.textoBusqueda.set('');
                    this.ultimaVentaRegistrada.set(venta);
                    const textoCambio =
                        cambioCalculado > 0
                            ? ` — Cambio a devolver: Bs. ${(cambioCalculado / 100).toFixed(2).replace('.', ',')}`
                            : '';
                    this.mensajeExito.set(
                        `Venta #${venta.id} cobrada (${venta.metodoPago}) por Bs. ${(venta.totalCentavos / 100).toFixed(2).replace('.', ',')}${textoCambio}.`,
                    );
                    this.busqueda$.next('');
                    this.cargarCaja();
                    setTimeout(() => this.enfocarBuscador(), 50);
                },
                error: (err: unknown) => {
                    this.cobrando.set(false);
                    this.manejarError(err, 'No se pudo registrar la venta.');
                    this.busqueda$.next(this.textoBusqueda());
                },
            });
    }

    descargarPdfVenta(venta: Venta): void {
        void this.pdfService.descargarNotaVenta(venta);
    }

    // --- Historial de ventas y devoluciones ---

    cargarHistorialVentas(): void {
        this.cargandoVentas.set(true);
        const filtro = this.filtroCanal();
        const canal: CanalVenta | undefined = filtro === 'TODOS' ? undefined : filtro;
        this.ventasService.listar({ canal, limite: 80 }).subscribe({
            next: (lista) => {
                this.ventas.set(lista);
                this.cargandoVentas.set(false);
            },
            error: (err: unknown) => {
                this.cargandoVentas.set(false);
                this.manejarError(err, 'No se pudo cargar el historial de ventas.');
            },
        });
    }

    cambiarFiltroCanal(canal: 'TODOS' | CanalVenta): void {
        this.filtroCanal.set(canal);
        this.cargarHistorialVentas();
    }

    tieneItemsDevolvibles(venta: Venta): boolean {
        return venta.items.some((i) => i.cantidadDevolvible > 0);
    }

    abrirModalDevolucion(venta: Venta): void {
        this.mensajeError.set(null);
        if (!this.cajaActual()) {
            this.mensajeError.set('Debes abrir una caja antes de registrar una devolución.');
            return;
        }

        const inicial: Record<number, number> = {};
        for (const item of venta.items) {
            inicial[item.productoId] = 0;
        }
        this.cantidadesDevolucion.set(inicial);
        this.motivoDevolucion.set('');
        this.ventaParaDevolver.set(venta);
    }

    cerrarModalDevolucion(): void {
        this.ventaParaDevolver.set(null);
        this.cantidadesDevolucion.set({});
        this.motivoDevolucion.set('');
    }

    ajustarCantidadDevolucion(productoId: number, max: number, delta: number): void {
        this.cantidadesDevolucion.update((actual) => {
            const prev = actual[productoId] ?? 0;
            const siguiente = Math.max(0, Math.min(max, prev + delta));
            return { ...actual, [productoId]: siguiente };
        });
    }

    actualizarMotivo(event: Event): void {
        this.motivoDevolucion.set((event.target as HTMLTextAreaElement).value);
    }

    confirmarDevolucion(): void {
        const venta = this.ventaParaDevolver();
        if (!venta || this.registrandoDevolucion()) return;

        const motivo = this.motivoDevolucion().trim();
        if (motivo.length < 3) {
            this.mensajeError.set('Ingresa un motivo válido (mínimo 3 caracteres).');
            return;
        }

        const cants = this.cantidadesDevolucion();
        const items = Object.entries(cants)
            .filter(([, cant]) => cant > 0)
            .map(([prodId, cantidad]) => ({ productoId: Number(prodId), cantidad }));

        if (items.length === 0) {
            this.mensajeError.set('Selecciona al menos una unidad para devolver.');
            return;
        }

        this.registrandoDevolucion.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.devolucionesService
            .crear({
                ventaId: venta.id,
                motivo,
                items,
            })
            .subscribe({
                next: (dev) => {
                    this.registrandoDevolucion.set(false);
                    this.cerrarModalDevolucion();
                    this.mensajeExito.set(
                        `Devolución #${dev.id} registrada en Caja #${dev.cajaId}. Stock repuesto y monto descontado de caja.`,
                    );
                    this.cargarHistorialVentas();
                    this.cargarCaja();
                    this.busqueda$.next(this.textoBusqueda());
                },
                error: (err: unknown) => {
                    this.registrandoDevolucion.set(false);
                    this.manejarError(err, 'No se pudo registrar la devolución.');
                },
            });
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
