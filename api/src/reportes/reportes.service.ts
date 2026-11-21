import { Injectable } from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
    ventas,
    detalleVenta,
    devoluciones,
    detalleDevolucion,
    productos,
    categorias,
    cajas,
    pedidos,
} from '../db/schema';
import { RangoFechasDto, MasVendidosQueryDto } from './reportes.schemas';
import {
    resolverRangoFechas,
    calcularMetricasNetasProducto,
    calcularPorcentajeMargen,
} from './reportes.utils';
import { esPedidoVencido } from '../pedidos/pedidos.utils';

export interface ProductoMasVendidoDto {
    productoId: number;
    nombre: string;
    categoriaNombre: string;
    stockActual: number;
    unidadesVendidas: number;
    unidadesDevueltas: number;
    unidadesNetas: number;
    ingresosNetosCentavos: number;
}

export interface ReporteMasVendidosDto {
    desde: string;
    hasta: string;
    items: ProductoMasVendidoDto[];
}

export interface ResumenCanalDto {
    canal: 'MOSTRADOR' | 'ONLINE';
    cantidadVentas: number;
    ventasBrutasCentavos: number;
    devolucionesCentavos: number;
    ventasNetasCentavos: number;
}

export interface ResumenMetodoPagoDto {
    metodoPago: 'EFECTIVO' | 'QR';
    cantidadVentas: number;
    ventasBrutasCentavos: number;
}

export interface ReporteVentasPorCanalDto {
    desde: string;
    hasta: string;
    canales: ResumenCanalDto[];
    metodosPago: ResumenMetodoPagoDto[];
    totales: {
        cantidadVentas: number;
        ventasBrutasCentavos: number;
        devolucionesCentavos: number;
        ventasNetasCentavos: number;
    };
}

export interface CierreCajaItemDto {
    id: number;
    fechaApertura: Date;
    fechaCierre: Date | null;
    montoInicialCentavos: number;
    efectivoEsperadoCentavos: number;
    efectivoContadoCentavos: number;
    diferenciaCentavos: number;
}

export interface ReporteCierresCajaDto {
    desde: string;
    hasta: string;
    totales: {
        cantidadCierres: number;
        totalEsperadoCentavos: number;
        totalContadoCentavos: number;
        diferenciaAcumuladaCentavos: number;
    };
    cierres: CierreCajaItemDto[];
}

export interface MargenProductoDto {
    productoId: number;
    nombre: string;
    categoriaNombre: string;
    unidadesNetas: number;
    ingresosNetosCentavos: number;
    costoNetoCentavos: number;
    margenCentavos: number;
    margenPorcentaje: number;
}

export interface ReporteMargenDto {
    desde: string;
    hasta: string;
    totales: {
        ingresosNetosCentavos: number;
        costoNetoCentavos: number;
        margenTotalCentavos: number;
        margenPorcentajePromedio: number;
    };
    items: MargenProductoDto[];
}

export interface ResumenDashboardDto {
    ventasHoy: {
        cantidad: number;
        brutasCentavos: number;
        devolucionesCentavos: number;
        netasCentavos: number;
    };
    cajaActual: {
        id: number;
        fechaApertura: Date;
        efectivoEsperadoCentavos: number;
    } | null;
    pedidosPendientes: {
        total: number;
        vencidos: number;
    };
    catalogo: {
        productosActivos: number;
        stockBajo: number;
        agotados: number;
        categoriasActivas: number;
        categoriasInactivas: number;
    };
    alertasStock: {
        id: number;
        nombre: string;
        categoriaNombre: string;
        stock: number;
    }[];
}

@Injectable()
export class ReportesService {
    /**
     * KPIs en tiempo real para el Dashboard Principal (/admin/dashboard).
     */
    async obtenerResumenDashboard(): Promise<ResumenDashboardDto> {
        const ahora = new Date();
        const inicioHoy = new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            0,
            0,
            0,
            0,
        );
        const finHoy = new Date(
            ahora.getFullYear(),
            ahora.getMonth(),
            ahora.getDate(),
            23,
            59,
            59,
            999,
        );

        // 1. Ventas y devoluciones de hoy
        const [ventasHoyRow] = await db
            .select({
                cantidad: sql<number>`count(*)`,
                brutas: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
            })
            .from(ventas)
            .where(and(gte(ventas.fecha, inicioHoy), lte(ventas.fecha, finHoy)));

