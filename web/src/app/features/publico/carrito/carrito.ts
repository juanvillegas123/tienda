import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CarritoService } from '../../../core/carrito.service';
import { PedidosService } from '../../../core/pedidos.service';
import { ConfiguracionService } from '../../../core/configuracion.service';
import { ItemCarrito, PedidoCreadoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';
import { esNotaTallaVisible, rutaProducto } from '../../../shared/catalogo-ui.utils';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-carrito-publico',
    standalone: true,
    imports: [RouterLink, ReactiveFormsModule, BsPipe, EstadoVacioComponent],
    templateUrl: './carrito.html',
})
export class CarritoComponent implements OnInit {
    readonly carrito = inject(CarritoService);
    private readonly pedidosService = inject(PedidosService);
    private readonly configuracionService = inject(ConfiguracionService);
    private readonly fb = inject(FormBuilder);

    readonly esNotaTallaVisible = esNotaTallaVisible;
    readonly rutaProducto = rutaProducto;

    readonly aviso = signal<string | null>(null);
    readonly confirmandoVaciar = signal(false);
    readonly enviando = signal(false);
    readonly whatsappNumero = signal<string>(environment.whatsappNumero);

    // Estado de confirmación tras enviar el pedido exitosamente
    readonly pedidoConfirmado = signal<PedidoCreadoPublico | null>(null);
    readonly urlWhatsappGenerada = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        nombreCliente: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120)]],
        telefonoCliente: ['', [Validators.maxLength(30)]],
    });

    ngOnInit(): void {
        this.configuracionService.obtenerWhatsapp().subscribe({
            next: (numero) => this.whatsappNumero.set(numero),
        });
    }

    campoInvalido(campo: 'nombreCliente' | 'telefonoCliente'): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    cambiarCantidad(item: ItemCarrito, delta: number): void {
        this.aviso.set(null);
        const res = this.carrito.actualizarCantidad(item.productoId, item.cantidad + delta);
        if (!res.ok) {
            this.aviso.set(res.mensaje);
        }
    }

    actualizarNota(item: ItemCarrito, event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.carrito.actualizarNota(item.productoId, valor);
    }

    eliminar(productoId: number): void {
        this.aviso.set(null);
        this.carrito.eliminar(productoId);
    }

    vaciarCarrito(): void {
        this.carrito.vaciar();
        this.confirmandoVaciar.set(false);
        this.aviso.set(null);
    }

    enviarPedido(): void {
        if (this.carrito.items().length === 0) return;

        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        if (this.enviando()) return;

        this.enviando.set(true);
        this.aviso.set(null);

        const { nombreCliente, telefonoCliente } = this.form.getRawValue();
        const payload = {
            nombreCliente: nombreCliente.trim(),
            telefonoCliente: telefonoCliente.trim().length > 0 ? telefonoCliente.trim() : null,
            items: this.carrito.items().map((i) => ({
                productoId: i.productoId,
                cantidad: i.cantidad,
                notaCliente: i.notaCliente.trim().length > 0 ? i.notaCliente.trim() : null,
            })),
        };

        this.pedidosService.crear(payload).subscribe({
            next: (pedido) => {
                const url = this.construirUrlWhatsapp(pedido);
                this.urlWhatsappGenerada.set(url);
                this.pedidoConfirmado.set(pedido);
                this.carrito.vaciar();
                this.form.reset();
                this.enviando.set(false);

                // Abrir WhatsApp en nueva pestaña (si el navegador bloquea popup, queda el botón en la confirmación)
                window.open(url, '_blank', 'noopener,noreferrer');
            },
            error: (err: unknown) => {
                this.enviando.set(false);
                if (err instanceof HttpErrorResponse) {
                    const body = err.error as Record<string, unknown> | null;
                    this.aviso.set(
                        (body?.['mensaje'] as string) ??
                            'No se pudo registrar tu pedido. Revisa el stock e intenta nuevamente.',
                    );
                } else {
                    this.aviso.set('Ocurrió un error al enviar tu pedido. Intenta nuevamente.');
                }
            },
        });
    }

    private construirUrlWhatsapp(pedido: PedidoCreadoPublico): string {
        const lineas: string[] = [
            `¡Hola! Quiero confirmar mi pedido *${pedido.codigo}*`,
            `Cliente: ${pedido.nombreCliente}`,
        ];

        if (pedido.telefonoCliente) {
            lineas.push(`Teléfono: ${pedido.telefonoCliente}`);
        }

        lineas.push('', '*Detalle del pedido:*');

        for (const item of pedido.items) {
            const subtotalBs = this.formatearBs(item.subtotalCentavos);
            let linea = `• ${item.cantidad}x ${item.nombreProducto} — ${subtotalBs}`;
            if (item.notaCliente) {
                linea += ` (Nota: ${item.notaCliente})`;
            }
            lineas.push(linea);
        }

        lineas.push('', `*Total:* ${this.formatearBs(pedido.totalCentavos)}`);

        const numero = this.whatsappNumero().replace(/\D/g, '') || environment.whatsappNumero;
        return `https://wa.me/${numero}?text=${encodeURIComponent(lineas.join('\n'))}`;
    }

    private formatearBs(centavos: number): string {
        const bolivianos = centavos / 100;
        return `Bs. ${bolivianos.toLocaleString('es-BO', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    }
}
