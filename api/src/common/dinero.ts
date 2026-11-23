/**
 * Utilidades para manejo de dinero en centavos enteros (RN-04).
 * Prohibido usar flotantes para cálculos de dinero.
 */

export function bsACentavos(bolivianos: number): number {
    return Math.round(bolivianos * 100);
}

export function centavosABs(centavos: number): number {
    return centavos / 100;
}

export function sumarCentavos(...montos: number[]): number {
    return montos.reduce((acc, curr) => acc + Math.trunc(curr), 0);
}

export function restarCentavos(a: number, b: number): number {
    return Math.trunc(a) - Math.trunc(b);
}

export function multiplicarCentavos(centavos: number, cantidad: number): number {
    return Math.trunc(centavos) * Math.trunc(cantidad);
}

/**
 * Calcula el precio final y el ahorro en centavos enteros aplicando un porcentaje entero (0–99).
 */
export function calcularPrecioConDescuento(
    precioOriginalCentavos: number,
    descuentoPorcentaje: number,
): { precioFinalCentavos: number; descuentoCentavos: number } {
    const base = Math.max(0, Math.trunc(precioOriginalCentavos));
    const pct = Math.max(0, Math.min(99, Math.trunc(descuentoPorcentaje)));
    if (pct === 0 || base === 0) {
        return { precioFinalCentavos: base, descuentoCentavos: 0 };
    }
    const descuentoCentavos = Math.round((base * pct) / 100);
    return {
        precioFinalCentavos: Math.max(0, base - descuentoCentavos),
        descuentoCentavos,
    };
}
