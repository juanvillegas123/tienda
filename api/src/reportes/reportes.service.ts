import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, gte, lte, desc, asc, inArray, sql } from 'drizzle-orm';
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
    UMBRAL_STOCK_BAJO,
    formatearFechaLocal,
    resolverRangoFechas,
    calcularRangoAnterior,
    generarFechasEnRango,
    calcularVariacionPorcentual,
    calcularMetricasNetasProducto,
    calcularPorcentajeMargen,
    calcularCoberturaYReposicion,
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
    periodoAnterior: {
        desde: string;
        hasta: string;
        ventasNetasCentavos: number;
        variacionPorcentaje: number | null;
    };
}

export interface VentaDiariaDto {
    fecha: string;
    mostradorNetoCentavos: number;
    onlineNetoCentavos: number;
    devolucionesCentavos: number;
    totalNetoCentavos: number;
    cantidadVentas: number;
}

export interface ReporteVentasPorDiaDto {
    desde: string;
    hasta: string;
    dias: VentaDiariaDto[];
}

export interface VentaCategoriaDto {
    categoriaId: number;
    nombre: string;
    unidadesNetas: number;
    ventasNetasCentavos: number;
    porcentaje: number;
}

export interface ReporteVentasPorCategoriaDto {
    desde: string;
    hasta: string;
    totalNetoCentavos: number;
    categorias: VentaCategoriaDto[];
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

export interface DetalleCierreCajaDto {
    caja: {
        id: number;
        estado: 'ABIERTA' | 'CERRADA';
        fechaApertura: Date;
        fechaCierre: Date | null;
        montoInicialCentavos: number;
        ventasEfectivoCentavos: number;
        ventasQrCentavos: number;
        devolucionesCentavos: number;
        efectivoEsperadoCentavos: number;
        efectivoContadoCentavos: number | null;
        diferenciaCentavos: number | null;
    };
    ventas: {
        id: number;
        canal: 'MOSTRADOR' | 'ONLINE';
        metodoPago: 'EFECTIVO' | 'QR';
        totalCentavos: number;
        fecha: Date;
        items: { nombreProducto: string; cantidad: number; precioCentavos: number }[];
    }[];
    devoluciones: {
        id: number;
        ventaId: number;
        motivo: string;
        montoCentavos: number;
        fecha: Date;
    }[];
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

export interface ReporteInteligenciaStockDto {
    resumen: {
        totalSinRotacion: number;
        valorInmovilizadoCentavos: number;
        productosParaReponer: number;
    };
    sinRotacion30d: {
        productoId: number;
        nombre: string;
        categoriaNombre: string;
        stockActual: number;
        costoCentavos: number;
        valorInmovilizadoCentavos: number;
    }[];
    cobertura: {
        productoId: number;
        nombre: string;
        categoriaNombre: string;
        stockActual: number;
        unidadesNetas30d: number;
        velocidadDiaria: number;
        diasCobertura: number;
        sugerenciaReposicion: number;
    }[];
}

export interface ResumenDashboardDto {
    ventasHoy: {
        cantidad: number;
        brutasCentavos: number;
        devolucionesCentavos: number;
        netasCentavos: number;
        ayerNetasCentavos: number;
        variacionVsAyerPct: number | null;
    };
    mesActual: {
        cantidadVentas: number;
        ventasNetasCentavos: number;
        ventasMesAnteriorCentavos: number;
        variacionVsMesAnteriorPct: number | null;
        gananciaNetaCentavos: number;
        margenPorcentaje: number;
    };
    inventario: {
        valorTotalCentavos: number;
        totalUnidades: number;
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
        umbralStockBajo: number;
    };
    alertasStock: {
        id: number;
        nombre: string;
        categoriaNombre: string;
        stock: number;
    }[];
    ultimasVentas: {
        id: number;
        canal: 'MOSTRADOR' | 'ONLINE';
        metodoPago: 'EFECTIVO' | 'QR';
        totalCentavos: number;
        fecha: Date;
    }[];
    ultimosPedidos: {
        id: number;
        codigo: string;
        nombreCliente: string | null;
        estado: 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO';
        totalCentavos: number;
        fechaCreacion: Date;
        vencido: boolean;
    }[];
}

@Injectable()
export class ReportesService {
    /**
     * KPIs en tiempo real + comparativas + actividad reciente para /admin/dashboard (Bloque 2).
     */
    async obtenerResumenDashboard(): Promise<ResumenDashboardDto> {
        const ahora = new Date();
        const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
        const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

        const inicioAyer = new Date(inicioHoy);
        inicioAyer.setDate(inicioAyer.getDate() - 1);
        const finAyer = new Date(finHoy);
        finAyer.setDate(finAyer.getDate() - 1);

        const inicioMesActual = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
        const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1, 0, 0, 0, 0);
        const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0, 23, 59, 59, 999);

