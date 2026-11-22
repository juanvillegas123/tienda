import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { eq, and, like, asc, desc, sql } from 'drizzle-orm';
import { db } from '../db/db';
import {
    productos,
    categorias,
    proveedores,
    imagenesProducto,
    movimientosInventario,
} from '../db/schema';
import {
    CrearProductoDto,
    EditarProductoDto,
    FiltroProductosDto,
    FiltroProductosPublicoDto,
} from './productos.schemas';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import { centavosABs } from '../common/dinero';

export interface ProductoPublicoDto {
    id: number;
    categoriaId: number;
    categoriaNombre: string;
    nombre: string;
    descripcion: string | null;
    precioCentavos: number;
    stock: number;
    escala: string | null;
    notaTalla: string | null;
    imagenPrincipal: string | null;
    imagenes: { id: number; url: string; orden: number }[];
    activo: boolean;
}

export interface ProductoAdminDto extends ProductoPublicoDto {
    costoCentavos: number;
    proveedorId: number | null;
    proveedorNombre: string | null;
    fechaCreacion: Date;
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
}

@Injectable()
export class ProductosService {
    constructor(private readonly almacenamientoService: AlmacenamientoService) { }
    /**
     * Catálogo público: solo productos activos cuya categoría también esté activa, sin costos ni proveedores (RN-02 y 5.1).
     */
    async listarPublicos(filtro?: FiltroProductosPublicoDto): Promise<ProductoPublicoDto[]> {
        const condiciones = [eq(productos.activo, true), eq(categorias.activa, true)];

        if (filtro?.categoriaId) {
            condiciones.push(eq(productos.categoriaId, filtro.categoriaId));
        }

        if (filtro?.q && filtro.q.trim().length > 0) {
            const termino = `%${filtro.q.trim().toLowerCase()}%`;
            condiciones.push(like(sql`lower(${productos.nombre})`, termino));
        }

        const rows = await db
            .select({
                id: productos.id,
                categoriaId: productos.categoriaId,
                categoriaNombre: categorias.nombre,
                nombre: productos.nombre,
                descripcion: productos.descripcion,
                precioCentavos: productos.precioCentavos,
                stock: productos.stock,
                escala: productos.escala,
                notaTalla: productos.notaTalla,
                imagenPrincipal: productos.imagenPrincipal,
                activo: productos.activo,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(and(...condiciones))
            .orderBy(desc(productos.id));

        if (rows.length === 0) return [];

        const ids = rows.map((r) => r.id);
        const todasImagenes = await db
            .select({
                id: imagenesProducto.id,
                productoId: imagenesProducto.productoId,
                url: imagenesProducto.url,
                orden: imagenesProducto.orden,
            })
            .from(imagenesProducto)
            .where(sql`${imagenesProducto.productoId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
            .orderBy(imagenesProducto.orden);

        const mapaImagenes = new Map<number, { id: number; url: string; orden: number }[]>();
        for (const img of todasImagenes) {
            if (!mapaImagenes.has(img.productoId)) {
                mapaImagenes.set(img.productoId, []);
            }
            mapaImagenes.get(img.productoId)!.push({
                id: img.id,
                url: img.url,
                orden: img.orden,
            });
        }

        return rows.map((r) => ({
            ...r,
            imagenes: mapaImagenes.get(r.id) ?? [],
        }));
    }

    /**
     * Detalle público: solo si está activo.
     */
    async obtenerPublicoPorId(id: number): Promise<ProductoPublicoDto> {
        const [prod] = await db
            .select({
                id: productos.id,
                categoriaId: productos.categoriaId,
                categoriaNombre: categorias.nombre,
                nombre: productos.nombre,
                descripcion: productos.descripcion,
                precioCentavos: productos.precioCentavos,
                stock: productos.stock,
                escala: productos.escala,
                notaTalla: productos.notaTalla,
                imagenPrincipal: productos.imagenPrincipal,
                activo: productos.activo,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .where(and(eq(productos.id, id), eq(productos.activo, true), eq(categorias.activa, true)))
            .limit(1);

        if (!prod) {
            throw new NotFoundException(`Producto #${id} no encontrado o inactivo`);
        }

        const imagenes = await db
            .select({
                id: imagenesProducto.id,
                url: imagenesProducto.url,
                orden: imagenesProducto.orden,
            })
            .from(imagenesProducto)
            .where(eq(imagenesProducto.productoId, id))
            .orderBy(imagenesProducto.orden);

        return {
            ...prod,
            imagenes,
        };
    }

    /**
     * Listado administrativo paginado y ordenable: incluye costos, proveedores y productos inactivos.
     */
    async listarAdmin(filtro?: FiltroProductosDto): Promise<PaginatedResult<ProductoAdminDto>> {
        const condiciones = [];

        if (filtro?.activo !== undefined) {
            condiciones.push(eq(productos.activo, filtro.activo));
        }

        if (filtro?.agotado === true) {
            condiciones.push(eq(productos.stock, 0));
        }

        if (filtro?.categoriaId) {
            condiciones.push(eq(productos.categoriaId, filtro.categoriaId));
        }

        if (filtro?.q && filtro.q.trim().length > 0) {
            const termino = `%${filtro.q.trim().toLowerCase()}%`;
            condiciones.push(like(sql`lower(${productos.nombre})`, termino));
        }

        const pagina = filtro?.pagina ?? 1;
        const limite = filtro?.limite ?? 15;
        const ordenCampo = filtro?.ordenCampo ?? 'fecha';
        const ordenDir = filtro?.ordenDir ?? 'desc';

        const whereClause = condiciones.length > 0 ? and(...condiciones) : undefined;

        const [conteo] = await db
            .select({ total: sql<number>`count(*)` })
            .from(productos)
            .where(whereClause);

        const total = Number(conteo?.total ?? 0);
        const totalPaginas = Math.max(1, Math.ceil(total / limite));

        const ordenClausulas =
            ordenCampo === 'nombre'
                ? [
                    ordenDir === 'desc'
                        ? desc(sql`lower(${productos.nombre})`)
                        : asc(sql`lower(${productos.nombre})`),
                    ordenDir === 'desc' ? desc(productos.id) : asc(productos.id),
                ]
                : [
                    ordenDir === 'desc' ? desc(productos.fechaCreacion) : asc(productos.fechaCreacion),
                    ordenDir === 'desc' ? desc(productos.id) : asc(productos.id),
                ];

        const rows = await db
            .select({
                id: productos.id,
                categoriaId: productos.categoriaId,
                categoriaNombre: categorias.nombre,
                proveedorId: productos.proveedorId,
                proveedorNombre: proveedores.nombre,
                nombre: productos.nombre,
                descripcion: productos.descripcion,
                precioCentavos: productos.precioCentavos,
                costoCentavos: productos.costoCentavos,
                stock: productos.stock,
                escala: productos.escala,
                notaTalla: productos.notaTalla,
                imagenPrincipal: productos.imagenPrincipal,
                activo: productos.activo,
                fechaCreacion: productos.fechaCreacion,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .leftJoin(proveedores, eq(productos.proveedorId, proveedores.id))
            .where(whereClause)
            .orderBy(...ordenClausulas)
            .limit(limite)
            .offset((pagina - 1) * limite);

        if (rows.length === 0) {
            return { items: [], total, pagina, limite, totalPaginas };
        }

        const ids = rows.map((r) => r.id);
        const todasImagenes = await db
            .select({
                id: imagenesProducto.id,
                productoId: imagenesProducto.productoId,
                url: imagenesProducto.url,
                orden: imagenesProducto.orden,
            })
            .from(imagenesProducto)
            .where(sql`${imagenesProducto.productoId} IN (${sql.join(ids.map((id) => sql`${id}`), sql`, `)})`)
            .orderBy(imagenesProducto.orden);

        const mapaImagenes = new Map<number, { id: number; url: string; orden: number }[]>();
        for (const img of todasImagenes) {
            if (!mapaImagenes.has(img.productoId)) {
                mapaImagenes.set(img.productoId, []);
            }
            mapaImagenes.get(img.productoId)!.push({
                id: img.id,
                url: img.url,
                orden: img.orden,
            });
        }

        const items = rows.map((r) => ({
            ...r,
            imagenes: mapaImagenes.get(r.id) ?? [],
        }));

        return { items, total, pagina, limite, totalPaginas };
    }

    /**
     * Detalle administrativo completo.
     */
    async obtenerAdminPorId(id: number): Promise<ProductoAdminDto> {
        const [prod] = await db
            .select({
                id: productos.id,
                categoriaId: productos.categoriaId,
                categoriaNombre: categorias.nombre,
                proveedorId: productos.proveedorId,
                proveedorNombre: proveedores.nombre,
                nombre: productos.nombre,
                descripcion: productos.descripcion,
                precioCentavos: productos.precioCentavos,
                costoCentavos: productos.costoCentavos,
                stock: productos.stock,
                escala: productos.escala,
                notaTalla: productos.notaTalla,
                imagenPrincipal: productos.imagenPrincipal,
                activo: productos.activo,
                fechaCreacion: productos.fechaCreacion,
            })
            .from(productos)
            .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
            .leftJoin(proveedores, eq(productos.proveedorId, proveedores.id))
            .where(eq(productos.id, id))
            .limit(1);

        if (!prod) {
            throw new NotFoundException(`Producto #${id} no encontrado`);
        }

        const imagenes = await db
            .select({
                id: imagenesProducto.id,
                url: imagenesProducto.url,
                orden: imagenesProducto.orden,
            })
            .from(imagenesProducto)
            .where(eq(imagenesProducto.productoId, id))
            .orderBy(imagenesProducto.orden);

        return {
            ...prod,
            imagenes,
        };
    }

    /**
     * Crear producto en una transacción única (RN-01, RN-04, 5.1).
     */
    async crear(dto: CrearProductoDto): Promise<ProductoAdminDto> {
        // 1. Validar categoría
        const [cat] = await db
            .select({ id: categorias.id })
            .from(categorias)
            .where(eq(categorias.id, dto.categoriaId))
            .limit(1);

        if (!cat) {
            throw new BadRequestException(`La categoría #${dto.categoriaId} no existe`);
        }

        // 2. Validar proveedor si se provee
        if (dto.proveedorId) {
            const [prov] = await db
                .select({ id: proveedores.id })
                .from(proveedores)
                .where(eq(proveedores.id, dto.proveedorId))
                .limit(1);

            if (!prov) {
                throw new BadRequestException(`El proveedor #${dto.proveedorId} no existe`);
            }
        }

        const stockInicial = dto.stockInicial ?? 0;

        // 3. Transacción para insertar producto, imágenes y movimiento de inventario
        const nuevoId = await db.transaction(async (tx) => {
            const [insertado] = await tx
                .insert(productos)
                .values({
                    categoriaId: dto.categoriaId,
                    proveedorId: dto.proveedorId ?? null,
                    nombre: dto.nombre,
                    descripcion: dto.descripcion ?? null,
                    precioCentavos: dto.precioCentavos,
                    costoCentavos: dto.costoCentavos ?? 0,
                    stock: stockInicial,
                    escala: dto.escala ?? null,
                    notaTalla: dto.notaTalla ?? null,
                    imagenPrincipal: dto.imagenPrincipal && dto.imagenPrincipal.length > 0 ? dto.imagenPrincipal : null,
                    activo: true,
                })
                .returning({ id: productos.id });

            // Insertar imágenes adicionales
            if (dto.imagenesAdicionales && dto.imagenesAdicionales.length > 0) {
                for (let i = 0; i < dto.imagenesAdicionales.length; i++) {
                    await tx.insert(imagenesProducto).values({
                        productoId: insertado.id,
                        url: dto.imagenesAdicionales[i],
                        orden: i,
                    });
                }
            }

            // Registrar movimiento de inventario si hay stock inicial
            if (stockInicial > 0) {
                const costoCentavosInicial = dto.costoCentavos ?? 0;
                const notaInicial =
                    costoCentavosInicial > 0
                        ? `Stock inicial al alta del producto (Costo unit.: Bs. ${centavosABs(costoCentavosInicial).toFixed(2).replace('.', ',')})`
                        : 'Stock inicial registrado al dar de alta el producto';

                await tx.insert(movimientosInventario).values({
                    productoId: insertado.id,
                    proveedorId: dto.proveedorId ?? null,
                    tipo: 'ENTRADA',
                    cantidad: stockInicial,
                    tipoReferencia: 'STOCK_INICIAL',
                    nota: notaInicial,
                });
            }

            return insertado.id;
        });

        return this.obtenerAdminPorId(nuevoId);
    }

    /**
     * Editar producto en una transacción única.
     */
    async editar(id: number, dto: EditarProductoDto): Promise<ProductoAdminDto> {
        const actual = await this.obtenerAdminPorId(id);

        if (dto.categoriaId !== undefined) {
            const [cat] = await db
                .select({ id: categorias.id })
                .from(categorias)
                .where(eq(categorias.id, dto.categoriaId))
                .limit(1);

            if (!cat) {
                throw new BadRequestException(`La categoría #${dto.categoriaId} no existe`);
            }
        }

        if (dto.proveedorId !== undefined && dto.proveedorId !== null) {
            const [prov] = await db
                .select({ id: proveedores.id })
                .from(proveedores)
                .where(eq(proveedores.id, dto.proveedorId))
                .limit(1);

            if (!prov) {
                throw new BadRequestException(`El proveedor #${dto.proveedorId} no existe`);
            }
        }

        await db.transaction(async (tx) => {
            const datosActualizar: Partial<typeof productos.$inferInsert> = {};

            if (dto.categoriaId !== undefined) datosActualizar.categoriaId = dto.categoriaId;
            if (dto.proveedorId !== undefined) datosActualizar.proveedorId = dto.proveedorId;
            if (dto.nombre !== undefined) datosActualizar.nombre = dto.nombre;
            if (dto.descripcion !== undefined) datosActualizar.descripcion = dto.descripcion;
            if (dto.precioCentavos !== undefined) datosActualizar.precioCentavos = dto.precioCentavos;
            if (dto.costoCentavos !== undefined) datosActualizar.costoCentavos = dto.costoCentavos;
            if (dto.stock !== undefined) datosActualizar.stock = dto.stock;
            if (dto.escala !== undefined) datosActualizar.escala = dto.escala;
            if (dto.notaTalla !== undefined) datosActualizar.notaTalla = dto.notaTalla;
            if (dto.imagenPrincipal !== undefined) {
                datosActualizar.imagenPrincipal =
                    dto.imagenPrincipal && dto.imagenPrincipal.length > 0 ? dto.imagenPrincipal : null;
            }
            if (dto.activo !== undefined) datosActualizar.activo = dto.activo;

            if (Object.keys(datosActualizar).length > 0) {
                await tx.update(productos).set(datosActualizar).where(eq(productos.id, id));
            }

            // Si se enviaron imágenes adicionales, reemplazarlas
            if (dto.imagenesAdicionales !== undefined) {
                await tx.delete(imagenesProducto).where(eq(imagenesProducto.productoId, id));

                for (let i = 0; i < dto.imagenesAdicionales.length; i++) {
                    await tx.insert(imagenesProducto).values({
                        productoId: id,
                        url: dto.imagenesAdicionales[i],
                        orden: i,
                    });
                }
            }

            // Si cambió el stock manualmente en la edición, registrar movimiento de ajuste
            if (dto.stock !== undefined && dto.stock !== actual.stock) {
                const diferencia = dto.stock - actual.stock;
                await tx.insert(movimientosInventario).values({
                    productoId: id,
                    proveedorId: dto.proveedorId !== undefined ? dto.proveedorId : actual.proveedorId,
                    tipo: 'AJUSTE',
                    cantidad: Math.abs(diferencia),
                    tipoReferencia: 'AJUSTE_MANUAL',
                    nota: `Ajuste manual de stock de ${actual.stock} a ${dto.stock}`,
                });
            }
        });

        // Limpiar en R2 las imágenes antiguas que dejaron de referenciarse (best-effort)
        const actualizado = await this.obtenerAdminPorId(id);
        const urlsActuales = new Set<string>();
        if (actualizado.imagenPrincipal) urlsActuales.add(actualizado.imagenPrincipal);
        for (const img of actualizado.imagenes) {
            urlsActuales.add(img.url);
        }

        const urlsAnteriores: string[] = [];
        if (actual.imagenPrincipal) urlsAnteriores.push(actual.imagenPrincipal);
        for (const img of actual.imagenes) {
            urlsAnteriores.push(img.url);
        }

        const huerfanas = urlsAnteriores.filter((url) => !urlsActuales.has(url));
        if (huerfanas.length > 0) {
            await Promise.all(huerfanas.map((url) => this.almacenamientoService.eliminarPorUrl(url)));
        }

        return actualizado;
    }

    /**
     * Baja lógica de un producto (RN-07: los productos NO se borran).
     */
    async darDeBaja(id: number): Promise<ProductoAdminDto> {
        await this.obtenerAdminPorId(id);

        await db
            .update(productos)
            .set({ activo: false })
            .where(eq(productos.id, id));

        return this.obtenerAdminPorId(id);
    }
}
