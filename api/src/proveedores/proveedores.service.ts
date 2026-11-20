import { Injectable, NotFoundException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../db/db';
import { proveedores } from '../db/schema';
import { CrearProveedorDto, EditarProveedorDto } from './proveedores.schemas';

@Injectable()
export class ProveedoresService {
    async listarActivos() {
        return db
            .select()
            .from(proveedores)
            .where(eq(proveedores.activo, true))
            .orderBy(proveedores.nombre);
    }

    async listarTodos() {
        return db
            .select()
            .from(proveedores)
            .orderBy(proveedores.nombre);
    }

    async obtenerPorId(id: number) {
        const [proveedor] = await db
            .select()
            .from(proveedores)
            .where(eq(proveedores.id, id))
            .limit(1);

        if (!proveedor) {
            throw new NotFoundException(`Proveedor #${id} no encontrado`);
        }
        return proveedor;
    }

    async crear(dto: CrearProveedorDto) {
        const [insertado] = await db
            .insert(proveedores)
            .values({
                nombre: dto.nombre,
                contacto: dto.contacto ?? null,
                telefono: dto.telefono ?? null,
                correo: dto.correo ?? null,
                activo: true,
            })
            .returning();
        return insertado;
    }

    async editar(id: number, dto: EditarProveedorDto) {
        await this.obtenerPorId(id);
        const [actualizado] = await db
            .update(proveedores)
            .set(dto)
            .where(eq(proveedores.id, id))
            .returning();
        return actualizado;
    }

    async darDeBaja(id: number) {
        await this.obtenerPorId(id);
        const [actualizado] = await db
            .update(proveedores)
            .set({ activo: false })
            .where(eq(proveedores.id, id))
            .returning();
        return actualizado;
    }
}