        const [devHoyRow] = await db
            .select({
                total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
            })
            .from(devoluciones)
            .where(and(gte(devoluciones.fecha, inicioHoy), lte(devoluciones.fecha, finHoy)));

        const brutasHoy = Number(ventasHoyRow?.brutas ?? 0);
        const devHoy = Number(devHoyRow?.total ?? 0);

        // 2. Caja abierta actual
        const [cajaAbierta] = await db
            .select({
                id: cajas.id,
                fechaApertura: cajas.fechaApertura,
                montoInicialCentavos: cajas.montoInicialCentavos,
            })
            .from(cajas)
            .where(eq(cajas.estado, 'ABIERTA'))
            .orderBy(desc(cajas.id))
            .limit(1);

        let cajaResumen: ResumenDashboardDto['cajaActual'] = null;
        if (cajaAbierta) {
            const [efRow] = await db
                .select({
                    total: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
                })
                .from(ventas)
                .where(and(eq(ventas.cajaId, cajaAbierta.id), eq(ventas.metodoPago, 'EFECTIVO')));

            const [devCajaRow] = await db
                .select({
                    total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
                })
                .from(devoluciones)
                .where(eq(devoluciones.cajaId, cajaAbierta.id));

            cajaResumen = {
                id: cajaAbierta.id,
                fechaApertura: cajaAbierta.fechaApertura,
                efectivoEsperadoCentavos:
                    cajaAbierta.montoInicialCentavos +
                    Number(efRow?.total ?? 0) -
                    Number(devCajaRow?.total ?? 0),
            };
        }

        // 3. Pedidos pendientes y vencidos
        const pendientesRows = await db
            .select({
                estado: pedidos.estado,
                fechaCreacion: pedidos.fechaCreacion,
            })
            .from(pedidos)
            .where(eq(pedidos.estado, 'PENDIENTE'));

        const vencidosCount = pendientesRows.filter((p) =>
            esPedidoVencido(p.estado, p.fechaCreacion, ahora),
        ).length;

        // 4. Salud de catálogo e inventario
        const [prodStats] = await db
            .select({
                activos: sql<number>`coalesce(sum(case when ${productos.activo} = 1 then 1 else 0 end), 0)`,
                stockBajo: sql<number>`coalesce(sum(case when ${productos.activo} = 1 and ${productos.stock} between 1 and 5 then 1 else 0 end), 0)`,
                agotados: sql<number>`coalesce(sum(case when ${productos.activo} = 1 and ${productos.stock} = 0 then 1 else 0 end), 0)`,
            })
            .from(productos);

        const [catStats] = await db
            .select({
                activas: sql<number>`coalesce(sum(case when ${categorias.activa} = 1 then 1 else 0 end), 0)`,
                inactivas: sql<number>`coalesce(sum(case when ${categorias.activa} = 0 then 1 else 0 end), 0)`,
            })
            .from(categorias);

        const alertasStock = await db
            .select({
                id: productos.id,
                nombre: productos.nombre,
                categoriaNombre: categorias.nombre,
                stock: productos.stock,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(and(eq(productos.activo, true), lte(productos.stock, 5)))
            .orderBy(asc(productos.stock), asc(productos.nombre))
            .limit(8);

        return {
            ventasHoy: {
                cantidad: Number(ventasHoyRow?.cantidad ?? 0),
                brutasCentavos: brutasHoy,
                devolucionesCentavos: devHoy,
                netasCentavos: brutasHoy - devHoy,
            },
            cajaActual: cajaResumen,
            pedidosPendientes: {
                total: pendientesRows.length,
                vencidos: vencidosCount,
            },
            catalogo: {
                productosActivos: Number(prodStats?.activos ?? 0),
                stockBajo: Number(prodStats?.stockBajo ?? 0),
                agotados: Number(prodStats?.agotados ?? 0),
                categoriasActivas: Number(catStats?.activas ?? 0),
                categoriasInactivas: Number(catStats?.inactivas ?? 0),
            },
            alertasStock,
        };
    }

    /**
     * Reporte: Productos más vendidos en un rango de fechas (restando devoluciones).
     */
    async masVendidos(query: MasVendidosQueryDto): Promise<ReporteMasVendidosDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);
        const mapa = await this.agregarPorProductoEnRango(rango.inicio, rango.fin);

