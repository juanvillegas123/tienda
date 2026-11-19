import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, ne } from 'drizzle-orm';
import { db } from '../db/db';
import { categorias } from '../db/schema';
import { CrearCategoriaDto, EditarCategoriaDto } from './categorias.schemas';
import { generarSlug } from '../common/slug';

@Injectable()
export class CategoriasService {
    async listarActivas() {
        return db
            .select()
            .from(categorias)
            .where(eq(categorias.activa, true))
            .orderBy(categorias.nombre);
    }

    async listarAdmin() {
        return db
            .select()
            .from(categorias)
            .orderBy(categorias.id);
    }

    async obtenerPorId(id: number) {
        const [categoria] = await db
            .select()
            .from(categorias)
            .where(eq(categorias.id, id))
            .limit(1);

        if (!categoria) {
            throw new NotFoundException(`Categoría #${id} no encontrada`);
        }
        return categoria;
    }

    async crear(dto: CrearCategoriaDto) {
        const slug = dto.slug && dto.slug.length > 0 ? generarSlug(dto.slug) : generarSlug(dto.nombre);

        // Validar unicidad del slug
        const [existente] = await db
            .select({ id: categorias.id })
            .from(categorias)
            .where(eq(categorias.slug, slug))
            .limit(1);

        if (existente) {
            throw new ConflictException(`Ya existe una categoría con el slug '${slug}'`);
        }

        const [insertada] = await db
            .insert(categorias)
            .values({
                nombre: dto.nombre,
                slug,
                activa: true,
            })
            .returning();

        return insertada;
    }

    async editar(id: number, dto: EditarCategoriaDto) {
        await this.obtenerPorId(id);

        let slug: string | undefined;
        if (dto.slug !== undefined && dto.slug.trim().length > 0) {
            slug = generarSlug(dto.slug);
        } else if (dto.nombre !== undefined) {
            slug = generarSlug(dto.nombre);
        }

        if (slug) {
            const [duplicado] = await db
                .select({ id: categorias.id })
                .from(categorias)
                .where(and(eq(categorias.slug, slug), ne(categorias.id, id)))
                .limit(1);

            if (duplicado) {
                throw new ConflictException(`Ya existe otra categoría con el slug '${slug}'`);
            }
        }

        const datosActualizar: Partial<typeof categorias.$inferInsert> = {};
        if (dto.nombre !== undefined) datosActualizar.nombre = dto.nombre;
        if (slug !== undefined) datosActualizar.slug = slug;
        if (dto.activa !== undefined) datosActualizar.activa = dto.activa;

        const [actualizada] = await db
            .update(categorias)
            .set(datosActualizar)
            .where(eq(categorias.id, id))
            .returning();

        return actualizada;
    }

    async darDeBaja(id: number) {
        await this.obtenerPorId(id);

        const [actualizada] = await db
            .update(categorias)
            .set({ activa: false })
            .where(eq(categorias.id, id))
            .returning();

        return actualizada;
    }
}
