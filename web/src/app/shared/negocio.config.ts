export interface PreguntaFrecuenteNegocio {
    pregunta: string;
    respuesta: string;
}

export interface HorarioEstructurado {
    zonaHoraria: 'America/La_Paz';
    /** 0 = Domingo, 1 = Lunes ... 6 = Sábado */
    diasAbiertos: number[];
    horaApertura: number;
    minutoApertura: number;
    horaCierre: number;
    minutoCierre: number;
    schemaDias: string[];
    opens: string;
    closes: string;
}

export const NEGOCIO_CONFIG = {
    nombre: 'Onii-Chan Store',
    lema: 'Calidad en figuras',
    descripcion:
        'Tienda especializada en figuras de colección, poleras, peluches, pines y accesorios anime seleccionados para tu vitrina.',
    direccion: 'Calle Loa #406',
    referencia: 'Zona céntrica — Sucre',
    ciudad: 'Sucre, Bolivia',
    localidad: 'Sucre',
    region: 'Chuquisaca',
    paisCodigo: 'BO',
    horarios: 'Lunes a Sábado de 12:30 a 20:00',
    notaHorarios: 'Domingos cerrado · Pedidos online disponibles 24/7',
    horarioEstructurado: {
        zonaHoraria: 'America/La_Paz',
        diasAbiertos: [1, 2, 3, 4, 5, 6],
        horaApertura: 12,
        minutoApertura: 30,
        horaCierre: 20,
        minutoCierre: 0,
        schemaDias: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
        ],
        opens: '12:30',
        closes: '20:00',
    } satisfies HorarioEstructurado,
    googleMapsUrl: 'https://maps.app.goo.gl/vD5J2k5nz5jXTPVb6',
    googleMapsEmbedUrl: '',
    redes: {
        instagramUrl: 'https://www.instagram.com/onii.chan_store.bo',
        instagramUsuario: '@onii.chan_store.bo',
        tiktokUrl: 'https://www.tiktok.com/@onii.chan.store',
        tiktokUsuario: '@onii.chan.store',
        facebookUrl: 'https://www.facebook.com/profile.php?id=61553764629367',
        facebookUsuario: 'Onii-Chan Store',
    },
    preguntasFrecuentes: [
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
    ] satisfies PreguntaFrecuenteNegocio[],
} as const;
