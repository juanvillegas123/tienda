import { z } from 'zod';

const fechaIsoRegex = /^\d{4}-\d{2}-\d{2}$/;

const fechaOpcionalSchema = z
    .string()
    .trim()
    .regex(fechaIsoRegex, 'La fecha debe tener formato AAAA-MM-DD')
    .optional();

export const rangoFechasSchema = z
    .object({
        desde: fechaOpcionalSchema,
        hasta: fechaOpcionalSchema,
    })
    .strict()
    .refine(
        (data) => {
            if (data.desde && data.hasta) {
                return data.desde <= data.hasta;
            }
            return true;
        },
        { message: 'La fecha "desde" no puede ser posterior a la fecha "hasta"' },
    );

export const masVendidosQuerySchema = z
    .object({
        desde: fechaOpcionalSchema,
        hasta: fechaOpcionalSchema,
        limite: z.coerce.number().int().min(1).max(100).default(20),
    })
    .strict()
    .refine(
        (data) => {
            if (data.desde && data.hasta) {
                return data.desde <= data.hasta;
            }
            return true;
        },
        { message: 'La fecha "desde" no puede ser posterior a la fecha "hasta"' },
    );

export type RangoFechasDto = z.infer<typeof rangoFechasSchema>;
export type MasVendidosQueryDto = z.infer<typeof masVendidosQuerySchema>;
