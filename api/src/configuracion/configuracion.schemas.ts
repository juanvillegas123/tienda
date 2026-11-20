import { z } from 'zod';

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

export type ActualizarWhatsappDto = z.infer<typeof actualizarWhatsappSchema>;
