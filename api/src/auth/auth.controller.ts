import {
    Controller,
    Post,
    Get,
    Patch,
    Body,
    Res,
    HttpCode,
    HttpStatus,
    UsePipes,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { AuthService } from './auth.service';
import { loginSchema, cambiarUsuarioSchema, cambiarContrasenaSchema } from './auth.schemas';
import type { LoginDto, CambiarUsuarioDto, CambiarContrasenaDto } from './auth.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from './public.decorator';
import { SesionActual } from './sesion-actual.decorator';
import type { JwtPayload } from './jwt-auth.guard';

const COOKIE_NOMBRE = 'sesion';
const COOKIE_MAX_AGE = 10 * 60 * 60; // 10 horas en segundos

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @UsePipes(new ZodValidationPipe(loginSchema))
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) reply: FastifyReply) {
        const token = await this.authService.login(dto);

        const isProduction = process.env.NODE_ENV === 'production';
        void reply.setCookie(COOKIE_NOMBRE, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') ?? 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });

        return { mensaje: 'Sesión iniciada' };
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    logout(@Res({ passthrough: true }) reply: FastifyReply) {
        void reply.clearCookie(COOKIE_NOMBRE, { path: '/' });
        return { mensaje: 'Sesión cerrada' };
    }

    @Get('me')
    async me(@SesionActual() sesion: JwtPayload) {
        return this.authService.me(sesion.sub);
    }

    @Patch('perfil/usuario')
    @HttpCode(HttpStatus.OK)
    async cambiarUsuario(
        @SesionActual() sesion: JwtPayload,
        @Body(new ZodValidationPipe(cambiarUsuarioSchema)) dto: CambiarUsuarioDto,
        @Res({ passthrough: true }) reply: FastifyReply,
    ) {
        const { usuario, token } = await this.authService.cambiarUsuario(sesion.sub, dto);

        const isProduction = process.env.NODE_ENV === 'production';
        void reply.setCookie(COOKIE_NOMBRE, token, {
            httpOnly: true,
            secure: isProduction,
            sameSite: (process.env.COOKIE_SAME_SITE as 'strict' | 'lax' | 'none') ?? 'lax',
            path: '/',
            maxAge: COOKIE_MAX_AGE,
        });

        return { usuario, mensaje: 'Usuario actualizado correctamente' };
    }

    @Patch('perfil/contrasena')
    @HttpCode(HttpStatus.OK)
    async cambiarContrasena(
        @SesionActual() sesion: JwtPayload,
        @Body(new ZodValidationPipe(cambiarContrasenaSchema)) dto: CambiarContrasenaDto,
    ) {
        await this.authService.cambiarContrasena(sesion.sub, dto);
        return { mensaje: 'Contraseña actualizada correctamente' };
    }
}
