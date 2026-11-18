import { loginSchema } from './auth.schemas';

describe('LoginSchema (Zod)', () => {
    it('debe validar credenciales válidas', () => {
        const resultado = loginSchema.safeParse({
            usuario: 'admin',
            contrasena: 'clave123',
        });
        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.data.usuario).toBe('admin');
            expect(resultado.data.contrasena).toBe('clave123');
        }
    });

    it('debe recortar espacios en blanco del usuario', () => {
        const resultado = loginSchema.safeParse({
            usuario: '  admin  ',
            contrasena: 'clave123',
        });
        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.data.usuario).toBe('admin');
        }
    });

    it('debe rechazar usuario vacío', () => {
        const resultado = loginSchema.safeParse({
            usuario: '',
            contrasena: 'clave123',
        });
        expect(resultado.success).toBe(false);
    });

    it('debe rechazar campos adicionales desconocidos (strict)', () => {
        const resultado = loginSchema.safeParse({
            usuario: 'admin',
            contrasena: 'clave123',
            extra: 'no-permitido',
        });
        expect(resultado.success).toBe(false);
    });
});
