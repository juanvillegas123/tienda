import { z } from 'zod';

const itemCrearPedidoSchema = z
    .object({
        productoId: z.number().int().positive('El ID del producto debe ser positivo'),
        cantidad: z.number().int().min(1, 'La cantidad mínima es 1').max(999, 'Cantidad excesiva'),
        notaCliente: z.string().trim().max(200, 'La nota no puede exceder 200 caracteres').optional().nullable(),
    })
    .strict();

export const crearPedidoSchema = z
    .object({
        nombreCliente: z
            .string()
            .trim()
            .min(2, 'Ingresa tu nombre (mínimo 2 caracteres)')
            .max(120, 'El nombre no puede exceder 120 caracteres'),
        telefonoCliente: z
            .string()
            .trim()
            .max(30, 'El teléfono no puede exceder 30 caracteres')
            .optional()
            .nullable(),
        items: z
            .array(itemCrearPedidoSchema)
            .min(1, 'El pedido debe tener al menos un producto')
            .max(50, 'Máximo 50 productos por pedido')
            .refine(
                (items) => new Set(items.map((i) => i.productoId)).size === items.length,
                'No se pueden repetir productos en el mismo pedido',
            ),
    })
    .strict();

export const listarPedidosQuerySchema = z
    .object({
        estado: z.enum(['PENDIENTE', 'CONFIRMADO', 'CANCELADO']).optional(),
    })
    .strict();

const itemAjustadoSchema = z
    .object({
        productoId: z.number().int().positive('El ID del producto debe ser positivo'),
        cantidad: z.number().int().min(0, 'La cantidad no puede ser negativa').max(999, 'Cantidad excesiva'),
    })
    .strict();

export const confirmarPedidoSchema = z
    .object({
        metodoPago: z.enum(['EFECTIVO', 'QR'], {
            message: 'El método de pago debe ser EFECTIVO o QR',
        }),
        itemsAjustados: z
            .array(itemAjustadoSchema)
            .max(50)
            .refine(
                (items) => new Set(items.map((i) => i.productoId)).size === items.length,
                'No se pueden repetir productos en los ajustes',
            )
            .optional(),
    })
    .strict();

export type CrearPedidoDto = z.infer<typeof crearPedidoSchema>;
export type ListarPedidosQueryDto = z.infer<typeof listarPedidosQuerySchema>;
export type ConfirmarPedidoDto = z.infer<typeof confirmarPedidoSchema>;
