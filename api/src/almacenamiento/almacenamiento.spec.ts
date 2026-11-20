import sharp from 'sharp';
import {
    validarBufferImagen,
    optimizarBufferImagenCatalogo,
    extraerClaveDeUrlPublica,
    MAX_BYTES_IMAGEN,
    ANCHO_CATALOGO,
    ALTO_CATALOGO,
} from './validacion-imagen';

describe('Almacenamiento (validación y optimización de imágenes)', () => {
    it('detecta magic bytes válidos de JPEG, PNG, WEBP y GIF', () => {
        expect(validarBufferImagen(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpeg');
        expect(
            validarBufferImagen(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
        ).toBe('png');
        expect(validarBufferImagen(Buffer.from('RIFF1234WEBP', 'ascii'))).toBe('webp');
        expect(validarBufferImagen(Buffer.from('GIF89a', 'ascii'))).toBe('gif');
    });

    it('rechaza archivos vacíos, HTML/SVG falsificados y tamaños mayores a 5 MB', () => {
        expect(() => validarBufferImagen(Buffer.alloc(0))).toThrow();
        expect(() => validarBufferImagen(Buffer.from('<svg></svg>', 'utf-8'))).toThrow();
        expect(() => validarBufferImagen(Buffer.from('<html>script</html>', 'utf-8'))).toThrow();

        const enorme = Buffer.alloc(MAX_BYTES_IMAGEN + 1);
        enorme[0] = 0xff;
        enorme[1] = 0xd8;
        enorme[2] = 0xff;
        expect(() => validarBufferImagen(enorme)).toThrow();
    });

    it('extrae correctamente la clave R2 solo si pertenece a R2_PUBLIC_URL', () => {
        const base = 'https://pub-demo123.r2.dev';
        expect(
            extraerClaveDeUrlPublica('https://pub-demo123.r2.dev/productos/2026/11/abc.webp', base),
        ).toBe('productos/2026/11/abc.webp');

        expect(
            extraerClaveDeUrlPublica('https://otro-dominio.com/productos/2026/11/abc.webp', base),
        ).toBeNull();
    });

    it('optimiza una imagen real a 800x1000 (4:5) en formato WebP', async () => {
        const pngOriginal = await sharp({
            create: {
                width: 400,
                height: 200,
                channels: 4,
                background: { r: 136, g: 24, b: 48, alpha: 1 },
            },
        })
            .png()
            .toBuffer();

        const webpOptimizado = await optimizarBufferImagenCatalogo(pngOriginal);
        const meta = await sharp(webpOptimizado).metadata();

        expect(meta.format).toBe('webp');
        expect(meta.width).toBe(ANCHO_CATALOGO);
        expect(meta.height).toBe(ALTO_CATALOGO);
    });
});
