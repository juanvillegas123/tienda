import {
    Injectable,
    InternalServerErrorException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
    ErrorValidacionImagen,
    optimizarBufferImagenCatalogo,
    extraerClaveDeUrlPublica,
} from './validacion-imagen';

export interface ImagenSubidaResultado {
    url: string;
    clave: string;
}

@Injectable()
export class AlmacenamientoService {
    private readonly logger = new Logger(AlmacenamientoService.name);
    private s3Client: S3Client | null = null;

    private obtenerConfiguracion() {
        const accountId = process.env.R2_ACCOUNT_ID?.trim();
        const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
        const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
        const bucket = process.env.R2_BUCKET_NAME?.trim();
        const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
        const endpointEnv = process.env.R2_ENDPOINT?.trim();
        const jurisdiction = process.env.R2_JURISDICTION?.trim().toLowerCase();

        if ((!accountId && !endpointEnv) || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
            throw new InternalServerErrorException(
                'El almacenamiento de imágenes (Cloudflare R2) no está configurado en el servidor.',
            );
        }

        if (!publicUrl.startsWith('https://')) {
            throw new InternalServerErrorException(
                'La variable R2_PUBLIC_URL debe comenzar con https://.',
            );
        }

        let endpoint: string;
        if (endpointEnv) {
            endpoint = new URL(endpointEnv).origin;
        } else if (jurisdiction) {
            endpoint = `https://${accountId}.${jurisdiction}.r2.cloudflarestorage.com`;
        } else {
            endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
        }

        return { endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
    }

    private obtenerCliente(): { client: S3Client; bucket: string; publicUrl: string } {
        const config = this.obtenerConfiguracion();

        if (!this.s3Client) {
            this.s3Client = new S3Client({
                region: 'auto',
                endpoint: config.endpoint,
                credentials: {
                    accessKeyId: config.accessKeyId,
                    secretAccessKey: config.secretAccessKey,
                },
                requestChecksumCalculation: 'WHEN_REQUIRED',
                responseChecksumValidation: 'WHEN_REQUIRED',
            });
        }

        return {
            client: this.s3Client,
            bucket: config.bucket,
            publicUrl: config.publicUrl,
        };
    }

    /**
     * Valida magic bytes, optimiza a 800x1000 (4:5) WebP y sube a Cloudflare R2.
     */
    async subirImagenProducto(buffer: Buffer): Promise<ImagenSubidaResultado> {
        let bufferOptimizado: Buffer;
        try {
            bufferOptimizado = await optimizarBufferImagenCatalogo(buffer);
        } catch (err) {
            if (err instanceof ErrorValidacionImagen) {
                throw new BadRequestException(err.message);
            }
            throw err;
        }

        const { client, bucket, publicUrl } = this.obtenerCliente();

        const ahora = new Date();
        const anio = ahora.getUTCFullYear();
        const mes = String(ahora.getUTCMonth() + 1).padStart(2, '0');
        const clave = `productos/${anio}/${mes}/${randomUUID()}.webp`;

        try {
            await client.send(
                new PutObjectCommand({
                    Bucket: bucket,
                    Key: clave,
                    Body: bufferOptimizado,
                    ContentType: 'image/webp',
                    CacheControl: 'public, max-age=31536000, immutable',
                }),
            );
        } catch (err) {
            const detalle =
                err instanceof Error ? `${err.name}: ${err.message}` : 'error desconocido';
            this.logger.error(`Error al subir imagen a Cloudflare R2 (${detalle})`);
            throw new InternalServerErrorException(
                'No se pudo guardar la imagen en el almacenamiento en la nube.',
            );
        }

        return {
            url: `${publicUrl}/${clave}`,
            clave,
        };
    }

    /**
     * Elimina una imagen de Cloudflare R2 si pertenece al bucket configurado.
     * Operación best-effort: no interrumpe la edición de productos si falla.
     */
    async eliminarPorUrl(url: string | null | undefined): Promise<void> {
        if (!url) return;

        const publicUrl = process.env.R2_PUBLIC_URL?.trim().replace(/\/+$/, '');
        if (!publicUrl) return;

        const clave = extraerClaveDeUrlPublica(url, publicUrl);
        if (!clave) return;

        try {
            const { client, bucket } = this.obtenerCliente();
            await client.send(
                new DeleteObjectCommand({
                    Bucket: bucket,
                    Key: clave,
                }),
            );
        } catch (err) {
            this.logger.warn(
                `No se pudo eliminar imagen huérfana (${clave}) en R2: ${err instanceof Error ? err.message : 'error desconocido'}`,
            );
        }
    }
}