        // 1. Ventas hoy vs ayer
        const hoyTot = await this.obtenerVentasNetasEnRango(inicioHoy, finHoy);
        const ayerTot = await this.obtenerVentasNetasEnRango(inicioAyer, finAyer);

        // 2. Mes actual vs mes anterior + ganancia neta del mes actual
        const mesActualTot = await this.obtenerVentasNetasEnRango(inicioMesActual, finHoy);
        const mesAnteriorTot = await this.obtenerVentasNetasEnRango(inicioMesAnterior, finMesAnterior);
        const mapaMesActual = await this.agregarPorProductoEnRango(inicioMesActual, finHoy);

        let ingresosMes = 0;
        let costosMes = 0;
        for (const p of mapaMesActual.values()) {
            const m = calcularMetricasNetasProducto(
                p.unidadesVendidas,
                p.ingresosBrutosCentavos,
                p.costoBrutoCentavos,
                p.unidadesDevueltas,
                p.ingresosDevueltosCentavos,
                p.costoDevueltoCentavos,
            );
            ingresosMes += m.ingresosNetosCentavos;
            costosMes += m.costoNetoCentavos;
        }
        const gananciaMes = ingresosMes - costosMes;

        // 3. Caja abierta actual
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

        // 4. Pedidos pendientes y vencidos
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

        // 5. Salud de catálogo e inventario valorizado (stock * costo) con umbral unificado <= 3
        const [prodStats] = await db
            .select({
                activos: sql<number>`coalesce(sum(case when ${productos.activo} = 1 then 1 else 0 end), 0)`,
                stockBajo: sql<number>`coalesce(sum(case when ${productos.activo} = 1 and ${productos.stock} between 1 and ${UMBRAL_STOCK_BAJO} then 1 else 0 end), 0)`,
                agotados: sql<number>`coalesce(sum(case when ${productos.activo} = 1 and ${productos.stock} = 0 then 1 else 0 end), 0)`,
                valorInventario: sql<number>`coalesce(sum(case when ${productos.activo} = 1 then ${productos.stock} * ${productos.costoCentavos} else 0 end), 0)`,
                totalUnidades: sql<number>`coalesce(sum(case when ${productos.activo} = 1 then ${productos.stock} else 0 end), 0)`,
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
            .where(and(eq(productos.activo, true), lte(productos.stock, UMBRAL_STOCK_BAJO)))
            .orderBy(asc(productos.stock), asc(productos.nombre))
            .limit(8);

        // 6. Actividad reciente: últimas 5 ventas y últimos 5 pedidos
        const ultimasVentas = await db
            .select({
                id: ventas.id,
                canal: ventas.canal,
                metodoPago: ventas.metodoPago,
                totalCentavos: ventas.totalCentavos,
                fecha: ventas.fecha,
            })
            .from(ventas)
            .orderBy(desc(ventas.id))
            .limit(5);

        const ultimosPedidosRaw = await db
            .select({
                id: pedidos.id,
                codigo: pedidos.codigo,
                nombreCliente: pedidos.nombreCliente,
                estado: pedidos.estado,
                totalCentavos: pedidos.totalCentavos,
                fechaCreacion: pedidos.fechaCreacion,
            })
            .from(pedidos)
            .orderBy(desc(pedidos.id))
            .limit(5);

        const ultimosPedidos = ultimosPedidosRaw.map((p) => ({
            ...p,
            vencido: esPedidoVencido(p.estado, p.fechaCreacion, ahora),
        }));

        return {
            ventasHoy: {
                cantidad: hoyTot.cantidad,
                brutasCentavos: hoyTot.brutasCentavos,
                devolucionesCentavos: hoyTot.devolucionesCentavos,
                netasCentavos: hoyTot.netasCentavos,
                ayerNetasCentavos: ayerTot.netasCentavos,
                variacionVsAyerPct: calcularVariacionPorcentual(
                    hoyTot.netasCentavos,
                    ayerTot.netasCentavos,
                ),
            },
            mesActual: {
                cantidadVentas: mesActualTot.cantidad,
                ventasNetasCentavos: mesActualTot.netasCentavos,
                ventasMesAnteriorCentavos: mesAnteriorTot.netasCentavos,
                variacionVsMesAnteriorPct: calcularVariacionPorcentual(
                    mesActualTot.netasCentavos,
                    mesAnteriorTot.netasCentavos,
                ),
                gananciaNetaCentavos: gananciaMes,
                margenPorcentaje: calcularPorcentajeMargen(gananciaMes, ingresosMes),
            },
            inventario: {
                valorTotalCentavos: Number(prodStats?.valorInventario ?? 0),
                totalUnidades: Number(prodStats?.totalUnidades ?? 0),
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
                umbralStockBajo: UMBRAL_STOCK_BAJO,
            },
            alertasStock,
            ultimasVentas,
            ultimosPedidos,
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
     * Reporte: Ventas por canal (Mostrador vs. Online) y método de pago, restando devoluciones
     * + comparación contra período anterior.
     */
    async ventasPorCanal(query: RangoFechasDto): Promise<ReporteVentasPorCanalDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);
        const rangoPrev = calcularRangoAnterior(rango.desdeTexto, rango.hastaTexto);

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

        const prevTot = await this.obtenerVentasNetasEnRango(rangoPrev.inicio, rangoPrev.fin);

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            canales,
            metodosPago,
            totales,
            periodoAnterior: {
                desde: rangoPrev.desdeTexto,
                hasta: rangoPrev.hastaTexto,
                ventasNetasCentavos: prevTot.netasCentavos,
                variacionPorcentaje: calcularVariacionPorcentual(
                    totales.ventasNetasCentavos,
                    prevTot.netasCentavos,
                ),
            },
        };
    }

