import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { eq, and, gte, inArray, desc, sql, like, or } from 'drizzle-orm';
import { db } from '../db/db';
import {
    pedidos,
    detallePedido,
    productos,
    ventas,
    detalleVenta,
    cajas,
    movimientosInventario,
} from '../db/schema';
import { sumarCentavos, multiplicarCentavos } from '../common/dinero';
import {
    CrearPedidoDto,
    ListarPedidosQueryDto,
    ConfirmarPedidoDto,
} from './pedidos.schemas';
import { formatearCodigoPedido, esPedidoVencido } from './pedidos.utils';

export interface ItemPedidoDetalleDto {
    id: number;
    productoId: number;
    nombreProducto: string;
    imagenPrincipal: string | null;
    cantidad: number;
    precioCentavos: number;
    subtotalCentavos: number;
    notaCliente: string | null;
    stockActual: number;
    productoActivo: boolean;
}

export interface PedidoResumenDto {
    id: number;
    codigo: string;
    nombreCliente: string | null;
    telefonoCliente: string | null;
    totalCentavos: number;
    estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO';
    fechaCreacion: Date;
    fechaConfirmacion: Date | null;
    vencido: boolean;
    cantidadItems: number;
}

export interface PedidoDetalleDto extends PedidoResumenDto {
    items: ItemPedidoDetalleDto[];
}

export interface PedidoCreadoPublicoDto {
    id: number;
    codigo: string;
    nombreCliente: string;
    telefonoCliente: string | null;
    totalCentavos: number;
    estado: 'PENDIENTE';
    fechaCreacion: Date;
    items: {
        productoId: number;
        nombreProducto: string;
        cantidad: number;
        precioCentavos: number;
        subtotalCentavos: number;
        notaCliente: string | null;
    }[];
}

