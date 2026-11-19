import { crearProductoSchema, editarProductoSchema } from './productos.schemas';

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
});
