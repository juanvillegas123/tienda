import { PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
    constructor(private readonly schema: ZodSchema) {}

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    transform(value: unknown, _metadata: ArgumentMetadata) {
        const result = this.schema.safeParse(value);
        if (!result.success) {
            // Zod v4 usa .issues; v3 usaba .errors (alias). Soportamos ambas.
            const issues = result.error.issues ?? [];
            const mensajes = issues.map((e) => `${e.path.join('.')}: ${e.message}`);
            const detalle = mensajes.length > 0 ? `: ${mensajes.join('; ')}` : '';
            throw new BadRequestException({
                mensaje: `Datos inválidos${detalle}`,
                errores: mensajes,
            });
        }
        return result.data;
    }
}
