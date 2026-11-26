/**
 * Utilidades estrictas para parseo y validación de montos en Bolivianos (Bs.) a centavos enteros.
 * Rechaza etiquetas HTML, letras, notación científica (1e10), hexadecimal (0x10), Infinity y negativos.
 */

export const MAX_MONTO_BS = 1_000_000;
export const MAX_MONTO_CENTAVOS = MAX_MONTO_BS * 100;

const PATRON_MONTO_BS = /^\d+([.,]\d{1,2})?$/;

/**
 * Convierte un texto o número en Bolivianos a centavos enteros de forma estricta.
 * Retorna `null` si el valor está vacío o no cumple estrictamente el formato monetario.
 */
export function parsearBsACentavosEstricto(valor: unknown): number | null {
    if (valor === null || valor === undefined) return null;

    const texto = String(valor).trim();
    if (!texto || !PATRON_MONTO_BS.test(texto)) {
        return null;
    }

    const normalizado = texto.replace(',', '.');
    const partes = normalizado.split('.');
    const enteros = Number(partes[0]);
    const decimalesTexto = (partes[1] ?? '').padEnd(2, '0');
    const decimales = Number(decimalesTexto);

    if (!Number.isSafeInteger(enteros) || !Number.isSafeInteger(decimales)) {
        return null;
    }

    const centavos = enteros * 100 + decimales;
    if (!Number.isSafeInteger(centavos) || centavos < 0 || centavos > MAX_MONTO_CENTAVOS) {
        return null;
    }

    return centavos;
}
