import {
    crearEntradaInventarioSchema,
    crearAjusteInventarioSchema,
    listarMovimientosQuerySchema,
} from './inventario.schemas';

describe('Inventario (esquemas Zod)', () => {
    it('valida entrada de mercadería con proveedor y costo en centavos enteros', () => {
        const res = crearEntradaInventarioSchema.safeParse({
            productoId: 1,
            proveedorId: 2,
            cantidad: 10,
            costoCentavos: 8550,
            nota: 'Lote noviembre',
        });
        expect(res.success).toBe(true);
    });

    it('rechaza entrada con cantidad <= 0 o costo con decimales/negativo', () => {
        expect(
            crearEntradaInventarioSchema.safeParse({
                productoId: 1,
                cantidad: 0,
                costoCentavos: 5000,
            }).success,
        ).toBe(false);

        expect(
            crearEntradaInventarioSchema.safeParse({
                productoId: 1,
                cantidad: 3,
                costoCentavos: 45.5,
            }).success,
        ).toBe(false);
    });

    it('exige nota obligatoria y stock >= 0 en ajustes manuales', () => {
        expect(
            crearAjusteInventarioSchema.safeParse({
                productoId: 1,
                nuevoStock: 4,
                nota: 'Conteo físico semanal',
            }).success,
        ).toBe(true);

        expect(
            crearAjusteInventarioSchema.safeParse({
                productoId: 1,
                nuevoStock: 4,
                nota: '',
            }).success,
        ).toBe(false);

        expect(
            crearAjusteInventarioSchema.safeParse({
                productoId: 1,
                nuevoStock: -1,
                nota: 'Ajuste inválido',
            }).success,
        ).toBe(false);
    });

    it('valida filtros de consulta de movimientos', () => {
        const res = listarMovimientosQuerySchema.safeParse({
            productoId: '5',
            tipo: 'ENTRADA',
            limite: '50',
        });
        expect(res.success).toBe(true);
    });
});
