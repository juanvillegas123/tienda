import { z } from 'zod';

const urlHttpsOpcional = z
    .string()
    .trim()
    .max(500, 'La URL es demasiado larga')
    .refine(
        (v) => v === '' || /^https:\/\/[^\s]+$/i.test(v),
        'Debe ser un enlace válido que comience con https://',
    );

const urlGoogleMapsEmbedOpcional = z
    .string()
    .trim()
    .max(1000, 'La URL del mapa embebido es demasiado larga')
    .refine(
        (v) => v === '' || /^https:\/\/(www\.)?google\.com\/maps\/embed[^\s]*$/i.test(v),
        'Solo se permiten enlaces embebidos oficiales de Google Maps (https://www.google.com/maps/embed...)',
    );

export const actualizarWhatsappSchema = z
    .object({
        whatsappNumero: z
            .string()
            .trim()
            .regex(
                /^\d{8,15}$/,
                'Ingresa solo dígitos con código de país (entre 8 y 15 dígitos, ej: 59170000000)',
            ),
    })
    .strict();

export const actualizarInfoTiendaSchema = z
    .object({
        descripcion: z.string().trim().min(5, 'La descripción es requerida').max(400),
        direccion: z.string().trim().min(3, 'La dirección es requerida').max(200),
        referencia: z.string().trim().max(200),
        ciudad: z.string().trim().min(2, 'La ciudad es requerida').max(100),
        horarios: z.string().trim().min(3, 'Los horarios son requeridos').max(200),
        googleMapsUrl: urlHttpsOpcional,
        googleMapsEmbedUrl: urlGoogleMapsEmbedOpcional,
        instagramUrl: urlHttpsOpcional,
        instagramUsuario: z.string().trim().max(80),
        tiktokUrl: urlHttpsOpcional,
        tiktokUsuario: z.string().trim().max(80),
        facebookUrl: urlHttpsOpcional,
        facebookUsuario: z.string().trim().max(80),
    })
    .strict();

export type ActualizarWhatsappDto = z.infer<typeof actualizarWhatsappSchema>;
export type ActualizarInfoTiendaDto = z.infer<typeof actualizarInfoTiendaSchema>;
