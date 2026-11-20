import {
    Injectable,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { db } from '../db/db';
import { cajas, ventas, devoluciones } from '../db/schema';
import { AbrirCajaDto, CerrarCajaDto } from './cajas.schemas';
import { calcularCierreCaja } from './cajas.utils';

export interface CajaResumenDto {
    id: number;
    administradoraId: number;
    fechaApertura: Date;
    fechaCierre: Date | null;
    montoInicialCentavos: number;
    ventasEfectivoCentavos: number;
    ventasQrCentavos: number;
    devolucionesCentavos: number;
    cantidadVentas: number;
    cantidadDevoluciones: number;
    efectivoEsperadoCentavos: number;
    efectivoContadoCentavos: number | null;
    diferenciaCentavos: number | null;
    estado: 'ABIERTA' | 'CERRADA';
}

@Injectable()
export class CajasService {
    /**
     * Devuelve la caja actualmente abierta con totales parciales en vivo, o null si no hay caja abierta.
     */
    async obtenerActual(): Promise<CajaResumenDto | null> {
        const [caja] = await db
            .select()
            .from(cajas)
            .where(eq(cajas.estado, 'ABIERTA'))
            .orderBy(desc(cajas.id))
            .limit(1);

        if (!caja) return null;

        return this.enriquecerCaja(caja);
    }

    /**
     * Abre una nueva caja (RN-06: solo puede haber una caja abierta a la vez).
     */
    async abrir(dto: AbrirCajaDto, administradoraId: number): Promise<CajaResumenDto> {
        const nuevaCaja = await db.transaction(async (tx) => {
            const [existente] = await tx
                .select({ id: cajas.id })
                .from(cajas)
                .where(eq(cajas.estado, 'ABIERTA'))
                .limit(1);

            if (existente) {
                throw new ConflictException(
                    'Ya existe una caja abierta. Cierra la caja actual antes de abrir una nueva.',
                );
            }

            const [insertada] = await tx
                .insert(cajas)
                .values({
                    administradoraId,
                    montoInicialCentavos: dto.montoInicialCentavos,
                    estado: 'ABIERTA',
                })
                .returning();

            return insertada;
        });

        return this.enriquecerCaja(nuevaCaja);
    }

    /**
     * Cierra la caja abierta calculando efectivo esperado y diferencia (RN-10).
     * Una caja cerrada no puede reabrirse ni modificarse.
     */
    async cerrar(dto: CerrarCajaDto): Promise<CajaResumenDto> {
        const cerrada = await db.transaction(async (tx) => {
            const [caja] = await tx
                .select()
                .from(cajas)
                .where(eq(cajas.estado, 'ABIERTA'))
                .orderBy(desc(cajas.id))
                .limit(1);

            if (!caja) {
                throw new BadRequestException('No hay ninguna caja abierta para cerrar.');
            }

            const [totalesEfectivo] = await tx
                .select({
                    total: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
                })
                .from(ventas)
                .where(and(eq(ventas.cajaId, caja.id), eq(ventas.metodoPago, 'EFECTIVO')));

            const [totalesDev] = await tx
                .select({
                    total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
                })
                .from(devoluciones)
                .where(eq(devoluciones.cajaId, caja.id));

            const ventasEfectivoCentavos = Number(totalesEfectivo?.total ?? 0);
            const devolucionesCentavos = Number(totalesDev?.total ?? 0);

            const { efectivoEsperadoCentavos, diferenciaCentavos } = calcularCierreCaja(
                caja.montoInicialCentavos,
                ventasEfectivoCentavos,
                devolucionesCentavos,
                dto.efectivoContadoCentavos,
            );

            const [actualizada] = await tx
                .update(cajas)
                .set({
                    estado: 'CERRADA',
                    fechaCierre: new Date(),
                    efectivoEsperadoCentavos,
                    efectivoContadoCentavos: dto.efectivoContadoCentavos,
                    diferenciaCentavos,
                })
                .where(and(eq(cajas.id, caja.id), eq(cajas.estado, 'ABIERTA')))
                .returning();

            if (!actualizada) {
                throw new ConflictException('La caja ya fue cerrada por otra operación.');
            }

            return actualizada;
        });

        return this.enriquecerCaja(cerrada);
    }

    /**
     * Historial de cajas (cierres y caja abierta actual si existe), más recientes primero.
     */
    async listarHistorial(): Promise<CajaResumenDto[]> {
        const lista = await db.select().from(cajas).orderBy(desc(cajas.id)).limit(100);
        if (lista.length === 0) return [];

        const ids = lista.map((c) => c.id);

        const agregadosVentas = await db
            .select({
                cajaId: ventas.cajaId,
                metodoPago: ventas.metodoPago,
                total: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
                cantidad: sql<number>`count(*)`,
            })
            .from(ventas)
            .where(inArray(ventas.cajaId, ids))
            .groupBy(ventas.cajaId, ventas.metodoPago);

        const agregadosDev = await db
            .select({
                cajaId: devoluciones.cajaId,
                total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
                cantidad: sql<number>`count(*)`,
            })
            .from(devoluciones)
            .where(inArray(devoluciones.cajaId, ids))
            .groupBy(devoluciones.cajaId);

        const mapaVentas = new Map<
            number,
            { efectivo: number; qr: number; cantidad: number }
        >();
        for (const row of agregadosVentas) {
            if (row.cajaId === null) continue;
            const prev = mapaVentas.get(row.cajaId) ?? { efectivo: 0, qr: 0, cantidad: 0 };
            if (row.metodoPago === 'EFECTIVO') {
                prev.efectivo += Number(row.total);
            } else {
                prev.qr += Number(row.total);
            }
            prev.cantidad += Number(row.cantidad);
            mapaVentas.set(row.cajaId, prev);
        }

        const mapaDev = new Map<number, { total: number; cantidad: number }>();
        for (const row of agregadosDev) {
            mapaDev.set(row.cajaId, {
                total: Number(row.total),
                cantidad: Number(row.cantidad),
            });
        }

        return lista.map((caja) => {
            const v = mapaVentas.get(caja.id) ?? { efectivo: 0, qr: 0, cantidad: 0 };
            const d = mapaDev.get(caja.id) ?? { total: 0, cantidad: 0 };
            const esperadoCalculado = caja.montoInicialCentavos + v.efectivo - d.total;

            return {
                id: caja.id,
                administradoraId: caja.administradoraId,
                fechaApertura: caja.fechaApertura,
                fechaCierre: caja.fechaCierre,
                montoInicialCentavos: caja.montoInicialCentavos,
                ventasEfectivoCentavos: v.efectivo,
                ventasQrCentavos: v.qr,
                devolucionesCentavos: d.total,
                cantidadVentas: v.cantidad,
                cantidadDevoluciones: d.cantidad,
                efectivoEsperadoCentavos:
                    caja.estado === 'CERRADA' && caja.efectivoEsperadoCentavos !== null
                        ? caja.efectivoEsperadoCentavos
                        : esperadoCalculado,
                efectivoContadoCentavos: caja.efectivoContadoCentavos,
                diferenciaCentavos: caja.diferenciaCentavos,
                estado: caja.estado,
            };
        });
    }

    private async enriquecerCaja(caja: typeof cajas.$inferSelect): Promise<CajaResumenDto> {
        const ventasPorMetodo = await db
            .select({
                metodoPago: ventas.metodoPago,
                total: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)`,
                cantidad: sql<number>`count(*)`,
            })
            .from(ventas)
            .where(eq(ventas.cajaId, caja.id))
            .groupBy(ventas.metodoPago);

        const [devRow] = await db
            .select({
                total: sql<number>`coalesce(sum(${devoluciones.montoCentavos}), 0)`,
                cantidad: sql<number>`count(*)`,
            })
            .from(devoluciones)
            .where(eq(devoluciones.cajaId, caja.id));

        let ventasEfectivoCentavos = 0;
        let ventasQrCentavos = 0;
        let cantidadVentas = 0;

        for (const row of ventasPorMetodo) {
            if (row.metodoPago === 'EFECTIVO') {
                ventasEfectivoCentavos += Number(row.total);
            } else {
                ventasQrCentavos += Number(row.total);
            }
            cantidadVentas += Number(row.cantidad);
        }

        const devolucionesCentavos = Number(devRow?.total ?? 0);
        const cantidadDevoluciones = Number(devRow?.cantidad ?? 0);
        const esperadoCalculado =
            caja.montoInicialCentavos + ventasEfectivoCentavos - devolucionesCentavos;

        return {
            id: caja.id,
            administradoraId: caja.administradoraId,
            fechaApertura: caja.fechaApertura,
            fechaCierre: caja.fechaCierre,
            montoInicialCentavos: caja.montoInicialCentavos,
            ventasEfectivoCentavos,
            ventasQrCentavos,
            devolucionesCentavos,
            cantidadVentas,
            cantidadDevoluciones,
            efectivoEsperadoCentavos:
                caja.estado === 'CERRADA' && caja.efectivoEsperadoCentavos !== null
                    ? caja.efectivoEsperadoCentavos
                    : esperadoCalculado,
            efectivoContadoCentavos: caja.efectivoContadoCentavos,
            diferenciaCentavos: caja.diferenciaCentavos,
            estado: caja.estado,
        };
    }
}
