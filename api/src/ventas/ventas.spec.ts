import { crearVentaSchema, listarVentasQuerySchema } from './ventas.schemas';

describe('Ventas (esquemas Zod)', () => {
    it('acepta una venta válida de mostrador', () => {
        const res = crearVentaSchema.safeParse({
            metodoPago: 'EFECTIVO',
            items: [
                { productoId: 1, cantidad: 2 },
                { productoId: 4, cantidad: 1 },
            ],
        });
        expect(res.success).toBe(true);
    });

    it('rechaza venta sin productos, cantidad <= 0 o método inválido', () => {
        expect(crearVentaSchema.safeParse({ metodoPago: 'EFECTIVO', items: [] }).success).toBe(false);
        expect(
            crearVentaSchema.safeParse({
                metodoPago: 'EFECTIVO',
                items: [{ productoId: 1, cantidad: 0 }],
            }).success,
        ).toBe(false);
        expect(
            crearVentaSchema.safeParse({
                metodoPago: 'TARJETA',
                items: [{ productoId: 1, cantidad: 1 }],
            }).success,
        ).toBe(false);
    });

    it('valida filtros de consulta de historial', () => {
        const res = listarVentasQuerySchema.safeParse({ canal: 'MOSTRADOR', limite: '25' });
        expect(res.success).toBe(true);
        if (res.success) {
            expect(res.data.limite).toBe(25);
        }
    });
});
