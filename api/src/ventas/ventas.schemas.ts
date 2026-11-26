import { z } from 'zod';

export const itemVentaSchema = z
    .object({
        productoId: z.number().int().positive('Producto inválido'),
        cantidad: z
            .number()
            .int('La cantidad debe ser entera')
            .min(1, 'La cantidad mínima es 1')
            .max(999, 'La cantidad máxima por producto es 999'),
    })
    .strict();

export const crearVentaSchema = z
    .object({
        metodoPago: z.enum(['EFECTIVO', 'QR']),
        items: z
            .array(itemVentaSchema)
            .min(1, 'Agrega al menos un producto a la venta')
            .max(100, 'Demasiados productos en una sola venta'),
    })
    .strict();

export const listarVentasQuerySchema = z
    .object({
        canal: z.enum(['MOSTRADOR', 'ONLINE']).optional(),
        cajaId: z.coerce.number().int().positive().optional(),
        limite: z.coerce.number().int().min(1).max(200).default(50),
    })
    .strict();

export type CrearVentaDto = z.infer<typeof crearVentaSchema>;
export type ListarVentasQueryDto = z.infer<typeof listarVentasQuerySchema>;
