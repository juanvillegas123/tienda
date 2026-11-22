import {
    Injectable,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { eq, and, asc, desc, like, sql } from 'drizzle-orm';
import { db } from '../db/db';
import { productos, proveedores, movimientosInventario } from '../db/schema';
import {
    CrearEntradaInventarioDto,
    CrearAjusteInventarioDto,
    ListarMovimientosQueryDto,
} from './inventario.schemas';
import { centavosABs } from '../common/dinero';

export interface MovimientoInventarioDto {
    id: number;
    productoId: number;
    productoNombre: string;
    proveedorId: number | null;
    proveedorNombre: string | null;
    tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';
    cantidad: number;
    tipoReferencia: string | null;
    idReferencia: number | null;
    nota: string | null;
    fecha: Date;
}

@Injectable()
export class InventarioService {
    /**
     * Registra una entrada de mercadería: suma stock, actualiza costo vigente del producto
     * y registra el movimiento con proveedor y costo en una sola transacción.
     */
    async registrarEntrada(dto: CrearEntradaInventarioDto): Promise<MovimientoInventarioDto> {
        const movId = await db.transaction(async (tx) => {
            const [prod] = await tx
                .select({ id: productos.id, nombre: productos.nombre })
                .from(productos)
                .where(eq(productos.id, dto.productoId))
                .limit(1);

            if (!prod) {
                throw new NotFoundException(`Producto #${dto.productoId} no encontrado.`);
            }

            if (dto.proveedorId) {
                const [prov] = await tx
                    .select({ id: proveedores.id, activo: proveedores.activo })
                    .from(proveedores)
                    .where(eq(proveedores.id, dto.proveedorId))
                    .limit(1);

                if (!prov || !prov.activo) {
                    throw new BadRequestException(
                        `El proveedor #${dto.proveedorId} no existe o fue dado de baja.`,
                    );
                }
            }

            const datosProducto: Record<string, unknown> = {
                stock: sql`${productos.stock} + ${dto.cantidad}`,
                costoCentavos: dto.costoCentavos,
            };
            if (dto.proveedorId) {
                datosProducto['proveedorId'] = dto.proveedorId;
            }

            await tx.update(productos).set(datosProducto).where(eq(productos.id, dto.productoId));

            const costoTexto = `Bs. ${centavosABs(dto.costoCentavos).toFixed(2).replace('.', ',')}`;
            const notaExtra = dto.nota?.trim();
            const notaFinal = notaExtra
                ? `Costo unit.: ${costoTexto} — ${notaExtra}`
                : `Ingreso de mercadería (Costo unit.: ${costoTexto})`;

            const [mov] = await tx
                .insert(movimientosInventario)
                .values({
                    productoId: dto.productoId,
                    proveedorId: dto.proveedorId ?? null,
                    tipo: 'ENTRADA',
                    cantidad: dto.cantidad,
                    tipoReferencia: 'ENTRADA_MERCADERIA',
                    nota: notaFinal,
                })
                .returning({ id: movimientosInventario.id });

            return mov.id;
        });

        const [creado] = await this.obtenerPorIds([movId]);
        return creado;
    }

    /**
     * Registra un ajuste manual de stock exigiendo nota obligatoria (sin permitir stock negativo).
     */
    async registrarAjuste(dto: CrearAjusteInventarioDto): Promise<MovimientoInventarioDto> {
        const movId = await db.transaction(async (tx) => {
            const [prod] = await tx
                .select({ id: productos.id, stock: productos.stock, proveedorId: productos.proveedorId })
                .from(productos)
                .where(eq(productos.id, dto.productoId))
                .limit(1);

            if (!prod) {
                throw new NotFoundException(`Producto #${dto.productoId} no encontrado.`);
            }

            if (dto.nuevoStock === prod.stock) {
                throw new BadRequestException(
                    `El stock actual ya es ${prod.stock}. Ingresa una cantidad diferente para registrar el ajuste.`,
                );
            }

            const diferencia = dto.nuevoStock - prod.stock;
            const signo = diferencia > 0 ? `+${diferencia}` : `${diferencia}`;

            await tx
                .update(productos)
                .set({ stock: dto.nuevoStock })
                .where(eq(productos.id, dto.productoId));

            const [mov] = await tx
                .insert(movimientosInventario)
                .values({
                    productoId: dto.productoId,
                    proveedorId: null,
                    tipo: 'AJUSTE',
                    cantidad: Math.abs(diferencia),
                    tipoReferencia: 'AJUSTE_MANUAL',
                    nota: `Ajuste (${prod.stock} → ${dto.nuevoStock}, ${signo}): ${dto.nota.trim()}`,
                })
                .returning({ id: movimientosInventario.id });

            return mov.id;
        });

        const [creado] = await this.obtenerPorIds([movId]);
        return creado;
    }

    /**
     * Historial auditable de movimientos de inventario con filtros opcionales por producto y tipo.
     */
    async listarMovimientos(filtro?: ListarMovimientosQueryDto): Promise<MovimientoInventarioDto[]> {
        const condiciones = [];
        if (filtro?.productoId) {
            condiciones.push(eq(movimientosInventario.productoId, filtro.productoId));
        }
        if (filtro?.tipo) {
            condiciones.push(eq(movimientosInventario.tipo, filtro.tipo));
        }
        if (filtro?.q && filtro.q.trim().length > 0) {
            const termino = `%${filtro.q.trim().toLowerCase()}%`;
            condiciones.push(like(sql`lower(${productos.nombre})`, termino));
        }

        const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;
        const limite = filtro?.limite ?? 100;
        const ordenamiento =
            filtro?.orden === 'fecha-asc'
                ? [asc(movimientosInventario.fecha), asc(movimientosInventario.id)]
                : [desc(movimientosInventario.fecha), desc(movimientosInventario.id)];

        return db
            .select({
                id: movimientosInventario.id,
                productoId: movimientosInventario.productoId,
                productoNombre: productos.nombre,
                proveedorId: movimientosInventario.proveedorId,
                proveedorNombre: proveedores.nombre,
                tipo: movimientosInventario.tipo,
                cantidad: movimientosInventario.cantidad,
                tipoReferencia: movimientosInventario.tipoReferencia,
                idReferencia: movimientosInventario.idReferencia,
                nota: movimientosInventario.nota,
                fecha: movimientosInventario.fecha,
            })
            .from(movimientosInventario)
            .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
            .leftJoin(proveedores, eq(movimientosInventario.proveedorId, proveedores.id))
            .where(whereClause)
            .orderBy(...ordenamiento)
            .limit(limite);
    }

    private async obtenerPorIds(ids: number[]): Promise<MovimientoInventarioDto[]> {
        if (ids.length === 0) return [];
        return db
            .select({
                id: movimientosInventario.id,
                productoId: movimientosInventario.productoId,
                productoNombre: productos.nombre,
                proveedorId: movimientosInventario.proveedorId,
                proveedorNombre: proveedores.nombre,
                tipo: movimientosInventario.tipo,
                cantidad: movimientosInventario.cantidad,
                tipoReferencia: movimientosInventario.tipoReferencia,
                idReferencia: movimientosInventario.idReferencia,
                nota: movimientosInventario.nota,
                fecha: movimientosInventario.fecha,
            })
            .from(movimientosInventario)
            .innerJoin(productos, eq(movimientosInventario.productoId, productos.id))
            .leftJoin(proveedores, eq(movimientosInventario.proveedorId, proveedores.id))
            .where(eq(movimientosInventario.id, ids[0]))
            .limit(1);
    }
}
