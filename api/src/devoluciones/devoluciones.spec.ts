import { crearDevolucionSchema } from './devoluciones.schemas';
import { validarYCalcularDevolucion } from './devoluciones.utils';

describe('Devoluciones (esquemas Zod y reglas RN-08)', () => {
    it('valida el esquema de devolución con motivo obligatorio', () => {
        expect(
            crearDevolucionSchema.safeParse({
                ventaId: 10,
                motivo: 'Producto con defecto de fábrica',
                items: [{ productoId: 2, cantidad: 1 }],
            }).success,
        ).toBe(true);

        expect(
            crearDevolucionSchema.safeParse({
                ventaId: 10,
                motivo: 'ab', // muy corto
                items: [{ productoId: 2, cantidad: 1 }],
            }).success,
        ).toBe(false);
    });

    it('calcula el monto con el precio original y respeta devoluciones previas', () => {
        const vendidas = [
            { productoId: 1, cantidadVendida: 3, precioCentavos: 4550 },
            { productoId: 2, cantidadVendida: 1, precioCentavos: 12000 },
        ];
        const previas = new Map<number, number>([[1, 1]]); // ya se devolvió 1 unidad del producto 1

        const res = validarYCalcularDevolucion(vendidas, previas, [
            { productoId: 1, cantidad: 2 },
        ]);

        expect(res.montoCentavos).toBe(9100);
        expect(res.lineasConsolidadas).toHaveLength(1);
    });

    it('rechaza devolver más unidades que (vendido - ya devuelto) o productos ajenos a la venta', () => {
        const vendidas = [{ productoId: 1, cantidadVendida: 2, precioCentavos: 5000 }];
        const previas = new Map<number, number>([[1, 1]]);

        expect(() =>
            validarYCalcularDevolucion(vendidas, previas, [{ productoId: 1, cantidad: 2 }]),
        ).toThrow();

        expect(() =>
            validarYCalcularDevolucion(vendidas, new Map(), [{ productoId: 99, cantidad: 1 }]),
        ).toThrow();
    });
});
