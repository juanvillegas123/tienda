import { formatearCodigoPedido, esPedidoVencido } from './pedidos.utils';

describe('Utilidades de Pedidos', () => {
    it('debe formatear códigos con ceros a la izquierda (PED-XXXX)', () => {
        expect(formatearCodigoPedido(1)).toBe('PED-0001');
        expect(formatearCodigoPedido(42)).toBe('PED-0042');
        expect(formatearCodigoPedido(1234)).toBe('PED-1234');
        expect(formatearCodigoPedido(12345)).toBe('PED-12345');
    });

    it('debe marcar como vencido un pedido PENDIENTE con 24 horas o más', () => {
        const ahora = new Date('2026-11-19T20:00:00Z');
        const hace23h = new Date('2026-11-18T21:00:00Z');
        const hace24h = new Date('2026-11-18T20:00:00Z');
        const hace30h = new Date('2026-11-18T14:00:00Z');

        expect(esPedidoVencido('PENDIENTE', hace23h, ahora)).toBe(false);
        expect(esPedidoVencido('PENDIENTE', hace24h, ahora)).toBe(true);
        expect(esPedidoVencido('PENDIENTE', hace30h, ahora)).toBe(true);
    });

    it('no debe marcar como vencidos pedidos CONFIRMADO ni CANCELADO aunque pasen 24 horas', () => {
        const ahora = new Date('2026-11-19T20:00:00Z');
        const hace48h = new Date('2026-11-17T20:00:00Z');

        expect(esPedidoVencido('CONFIRMADO', hace48h, ahora)).toBe(false);
        expect(esPedidoVencido('CANCELADO', hace48h, ahora)).toBe(false);
    });
});
