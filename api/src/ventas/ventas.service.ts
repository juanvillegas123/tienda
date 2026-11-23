import {
    Injectable,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
    cajas,
    productos,
    ventas,
    detalleVenta,
    devoluciones,
    detalleDevolucion,
    movimientosInventario,
} from '../db/schema';
import { CrearVentaDto, ListarVentasQueryDto } from './ventas.schemas';
import { sumarCentavos, calcularPrecioConDescuento } from '../common/dinero';

export interface DetalleVentaDto {
    id: number;
    productoId: number;
    nombreProducto: string;
    cantidad: number;
    cantidadDevuelta: number;
    cantidadDevolvible: number;
    precioCentavos: number;
    precioOriginalCentavos: number;
    descuentoPorcentaje: number;
    costoCentavos: number;
}

export interface DevolucionEnVentaDto {
    id: number;
    cajaId: number;
    motivo: string;
    montoCentavos: number;
    fecha: Date;
}

export interface VentaDto {
    id: number;
    cajaId: number | null;
    pedidoId: number | null;
    administradoraId: number;
    canal: 'MOSTRADOR' | 'ONLINE';
    metodoPago: 'EFECTIVO' | 'QR';
    totalCentavos: number;
    fecha: Date;
    items: DetalleVentaDto[];
    devoluciones: DevolucionEnVentaDto[];
}

@Injectable()
export class VentasService {
    /**
     * Registra una venta de mostrador (POS): exige caja abierta (RN-06),
     * recalcula precios en servidor (RN-09), descuenta stock condicionado (RN-01/RN-03)
     * y guarda costo vigente en detalle_venta.
     */
    async crear(dto: CrearVentaDto, administradoraId: number): Promise<VentaDto> {
        // Consolidar cantidades si se repite el mismo productoId
        const mapaSolicitado = new Map<number, number>();
        for (const item of dto.items) {
            mapaSolicitado.set(item.productoId, (mapaSolicitado.get(item.productoId) ?? 0) + item.cantidad);
        }
        const productoIds = Array.from(mapaSolicitado.keys());

        const ventaId = await db.transaction(async (tx) => {
            // 1. Verificar caja abierta (RN-06)
            const [cajaAbierta] = await tx
                .select({ id: cajas.id })
                .from(cajas)
                .where(eq(cajas.estado, 'ABIERTA'))
                .orderBy(desc(cajas.id))
                .limit(1);

            if (!cajaAbierta) {
                throw new BadRequestException(
                    'No hay una caja abierta. Abre la caja antes de registrar una venta de mostrador.',
                );
            }

            // 2. Consultar productos en BD
            const prodsDb = await tx
                .select({
                    id: productos.id,
                    nombre: productos.nombre,
                    precioCentavos: productos.precioCentavos,
                    descuentoPorcentaje: productos.descuentoPorcentaje,
                    costoCentavos: productos.costoCentavos,
                    stock: productos.stock,
                    activo: productos.activo,
                })
                .from(productos)
                .where(inArray(productos.id, productoIds));

            const mapaProds = new Map(prodsDb.map((p) => [p.id, p]));

            const subtotales: number[] = [];
            const lineas: {
                productoId: number;
                nombre: string;
                cantidad: number;
                precioCentavos: number;
                precioOriginalCentavos: number;
                descuentoPorcentaje: number;
                costoCentavos: number;
            }[] = [];

            for (const [productoId, cantidad] of mapaSolicitado.entries()) {
                const prod = mapaProds.get(productoId);
                if (!prod || !prod.activo) {
                    throw new BadRequestException(
                        `El producto #${productoId} no existe o fue dado de baja.`,
                    );
                }
                if (prod.stock < cantidad) {
                    throw new ConflictException(
                        `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}.`,
                    );
                }
                const pct = prod.descuentoPorcentaje ?? 0;
                const { precioFinalCentavos } = calcularPrecioConDescuento(
                    prod.precioCentavos,
                    pct,
                );
                subtotales.push(precioFinalCentavos * cantidad);
                lineas.push({
                    productoId,
                    nombre: prod.nombre,
                    cantidad,
                    precioCentavos: precioFinalCentavos,
                    precioOriginalCentavos: prod.precioCentavos,
                    descuentoPorcentaje: pct,
                    costoCentavos: prod.costoCentavos,
                });
            }

            const totalCentavos = sumarCentavos(...subtotales);

            // 3. Crear venta
            const [ventaInsertada] = await tx
                .insert(ventas)
                .values({
                    cajaId: cajaAbierta.id,
                    pedidoId: null,
                    administradoraId,
                    canal: 'MOSTRADOR',
                    metodoPago: dto.metodoPago,
                    totalCentavos,
                })
                .returning({ id: ventas.id });

            // 4. Descuento condicionado de stock + detalle_venta + movimiento de inventario
            for (const linea of lineas) {
                const actualizado = await tx
                    .update(productos)
                    .set({ stock: sql`${productos.stock} - ${linea.cantidad}` })
                    .where(
                        and(
                            eq(productos.id, linea.productoId),
                            sql`${productos.stock} >= ${linea.cantidad}`,
                        ),
                    )
                    .returning({ id: productos.id });

                if (actualizado.length === 0) {
                    throw new ConflictException(
                        `Stock insuficiente para "${linea.nombre}". Intenta nuevamente.`,
                    );
                }

                await tx.insert(detalleVenta).values({
                    ventaId: ventaInsertada.id,
                    productoId: linea.productoId,
                    cantidad: linea.cantidad,
                    precioCentavos: linea.precioCentavos,
                    precioOriginalCentavos: linea.precioOriginalCentavos,
                    descuentoPorcentaje: linea.descuentoPorcentaje,
                    costoCentavos: linea.costoCentavos,
                });

                await tx.insert(movimientosInventario).values({
                    productoId: linea.productoId,
                    tipo: 'SALIDA',
                    cantidad: linea.cantidad,
                    tipoReferencia: 'VENTA_MOSTRADOR',
                    idReferencia: ventaInsertada.id,
                    nota: `Venta de mostrador #${ventaInsertada.id}`,
                });
            }

            return ventaInsertada.id;
        });

        const [creada] = await this.cargarVentasConDetalles([ventaId]);
        return creada;
    }

