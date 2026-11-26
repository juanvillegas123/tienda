import { z } from 'zod';

const MAX_MONTO_CENTAVOS = 100_000_000;
const MAX_CANTIDAD_STOCK = 99_999;

export const crearEntradaInventarioSchema = z
    .object({
        productoId: z.coerce.number().int().positive('Selecciona un producto válido'),
        proveedorId: z.coerce
            .number()
            .int()
            .positive('Proveedor inválido')
            .nullable()
            .optional(),
        cantidad: z.coerce
            .number()
            .int('La cantidad debe ser un número entero')
            .min(1, 'La cantidad mínima de ingreso es 1')
            .max(MAX_CANTIDAD_STOCK, 'La cantidad excede el límite permitido'),
        costoCentavos: z.coerce
            .number()
            .int('El costo debe ser un número entero en centavos')
            .min(0, 'El costo no puede ser negativo')
            .max(MAX_MONTO_CENTAVOS, 'El costo excede el límite permitido'),
        nota: z.string().trim().max(500, 'La nota no puede exceder 500 caracteres').nullable().optional(),
    })
    .strict();

export const crearAjusteInventarioSchema = z
    .object({
        productoId: z.coerce.number().int().positive('Selecciona un producto válido'),
        nuevoStock: z.coerce
            .number()
            .int('El stock debe ser un número entero')
            .min(0, 'El stock no puede ser negativo')
            .max(MAX_CANTIDAD_STOCK, 'El stock excede el límite permitido'),
        nota: z
            .string()
            .trim()
            .min(3, 'Debes ingresar una nota explicando el ajuste (mínimo 3 caracteres)')
            .max(500, 'La nota no puede exceder 500 caracteres'),
    })
    .strict();

export const listarMovimientosQuerySchema = z
    .object({
        productoId: z.coerce.number().int().positive().optional(),
        tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION']).optional(),
        q: z.string().trim().max(120).optional(),
        orden: z.enum(['fecha-desc', 'fecha-asc']).default('fecha-desc'),
        limite: z.coerce.number().int().min(1).max(300).default(100),
    })
    .strict();

export type CrearEntradaInventarioDto = z.infer<typeof crearEntradaInventarioSchema>;
export type CrearAjusteInventarioDto = z.infer<typeof crearAjusteInventarioSchema>;
export type ListarMovimientosQueryDto = z.infer<typeof listarMovimientosQuerySchema>;
