import {
    Injectable,
    UnauthorizedException,
    InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { administradora } from '../db/schema';
import { LoginDto } from './auth.schemas';

const MAX_INTENTOS = 5;
const BLOQUEO_MINUTOS = 15;

@Injectable()
export class AuthService {
    constructor(private readonly jwtService: JwtService) {}

    async login(dto: LoginDto): Promise<string> {
        const [admin] = await db
            .select()
            .from(administradora)
            .where(eq(administradora.usuario, dto.usuario))
            .limit(1);

        // Mensaje genérico para no revelar si el usuario existe
        const mensajeGenerico = 'Credenciales inválidas';

        if (!admin) {
            // Hashear igual para evitar timing attacks
            await argon2.hash(dto.contrasena, { type: argon2.argon2id });
            throw new UnauthorizedException(mensajeGenerico);
        }

        // Verificar bloqueo
        if (admin.bloqueadaHasta && admin.bloqueadaHasta > new Date()) {
            throw new UnauthorizedException(
                'Cuenta bloqueada temporalmente. Intente más tarde.',
            );
        }

        let claveValida = false;
        try {
            claveValida = await argon2.verify(admin.contrasenaCifrada, dto.contrasena);
        } catch {
            throw new InternalServerErrorException('Error al verificar credenciales');
        }

        if (!claveValida) {
            const nuevosIntentos = admin.intentosFallidos + 1;
            const actualizacion: Partial<typeof admin> = {
                intentosFallidos: nuevosIntentos,
            };

            if (nuevosIntentos >= MAX_INTENTOS) {
                const hasta = new Date();
                hasta.setMinutes(hasta.getMinutes() + BLOQUEO_MINUTOS);
                actualizacion.bloqueadaHasta = hasta;
                actualizacion.intentosFallidos = 0;
            }

            await db
                .update(administradora)
                .set(actualizacion)
                .where(eq(administradora.id, admin.id));

            throw new UnauthorizedException(mensajeGenerico);
        }

        // Login exitoso: resetear intentos
        await db
            .update(administradora)
            .set({ intentosFallidos: 0, bloqueadaHasta: null })
            .where(eq(administradora.id, admin.id));

        return this.jwtService.sign({ sub: admin.id, usuario: admin.usuario });
    }

    async me(adminId: number) {
        const [admin] = await db
            .select({
                id: administradora.id,
                usuario: administradora.usuario,
                fechaCreacion: administradora.fechaCreacion,
            })
            .from(administradora)
            .where(eq(administradora.id, adminId))
            .limit(1);

        if (!admin) {
            throw new UnauthorizedException('Sesión inválida');
        }

        return admin;
    }
}