    /**
     * Reporte (Bloque 3): Serie diaria de ventas netas (Mostrador y Online apilados, restando devoluciones).
     */
    async ventasPorDia(query: RangoFechasDto): Promise<ReporteVentasPorDiaDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);
        const fechas = generarFechasEnRango(rango.desdeTexto, rango.hastaTexto);

        const mapa = new Map<string, VentaDiariaDto>();
        for (const f of fechas) {
            mapa.set(f, {
                fecha: f,
                mostradorNetoCentavos: 0,
                onlineNetoCentavos: 0,
                devolucionesCentavos: 0,
                totalNetoCentavos: 0,
                cantidadVentas: 0,
            });
        }

        const ventasRows = await db
            .select({
                canal: ventas.canal,
                totalCentavos: ventas.totalCentavos,
                fecha: ventas.fecha,
            })
            .from(ventas)
            .where(and(gte(ventas.fecha, rango.inicio), lte(ventas.fecha, rango.fin)));

        for (const v of ventasRows) {
            const clave = formatearFechaLocal(v.fecha);
            const dia = mapa.get(clave);
            if (!dia) continue;
            if (v.canal === 'MOSTRADOR') {
                dia.mostradorNetoCentavos += v.totalCentavos;
            } else {
                dia.onlineNetoCentavos += v.totalCentavos;
            }
            dia.cantidadVentas += 1;
        }

        const devRows = await db
            .select({
                canal: ventas.canal,
                montoCentavos: devoluciones.montoCentavos,
                fecha: devoluciones.fecha,
            })
            .from(devoluciones)
            .innerJoin(ventas, eq(devoluciones.ventaId, ventas.id))
            .where(and(gte(devoluciones.fecha, rango.inicio), lte(devoluciones.fecha, rango.fin)));

        for (const d of devRows) {
            const clave = formatearFechaLocal(d.fecha);
            const dia = mapa.get(clave);
            if (!dia) continue;
            if (d.canal === 'MOSTRADOR') {
                dia.mostradorNetoCentavos -= d.montoCentavos;
            } else {
                dia.onlineNetoCentavos -= d.montoCentavos;
            }
            dia.devolucionesCentavos += d.montoCentavos;
        }

