import { rangoFechasSchema, masVendidosQuerySchema } from './reportes.schemas';
import {
    resolverRangoFechas,
    calcularMetricasNetasProducto,
    calcularPorcentajeMargen,
} from './reportes.utils';

describe('Reportes (esquemas Zod y cálculos netos con devoluciones)', () => {
    it('valida rangos de fechas correctos y rechaza desde > hasta o formatos inválidos', () => {
        expect(
            rangoFechasSchema.safeParse({ desde: '2026-11-01', hasta: '2026-11-21' }).success,
        ).toBe(true);
        expect(
            rangoFechasSchema.safeParse({ desde: '2026-11-25', hasta: '2026-11-01' }).success,
        ).toBe(false);
        expect(rangoFechasSchema.safeParse({ desde: '21/11/2026' }).success).toBe(false);
        expect(masVendidosQuerySchema.safeParse({ limite: '15' }).success).toBe(true);
    });

    it('resuelve fechas por defecto (últimos 30 días) y límites inicio/fin de día', () => {
        const ref = new Date(2026, 10, 21, 14, 0, 0); // 2026-11-21
        const rango = resolverRangoFechas(undefined, undefined, ref);
        expect(rango.hastaTexto).toBe('2026-11-21');
        expect(rango.desdeTexto).toBe('2026-10-23');
        expect(rango.inicio.getHours()).toBe(0);
        expect(rango.fin.getHours()).toBe(23);
    });

    it('resta correctamente devoluciones en unidades, ingresos, costos y margen', () => {
        // Vendidas 5 unid. a Bs. 100 (costo Bs. 60), devuelta 1 unid.
        const m = calcularMetricasNetasProducto(5, 50000, 30000, 1, 10000, 6000);
        expect(m.unidadesNetas).toBe(4);
        expect(m.ingresosNetosCentavos).toBe(40000);
        expect(m.costoNetoCentavos).toBe(24000);
        expect(m.margenCentavos).toBe(16000);
        expect(m.margenPorcentaje).toBe(40);
    });

    it('devuelve margen 0% cuando los ingresos netos son 0 o negativos', () => {
        expect(calcularPorcentajeMargen(0, 0)).toBe(0);
        expect(calcularPorcentajeMargen(-500, -1000)).toBe(0);
    });
});
