import sharp from 'sharp';

export const MAX_BYTES_IMAGEN = 5 * 1024 * 1024; // 5 MB
export const ANCHO_CATALOGO = 800;
export const ALTO_CATALOGO = 1000; // Proporción exacta 4:5 para tarjetas y detalle

export type FormatoImagenDetectado = 'jpeg' | 'png' | 'webp' | 'gif';

export class ErrorValidacionImagen extends Error {
    constructor(mensaje: string) {
        super(mensaje);
        this.name = 'ErrorValidacionImagen';
    }
}

/**
 * Valida tamaño y magic bytes reales del archivo para evitar archivos falsificados.
 */
export function validarBufferImagen(buffer: Buffer): FormatoImagenDetectado {
    if (!buffer || buffer.length === 0) {
        throw new ErrorValidacionImagen('El archivo de imagen está vacío.');
    }

    if (buffer.length > MAX_BYTES_IMAGEN) {
        throw new ErrorValidacionImagen('La imagen supera el límite máximo permitido de 5 MB.');
    }

    // JPEG: FF D8 FF
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return 'jpeg';
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
        buffer.length >= 8 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
    ) {
        return 'png';
    }

    // WEBP: "RIFF" .... "WEBP"
    if (
        buffer.length >= 12 &&
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
        return 'webp';
    }

    // GIF: "GIF87a" o "GIF89a"
    if (
        buffer.length >= 6 &&
        (buffer.subarray(0, 6).toString('ascii') === 'GIF87a' ||
            buffer.subarray(0, 6).toString('ascii') === 'GIF89a')
    ) {
        return 'gif';
    }

    throw new ErrorValidacionImagen(
        'Formato de archivo no válido. Solo se permiten imágenes reales JPG, PNG, WEBP o GIF.',
    );
}

/**
 * Valida magic bytes, ajusta orientación EXIF, escala a 800x1000 (4:5) con fondo blanco
 * y convierte a WebP optimizado sin metadatos EXIF.
 */
export async function optimizarBufferImagenCatalogo(buffer: Buffer): Promise<Buffer> {
    validarBufferImagen(buffer);

    try {
        return await sharp(buffer)
            .rotate()
            .resize(ANCHO_CATALOGO, ALTO_CATALOGO, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            })
            .webp({ quality: 85 })
            .toBuffer();
    } catch {
        throw new ErrorValidacionImagen(
            'No se pudo procesar la imagen. Verifica que el archivo no esté dañado.',
        );
    }
}

/**
 * Extrae la clave del objeto R2 si la URL pertenece al dominio público configurado.
 * Retorna null si la URL es externa o inválida.
 */
export function extraerClaveDeUrlPublica(url: string, r2PublicUrl: string): string | null {
    const baseLimpia = r2PublicUrl.trim().replace(/\/+$/, '');
    if (!baseLimpia || !url) return null;

    const prefijo = `${baseLimpia}/`;
    if (!url.startsWith(prefijo)) {
        return null;
    }

    const clave = url.slice(prefijo.length).split('?')[0].split('#')[0].trim();
    return clave.length > 0 ? clave : null;
}
