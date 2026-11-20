export interface ResultadoCalculoCierre {
    efectivoEsperadoCentavos: number;
    diferenciaCentavos: number;
}

/**
 * RN-10: efectivo esperado = monto inicial + ventas en efectivo de esa caja - devoluciones de esa caja.
 * La diferencia (contado - esperado) se registra tal cual, sin corregirse.
 */
export function calcularCierreCaja(
    montoInicialCentavos: number,
    ventasEfectivoCentavos: number,
    devolucionesCentavos: number,
    efectivoContadoCentavos: number,
): ResultadoCalculoCierre {
    const efectivoEsperadoCentavos =
        montoInicialCentavos + ventasEfectivoCentavos - devolucionesCentavos;
    const diferenciaCentavos = efectivoContadoCentavos - efectivoEsperadoCentavos;

    return {
        efectivoEsperadoCentavos,
        diferenciaCentavos,
    };
}
