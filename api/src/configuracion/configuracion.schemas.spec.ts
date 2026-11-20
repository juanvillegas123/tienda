import { actualizarWhatsappSchema } from './configuracion.schemas';

describe('ConfiguracionSchemas (Zod)', () => {
    it('debe aceptar números válidos solo dígitos con código de país', () => {
        expect(actualizarWhatsappSchema.safeParse({ whatsappNumero: '59170000000' }).success).toBe(true);
        expect(actualizarWhatsappSchema.safeParse({ whatsappNumero: '  59176543210  ' }).success).toBe(true);
    });

    it('debe rechazar números con símbolos, letras o muy cortos', () => {
        expect(actualizarWhatsappSchema.safeParse({ whatsappNumero: '+59170000000' }).success).toBe(false);
        expect(actualizarWhatsappSchema.safeParse({ whatsappNumero: '591-7000-0000' }).success).toBe(false);
        expect(actualizarWhatsappSchema.safeParse({ whatsappNumero: '12345' }).success).toBe(false);
    });
});
