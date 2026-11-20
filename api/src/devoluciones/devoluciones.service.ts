import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { eq, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
    cajas,
    ventas,
    detalleVenta,
    devoluciones,
    detalleDevolucion,
    productos,
    movimientosInventario,
} from '../db/schema';
import { CrearDevolucionDto } from './devoluciones.schemas';
import {
    validarYCalcularDevolucion,
    ErrorReglaDevolucion,
} from './devoluciones.utils';

export interface DevolucionRegistradaDto {
    id: number;
    ventaId: number;
    cajaId: number;
    motivo: string;
    montoCentavos: number;
    fecha: Date;
    items: { productoId: number; cantidad: number }[];
}

@Injectable()
export class DevolucionesService {
    /**
     * Registra una devolución en la caja abierta actual (RN-08),
     * devuelve stock al inventario y registra movimiento tipo DEVOLUCION.
     */
    async crear(dto: CrearDevolucionDto): Promise<DevolucionRegistradaDto> {
        return db.transaction(async (tx) => {
            // 1. Exigir caja abierta (RN-08)
            const [cajaAbierta] = await tx
                .select({ id: cajas.id })
                .from(cajas)
                .where(eq(cajas.estado, 'ABIERTA'))
                .orderBy(desc(cajas.id))
                .limit(1);

            if (!cajaAbierta) {
                throw new BadRequestException(
                    'Debes tener una caja abierta para registrar una devolución.',
                );
            }

            // 2. Verificar que la venta existe
            const [venta] = await tx
                .select({ id: ventas.id })
                .from(ventas)
                .where(eq(ventas.id, dto.ventaId))
                .limit(1);

            if (!venta) {
                throw new NotFoundException(`La venta #${dto.ventaId} no existe.`);
            }

            // 3. Cargar líneas vendidas y cantidades ya devueltas
            const lineasVendidas = await tx
                .select({
                    productoId: detalleVenta.productoId,
                    cantidadVendida: detalleVenta.cantidad,
                    precioCentavos: detalleVenta.precioCentavos,
                })
                .from(detalleVenta)
                .where(eq(detalleVenta.ventaId, dto.ventaId));

            const devsPrevias = await tx
                .select({ id: devoluciones.id })
                .from(devoluciones)
                .where(eq(devoluciones.ventaId, dto.ventaId));

            const yaDevueltoMap = new Map<number, number>();
            if (devsPrevias.length > 0) {
                const detPrevios = await tx
                    .select({
                        productoId: detalleDevolucion.productoId,
                        cantidad: detalleDevolucion.cantidad,
                    })
                    .from(detalleDevolucion)
                    .where(
                        inArray(
                            detalleDevolucion.devolucionId,
                            devsPrevias.map((d) => d.id),
                        ),
                    );

                for (const d of detPrevios) {
                    yaDevueltoMap.set(d.productoId, (yaDevueltoMap.get(d.productoId) ?? 0) + d.cantidad);
                }
            }

            // 4. Validar cantidades y calcular monto en servidor
            let resultado;
            try {
                resultado = validarYCalcularDevolucion(lineasVendidas, yaDevueltoMap, dto.items);
            } catch (err) {
                if (err instanceof ErrorReglaDevolucion) {
                    throw new BadRequestException(err.message);
                }
                throw err;
            }

            // 5. Insertar devolución en la caja abierta actual
            const [devInsertada] = await tx
                .insert(devoluciones)
                .values({
                    ventaId: dto.ventaId,
                    cajaId: cajaAbierta.id,
                    motivo: dto.motivo,
                    montoCentavos: resultado.montoCentavos,
                })
                .returning();

            // 6. Insertar detalle, sumar stock y registrar movimiento DEVOLUCION
            for (const linea of resultado.lineasConsolidadas) {
                await tx.insert(detalleDevolucion).values({
                    devolucionId: devInsertada.id,
                    productoId: linea.productoId,
                    cantidad: linea.cantidad,
                });

                await tx
                    .update(productos)
                    .set({ stock: sql`${productos.stock} + ${linea.cantidad}` })
                    .where(eq(productos.id, linea.productoId));

                await tx.insert(movimientosInventario).values({
                    productoId: linea.productoId,
                    tipo: 'DEVOLUCION',
                    cantidad: linea.cantidad,
                    tipoReferencia: 'DEVOLUCION',
                    idReferencia: devInsertada.id,
                    nota: `Devolución de venta #${dto.ventaId}: ${dto.motivo}`,
                });
            }

            return {
                id: devInsertada.id,
                ventaId: devInsertada.ventaId,
                cajaId: devInsertada.cajaId,
                motivo: devInsertada.motivo,
                montoCentavos: devInsertada.montoCentavos,
                fecha: devInsertada.fecha,
                items: resultado.lineasConsolidadas.map((l) => ({
                    productoId: l.productoId,
                    cantidad: l.cantidad,
                })),
            };
        });
    }
}
