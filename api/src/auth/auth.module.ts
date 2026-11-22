import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    imports: [
        JwtModule.registerAsync({
            useFactory: () => {
                const secret = process.env.JWT_SECRET?.trim();
                if (process.env.NODE_ENV === 'production' && !secret) {
                    throw new Error('JWT_SECRET es obligatorio en producción.');
                }
                return {
                    secret: secret || 'dev-jwt-secret',
                    signOptions: { expiresIn: '10h' },
                };
            },
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtAuthGuard],
    exports: [JwtModule, JwtAuthGuard],
})
export class AuthModule {}
