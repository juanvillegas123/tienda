import { z } from 'zod';

export const loginSchema = z
    .object({
        usuario: z.string().min(1, 'El usuario es requerido').trim(),
        contrasena: z.string().min(1, 'La contraseña es requerida'),
    })
    .strict();

export type LoginDto = z.infer<typeof loginSchema>;
