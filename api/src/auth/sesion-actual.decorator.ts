import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { FastifyRequest } from 'fastify';
import { JwtPayload } from './jwt-auth.guard';

export const SesionActual = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): JwtPayload => {
        const request = ctx.switchToHttp().getRequest<FastifyRequest & { administradora: JwtPayload }>();
        return request.administradora;
    },
);
