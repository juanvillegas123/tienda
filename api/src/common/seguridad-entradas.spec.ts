import { crearVentaSchema } from '../ventas/ventas.schemas';
import { abrirCajaSchema, cerrarCajaSchema } from '../cajas/cajas.schemas';
import { crearPedidoSchema } from '../pedidos/pedidos.schemas';
import { crearProductoSchema } from '../productos/productos.schemas';
import { validarBufferImagen, ErrorValidacionImagen } from '../almacenamiento/validacion-imagen';

describe('Auditoría de seguridad: validación estricta de entradas y archivos', () => {
    describe('Ventas POS (crearVentaSchema)', () => {
        it('rechaza manipulación de precios/totales desde el cliente (RN-09)', () => {
            const res = crearVentaSchema.safeParse({
                metodoPago: 'EFECTIVO',
                totalCentavos: 100,
                items: [{ productoId: 1, cantidad: 1 }],
            });
            expect(res.success).toBe(false);
        });

        it('rechaza cantidades con HTML, texto, booleanos, decimales o fuera de rango', () => {
            const casos = [
                { productoId: 1, cantidad: '<b>1</b>' },
                { productoId: 1, cantidad: true },
                { productoId: 1, cantidad: 0 },
                { productoId: 1, cantidad: -2 },
                { productoId: 1, cantidad: 1.5 },
                { productoId: 1, cantidad: 1000 },
            ];
            for (const item of casos) {
                const res = crearVentaSchema.safeParse({
                    metodoPago: 'EFECTIVO',
                    items: [item],
                });
                expect(res.success).toBe(false);
            }
        });
    });

    describe('Caja (abrirCajaSchema y cerrarCajaSchema)', () => {
        it('rechaza HTML, texto, booleanos, negativos o montos fuera de límite', () => {
            const invalidos = ['<script>alert(1)</script>', '100', true, -100, 100_000_001, 12.5];
            for (const val of invalidos) {
                expect(abrirCajaSchema.safeParse({ montoInicialCentavos: val }).success).toBe(false);
                expect(cerrarCajaSchema.safeParse({ efectivoContadoCentavos: val }).success).toBe(false);
            }
        });

        it('acepta enteros válidos dentro de rango', () => {
            expect(abrirCajaSchema.safeParse({ montoInicialCentavos: 20000 }).success).toBe(true);
            expect(cerrarCajaSchema.safeParse({ efectivoContadoCentavos: 0 }).success).toBe(true);
        });
    });

    describe('Pedidos públicos (crearPedidoSchema)', () => {
        it('rechaza etiquetas HTML en nombre, teléfono o nota de producto', () => {
            expect(
                crearPedidoSchema.safeParse({
                    nombreCliente: '<img src=x onerror=alert(1)>',
                    items: [{ productoId: 1, cantidad: 1 }],
                }).success,
            ).toBe(false);

            expect(
                crearPedidoSchema.safeParse({
                    nombreCliente: 'Juan Pérez',
                    items: [{ productoId: 1, cantidad: 1, notaCliente: '<script>x</script>' }],
                }).success,
            ).toBe(false);
        });

        it('rechaza campos extra de precio en items del pedido', () => {
            const res = crearPedidoSchema.safeParse({
                nombreCliente: 'Juan Pérez',
                items: [{ productoId: 1, cantidad: 1, precioCentavos: 1 }],
            });
            expect(res.success).toBe(false);
        });
    });

    describe('Productos (crearProductoSchema)', () => {
        it('rechaza montos o stocks fuera de rango seguro', () => {
            const res = crearProductoSchema.safeParse({
                categoriaId: 1,
                nombre: 'Figura Test',
                precioCentavos: 999_999_999_999,
                costoCentavos: 1000,
                stockInicial: 10,
            });
            expect(res.success).toBe(false);
        });
    });

    describe('Subida de imágenes (magic bytes)', () => {
        it('rechaza archivos HTML o SVG disfrazados', () => {
            const htmlBuffer = Buffer.from('<html><body><script>alert(1)</script></body></html>');
            const svgBuffer = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>');

            expect(() => validarBufferImagen(htmlBuffer)).toThrow(ErrorValidacionImagen);
            expect(() => validarBufferImagen(svgBuffer)).toThrow(ErrorValidacionImagen);
        });

        it('acepta firma real JPEG', () => {
            const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
            expect(validarBufferImagen(jpegHeader)).toBe('jpeg');
        });
    });
});
