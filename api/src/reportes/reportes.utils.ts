export const UMBRAL_STOCK_BAJO = 3;

export interface RangoFechasResuelto {
    desdeTexto: string;
    hastaTexto: string;
    inicio: Date;
    fin: Date;
}

export function formatearFechaLocal(fecha: Date): string {
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
 * Calcula el período inmediatamente anterior de igual cantidad de días.
 */
export function calcularRangoAnterior(
    desdeTexto: string,
    hastaTexto: string,
): RangoFechasResuelto {
    const inicioActual = parsearInicioDia(desdeTexto);
    const finActual = parsearInicioDia(hastaTexto);
    const dias = Math.max(
        1,
        Math.round((finActual.getTime() - inicioActual.getTime()) / (24 * 60 * 60 * 1000)) + 1,
    );

    const finPrev = new Date(inicioActual);
    finPrev.setDate(finPrev.getDate() - 1);

    const inicioPrev = new Date(finPrev);
    inicioPrev.setDate(inicioPrev.getDate() - (dias - 1));

    const prevDesde = formatearFechaLocal(inicioPrev);
    const prevHasta = formatearFechaLocal(finPrev);

    return {
        desdeTexto: prevDesde,
        hastaTexto: prevHasta,
        inicio: parsearInicioDia(prevDesde),
        fin: parsearFinDia(prevHasta),
    };
}

/**
 * Genera la secuencia completa de días YYYY-MM-DD entre desde y hasta (máx. 366 días).
 */
export function generarFechasEnRango(desdeTexto: string, hastaTexto: string): string[] {
    const resultado: string[] = [];
    const cursor = parsearInicioDia(desdeTexto);
    const fin = parsearInicioDia(hastaTexto);

    let contador = 0;
    while (cursor <= fin && contador < 366) {
        resultado.push(formatearFechaLocal(cursor));
        cursor.setDate(cursor.getDate() + 1);
        contador++;
    }
    return resultado;
}

/**
 * Variación porcentual entre periodo actual y anterior (redondeada a 1 decimal).
 * Retorna null si el periodo anterior fue 0 y el actual es distinto de 0.
 */
export function calcularVariacionPorcentual(actual: number, anterior: number): number | null {
    if (anterior === 0) {
        return actual === 0 ? 0 : null;
    }
    return Math.round(((actual - anterior) / Math.abs(anterior)) * 1000) / 10;
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

export interface CoberturaStockCalculo {
    velocidadDiaria: number;
    diasCobertura: number | null;
    sugerenciaReposicion: number;
}

/**
 * Calcula velocidad diaria, días de cobertura y sugerencia de reposición a 30 días.
 */
export function calcularCoberturaYReposicion(
    stockActual: number,
    unidadesNetas30d: number,
): CoberturaStockCalculo {
    if (unidadesNetas30d <= 0) {
        return {
            velocidadDiaria: 0,
            diasCobertura: null,
            sugerenciaReposicion: 0,
        };
    }

    const velocidadDiaria = Math.round((unidadesNetas30d / 30) * 100) / 100;
    const diasCobertura = Math.floor((stockActual * 30) / unidadesNetas30d);
    const sugerenciaReposicion =
        diasCobertura <= 14 ? Math.max(1, Math.ceil(unidadesNetas30d - stockActual)) : 0;

    return {
        velocidadDiaria,
        diasCobertura,
        sugerenciaReposicion,
    };
}