    /**
     * Lista el historial de ventas con su detalle y devoluciones registradas.
     */
    async listar(filtro?: ListarVentasQueryDto): Promise<VentaDto[]> {
        const condiciones = [];
        if (filtro?.canal) {
            condiciones.push(eq(ventas.canal, filtro.canal));
        }
        if (filtro?.cajaId) {
            condiciones.push(eq(ventas.cajaId, filtro.cajaId));
        }

        const limite = filtro?.limite ?? 50;
        const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;

        const rows = await db
            .select({ id: ventas.id })
            .from(ventas)
            .where(whereClause)
            .orderBy(desc(ventas.id))
            .limit(limite);

        if (rows.length === 0) return [];
        return this.cargarVentasConDetalles(rows.map((r) => r.id));
    }

    private async cargarVentasConDetalles(ventaIds: number[]): Promise<VentaDto[]> {
        if (ventaIds.length === 0) return [];

        const ventasRows = await db
            .select()
            .from(ventas)
            .where(inArray(ventas.id, ventaIds))
            .orderBy(desc(ventas.id));

        const detallesRows = await db
            .select({
                id: detalleVenta.id,
                ventaId: detalleVenta.ventaId,
                productoId: detalleVenta.productoId,
                nombreProducto: productos.nombre,
                cantidad: detalleVenta.cantidad,
                precioCentavos: detalleVenta.precioCentavos,
                precioOriginalCentavos: detalleVenta.precioOriginalCentavos,
                descuentoPorcentaje: detalleVenta.descuentoPorcentaje,
                costoCentavos: detalleVenta.costoCentavos,
            })
            .from(detalleVenta)
            .innerJoin(productos, eq(detalleVenta.productoId, productos.id))
            .where(inArray(detalleVenta.ventaId, ventaIds));

        const devsRows = await db
            .select({
                id: devoluciones.id,
                ventaId: devoluciones.ventaId,
                cajaId: devoluciones.cajaId,
                motivo: devoluciones.motivo,
                montoCentavos: devoluciones.montoCentavos,
                fecha: devoluciones.fecha,
            })
            .from(devoluciones)
            .where(inArray(devoluciones.ventaId, ventaIds))
            .orderBy(desc(devoluciones.id));

        const devIds = devsRows.map((d) => d.id);
        const detDevRows =
            devIds.length > 0
                ? await db
                      .select({
                          devolucionId: detalleDevolucion.devolucionId,
                          productoId: detalleDevolucion.productoId,
                          cantidad: detalleDevolucion.cantidad,
                      })
                      .from(detalleDevolucion)
                      .where(inArray(detalleDevolucion.devolucionId, devIds))
                : [];

        const devToVenta = new Map(devsRows.map((d) => [d.id, d.ventaId]));
        const devueltoPorVentaYProd = new Map<string, number>();
        for (const dd of detDevRows) {
            const vId = devToVenta.get(dd.devolucionId);
            if (vId === undefined) continue;
            const clave = `${vId}:${dd.productoId}`;
            devueltoPorVentaYProd.set(clave, (devueltoPorVentaYProd.get(clave) ?? 0) + dd.cantidad);
        }

        const mapaDetalles = new Map<number, DetalleVentaDto[]>();
        for (const det of detallesRows) {
            const devuelta = devueltoPorVentaYProd.get(`${det.ventaId}:${det.productoId}`) ?? 0;
            const lista = mapaDetalles.get(det.ventaId) ?? [];
            lista.push({
                id: det.id,
                productoId: det.productoId,
                nombreProducto: det.nombreProducto,
                cantidad: det.cantidad,
                cantidadDevuelta: devuelta,
                cantidadDevolvible: Math.max(0, det.cantidad - devuelta),
                precioCentavos: det.precioCentavos,
                precioOriginalCentavos:
                    det.precioOriginalCentavos > 0
                        ? det.precioOriginalCentavos
                        : det.precioCentavos,
                descuentoPorcentaje: det.descuentoPorcentaje ?? 0,
                costoCentavos: det.costoCentavos,
            });
            mapaDetalles.set(det.ventaId, lista);
        }

        const mapaDevs = new Map<number, DevolucionEnVentaDto[]>();
        for (const dev of devsRows) {
            const lista = mapaDevs.get(dev.ventaId) ?? [];
            lista.push({
                id: dev.id,
                cajaId: dev.cajaId,
                motivo: dev.motivo,
                montoCentavos: dev.montoCentavos,
                fecha: dev.fecha,
            });
            mapaDevs.set(dev.ventaId, lista);
        }

        return ventasRows.map((v) => ({
            id: v.id,
            cajaId: v.cajaId,
            pedidoId: v.pedidoId,
            administradoraId: v.administradoraId,
            canal: v.canal,
            metodoPago: v.metodoPago,
            totalCentavos: v.totalCentavos,
            fecha: v.fecha,
            items: mapaDetalles.get(v.id) ?? [],
            devoluciones: mapaDevs.get(v.id) ?? [],
        }));
    }
}
