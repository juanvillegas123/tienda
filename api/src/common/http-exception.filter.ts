import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { FastifyReply } from 'fastify';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const reply = ctx.getResponse<FastifyReply>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let mensaje = 'Error interno del servidor';
        let errores: string[] | undefined;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const response = exception.getResponse();
            if (typeof response === 'string') {
                mensaje = response;
            } else if (typeof response === 'object' && response !== null) {
                const r = response as Record<string, unknown>;
                mensaje = (r['mensaje'] as string) ?? (r['message'] as string) ?? mensaje;
                if (Array.isArray(r['errores'])) {
                    errores = r['errores'] as string[];
                } else if (Array.isArray(r['message'])) {
                    errores = r['message'] as string[];
                }
            }
        }

        const body: Record<string, unknown> = { statusCode: status, mensaje };
        if (errores) body['errores'] = errores;

        void reply.status(status).send(body);
    }
}
