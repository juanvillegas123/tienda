import { z } from 'zod';

export const abrirCajaSchema = z
    .object({
        montoInicialCentavos: z.coerce
            .number()
            .int('El monto inicial debe ser un entero en centavos')
            .min(0, 'El monto inicial no puede ser negativo'),
    })
    .strict();

export const cerrarCajaSchema = z
    .object({
        efectivoContadoCentavos: z.coerce
            .number()
            .int('El efectivo contado debe ser un entero en centavos')
            .min(0, 'El efectivo contado no puede ser negativo'),
    })
    .strict();

export type AbrirCajaDto = z.infer<typeof abrirCajaSchema>;
export type CerrarCajaDto = z.infer<typeof cerrarCajaSchema>;
