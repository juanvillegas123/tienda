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
    googleMapsEmbedUrl:
        'https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d235.7158547159913!2d-65.2600182!3d-19.0437808!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93fbcf003b6cc3db%3A0xa2c7c98ef0e35c50!2sONNI%20CHAN%20STORE!5e0!3m2!1ses!2sbo!4v1795318632150!5m2!1ses!2sbo',
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
            pregunta: '¿Cómo funciona mi pedido por WhatsApp?',
            respuesta:
                'Al enviar tu carrito se genera un código rápido para atenderte sin demoras. Por WhatsApp te confirmamos disponibilidad, resolvemos cualquier duda sobre el producto y coordinamos el pago y la entrega antes de concretar tu compra.',
        },
    ] satisfies PreguntaFrecuenteNegocio[],
} as const;
