export interface LineaVendida {
    productoId: number;
    cantidadVendida: number;
    precioCentavos: number;
}

export interface ItemDevolucionSolicitado {
    productoId: number;
    cantidad: number;
}

export interface ResultadoValidacionDevolucion {
    lineasConsolidadas: { productoId: number; cantidad: number; precioCentavos: number }[];
    montoCentavos: number;
}

export class ErrorReglaDevolucion extends Error {
    constructor(mensaje: string) {
        super(mensaje);
        this.name = 'ErrorReglaDevolucion';
    }
}

/**
 * Valida las cantidades a devolver contra lo vendido menos lo ya devuelto (sección 5.4)
 * y calcula el monto total de reembolso en centavos con el precio original de la venta.
 */
export function validarYCalcularDevolucion(
    lineasVendidas: LineaVendida[],
    yaDevueltoPorProducto: Map<number, number>,
    itemsSolicitados: ItemDevolucionSolicitado[],
): ResultadoValidacionDevolucion {
    const mapaVendidas = new Map<number, LineaVendida>();
    for (const linea of lineasVendidas) {
        mapaVendidas.set(linea.productoId, linea);
    }

    const consolidado = new Map<number, number>();
    for (const item of itemsSolicitados) {
        consolidado.set(item.productoId, (consolidado.get(item.productoId) ?? 0) + item.cantidad);
    }

    const lineasConsolidadas: { productoId: number; cantidad: number; precioCentavos: number }[] = [];
    let montoCentavos = 0;

    for (const [productoId, cantidad] of consolidado.entries()) {
        const vendida = mapaVendidas.get(productoId);
        if (!vendida) {
            throw new ErrorReglaDevolucion(
                `El producto #${productoId} no pertenece a la venta seleccionada.`,
            );
        }

        const yaDevuelto = yaDevueltoPorProducto.get(productoId) ?? 0;
        const maximoDevolvible = vendida.cantidadVendida - yaDevuelto;

        if (cantidad > maximoDevolvible) {
            throw new ErrorReglaDevolucion(
                `No puedes devolver ${cantidad} unidad(es) del producto #${productoId}. Máximo disponible para devolución: ${maximoDevolvible}.`,
            );
        }

        montoCentavos += vendida.precioCentavos * cantidad;
        lineasConsolidadas.push({
            productoId,
            cantidad,
            precioCentavos: vendida.precioCentavos,
        });
    }

    return { lineasConsolidadas, montoCentavos };
}
