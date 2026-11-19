import { z } from 'zod';

export const crearProveedorSchema = z
    .object({
        nombre: z
            .string()
            .min(1, 'El nombre es requerido')
            .max(150, 'El nombre no puede exceder 150 caracteres')
            .trim(),
        contacto: z.string().max(100).trim().optional().nullable(),
        telefono: z.string().max(30).trim().optional().nullable(),
        correo: z.string().email('Correo electrónico no válido').max(100).trim().optional().nullable(),
    })
    .strict();

export const editarProveedorSchema = crearProveedorSchema
    .partial()
    .extend({
        activo: z.boolean().optional(),
    })
    .strict();

export type CrearProveedorDto = z.infer<typeof crearProveedorSchema>;
export type EditarProveedorDto = z.infer<typeof editarProveedorSchema>;
