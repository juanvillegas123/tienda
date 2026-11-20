import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { PedidosService } from '../../../core/pedidos.service';
import { ConfiguracionService } from '../../../core/configuracion.service';
import {
    PedidoResumen,
    PedidoDetalle,
    EstadoPedido,
    MetodoPago,
} from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';

type PestanaEstado = EstadoPedido | 'TODOS';

@Component({
    selector: 'app-pedidos-admin',
    standalone: true,
    imports: [DatePipe, ReactiveFormsModule, BsPipe],
    templateUrl: './pedidos.html',
})
export class PedidosAdminComponent implements OnInit {
    private readonly pedidosService = inject(PedidosService);
    private readonly configuracionService = inject(ConfiguracionService);
    private readonly fb = inject(FormBuilder);

    readonly pedidos = signal<PedidoResumen[]>([]);
    readonly pestanaActiva = signal<PestanaEstado>('PENDIENTE');
    readonly cargando = signal(true);

    // Detalle y confirmación
    readonly pedidoSeleccionado = signal<PedidoDetalle | null>(null);
    readonly cargandoDetalle = signal(false);
    readonly procesando = signal(false);
    readonly metodoPago = signal<MetodoPago>('EFECTIVO');
    readonly cantidadesEditadas = signal<Record<number, number>>({});
    readonly accionConfirmacion = signal<'CONFIRMAR' | 'CANCELAR' | null>(null);

    // Configuración de WhatsApp de la tienda
    readonly whatsappActual = signal<string>('');
    readonly editandoWhatsapp = signal(false);
    readonly guardandoWhatsapp = signal(false);
    readonly formWhatsapp = this.fb.nonNullable.group({
        whatsappNumero: [
            '',
            [Validators.required, Validators.pattern(/^\d{8,15}$/)],
        ],
    });

