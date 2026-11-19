import { z } from 'zod';

export const crearProductoSchema = z
    .object({
        categoriaId: z.coerce.number().int().positive('La categoría debe ser un ID válido'),
        proveedorId: z.coerce.number().int().positive('El proveedor debe ser un ID válido').nullable().optional(),
        nombre: z
            .string()
            .min(1, 'El nombre es requerido')
            .max(200, 'El nombre no puede exceder 200 caracteres')
            .trim(),
        descripcion: z.string().max(2000).trim().nullable().optional(),
        precioCentavos: z.coerce
            .number()
            .int('El precio debe ser un número entero de centavos')
            .min(0, 'El precio no puede ser negativo'),
        costoCentavos: z.coerce
            .number()
            .int('El costo debe ser un número entero de centavos')
            .min(0, 'El costo no puede ser negativo')
            .default(0),
        stockInicial: z.coerce
            .number()
            .int('El stock debe ser un número entero')
            .min(0, 'El stock no puede ser negativo')
            .default(0),
        escala: z.string().max(50).trim().nullable().optional(),
        notaTalla: z.string().max(100).trim().nullable().optional(),
        imagenPrincipal: z.string().url('URL de imagen principal inválida').max(1000).nullable().optional().or(z.literal('')),
        imagenesAdicionales: z
            .array(z.string().url('URL de imagen adicional inválida').max(1000))
            .max(10, 'Máximo 10 imágenes adicionales')
            .default([]),
    })
    .strict();

export const editarProductoSchema = z
    .object({
        categoriaId: z.coerce.number().int().positive().optional(),
        proveedorId: z.coerce.number().int().positive().nullable().optional(),
        nombre: z
            .string()
            .min(1, 'El nombre no puede estar vacío')
            .max(200, 'El nombre no puede exceder 200 caracteres')
            .trim()
            .optional(),
        descripcion: z.string().max(2000).trim().nullable().optional(),
        precioCentavos: z.coerce
            .number()
            .int('El precio debe ser un número entero de centavos')
            .min(0, 'El precio no puede ser negativo')
            .optional(),
        costoCentavos: z.coerce
            .number()
            .int('El costo debe ser un número entero de centavos')
            .min(0, 'El costo no puede ser negativo')
            .optional(),
        stock: z.coerce
            .number()
            .int('El stock debe ser un número entero')
            .min(0, 'El stock no puede ser negativo')
            .optional(),
        escala: z.string().max(50).trim().nullable().optional(),
        notaTalla: z.string().max(100).trim().nullable().optional(),
        imagenPrincipal: z.string().url('URL de imagen principal inválida').max(1000).nullable().optional().or(z.literal('')),
        imagenesAdicionales: z
            .array(z.string().url('URL de imagen adicional inválida').max(1000))
            .max(10, 'Máximo 10 imágenes adicionales')
            .optional(),
        activo: z.boolean().optional(),
    })
    .strict();

export const filtroProductosSchema = z
    .object({
        categoriaId: z.coerce.number().int().positive().optional(),
        q: z.string().trim().optional(),
        activo: z
            .enum(['true', 'false', 'todos'])
            .optional()
            .transform((val) => {
                if (val === undefined || val === 'todos') return undefined;
                return val === 'true';
            }),
    })
    .strict();

export type CrearProductoDto = z.infer<typeof crearProductoSchema>;
export type EditarProductoDto = z.infer<typeof editarProductoSchema>;
export type FiltroProductosDto = z.infer<typeof filtroProductosSchema>;
