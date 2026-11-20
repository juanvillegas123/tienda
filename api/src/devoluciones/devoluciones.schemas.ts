import { z } from 'zod';

export const itemDevolucionSchema = z
    .object({
        productoId: z.coerce.number().int().positive('Producto inválido'),
        cantidad: z.coerce
            .number()
            .int('La cantidad debe ser entera')
            .min(1, 'La cantidad mínima a devolver es 1'),
    })
    .strict();

export const crearDevolucionSchema = z
    .object({
        ventaId: z.coerce.number().int().positive('Venta inválida'),
        motivo: z
            .string()
            .trim()
            .min(3, 'Debes indicar el motivo de la devolución (mínimo 3 caracteres)')
            .max(500, 'El motivo no puede exceder 500 caracteres'),
        items: z
            .array(itemDevolucionSchema)
            .min(1, 'Selecciona al menos un producto para devolver')
            .max(100),
    })
    .strict();

export type CrearDevolucionDto = z.infer<typeof crearDevolucionSchema>;
