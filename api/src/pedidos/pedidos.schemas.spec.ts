import {
    crearPedidoSchema,
    confirmarPedidoSchema,
    listarPedidosQuerySchema,
} from './pedidos.schemas';

describe('PedidosSchemas (Zod)', () => {
    it('debe validar un pedido público válido con nombre y sin teléfono', () => {
        const res = crearPedidoSchema.safeParse({
            nombreCliente: 'Ana Pérez',
            items: [{ productoId: 1, cantidad: 2, notaCliente: 'Talla M' }],
        });
        expect(res.success).toBe(true);
    });

    it('debe rechazar un pedido sin ítems o con productos repetidos', () => {
        expect(
            crearPedidoSchema.safeParse({
                nombreCliente: 'Ana Pérez',
                items: [],
            }).success,
        ).toBe(false);

        expect(
            crearPedidoSchema.safeParse({
                nombreCliente: 'Ana Pérez',
                items: [
                    { productoId: 1, cantidad: 1 },
                    { productoId: 1, cantidad: 2 },
                ],
            }).success,
        ).toBe(false);
    });

    it('debe rechazar campos extra como totalCentavos enviados desde el cliente (RN-09)', () => {
        const res = crearPedidoSchema.safeParse({
            nombreCliente: 'Ana Pérez',
            totalCentavos: 100,
            items: [{ productoId: 1, cantidad: 1 }],
        });
        expect(res.success).toBe(false);
    });

    it('debe validar confirmación con método de pago y ajustes opcionales', () => {
        expect(
            confirmarPedidoSchema.safeParse({
                metodoPago: 'QR',
                itemsAjustados: [{ productoId: 1, cantidad: 1 }],
            }).success,
        ).toBe(true);

        expect(
            confirmarPedidoSchema.safeParse({
                metodoPago: 'TARJETA',
            }).success,
        ).toBe(false);
    });

    it('debe validar filtro de estado', () => {
        expect(listarPedidosQuerySchema.safeParse({ estado: 'PENDIENTE' }).success).toBe(true);
        expect(listarPedidosQuerySchema.safeParse({ estado: 'OTRO' }).success).toBe(false);
    });
});