@Injectable()
export class PedidosService {
    /**
     * Crea un pedido PENDIENTE sin descontar ni reservar stock (RN-01, RN-03, RN-09).
     */
    async crear(dto: CrearPedidoDto): Promise<PedidoCreadoPublicoDto> {
        const productoIds = dto.items.map((i) => i.productoId);

        return db.transaction(async (tx) => {
            const encontrados = await tx
                .select({
                    id: productos.id,
                    nombre: productos.nombre,
                    precioCentavos: productos.precioCentavos,
                    stock: productos.stock,
                    activo: productos.activo,
                })
                .from(productos)
                .where(inArray(productos.id, productoIds));

            const mapaProductos = new Map(encontrados.map((p) => [p.id, p]));

            const lineasPreparadas: {
                productoId: number;
                nombreProducto: string;
                cantidad: number;
                precioCentavos: number;
                subtotalCentavos: number;
                notaCliente: string | null;
            }[] = [];

            for (const item of dto.items) {
                const prod = mapaProductos.get(item.productoId);
                if (!prod || !prod.activo) {
                    throw new BadRequestException(
                        `Uno de los productos seleccionados ya no está disponible.`,
                    );
                }
                if (prod.stock < item.cantidad) {
                    throw new ConflictException(
                        `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}.`,
                    );
                }

                const subtotal = multiplicarCentavos(prod.precioCentavos, item.cantidad);
                const notaLimpia = item.notaCliente?.trim() || null;

                lineasPreparadas.push({
                    productoId: prod.id,
                    nombreProducto: prod.nombre,
                    cantidad: item.cantidad,
                    precioCentavos: prod.precioCentavos,
                    subtotalCentavos: subtotal,
                    notaCliente: notaLimpia,
                });
            }

            const totalCentavos = sumarCentavos(
                ...lineasPreparadas.map((l) => l.subtotalCentavos),
            );

            const codigoTemporal = `TMP-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
            const telefonoLimpio = dto.telefonoCliente?.trim() || null;

            const [insertado] = await tx
                .insert(pedidos)
                .values({
                    codigo: codigoTemporal,
                    nombreCliente: dto.nombreCliente,
                    telefonoCliente: telefonoLimpio,
                    totalCentavos,
                    estado: 'PENDIENTE',
                })
                .returning();

            const codigoFinal = formatearCodigoPedido(insertado.id);

            await tx
                .update(pedidos)
                .set({ codigo: codigoFinal })
                .where(eq(pedidos.id, insertado.id));

            for (const linea of lineasPreparadas) {
                await tx.insert(detallePedido).values({
                    pedidoId: insertado.id,
                    productoId: linea.productoId,
                    cantidad: linea.cantidad,
                    precioCentavos: linea.precioCentavos,
                    notaCliente: linea.notaCliente,
                });
            }

            return {
                id: insertado.id,
                codigo: codigoFinal,
                nombreCliente: dto.nombreCliente,
                telefonoCliente: telefonoLimpio,
                totalCentavos,
                estado: 'PENDIENTE',
                fechaCreacion: insertado.fechaCreacion,
                items: lineasPreparadas,
            };
        });
    }

    /**
     * Lista pedidos para la administradora con filtro opcional por estado, búsqueda (código o cliente) y cálculo de vencimiento.
     */
    async listar(filtro?: ListarPedidosQueryDto): Promise<PedidoResumenDto[]> {
        const condiciones = [];

        if (filtro?.estado) {
            condiciones.push(eq(pedidos.estado, filtro.estado));
        }

        if (filtro?.q && filtro.q.trim().length > 0) {
            const termino = `%${filtro.q.trim().toLowerCase()}%`;
            condiciones.push(
                or(
                    like(sql`lower(${pedidos.codigo})`, termino),
                    like(sql`lower(coalesce(${pedidos.nombreCliente}, ''))`, termino),
                )!,
            );
        }

        const query = db
            .select({
                id: pedidos.id,
                codigo: pedidos.codigo,
                nombreCliente: pedidos.nombreCliente,
                telefonoCliente: pedidos.telefonoCliente,
                totalCentavos: pedidos.totalCentavos,
                estado: pedidos.estado,
                fechaCreacion: pedidos.fechaCreacion,
                fechaConfirmacion: pedidos.fechaConfirmacion,
            })
            .from(pedidos)
            .orderBy(desc(pedidos.id));

        const rows = condiciones.length > 0 ? await query.where(and(...condiciones)) : await query;

        if (rows.length === 0) return [];

        const ids = rows.map((r) => r.id);
        const conteos = await db
            .select({
                pedidoId: detallePedido.pedidoId,
                totalUnidades: sql<number>`coalesce(sum(${detallePedido.cantidad}), 0)`,
            })
            .from(detallePedido)
            .where(inArray(detallePedido.pedidoId, ids))
            .groupBy(detallePedido.pedidoId);

        const mapaConteos = new Map(conteos.map((c) => [c.pedidoId, Number(c.totalUnidades)]));
        const ahora = new Date();

        return rows.map((r) => ({
            ...r,
            vencido: esPedidoVencido(r.estado, r.fechaCreacion, ahora),
            cantidadItems: mapaConteos.get(r.id) ?? 0,
        }));
    }

    /**
     * Obtiene un pedido completo con detalle, notas del cliente y stock actual de cada producto.
     */
    async obtenerPorId(id: number): Promise<PedidoDetalleDto> {
        const [pedido] = await db
            .select()
            .from(pedidos)
            .where(eq(pedidos.id, id))
            .limit(1);

        if (!pedido) {
            throw new NotFoundException(`Pedido #${id} no encontrado`);
        }

        const detalles = await db
            .select({
                id: detallePedido.id,
                productoId: detallePedido.productoId,
                nombreProducto: productos.nombre,
                imagenPrincipal: productos.imagenPrincipal,
                cantidad: detallePedido.cantidad,
                precioCentavos: detallePedido.precioCentavos,
                notaCliente: detallePedido.notaCliente,
                stockActual: productos.stock,
                productoActivo: productos.activo,
            })
            .from(detallePedido)
            .innerJoin(productos, eq(detallePedido.productoId, productos.id))
            .where(eq(detallePedido.pedidoId, id))
            .orderBy(detallePedido.id);

        const items: ItemPedidoDetalleDto[] = detalles.map((d) => ({
            ...d,
            subtotalCentavos: multiplicarCentavos(d.precioCentavos, d.cantidad),
        }));

        const cantidadItems = items.reduce((acc, i) => acc + i.cantidad, 0);

        return {
            id: pedido.id,
            codigo: pedido.codigo,
            nombreCliente: pedido.nombreCliente,
            telefonoCliente: pedido.telefonoCliente,
            totalCentavos: pedido.totalCentavos,
            estado: pedido.estado,
            fechaCreacion: pedido.fechaCreacion,
            fechaConfirmacion: pedido.fechaConfirmacion,
            vencido: esPedidoVencido(pedido.estado, pedido.fechaCreacion),
            cantidadItems,
            items,
        };
    }

    /**
     * Confirma un pedido PENDIENTE: permite ajustar cantidades, re-valida y descuenta stock,
     * crea la venta ONLINE con costo vigente, registra movimientos de inventario y cierra el pedido.
     */
    async confirmar(
        id: number,
        dto: ConfirmarPedidoDto,
        administradoraId: number,
    ): Promise<{ pedido: PedidoDetalleDto; ventaId: number }> {
        const ventaId = await db.transaction(async (tx) => {
            const [pedido] = await tx
                .select()
                .from(pedidos)
                .where(eq(pedidos.id, id))
                .limit(1);

            if (!pedido) {
                throw new NotFoundException(`Pedido #${id} no encontrado`);
            }

            if (pedido.estado !== 'PENDIENTE') {
                throw new ConflictException(
                    `Solo se pueden confirmar pedidos en estado PENDIENTE (estado actual: ${pedido.estado}).`,
                );
            }

            const detallesActuales = await tx
                .select()
                .from(detallePedido)
                .where(eq(detallePedido.pedidoId, id));

            if (detallesActuales.length === 0) {
                throw new BadRequestException('El pedido no tiene productos para confirmar.');
            }

            // Aplicar ajustes opcionales de cantidades
            const mapaAjustes = new Map(
                (dto.itemsAjustados ?? []).map((a) => [a.productoId, a.cantidad]),
            );

            for (const prodIdAjustado of mapaAjustes.keys()) {
                const pertenece = detallesActuales.some((d) => d.productoId === prodIdAjustado);
                if (!pertenece) {
                    throw new BadRequestException(
                        `El producto #${prodIdAjustado} no pertenece a este pedido.`,
                    );
                }
            }

            const lineasFinales: {
                detalleId: number;
                productoId: number;
                cantidad: number;
                precioCentavos: number;
            }[] = [];

            for (const det of detallesActuales) {
                const nuevaCantidad = mapaAjustes.has(det.productoId)
                    ? mapaAjustes.get(det.productoId)!
                    : det.cantidad;

                if (nuevaCantidad === 0) {
                    await tx.delete(detallePedido).where(eq(detallePedido.id, det.id));
                    continue;
                }

                if (nuevaCantidad !== det.cantidad) {
                    await tx
                        .update(detallePedido)
                        .set({ cantidad: nuevaCantidad })
                        .where(eq(detallePedido.id, det.id));
                }

                lineasFinales.push({
                    detalleId: det.id,
                    productoId: det.productoId,
                    cantidad: nuevaCantidad,
                    precioCentavos: det.precioCentavos,
                });
            }

            if (lineasFinales.length === 0) {
                throw new BadRequestException(
                    'No puedes confirmar un pedido sin productos. Si no se concretó, cancélalo.',
                );
            }

            // Consultar productos actuales para nombre y costo vigente
            const prodIds = lineasFinales.map((l) => l.productoId);
            const prodsActuales = await tx
                .select({
                    id: productos.id,
                    nombre: productos.nombre,
                    costoCentavos: productos.costoCentavos,
                    stock: productos.stock,
                    activo: productos.activo,
                })
                .from(productos)
                .where(inArray(productos.id, prodIds));

            const mapaProds = new Map(prodsActuales.map((p) => [p.id, p]));

            // Descuento de stock condicionado (5.1)
            for (const linea of lineasFinales) {
                const prod = mapaProds.get(linea.productoId);
                if (!prod || !prod.activo) {
                    throw new ConflictException(
                        `El producto "${prod?.nombre ?? '#' + linea.productoId}" está dado de baja y no se puede vender.`,
                    );
                }

                const [actualizado] = await tx
                    .update(productos)
                    .set({ stock: sql`${productos.stock} - ${linea.cantidad}` })
                    .where(
                        and(
                            eq(productos.id, linea.productoId),
                            eq(productos.activo, true),
                            gte(productos.stock, linea.cantidad),
                        ),
                    )
                    .returning({ id: productos.id });

                if (!actualizado) {
                    throw new ConflictException(
                        `Stock insuficiente para "${prod.nombre}". Disponible: ${prod.stock}, solicitado: ${linea.cantidad}.`,
                    );
                }
            }

            // Recalcular total final en centavos
            const totalCentavos = sumarCentavos(
                ...lineasFinales.map((l) => multiplicarCentavos(l.precioCentavos, l.cantidad)),
            );

            // Vincular a la caja abierta si existe (opcional en canal ONLINE)
            const [cajaAbierta] = await tx
                .select({ id: cajas.id })
                .from(cajas)
                .where(eq(cajas.estado, 'ABIERTA'))
                .limit(1);

            const [ventaCreada] = await tx
                .insert(ventas)
                .values({
                    cajaId: cajaAbierta?.id ?? null,
                    pedidoId: id,
                    administradoraId,
                    canal: 'ONLINE',
                    metodoPago: dto.metodoPago,
                    totalCentavos,
                })
                .returning({ id: ventas.id });

            for (const linea of lineasFinales) {
                const prod = mapaProds.get(linea.productoId)!;

                await tx.insert(detalleVenta).values({
                    ventaId: ventaCreada.id,
                    productoId: linea.productoId,
                    cantidad: linea.cantidad,
                    precioCentavos: linea.precioCentavos,
                    costoCentavos: prod.costoCentavos,
                });

                await tx.insert(movimientosInventario).values({
                    productoId: linea.productoId,
                    tipo: 'SALIDA',
                    cantidad: linea.cantidad,
                    tipoReferencia: 'VENTA',
                    idReferencia: ventaCreada.id,
                    nota: `Venta online por confirmación de pedido ${pedido.codigo}`,
                });
            }

            await tx
                .update(pedidos)
                .set({
                    estado: 'CONFIRMADO',
                    totalCentavos,
                    fechaConfirmacion: new Date(),
                })
                .where(eq(pedidos.id, id));

            return ventaCreada.id;
        });

        const pedidoActualizado = await this.obtenerPorId(id);
        return { pedido: pedidoActualizado, ventaId };
    }

    /**
     * Cancela un pedido PENDIENTE sin modificar stock ni crear venta.
     */
    async cancelar(id: number): Promise<PedidoDetalleDto> {
        const [pedido] = await db
            .select()
            .from(pedidos)
            .where(eq(pedidos.id, id))
            .limit(1);

        if (!pedido) {
            throw new NotFoundException(`Pedido #${id} no encontrado`);
        }

        if (pedido.estado !== 'PENDIENTE') {
            throw new ConflictException(
                `Solo se pueden cancelar pedidos en estado PENDIENTE (estado actual: ${pedido.estado}).`,
            );
        }

        await db
            .update(pedidos)
            .set({ estado: 'CANCELADO' })
            .where(eq(pedidos.id, id));

        return this.obtenerPorId(id);
    }
}
