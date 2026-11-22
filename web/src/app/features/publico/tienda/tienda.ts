import { Component, ElementRef, OnInit, computed, effect, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ConfiguracionService } from '../../../core/configuracion.service';

interface PreguntaFrecuente {
    pregunta: string;
    respuesta: string;
}

@Component({
    selector: 'app-tienda-publica',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './tienda.html',
})
export class TiendaPublicaComponent implements OnInit {
    private readonly configService = inject(ConfiguracionService);

    readonly info = this.configService.infoTienda;
    readonly direccionCopiada = signal(false);
    readonly preguntaAbierta = signal<number | null>(0);
    private readonly mapaIframe = viewChild<ElementRef<HTMLIFrameElement>>('mapaIframe');

    readonly enlaceWhatsapp = computed(() => {
        const num = this.info().whatsappNumero?.replace(/\D/g, '') || '';
        if (!num) return null;
        const msg = encodeURIComponent(
            'Hola Onii-Chan Store, tengo una consulta sobre sus productos.',
        );
        return `https://wa.me/${num}?text=${msg}`;
    });

    readonly mapaEmbedValido = computed(() => {
        const url = this.info().googleMapsEmbedUrl?.trim() || '';
        return /^https:\/\/(www\.)?google\.com\/maps\/embed[^\s]*$/i.test(url) ? url : null;
    });

    /**
     * Calcula si la tienda está dentro del horario estándar (Lun–Sáb 12:30–20:00 hora local).
     */
    readonly abiertoAhora = computed(() => {
        const ahora = new Date();
        const dia = ahora.getDay(); // 0 = Domingo, 1..6 = Lun..Sáb
        if (dia === 0) return false;
        const minutos = ahora.getHours() * 60 + ahora.getMinutes();
        return minutos >= 12 * 60 + 30 && minutos < 20 * 60;
    });

    readonly preguntas: PreguntaFrecuente[] = [
        {
            pregunta: '¿Cómo elijo o confirmo mi talla en poleras?',
            respuesta:
                'En cada polera o prenda verás las tallas disponibles. Al agregarla al carrito, escribe la talla que deseas en la nota del producto; al recibir tu pedido por WhatsApp te confirmamos disponibilidad exacta antes del pago.',
        },
        {
            pregunta: '¿Qué métodos de pago aceptan?',
            respuesta:
                'Aceptamos pagos en efectivo y por transferencia QR, tanto en nuestra tienda física en Calle Loa #406 como en pedidos coordinados por WhatsApp.',
        },
        {
            pregunta: '¿Puedo recoger mi pedido en tienda o hacen envíos?',
            respuesta:
                'Puedes recoger tu pedido directamente en nuestra tienda física en Sucre (Calle Loa #406) o coordinar entrega / envío al confirmar tu código de pedido por WhatsApp.',
        },
        {
            pregunta: '¿Al enviar mi pedido por WhatsApp se reserva el stock?',
            respuesta:
                'Tu pedido recibe un código único (ej. PED-0001) para agilizar la atención. El stock se descuenta y asegura en el momento en que confirmas tu compra con nosotros por WhatsApp.',
        },
    ];

    constructor() {
        effect(() => {
            const url = this.mapaEmbedValido();
            const iframe = this.mapaIframe()?.nativeElement;
            if (url && iframe && iframe.src !== url) {
                iframe.src = url;
            }
        });
    }

    ngOnInit(): void {
        this.configService.cargarInfoTienda().subscribe();
    }

    alternarPregunta(idx: number): void {
        this.preguntaAbierta.update((actual) => (actual === idx ? null : idx));
    }

    async copiarDireccion(): Promise<void> {
        const i = this.info();
        const texto = `${i.direccion}, ${i.ciudad}`;
        try {
            await navigator.clipboard.writeText(texto);
            this.direccionCopiada.set(true);
            setTimeout(() => this.direccionCopiada.set(false), 2500);
        } catch {
            // Fallback silencioso si el navegador bloquea clipboard
        }
    }
}
