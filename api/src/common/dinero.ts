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
