/**
 * Script seguro de limpieza de datos de prueba previo al despliegue en producción.
 *
 * Elimina productos, categorías, proveedores, pedidos, ventas, devoluciones,
 * movimientos de inventario y cajas, y reinicia los contadores autoincrementales.
 *
 * CONSERVA INTACTAS las tablas `administradora` y `configuracion`.
 *
 * Uso obligatorio con confirmación explícita:
 *   npx tsx src/db/limpiar-datos-prueba.ts --confirmar
 */
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db } from './db';
import {
    detalleDevolucion,
    devoluciones,
    detalleVenta,
    ventas,
    detallePedido,
    pedidos,
    movimientosInventario,
    imagenesProducto,
    productos,
    categorias,
    proveedores,
    cajas,
} from './schema';

const TABLAS_A_REINICIAR = [
    'detalle_devolucion',
    'devoluciones',
    'detalle_venta',
    'ventas',
    'detalle_pedido',
    'pedidos',
    'movimientos_inventario',
    'imagenes_producto',
    'productos',
    'categorias',
    'proveedores',
    'cajas',
];

async function limpiar(): Promise<void> {
    if (!process.argv.includes('--confirmar')) {
        console.error(
            'ADVERTENCIA: Este script eliminará todos los productos, categorías, ventas, pedidos, cajas y movimientos de prueba.',
        );
        console.error('Conservará intactas tu cuenta de administradora y la configuración de la tienda.');
        console.error('Para ejecutarlo, corre: npx tsx src/db/limpiar-datos-prueba.ts --confirmar');
        process.exit(1);
    }

    await db.transaction(async (tx) => {
        await tx.delete(detalleDevolucion);
        await tx.delete(devoluciones);
        await tx.delete(detalleVenta);
        await tx.delete(ventas);
        await tx.delete(detallePedido);
        await tx.delete(pedidos);
        await tx.delete(movimientosInventario);
        await tx.delete(imagenesProducto);
        await tx.delete(productos);
        await tx.delete(categorias);
        await tx.delete(proveedores);
        await tx.delete(cajas);

        for (const tabla of TABLAS_A_REINICIAR) {
            await tx.run(sql`DELETE FROM sqlite_sequence WHERE name = ${tabla}`);
        }
    });

    console.log(
        'Base de datos limpiada correctamente. Se conservaron la cuenta de administradora y la configuración de la tienda.',
    );
}

limpiar().catch((err) => {
    console.error('Error al limpiar la base de datos:', err);
    process.exit(1);
});
