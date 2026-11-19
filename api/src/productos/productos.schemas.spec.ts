import {
    crearProductoSchema,
    editarProductoSchema,
    filtroProductosPublicoSchema,
} from './productos.schemas';

describe('ProductosSchemas (Zod)', () => {
    it('debe validar un producto completo y válido', () => {
        const resultado = crearProductoSchema.safeParse({
            categoriaId: 1,
            proveedorId: 2,
            nombre: 'Figura Rem 1/7',
            descripcion: 'Figura original de Re:Zero',
            precioCentavos: 35000,
            costoCentavos: 20000,
            stockInicial: 5,
            escala: '1/7',
            notaTalla: null,
            imagenPrincipal: 'https://ejemplo.com/rem.jpg',
            imagenesAdicionales: ['https://ejemplo.com/rem-2.jpg'],
        });

        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.data.precioCentavos).toBe(35000);
            expect(resultado.data.costoCentavos).toBe(20000);
            expect(resultado.data.stockInicial).toBe(5);
        }
    });

    it('debe rechazar precio con decimales (RN-04 exige centavos enteros)', () => {
        const resultado = crearProductoSchema.safeParse({
            categoriaId: 1,
            nombre: 'Producto Test',
            precioCentavos: 45.5, // Error: no es entero
        });

        expect(resultado.success).toBe(false);
    });

    it('debe rechazar precio o costo negativo', () => {
        const resultado = crearProductoSchema.safeParse({
            categoriaId: 1,
            nombre: 'Producto Test',
            precioCentavos: -100,
        });

        expect(resultado.success).toBe(false);
    });

    it('debe validar edición parcial válida', () => {
        const resultado = editarProductoSchema.safeParse({
            precioCentavos: 40000,
            stock: 3,
        });

        expect(resultado.success).toBe(true);
    });

    it('debe validar filtro público con categoriaId y q', () => {
        const resultado = filtroProductosPublicoSchema.safeParse({
            categoriaId: '2',
            q: 'figura',
        });

        expect(resultado.success).toBe(true);
        if (resultado.success) {
            expect(resultado.data.categoriaId).toBe(2);
            expect(resultado.data.q).toBe('figura');
        }
    });

    it('debe rechazar parámetros administrativos en filtro público', () => {
        const resultado = filtroProductosPublicoSchema.safeParse({
            activo: 'false',
        });

        expect(resultado.success).toBe(false);
    });

    it('debe rechazar URLs de imagen con esquemas inseguros (http, javascript, data, ftp)', () => {
        const urlsInseguras = [
            'http://ejemplo.com/imagen.jpg',
            'javascript:alert(1)',
            'data:image/png;base64,iVBORw0KGgo=',
            'ftp://ejemplo.com/imagen.jpg',
        ];

        for (const url of urlsInseguras) {
            const crearPrincipal = crearProductoSchema.safeParse({
                categoriaId: 1,
                nombre: 'Figura Test',
                precioCentavos: 15000,
                imagenPrincipal: url,
            });
            expect(crearPrincipal.success).toBe(false);

            const crearGaleria = crearProductoSchema.safeParse({
                categoriaId: 1,
                nombre: 'Figura Test',
                precioCentavos: 15000,
                imagenesAdicionales: [url],
            });
            expect(crearGaleria.success).toBe(false);

            const editarPrincipal = editarProductoSchema.safeParse({
                imagenPrincipal: url,
            });
            expect(editarPrincipal.success).toBe(false);
        }
    });

    it('debe rechazar URLs de imagen que superen la longitud máxima', () => {
        const urlLarga = `https://ejemplo.com/${'a'.repeat(1000)}.jpg`;
        const resultado = crearProductoSchema.safeParse({
            categoriaId: 1,
            nombre: 'Figura Test',
            precioCentavos: 15000,
            imagenPrincipal: urlLarga,
        });

        expect(resultado.success).toBe(false);
    });
});
