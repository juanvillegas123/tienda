import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import fastifyCookie from '@fastify/cookie';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyMultipart from '@fastify/multipart';

async function bootstrap() {
    const logger = new Logger('Bootstrap');
    const esProduccion = process.env.NODE_ENV === 'production';

    if (esProduccion && !process.env.JWT_SECRET?.trim()) {
        throw new Error('JWT_SECRET es obligatorio en producción.');
    }

    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({
            trustProxy: esProduccion,
        }),
    );

    // Helmet — cabeceras de seguridad estrictas para API JSON
    await app.register(fastifyHelmet, {
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        referrerPolicy: { policy: 'no-referrer' },
        crossOriginResourcePolicy: { policy: 'cross-origin' },
    });

    // Subida de archivos multipart (máx 5MB)
    await app.register(fastifyMultipart, {
        limits: {
            fileSize: 5 * 1024 * 1024,
        },
    });

    // CORS — solo el origen del frontend, con credenciales
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:4200';
    await app.register(fastifyCors, {
        origin: frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'X-Requested-With'],
    });

    // Cookie — necesario para leer cookies en los guards
    const cookieSecret = process.env.COOKIE_SECRET ?? process.env.JWT_SECRET;
    if (esProduccion && !cookieSecret?.trim()) {
        throw new Error('COOKIE_SECRET o JWT_SECRET es obligatorio en producción.');
    }
    await app.register(fastifyCookie, {
        secret: cookieSecret ?? 'dev-secret',
    });

    // Rate limit global moderado y más estricto en endpoints públicos de escritura (5.2)
    await app.register(fastifyRateLimit, {
        global: true,
        max: (req) => {
            const ruta = req.url.split('?')[0];
            if (req.method === 'POST' && ruta === '/api/pedidos') return 10;
            if (req.method === 'POST' && ruta === '/api/auth/login') return 15;
            if (req.method === 'POST' && ruta === '/api/productos/imagenes/subir') return 30;
            return 200;
        },
        keyGenerator: (req) => {
            const ruta = req.url.split('?')[0];
            if (
                req.method === 'POST' &&
                (ruta === '/api/pedidos' ||
                    ruta === '/api/auth/login' ||
                    ruta === '/api/productos/imagenes/subir')
            ) {
                return `${req.ip}:POST:${ruta}`;
            }
            return req.ip;
        },
        timeWindow: '1 minute',
        errorResponseBuilder: () => ({
            statusCode: 429,
            mensaje: 'Demasiadas solicitudes. Intente más tarde.',
        }),
    });

    // Prefijo global de la API
    app.setGlobalPrefix('api');

    const port = parseInt(process.env.PORT ?? '3000', 10);
    await app.listen(port, '0.0.0.0');
    logger.log(`API escuchando en puerto ${port}`);
}

void bootstrap();
