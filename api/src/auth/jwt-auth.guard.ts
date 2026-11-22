import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
    sub: number;
    usuario: string;
}

const METODOS_MUTACION = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest<FastifyRequest>();

        // Protección CSRF ligera (sección 5.2): exigir encabezado personalizado en mutaciones
        const metodo = (request.method ?? 'GET').toUpperCase();
        if (METODOS_MUTACION.has(metodo)) {
            const headerCsrf = request.headers?.['x-requested-with'];
            const valor = Array.isArray(headerCsrf) ? headerCsrf[0] : headerCsrf;
            if (!valor || valor.trim().length === 0) {
                throw new ForbiddenException(
                    'Solicitud rechazada: falta encabezado de seguridad X-Requested-With.',
                );
            }
        }

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const token = (request.cookies as Record<string, string> | undefined)?.['sesion'];

        if (!token) {
            throw new UnauthorizedException('Sesión requerida');
        }

        try {
            const payload = this.jwtService.verify<JwtPayload>(token);
            (request as FastifyRequest & { administradora: JwtPayload }).administradora = payload;
            return true;
        } catch {
            throw new UnauthorizedException('Sesión inválida o expirada');
        }
    }
}