        const dias = fechas.map((f) => {
            const dia = mapa.get(f)!;
            dia.totalNetoCentavos = dia.mostradorNetoCentavos + dia.onlineNetoCentavos;
            return dia;
        });

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            dias,
        };
    }

    /**
     * Reporte (Bloque 3): Ventas netas y unidades netas por categoría (restando devoluciones).
     */
    async ventasPorCategoria(query: RangoFechasDto): Promise<ReporteVentasPorCategoriaDto> {
        const rango = resolverRangoFechas(query.desde, query.hasta);
        const mapaProds = await this.agregarPorProductoEnRango(rango.inicio, rango.fin);

        const mapaCat = new Map<
            number,
            { categoriaId: number; nombre: string; unidadesNetas: number; ventasNetasCentavos: number }
        >();

        for (const p of mapaProds.values()) {
            const m = calcularMetricasNetasProducto(
                p.unidadesVendidas,
                p.ingresosBrutosCentavos,
                p.costoBrutoCentavos,
                p.unidadesDevueltas,
                p.ingresosDevueltosCentavos,
                p.costoDevueltoCentavos,
            );
            const prev = mapaCat.get(p.categoriaId) ?? {
                categoriaId: p.categoriaId,
                nombre: p.categoriaNombre,
                unidadesNetas: 0,
                ventasNetasCentavos: 0,
            };
            prev.unidadesNetas += m.unidadesNetas;
            prev.ventasNetasCentavos += m.ingresosNetosCentavos;
            mapaCat.set(p.categoriaId, prev);
        }

        const listaOrdenada = Array.from(mapaCat.values()).sort(
            (a, b) => b.ventasNetasCentavos - a.ventasNetasCentavos,
        );

        const totalNetoCentavos = listaOrdenada.reduce((a, c) => a + c.ventasNetasCentavos, 0);

        const categoriasRes: VentaCategoriaDto[] = listaOrdenada.map((c) => ({
            ...c,
            porcentaje:
                totalNetoCentavos > 0
                    ? Math.round((c.ventasNetasCentavos / totalNetoCentavos) * 1000) / 10
                    : 0,
        }));

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            totalNetoCentavos,
            categorias: categoriasRes,
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
     * Detalle completo y auditable de un cierre de caja (Bloque 4).
     */
    async obtenerDetalleCierre(cajaId: number): Promise<DetalleCierreCajaDto> {
        const [caja] = await db.select().from(cajas).where(eq(cajas.id, cajaId)).limit(1);
        if (!caja) {
            throw new NotFoundException(`Caja #${cajaId} no encontrada.`);
        }

        const ventasRows = await db
            .select({
                id: ventas.id,
                canal: ventas.canal,
                metodoPago: ventas.metodoPago,
                totalCentavos: ventas.totalCentavos,
                fecha: ventas.fecha,
            })
            .from(ventas)
            .where(eq(ventas.cajaId, cajaId))
            .orderBy(desc(ventas.id));

        const ventaIds = ventasRows.map((v) => v.id);
        const itemsRows =
            ventaIds.length > 0
                ? await db
                      .select({
                          ventaId: detalleVenta.ventaId,
                          nombreProducto: productos.nombre,
                          cantidad: detalleVenta.cantidad,
                          precioCentavos: detalleVenta.precioCentavos,
                      })
                      .from(detalleVenta)
                      .innerJoin(productos, eq(detalleVenta.productoId, productos.id))
                      .where(inArray(detalleVenta.ventaId, ventaIds))
                : [];

        const mapaItems = new Map<
            number,
            { nombreProducto: string; cantidad: number; precioCentavos: number }[]
        >();
        for (const it of itemsRows) {
            const lista = mapaItems.get(it.ventaId) ?? [];
            lista.push({
                nombreProducto: it.nombreProducto,
                cantidad: it.cantidad,
                precioCentavos: it.precioCentavos,
            });
            mapaItems.set(it.ventaId, lista);
        }

        const devsRows = await db
            .select({
                id: devoluciones.id,
                ventaId: devoluciones.ventaId,
                motivo: devoluciones.motivo,
                montoCentavos: devoluciones.montoCentavos,
                fecha: devoluciones.fecha,
            })
            .from(devoluciones)
            .where(eq(devoluciones.cajaId, cajaId))
            .orderBy(desc(devoluciones.id));

        let ventasEfectivoCentavos = 0;
        let ventasQrCentavos = 0;
        for (const v of ventasRows) {
            if (v.metodoPago === 'EFECTIVO') ventasEfectivoCentavos += v.totalCentavos;
            else ventasQrCentavos += v.totalCentavos;
        }
        const devolucionesCentavos = devsRows.reduce((a, d) => a + d.montoCentavos, 0);
        const esperadoCalculado =
            caja.montoInicialCentavos + ventasEfectivoCentavos - devolucionesCentavos;

        return {
            caja: {
                id: caja.id,
                estado: caja.estado,
                fechaApertura: caja.fechaApertura,
                fechaCierre: caja.fechaCierre,
                montoInicialCentavos: caja.montoInicialCentavos,
                ventasEfectivoCentavos,
                ventasQrCentavos,
                devolucionesCentavos,
                efectivoEsperadoCentavos:
                    caja.estado === 'CERRADA' && caja.efectivoEsperadoCentavos !== null
                        ? caja.efectivoEsperadoCentavos
                        : esperadoCalculado,
                efectivoContadoCentavos: caja.efectivoContadoCentavos,
                diferenciaCentavos: caja.diferenciaCentavos,
            },
            ventas: ventasRows.map((v) => ({
                ...v,
                items: mapaItems.get(v.id) ?? [],
            })),
            devoluciones: devsRows,
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

    /**
     * Bloque 5: Inteligencia de stock (sin ventas en 30 días, días de cobertura y reposición sugerida).
     */
    async inteligenciaStock(): Promise<ReporteInteligenciaStockDto> {
        const rango30 = resolverRangoFechas(undefined, undefined);
        const mapaVentas30 = await this.agregarPorProductoEnRango(rango30.inicio, rango30.fin);

        const activos = await db
            .select({
                productoId: productos.id,
                nombre: productos.nombre,
                categoriaNombre: categorias.nombre,
                stockActual: productos.stock,
                costoCentavos: productos.costoCentavos,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(eq(productos.activo, true));

        const sinRotacion30d: ReporteInteligenciaStockDto['sinRotacion30d'] = [];
        const cobertura: ReporteInteligenciaStockDto['cobertura'] = [];

        for (const prod of activos) {
            const v = mapaVentas30.get(prod.productoId);
            const unidadesNetas30d = v ? v.unidadesVendidas - v.unidadesDevueltas : 0;

            if (unidadesNetas30d <= 0) {
                if (prod.stockActual > 0) {
                    sinRotacion30d.push({
                        productoId: prod.productoId,
                        nombre: prod.nombre,
                        categoriaNombre: prod.categoriaNombre,
                        stockActual: prod.stockActual,
                        costoCentavos: prod.costoCentavos,
                        valorInmovilizadoCentavos: prod.stockActual * prod.costoCentavos,
                    });
                }
            } else {
                const calc = calcularCoberturaYReposicion(prod.stockActual, unidadesNetas30d);
                cobertura.push({
                    productoId: prod.productoId,
                    nombre: prod.nombre,
                    categoriaNombre: prod.categoriaNombre,
                    stockActual: prod.stockActual,
                    unidadesNetas30d,
                    velocidadDiaria: calc.velocidadDiaria,
                    diasCobertura: calc.diasCobertura ?? 0,
                    sugerenciaReposicion: calc.sugerenciaReposicion,
                });
            }
        }

        sinRotacion30d.sort((a, b) => b.valorInmovilizadoCentavos - a.valorInmovilizadoCentavos);
        cobertura.sort((a, b) => a.diasCobertura - b.diasCobertura);

        return {
            resumen: {
                totalSinRotacion: sinRotacion30d.length,
                valorInmovilizadoCentavos: sinRotacion30d.reduce(
                    (a, i) => a + i.valorInmovilizadoCentavos,
                    0,
                ),
                productosParaReponer: cobertura.filter((c) => c.sugerenciaReposicion > 0).length,
            },
            sinRotacion30d,
            cobertura,
        };
    }

    private async obtenerVentasNetasEnRango(inicio: Date, fin: Date) {
        const [vRow] = await db
            .select({
                cantidad: sql<number>`count(*)`,
                brutas: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
            })
            .from(ventas)
            .where(and(gte(ventas.fecha, inicio), lte(ventas.fecha, fin)));

        const [dRow] = await db
            .select({
                total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
            })
            .from(devoluciones)
            .where(and(gte(devoluciones.fecha, inicio), lte(devoluciones.fecha, fin)));

        const brutasCentavos = Number(vRow?.brutas ?? 0);
        const devolucionesCentavos = Number(dRow?.total ?? 0);
        return {
            cantidad: Number(vRow?.cantidad ?? 0),
            brutasCentavos,
            devolucionesCentavos,
            netasCentavos: brutasCentavos - devolucionesCentavos,
        };
    }

    private async agregarPorProductoEnRango(inicio: Date, fin: Date) {
        const ventasRows = await db
            .select({
                productoId: detalleVenta.productoId,
                categoriaId: productos.categoriaId,
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
            .groupBy(
                detalleVenta.productoId,
                productos.categoriaId,
                productos.nombre,
                categorias.nombre,
                productos.stock,
            );

        const devRows = await db
            .select({
                productoId: detalleDevolucion.productoId,
                categoriaId: productos.categoriaId,
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
                productos.categoriaId,
                productos.nombre,
                categorias.nombre,
                productos.stock,
            );

        const mapa = new Map<
            number,
            {
                productoId: number;
                categoriaId: number;
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
                categoriaId: r.categoriaId,
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
                    categoriaId: d.categoriaId,
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

    /**
     * Reporte de ventas realizadas con descuento en el rango de fechas.
     */
    async reporteDescuentos(filtro?: RangoFechasDto): Promise<{
        desde: string;
        hasta: string;
        ventasConDescuento: number;
        unidadesConDescuento: number;
        totalDescontadoCentavos: number;
        ingresosConDescuentoCentavos: number;
        items: {
            ventaId: number;
            fecha: Date;
            canal: 'MOSTRADOR' | 'ONLINE';
            productoId: number;
            nombreProducto: string;
            categoriaNombre: string;
            cantidad: number;
            descuentoPorcentaje: number;
            precioOriginalCentavos: number;
            precioCobradoCentavos: number;
            descuentoTotalCentavos: number;
            subtotalCobradoCentavos: number;
        }[];
    }> {
        const rango = resolverRangoFechas(filtro?.desde, filtro?.hasta);

        const rows = await db
            .select({
                ventaId: ventas.id,
                fecha: ventas.fecha,
                canal: ventas.canal,
                productoId: detalleVenta.productoId,
                nombreProducto: productos.nombre,
                categoriaNombre: categorias.nombre,
                cantidad: detalleVenta.cantidad,
                descuentoPorcentaje: detalleVenta.descuentoPorcentaje,
                precioOriginalCentavos: detalleVenta.precioOriginalCentavos,
                precioCobradoCentavos: detalleVenta.precioCentavos,
            })
            .from(detalleVenta)
            .innerJoin(ventas, eq(detalleVenta.ventaId, ventas.id))
            .innerJoin(productos, eq(detalleVenta.productoId, productos.id))
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(
                and(
                    gte(ventas.fecha, rango.inicio),
                    lte(ventas.fecha, rango.fin),
                    sql`${detalleVenta.descuentoPorcentaje} > 0`,
                ),
            )
            .orderBy(desc(ventas.fecha), desc(ventas.id));

        const ventasUnicas = new Set<number>();
        let unidadesConDescuento = 0;
        let totalDescontadoCentavos = 0;
        let ingresosConDescuentoCentavos = 0;

        const items = rows.map((r) => {
            ventasUnicas.add(r.ventaId);
            const orig =
                r.precioOriginalCentavos > 0 ? r.precioOriginalCentavos : r.precioCobradoCentavos;
            const ahorroUnit = Math.max(0, orig - r.precioCobradoCentavos);
            const descuentoTotal = ahorroUnit * r.cantidad;
            const subtotalCobrado = r.precioCobradoCentavos * r.cantidad;

            unidadesConDescuento += r.cantidad;
            totalDescontadoCentavos += descuentoTotal;
            ingresosConDescuentoCentavos += subtotalCobrado;

            return {
                ventaId: r.ventaId,
                fecha: r.fecha,
                canal: r.canal,
                productoId: r.productoId,
                nombreProducto: r.nombreProducto,
                categoriaNombre: r.categoriaNombre,
                cantidad: r.cantidad,
                descuentoPorcentaje: r.descuentoPorcentaje,
                precioOriginalCentavos: orig,
                precioCobradoCentavos: r.precioCobradoCentavos,
                descuentoTotalCentavos: descuentoTotal,
                subtotalCobradoCentavos: subtotalCobrado,
            };
        });

        return {
            desde: rango.desdeTexto,
            hasta: rango.hastaTexto,
            ventasConDescuento: ventasUnicas.size,
            unidadesConDescuento,
            totalDescontadoCentavos,
            ingresosConDescuentoCentavos,
            items,
        };
    }
}