        const items: ProductoMasVendidoDto[] = Array.from(mapa.values())
            .map((p) => {
                const m = calcularMetricasNetasProducto(
                    p.unidadesVendidas,
                    p.ingresosBrutosCentavos,
                    p.costoBrutoCentavos,
                    p.unidadesDevueltas,
                    p.ingresosDevueltosCentavos,
                    p.costoDevueltoCentavos,
                );
                return {
                    productoId: p.productoId,
                    nombre: p.nombre,
                    categoriaNombre: p.categoriaNombre,
                    stockActual: p.stockActual,
                    unidadesVendidas: m.unidadesVendidas,
                    unidadesDevueltas: m.unidadesDevueltas,
                    unidadesNetas: m.unidadesNetas,
                    ingresosNetosCentavos: m.ingresosNetosCentavos,
                };
            })
            .filter((i) => i.unidadesVendidas > 0 || i.unidadesDevueltas > 0)
            .sort(
                (a, b) =>
                    b.unidadesNetas - a.unidadesNetas ||
                    b.ingresosNetosCentavos - a.ingresosNetosCentavos,
            )
            .slice(0, query.limite ?? 20);

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            items,
        };
    }

    /**
     * Reporte: Ventas por canal (Mostrador vs. Online) y método de pago, restando devoluciones.
     */
    async ventasPorCanal(query: RangoFechasDto): Promise<ReporteVentasPorCanalDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);

        const ventasCanalRows = await db
            .select({
                canal: ventas.canal,
                cantidad: sql<number>`count(*)`,
                brutas: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
            })
            .from(ventas)
            .where(and(gte(ventas.fecha, rango.inicio), lte(ventas.fecha, rango.fin)))
            .groupBy(ventas.canal);

        const devCanalRows = await db
            .select({
                canal: ventas.canal,
                total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
            })
            .from(devoluciones)
            .innerJoin(ventas, eq(devoluciones.ventaId, ventas.id))
            .where(and(gte(devoluciones.fecha, rango.inicio), lte(devoluciones.fecha, rango.fin)))
            .groupBy(ventas.canal);

        const metodoRows = await db
            .select({
                metodoPago: ventas.metodoPago,
                cantidad: sql<number>`count(*)`,
                brutas: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
            })
            .from(ventas)
            .where(and(gte(ventas.fecha, rango.inicio), lte(ventas.fecha, rango.fin)))
            .groupBy(ventas.metodoPago);

        const mapaVentas = new Map(
            ventasCanalRows.map((r) => [
                r.canal,
                { cantidad: Number(r.cantidad), brutas: Number(r.brutas) },
            ]),
        );
        const mapaDev = new Map(devCanalRows.map((r) => [r.canal, Number(r.total)]));

        const canales: ResumenCanalDto[] = (['MOSTRADOR', 'ONLINE'] as const).map((canal) => {
            const v = mapaVentas.get(canal) ?? { cantidad: 0, brutas: 0 };
            const d = mapaDev.get(canal) ?? 0;
            return {
                canal,
                cantidadVentas: v.cantidad,
                ventasBrutasCentavos: v.brutas,
                devolucionesCentavos: d,
                ventasNetasCentavos: v.brutas - d,
            };
        });

        const mapaMetodos = new Map(
            metodoRows.map((r) => [
                r.metodoPago,
                { cantidad: Number(r.cantidad), brutas: Number(r.brutas) },
            ]),
        );

        const metodosPago: ResumenMetodoPagoDto[] = (['EFECTIVO', 'QR'] as const).map(
            (metodoPago) => {
                const m = mapaMetodos.get(metodoPago) ?? { cantidad: 0, brutas: 0 };
                return {
                    metodoPago,
                    cantidadVentas: m.cantidad,
                    ventasBrutasCentavos: m.brutas,
                };
            },
        );

        const totales = canales.reduce(
            (acc, c) => ({
                cantidadVentas: acc.cantidadVentas + c.cantidadVentas,
                ventasBrutasCentavos: acc.ventasBrutasCentavos + c.ventasBrutasCentavos,
                devolucionesCentavos: acc.devolucionesCentavos + c.devolucionesCentavos,
                ventasNetasCentavos: acc.ventasNetasCentavos + c.ventasNetasCentavos,
            }),
            {
                cantidadVentas: 0,
                ventasBrutasCentavos: 0,
                devolucionesCentavos: 0,
                ventasNetasCentavos: 0,
            },
        );

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            canales,
            metodosPago,
            totales,
        };
    }

    /**
     * Reporte: Historial de cierres de caja en el rango de fechas.
     */
    async cierresDeCaja(query: RangoFechasDto): Promise<ReporteCierresCajaDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);

        const rows = await db
            .select({
                id: cajas.id,
                fechaApertura: cajas.fechaApertura,
                fechaCierre: cajas.fechaCierre,
                montoInicialCentavos: cajas.montoInicialCentavos,
                efectivoEsperadoCentavos: cajas.efectivoEsperadoCentavos,
                efectivoContadoCentavos: cajas.efectivoContadoCentavos,
                diferenciaCentavos: cajas.diferenciaCentavos,
            })
            .from(cajas)
            .where(
                and(
                    eq(cajas.estado, 'CERRADA'),
                    gte(cajas.fechaCierre, rango.inicio),
                    lte(cajas.fechaCierre, rango.fin),
                ),
            )
            .orderBy(desc(cajas.fechaCierre), desc(cajas.id));

        const cierres: CierreCajaItemDto[] = rows.map((r) => ({
            id: r.id,
            fechaApertura: r.fechaApertura,
            fechaCierre: r.fechaCierre,
            montoInicialCentavos: r.montoInicialCentavos,
            efectivoEsperadoCentavos: r.efectivoEsperadoCentavos ?? 0,
            efectivoContadoCentavos: r.efectivoContadoCentavos ?? 0,
            diferenciaCentavos: r.diferenciaCentavos ?? 0,
        }));

        const totales = cierres.reduce(
            (acc, c) => ({
                cantidadCierres: acc.cantidadCierres + 1,
                totalEsperadoCentavos: acc.totalEsperadoCentavos + c.efectivoEsperadoCentavos,
                totalContadoCentavos: acc.totalContadoCentavos + c.efectivoContadoCentavos,
                diferenciaAcumuladaCentavos:
                    acc.diferenciaAcumuladaCentavos + c.diferenciaCentavos,
            }),
            {
                cantidadCierres: 0,
                totalEsperadoCentavos: 0,
                totalContadoCentavos: 0,
                diferenciaAcumuladaCentavos: 0,
            },
        );

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            totales,
            cierres,
        };
    }

    /**
     * Reporte: Margen de ganancia por producto en el rango de fechas (restando devoluciones).
     */
    async margenPorProducto(query: RangoFechasDto): Promise<ReporteMargenDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);
        const mapa = await this.agregarPorProductoEnRango(rango.inicio, rango.fin);

        const items: MargenProductoDto[] = Array.from(mapa.values())
            .map((p) => {
                const m = calcularMetricasNetasProducto(
                    p.unidadesVendidas,
                    p.ingresosBrutosCentavos,
                    p.costoBrutoCentavos,
                    p.unidadesDevueltas,
                    p.ingresosDevueltosCentavos,
                    p.costoDevueltoCentavos,
                );
                return {
                    productoId: p.productoId,
                    nombre: p.nombre,
                    categoriaNombre: p.categoriaNombre,
                    unidadesNetas: m.unidadesNetas,
                    ingresosNetosCentavos: m.ingresosNetosCentavos,
                    costoNetoCentavos: m.costoNetoCentavos,
                    margenCentavos: m.margenCentavos,
                    margenPorcentaje: m.margenPorcentaje,
                };
            })
            .sort((a, b) => b.margenCentavos - a.margenCentavos);

        const ingresosNetosCentavos = items.reduce((a, i) => a + i.ingresosNetosCentavos, 0);
        const costoNetoCentavos = items.reduce((a, i) => a + i.costoNetoCentavos, 0);
        const margenTotalCentavos = ingresosNetosCentavos - costoNetoCentavos;

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            totales: {
                ingresosNetosCentavos,
                costoNetoCentavos,
                margenTotalCentavos,
                margenPorcentajePromedio: calcularPorcentajeMargen(
                    margenTotalCentavos,
                    ingresosNetosCentavos,
                ),
            },
            items,
        };
    }

    private async agregarPorProductoEnRango(inicio: Date, fin: Date) {
        const ventasRows = await db
            .select({
                productoId: detalleVenta.productoId,
                nombre: productos.nombre,
                categoriaNombre: categorias.nombre,
                stockActual: productos.stock,
                unidadesVendidas: sql<number>`coalesce(sum(${detalleVenta.cantidad}), 0)`,
                ingresosBrutos: sql<number>`coalesce(sum(${detalleVenta.cantidad} * ${detalleVenta.precioCentavos}), 0)`,
                costoBruto: sql<number>`coalesce(sum(${detalleVenta.cantidad} * ${detalleVenta.costoCentavos}), 0)`,
            })
            .from(detalleVenta)
            .innerJoin(ventas, eq(detalleVenta.ventaId, ventas.id))
            .innerJoin(productos, eq(detalleVenta.productoId, productos.id))
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(and(gte(ventas.fecha, inicio), lte(ventas.fecha, fin)))
            .groupBy(detalleVenta.productoId, productos.nombre, categorias.nombre, productos.stock);

        const devRows = await db
            .select({
                productoId: detalleDevolucion.productoId,
                nombre: productos.nombre,
                categoriaNombre: categorias.nombre,
                stockActual: productos.stock,
                unidadesDevueltas: sql<number>`coalesce(sum(${detalleDevolucion.cantidad}), 0)`,
                ingresosDevueltos: sql<number>`coalesce(sum(${detalleDevolucion.cantidad} * ${detalleVenta.precioCentavos}), 0)`,
                costoDevuelto: sql<number>`coalesce(sum(${detalleDevolucion.cantidad} * ${detalleVenta.costoCentavos}), 0)`,
            })
            .from(detalleDevolucion)
            .innerJoin(devoluciones, eq(detalleDevolucion.devolucionId, devoluciones.id))
            .innerJoin(
                detalleVenta,
                and(
                    eq(detalleVenta.ventaId, devoluciones.ventaId),
                    eq(detalleVenta.productoId, detalleDevolucion.productoId),
                ),
            )
            .innerJoin(productos, eq(detalleDevolucion.productoId, productos.id))
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(and(gte(devoluciones.fecha, inicio), lte(devoluciones.fecha, fin)))
            .groupBy(
                detalleDevolucion.productoId,
                productos.nombre,
                categorias.nombre,
                productos.stock,
            );

        const mapa = new Map<
            number,
            {
                productoId: number;
                nombre: string;
                categoriaNombre: string;
                stockActual: number;
                unidadesVendidas: number;
                ingresosBrutosCentavos: number;
                costoBrutoCentavos: number;
                unidadesDevueltas: number;
                ingresosDevueltosCentavos: number;
                costoDevueltoCentavos: number;
            }
        >();

        for (const r of ventasRows) {
            mapa.set(r.productoId, {
                productoId: r.productoId,
                nombre: r.nombre,
                categoriaNombre: r.categoriaNombre,
                stockActual: r.stockActual,
                unidadesVendidas: Number(r.unidadesVendidas),
                ingresosBrutosCentavos: Number(r.ingresosBrutos),
                costoBrutoCentavos: Number(r.costoBruto),
                unidadesDevueltas: 0,
                ingresosDevueltosCentavos: 0,
                costoDevueltoCentavos: 0,
            });
        }

        for (const d of devRows) {
            const prev = mapa.get(d.productoId);
            if (prev) {
                prev.unidadesDevueltas += Number(d.unidadesDevueltas);
                prev.ingresosDevueltosCentavos += Number(d.ingresosDevueltos);
                prev.costoDevueltoCentavos += Number(d.costoDevuelto);
            } else {
                mapa.set(d.productoId, {
                    productoId: d.productoId,
                    nombre: d.nombre,
                    categoriaNombre: d.categoriaNombre,
                    stockActual: d.stockActual,
                    unidadesVendidas: 0,
                    ingresosBrutosCentavos: 0,
                    costoBrutoCentavos: 0,
                    unidadesDevueltas: Number(d.unidadesDevueltas),
                    ingresosDevueltosCentavos: Number(d.ingresosDevueltos),
                    costoDevueltoCentavos: Number(d.costoDevuelto),
                });
            }
        }

        return mapa;
    }
}
