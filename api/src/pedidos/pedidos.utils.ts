export const UMBRAL_VENCIMIENTO_HORAS = 24;
const MS_POR_HORA = 60 * 60 * 1000;

/**
 * Genera el código legible de un pedido a partir de su ID (ej: 1 -> PED-0001).
 */
export function formatearCodigoPedido(id: number): string {
    return `PED-${String(Math.trunc(id)).padStart(4, '0')}`;
}

/**
 * Determina si un pedido PENDIENTE superó el umbral de 24 horas sin confirmación.
 */
export function esPedidoVencido(
    estado: string,
    fechaCreacion: Date,
    ahora: Date = new Date(),
): boolean {
    if (estado !== 'PENDIENTE') return false;
    const diferenciaMs = ahora.getTime() - fechaCreacion.getTime();
    return diferenciaMs >= UMBRAL_VENCIMIENTO_HORAS * MS_POR_HORA;
}
