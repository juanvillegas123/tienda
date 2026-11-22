import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';

function crearContexto(req: Record<string, unknown>): ExecutionContext {
    return {
        getHandler: () => ({}),
        getClass: () => ({}),
        switchToHttp: () => ({
            getRequest: () => req,
        }),
    } as unknown as ExecutionContext;
}

describe('JwtAuthGuard (sesión JWT y protección CSRF X-Requested-With)', () => {
    let guard: JwtAuthGuard;
    let jwtService: { verify: jest.Mock };
    let reflector: { getAllAndOverride: jest.Mock };

    beforeEach(() => {
        jwtService = { verify: jest.fn() };
        reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
        guard = new JwtAuthGuard(
            jwtService as unknown as JwtService,
            reflector as unknown as Reflector,
        );
    });

    it('permite rutas @Public() con método GET sin cookie ni encabezado CSRF', () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const ctx = crearContexto({ method: 'GET', headers: {}, cookies: {} });
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rechaza mutaciones (POST/PATCH/DELETE) sin encabezado X-Requested-With con 403', () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const ctxPost = crearContexto({ method: 'POST', headers: {}, cookies: {} });
        expect(() => guard.canActivate(ctxPost)).toThrow(ForbiddenException);

        reflector.getAllAndOverride.mockReturnValue(false);
        const ctxPatch = crearContexto({
            method: 'PATCH',
            headers: {},
            cookies: { sesion: 'token-valido' },
        });
        expect(() => guard.canActivate(ctxPatch)).toThrow(ForbiddenException);
    });

    it('permite @Public() POST cuando lleva X-Requested-With', () => {
        reflector.getAllAndOverride.mockReturnValue(true);
        const ctx = crearContexto({
            method: 'POST',
            headers: { 'x-requested-with': 'XMLHttpRequest' },
            cookies: {},
        });
        expect(guard.canActivate(ctx)).toBe(true);
    });

    it('rechaza rutas de administración sin cookie de sesión con 401', () => {
        const ctx = crearContexto({ method: 'GET', headers: {}, cookies: {} });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('rechaza rutas de administración con token inválido o expirado con 401', () => {
        jwtService.verify.mockImplementation(() => {
            throw new Error('jwt expired');
        });
        const ctx = crearContexto({
            method: 'GET',
            headers: {},
            cookies: { sesion: 'token-expirado' },
        });
        expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
    });

    it('permite rutas privadas con cookie válida y adjunta administradora al request', () => {
        const payload = { sub: 1, usuario: 'admin' };
        jwtService.verify.mockReturnValue(payload);
        const req: Record<string, unknown> = {
            method: 'POST',
            headers: { 'x-requested-with': 'XMLHttpRequest' },
            cookies: { sesion: 'token-ok' },
        };
        const ctx = crearContexto(req);

        expect(guard.canActivate(ctx)).toBe(true);
        expect(req['administradora']).toEqual(payload);
    });
});
