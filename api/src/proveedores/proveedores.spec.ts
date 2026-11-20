import { crearProveedorSchema, editarProveedorSchema } from './proveedores.schemas';

describe('Proveedores (esquemas Zod)', () => {
    it('valida creación de proveedor completo y mínimo', () => {
        expect(
            crearProveedorSchema.safeParse({
                nombre: 'Distribuidora Akihabara',
                contacto: 'Kenji Sato',
                telefono: '70123456',
                correo: 'ventas@akihabara.bo',
            }).success,
        ).toBe(true);

        expect(crearProveedorSchema.safeParse({ nombre: 'Importadora Otaku' }).success).toBe(true);
    });

    it('rechaza nombre vacío, correo inválido o campos desconocidos', () => {
        expect(crearProveedorSchema.safeParse({ nombre: '   ' }).success).toBe(false);
        expect(
            crearProveedorSchema.safeParse({ nombre: 'Proveedor', correo: 'no-es-correo' }).success,
        ).toBe(false);
        expect(
            crearProveedorSchema.safeParse({ nombre: 'Proveedor', extra: true }).success,
        ).toBe(false);
    });

    it('permite edición parcial y reactivación', () => {
        expect(editarProveedorSchema.safeParse({ activo: true }).success).toBe(true);
        expect(editarProveedorSchema.safeParse({ telefono: '77777777' }).success).toBe(true);
    });
});
