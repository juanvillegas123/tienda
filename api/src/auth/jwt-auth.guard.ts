import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { FastifyRequest } from 'fastify';
import { IS_PUBLIC_KEY } from './public.decorator';

export interface JwtPayload {
    sub: number;
    usuario: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
    constructor(
        private readonly jwtService: JwtService,
        private readonly reflector: Reflector,
    ) {}

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<FastifyRequest>();
        const token = (request.cookies as Record<string, string>)['sesion'];

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
