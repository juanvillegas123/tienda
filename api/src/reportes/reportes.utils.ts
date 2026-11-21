export interface RangoFechasResuelto {
    desdeTexto: string;
    hastaTexto: string;
    inicio: Date;
    fin: Date;
}

function formatearFechaLocal(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parsearInicioDia(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
}

function parsearFinDia(iso: string): Date {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d, 23, 59, 59, 999);
}

/**
 * Resuelve un rango de fechas YYYY-MM-DD (por defecto últimos 30 días hasta hoy).
 */
export function resolverRangoFechas(
    desde?: string,
    hasta?: string,
    ahora: Date = new Date(),
): RangoFechasResuelto {
    const hoyTexto = formatearFechaLocal(ahora);
    const hace30 = new Date(ahora);
    hace30.setDate(hace30.getDate() - 29);
    const hace30Texto = formatearFechaLocal(hace30);

    const desdeTexto = desde ?? hace30Texto;
    const hastaTexto = hasta ?? hoyTexto;

    return {
        desdeTexto,
        hastaTexto,
        inicio: parsearInicioDia(desdeTexto),
        fin: parsearFinDia(hastaTexto),
    };
}

/**
 * Calcula porcentaje de margen redondeado a 1 decimal (ej. 42.5).
 */
export function calcularPorcentajeMargen(
    margenCentavos: number,
    ingresosNetosCentavos: number,
): number {
    if (ingresosNetosCentavos <= 0) return 0;
    return Math.round((margenCentavos / ingresosNetosCentavos) * 1000) / 10;
}

export interface MetricaProductoNeto {
    unidadesVendidas: number;
    unidadesDevueltas: number;
    unidadesNetas: number;
    ingresosNetosCentavos: number;
    costoNetoCentavos: number;
    margenCentavos: number;
    margenPorcentaje: number;
}

/**
 * Combina ventas brutas y devoluciones de un producto para obtener métricas netas exactas.
 */
export function calcularMetricasNetasProducto(
    unidadesVendidas: number,
    ingresosBrutosCentavos: number,
    costoBrutoCentavos: number,
    unidadesDevueltas: number,
    ingresosDevueltosCentavos: number,
    costoDevueltoCentavos: number,
): MetricaProductoNeto {
    const unidadesNetas = unidadesVendidas - unidadesDevueltas;
    const ingresosNetosCentavos = ingresosBrutosCentavos - ingresosDevueltosCentavos;
    const costoNetoCentavos = costoBrutoCentavos - costoDevueltoCentavos;
    const margenCentavos = ingresosNetosCentavos - costoNetoCentavos;
    const margenPorcentaje = calcularPorcentajeMargen(margenCentavos, ingresosNetosCentavos);

    return {
        unidadesVendidas,
        unidadesDevueltas,
        unidadesNetas,
        ingresosNetosCentavos,
        costoNetoCentavos,
        margenCentavos,
        margenPorcentaje,
    };
}
