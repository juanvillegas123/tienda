import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const fecha = (nombre: string) =>
    integer(nombre, { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`);

export const categorias = sqliteTable('categorias', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nombre: text('nombre').notNull(),
    slug: text('slug').notNull().unique(),
    activa: integer('activa', { mode: 'boolean' }).notNull().default(true),
});

export const proveedores = sqliteTable('proveedores', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    nombre: text('nombre').notNull(),
    contacto: text('contacto'),
    telefono: text('telefono'),
    correo: text('correo'),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
});

export const productos = sqliteTable('productos', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    categoriaId: integer('categoria_id').notNull().references(() => categorias.id),
    proveedorId: integer('proveedor_id').references(() => proveedores.id),
    nombre: text('nombre').notNull(),
    descripcion: text('descripcion'),
    precioCentavos: integer('precio_centavos').notNull(),
    costoCentavos: integer('costo_centavos').notNull().default(0),
    stock: integer('stock').notNull().default(0),
    escala: text('escala'),
    notaTalla: text('nota_talla'),
    imagenPrincipal: text('imagen_principal'),
    activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
    fechaCreacion: fecha('fecha_creacion'),
});

export const imagenesProducto = sqliteTable('imagenes_producto', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productoId: integer('producto_id').notNull().references(() => productos.id),
    url: text('url').notNull(),
    orden: integer('orden').notNull().default(0),
});

export const administradora = sqliteTable('administradora', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    usuario: text('usuario').notNull().unique(),
    contrasenaCifrada: text('contrasena_cifrada').notNull(),
    intentosFallidos: integer('intentos_fallidos').notNull().default(0),
    bloqueadaHasta: integer('bloqueada_hasta', { mode: 'timestamp' }),
    fechaCreacion: fecha('fecha_creacion'),
});

export const cajas = sqliteTable('cajas', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    administradoraId: integer('administradora_id').notNull().references(() => administradora.id),
    fechaApertura: fecha('fecha_apertura'),
    fechaCierre: integer('fecha_cierre', { mode: 'timestamp' }),
    montoInicialCentavos: integer('monto_inicial_centavos').notNull(),
    efectivoEsperadoCentavos: integer('efectivo_esperado_centavos'),
    efectivoContadoCentavos: integer('efectivo_contado_centavos'),
    diferenciaCentavos: integer('diferencia_centavos'),
    estado: text('estado', { enum: ['ABIERTA', 'CERRADA'] }).notNull().default('ABIERTA'),
});

export const pedidos = sqliteTable('pedidos', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    codigo: text('codigo').notNull().unique(),
    nombreCliente: text('nombre_cliente'),
    telefonoCliente: text('telefono_cliente'),
    totalCentavos: integer('total_centavos').notNull(),
    estado: text('estado', { enum: ['PENDIENTE', 'CONFIRMADO', 'CANCELADO'] })
        .notNull()
        .default('PENDIENTE'),
    fechaCreacion: fecha('fecha_creacion'),
    fechaConfirmacion: integer('fecha_confirmacion', { mode: 'timestamp' }),
});

export const detallePedido = sqliteTable('detalle_pedido', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    pedidoId: integer('pedido_id').notNull().references(() => pedidos.id),
    productoId: integer('producto_id').notNull().references(() => productos.id),
    cantidad: integer('cantidad').notNull(),
    precioCentavos: integer('precio_centavos').notNull(),
    notaCliente: text('nota_cliente'),
});

export const ventas = sqliteTable('ventas', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    cajaId: integer('caja_id').references(() => cajas.id),
    pedidoId: integer('pedido_id').unique().references(() => pedidos.id),
    administradoraId: integer('administradora_id').notNull().references(() => administradora.id),
    canal: text('canal', { enum: ['MOSTRADOR', 'ONLINE'] }).notNull(),
    metodoPago: text('metodo_pago', { enum: ['EFECTIVO', 'QR'] }).notNull(),
    totalCentavos: integer('total_centavos').notNull(),
    fecha: fecha('fecha'),
});

export const detalleVenta = sqliteTable('detalle_venta', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ventaId: integer('venta_id').notNull().references(() => ventas.id),
    productoId: integer('producto_id').notNull().references(() => productos.id),
    cantidad: integer('cantidad').notNull(),
    precioCentavos: integer('precio_centavos').notNull(),
    costoCentavos: integer('costo_centavos').notNull().default(0),
});

export const devoluciones = sqliteTable('devoluciones', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    ventaId: integer('venta_id').notNull().references(() => ventas.id),
    cajaId: integer('caja_id').notNull().references(() => cajas.id),
    motivo: text('motivo').notNull(),
    montoCentavos: integer('monto_centavos').notNull(),
    fecha: fecha('fecha'),
});

export const detalleDevolucion = sqliteTable('detalle_devolucion', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    devolucionId: integer('devolucion_id').notNull().references(() => devoluciones.id),
    productoId: integer('producto_id').notNull().references(() => productos.id),
    cantidad: integer('cantidad').notNull(),
});

export const movimientosInventario = sqliteTable('movimientos_inventario', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productoId: integer('producto_id').notNull().references(() => productos.id),
    proveedorId: integer('proveedor_id').references(() => proveedores.id),
    tipo: text('tipo', { enum: ['ENTRADA', 'SALIDA', 'AJUSTE', 'DEVOLUCION'] }).notNull(),
    cantidad: integer('cantidad').notNull(),
    tipoReferencia: text('tipo_referencia'),
    idReferencia: integer('id_referencia'),
    nota: text('nota'),
    fecha: fecha('fecha'),
});

export const configuracion = sqliteTable('configuracion', {
    clave: text('clave').primaryKey(),
    valor: text('valor').notNull(),
});
