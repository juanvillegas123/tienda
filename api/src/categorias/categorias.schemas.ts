import { z } from 'zod';

export const crearCategoriaSchema = z
    .object({
        nombre: z
            .string()
            .min(1, 'El nombre es requerido')
            .max(100, 'El nombre no puede exceder 100 caracteres')
            .trim(),
        slug: z
            .string()
            .max(100, 'El slug no puede exceder 100 caracteres')
            .trim()
            .optional(),
    })
    .strict();

export const editarCategoriaSchema = z
    .object({
        nombre: z
            .string()
            .min(1, 'El nombre no puede estar vacío')
            .max(100, 'El nombre no puede exceder 100 caracteres')
            .trim()
            .optional(),
        slug: z
            .string()
            .max(100, 'El slug no puede exceder 100 caracteres')
            .trim()
            .optional(),
        activa: z.boolean().optional(),
    })
    .strict();

export type CrearCategoriaDto = z.infer<typeof crearCategoriaSchema>;
export type EditarCategoriaDto = z.infer<typeof editarCategoriaSchema>;
