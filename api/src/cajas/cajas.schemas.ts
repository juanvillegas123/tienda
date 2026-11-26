import { z } from 'zod';

const MAX_MONTO_CENTAVOS = 100_000_000; // Bs. 1.000.000,00

export const abrirCajaSchema = z
    .object({
        montoInicialCentavos: z
            .number()
            .int('El monto inicial debe ser un entero en centavos')
            .min(0, 'El monto inicial no puede ser negativo')
            .max(MAX_MONTO_CENTAVOS, 'El monto inicial excede el límite permitido'),
    })
    .strict();

export const cerrarCajaSchema = z
    .object({
        efectivoContadoCentavos: z
            .number()
            .int('El efectivo contado debe ser un entero en centavos')
            .min(0, 'El efectivo contado no puede ser negativo')
            .max(MAX_MONTO_CENTAVOS, 'El efectivo contado excede el límite permitido'),
    })
    .strict();

export type AbrirCajaDto = z.infer<typeof abrirCajaSchema>;
export type CerrarCajaDto = z.infer<typeof cerrarCajaSchema>;