    // Mensajes globales
    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);
    readonly errorModal = signal<string | null>(null);

    readonly pestanas: { id: PestanaEstado; etiqueta: string }[] = [
        { id: 'PENDIENTE', etiqueta: 'Pendientes' },
        { id: 'CONFIRMADO', etiqueta: 'Confirmados' },
        { id: 'CANCELADO', etiqueta: 'Cancelados' },
        { id: 'TODOS', etiqueta: 'Todos' },
    ];

    readonly totalCalculadoModal = computed(() => {
        const pedido = this.pedidoSeleccionado();
        if (!pedido) return 0;
        const mapa = this.cantidadesEditadas();
        return pedido.items.reduce((acc, item) => {
            const cant = mapa[item.productoId] ?? item.cantidad;
            return acc + item.precioCentavos * cant;
        }, 0);
    });

    readonly tieneAlgunItemActivo = computed(() => {
        const pedido = this.pedidoSeleccionado();
        if (!pedido) return false;
        const mapa = this.cantidadesEditadas();
        return pedido.items.some((i) => (mapa[i.productoId] ?? i.cantidad) > 0);
    });

    readonly tieneConflictoStock = computed(() => {
        const pedido = this.pedidoSeleccionado();
        if (!pedido || pedido.estado !== 'PENDIENTE') return false;
        const mapa = this.cantidadesEditadas();
        return pedido.items.some((i) => {
            const cant = mapa[i.productoId] ?? i.cantidad;
            return cant > 0 && (!i.productoActivo || cant > i.stockActual);
        });
    });

    ngOnInit(): void {
        this.cargarPedidos();
        this.cargarWhatsapp();
    }

    cargarWhatsapp(): void {
        this.configuracionService.obtenerWhatsapp().subscribe({
            next: (numero) => {
                this.whatsappActual.set(numero);
                this.formWhatsapp.patchValue({ whatsappNumero: numero });
            },
        });
    }

    abrirEditorWhatsapp(): void {
        this.formWhatsapp.reset({ whatsappNumero: this.whatsappActual() });
        this.editandoWhatsapp.set(true);
    }

    guardarWhatsapp(): void {
        if (this.formWhatsapp.invalid) {
            this.formWhatsapp.markAllAsTouched();
            return;
        }
        this.guardandoWhatsapp.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        const numero = this.formWhatsapp.getRawValue().whatsappNumero.trim();
        this.configuracionService.actualizarWhatsapp(numero).subscribe({
            next: (res) => {
                this.whatsappActual.set(res.whatsappNumero);
                this.editandoWhatsapp.set(false);
                this.guardandoWhatsapp.set(false);
                this.mensajeExito.set(`Número de WhatsApp de la tienda actualizado a ${res.whatsappNumero}.`);
            },
            error: (err: unknown) => {
                this.guardandoWhatsapp.set(false);
                this.mensajeError.set(this.extraerMensajeError(err, 'No se pudo actualizar el número de WhatsApp.'));
            },
        });
    }

    cambiarPestana(pestana: PestanaEstado): void {
        this.pestanaActiva.set(pestana);
        this.cargarPedidos();
    }

    cargarPedidos(): void {
        this.cargando.set(true);
        const estado = this.pestanaActiva() === 'TODOS' ? undefined : (this.pestanaActiva() as EstadoPedido);
        this.pedidosService.listar(estado).subscribe({
            next: (lista) => {
                this.pedidos.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.mensajeError.set('No se pudieron cargar los pedidos.');
                this.cargando.set(false);
            },
        });
    }

    verDetalle(pedido: PedidoResumen): void {
        this.cargandoDetalle.set(true);
        this.errorModal.set(null);
        this.accionConfirmacion.set(null);
        this.metodoPago.set('EFECTIVO');

        this.pedidosService.obtenerPorId(pedido.id).subscribe({
            next: (detalle) => {
                this.pedidoSeleccionado.set(detalle);
                const mapa: Record<number, number> = {};
                for (const item of detalle.items) {
                    mapa[item.productoId] = item.cantidad;
                }
                this.cantidadesEditadas.set(mapa);
                this.cargandoDetalle.set(false);
            },
            error: () => {
                this.cargandoDetalle.set(false);
                this.mensajeError.set('No se pudo cargar el detalle del pedido.');
            },
        });
    }

    cerrarDetalle(): void {
        if (this.procesando()) return;
        this.pedidoSeleccionado.set(null);
        this.accionConfirmacion.set(null);
        this.errorModal.set(null);
    }

    actualizarCantidadItem(productoId: number, valor: number): void {
        const cant = Math.max(0, Math.trunc(Number.isNaN(valor) ? 0 : valor));
        this.cantidadesEditadas.update((actual) => ({
            ...actual,
            [productoId]: cant,
        }));
        this.errorModal.set(null);
    }

    cantidadItem(productoId: number, fallback: number): number {
        return this.cantidadesEditadas()[productoId] ?? fallback;
    }

    ejecutarConfirmacion(): void {
        const pedido = this.pedidoSeleccionado();
        if (!pedido || this.procesando()) return;

        this.procesando.set(true);
        this.errorModal.set(null);

        const mapa = this.cantidadesEditadas();
        const itemsAjustados = pedido.items.map((i) => ({
            productoId: i.productoId,
            cantidad: mapa[i.productoId] ?? i.cantidad,
        }));

        this.pedidosService
            .confirmar(pedido.id, {
                metodoPago: this.metodoPago(),
                itemsAjustados,
            })
            .subscribe({
                next: ({ pedido: confirmado }) => {
                    this.procesando.set(false);
                    this.pedidoSeleccionado.set(null);
                    this.accionConfirmacion.set(null);
                    this.mensajeExito.set(
                        `Pedido ${confirmado.codigo} confirmado. Se registró la venta ONLINE y se descontó el stock.`,
                    );
                    this.cargarPedidos();
                },
                error: (err: unknown) => {
                    this.procesando.set(false);
                    this.accionConfirmacion.set(null);
                    this.errorModal.set(
                        this.extraerMensajeError(err, 'No se pudo confirmar el pedido.'),
                    );
                },
            });
    }

    ejecutarCancelacion(): void {
        const pedido = this.pedidoSeleccionado();
        if (!pedido || this.procesando()) return;

        this.procesando.set(true);
        this.errorModal.set(null);

        this.pedidosService.cancelar(pedido.id).subscribe({
            next: (cancelado) => {
                this.procesando.set(false);
                this.pedidoSeleccionado.set(null);
                this.accionConfirmacion.set(null);
                this.mensajeExito.set(
                    `Pedido ${cancelado.codigo} cancelado. El stock no fue modificado.`,
                );
                this.cargarPedidos();
            },
            error: (err: unknown) => {
                this.procesando.set(false);
                this.accionConfirmacion.set(null);
                this.errorModal.set(
                    this.extraerMensajeError(err, 'No se pudo cancelar el pedido.'),
                );
            },
        });
    }

    private extraerMensajeError(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            return (body?.['mensaje'] as string) ?? fallback;
        }
        return fallback;
    }
}
