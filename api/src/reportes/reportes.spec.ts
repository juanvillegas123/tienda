import { rangoFechasSchema, masVendidosQuerySchema } from './reportes.schemas';
import {
    resolverRangoFechas,
    calcularRangoAnterior,
    generarFechasEnRango,
    calcularVariacionPorcentual,
    calcularMetricasNetasProducto,
    calcularPorcentajeMargen,
    calcularCoberturaYReposicion,
} from './reportes.utils';

describe('Reportes (esquemas Zod y cálculos estratégicos)', () => {
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

    it('resuelve fechas por defecto (últimos 30 días) y rango anterior equivalente', () => {
        const ref = new Date(2026, 10, 21, 14, 0, 0);
        const rango = resolverRangoFechas(undefined, undefined, ref);
        expect(rango.hastaTexto).toBe('2026-11-21');
        expect(rango.desdeTexto).toBe('2026-10-23');

        const prev = calcularRangoAnterior('2026-11-15', '2026-11-21'); // 7 días
        expect(prev.desdeTexto).toBe('2026-11-08');
        expect(prev.hastaTexto).toBe('2026-11-14');
    });

    it('genera todos los días del rango incluyendo días sin ventas', () => {
        const dias = generarFechasEnRango('2026-11-19', '2026-11-21');
        expect(dias).toEqual(['2026-11-19', '2026-11-20', '2026-11-21']);
    });

    it('calcula variaciones porcentuales y maneja base 0', () => {
        expect(calcularVariacionPorcentual(15000, 10000)).toBe(50);
        expect(calcularVariacionPorcentual(8000, 10000)).toBe(-20);
        expect(calcularVariacionPorcentual(0, 0)).toBe(0);
        expect(calcularVariacionPorcentual(5000, 0)).toBeNull();
    });

    it('resta correctamente devoluciones en unidades, ingresos, costos y margen', () => {
        const m = calcularMetricasNetasProducto(5, 50000, 30000, 1, 10000, 6000);
        expect(m.unidadesNetas).toBe(4);
        expect(m.ingresosNetosCentavos).toBe(40000);
        expect(m.costoNetoCentavos).toBe(24000);
        expect(m.margenCentavos).toBe(16000);
        expect(m.margenPorcentaje).toBe(40);
        expect(calcularPorcentajeMargen(0, 0)).toBe(0);
    });

    it('calcula días de cobertura y sugerencia de reposición a 30 días', () => {
        // 30 unidades vendidas en 30 días (1/día), stock actual 5 -> 5 días cobertura, sugerir 25
        const bajo = calcularCoberturaYReposicion(5, 30);
        expect(bajo.velocidadDiaria).toBe(1);
        expect(bajo.diasCobertura).toBe(5);
        expect(bajo.sugerenciaReposicion).toBe(25);

        // 10 unidades en 30 días, stock 20 -> 60 días cobertura -> no necesita reposición
        const sano = calcularCoberturaYReposicion(20, 10);
        expect(sano.diasCobertura).toBe(60);
        expect(sano.sugerenciaReposicion).toBe(0);
    });
});
