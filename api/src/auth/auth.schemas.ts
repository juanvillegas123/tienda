import { z } from 'zod';

export const loginSchema = z
    .object({
        usuario: z.string().min(1, 'El usuario es requerido').trim(),
        contrasena: z.string().min(1, 'La contraseña es requerida'),
    })
    .strict();

export const cambiarUsuarioSchema = z
    .object({
        nuevoUsuario: z
            .string()
            .trim()
            .min(3, 'El usuario debe tener al menos 3 caracteres')
            .max(30, 'El usuario no puede superar 30 caracteres')
            .regex(
                /^[a-zA-Z0-9._-]+$/,
                'Solo se permiten letras, números, puntos, guiones y guion bajo (sin espacios)',
            ),
        contrasenaActual: z.string().min(1, 'Ingresa tu contraseña actual para confirmar'),
    })
    .strict();

export const cambiarContrasenaSchema = z
    .object({
        contrasenaActual: z.string().min(1, 'Ingresa tu contraseña actual'),
        nuevaContrasena: z
            .string()
            .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
            .max(100, 'La contraseña es demasiado larga')
            .regex(/[A-Z]/, 'Debe incluir al menos una letra mayúscula')
            .regex(/[a-z]/, 'Debe incluir al menos una letra minúscula')
            .regex(/[0-9]/, 'Debe incluir al menos un número'),
    })
    .strict();

export type LoginDto = z.infer<typeof loginSchema>;
export type CambiarUsuarioDto = z.infer<typeof cambiarUsuarioSchema>;
export type CambiarContrasenaDto = z.infer<typeof cambiarContrasenaSchema>;
