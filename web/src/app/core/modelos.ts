// Modelos del dominio compartidos en el frontend

export interface AdminSesion {
    id: number;
    usuario: string;
    fechaCreacion: number;
}

export interface Categoria {
    id: number;
    nombre: string;
    slug: string;
    activa: boolean;
}

export interface Proveedor {
    id: number;
    nombre: string;
    contacto: string | null;
    telefono: string | null;
    correo: string | null;
    activo: boolean;
}

export interface ImagenProducto {
    id: number;
    url: string;
    orden: number;
}

export interface ProductoPublico {
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
    imagenes: ImagenProducto[];
    activo: boolean;
}

export interface ItemCarrito {
    productoId: number;
    nombre: string;
    precioCentavos: number;
    imagenPrincipal: string | null;
    stockMaximo: number;
    notaTallaInformativa: string | null;
    cantidad: number;
    notaCliente: string;
}

export interface ProductoAdmin {
    id: number;
    categoriaId: number;
    categoriaNombre: string;
    proveedorId: number | null;
    proveedorNombre: string | null;
    nombre: string;
    descripcion: string | null;
    precioCentavos: number;
    costoCentavos: number;
    stock: number;
    escala: string | null;
    notaTalla: string | null;
    imagenPrincipal: string | null;
    imagenes: ImagenProducto[];
    activo: boolean;
    fechaCreacion: string | number | Date;
}

export interface CrearProductoPayload {
    categoriaId: number;
    proveedorId?: number | null;
    nombre: string;
    descripcion?: string | null;
    precioCentavos: number;
    costoCentavos: number;
    stockInicial: number;
    escala?: string | null;
    notaTalla?: string | null;
    imagenPrincipal?: string | null;
    imagenesAdicionales?: string[];
}

export interface PaginatedResult<T> {
    items: T[];
    total: number;
    pagina: number;
    limite: number;
    totalPaginas: number;
}

export interface EditarProductoPayload {
    categoriaId?: number;
    proveedorId?: number | null;
    nombre?: string;
    descripcion?: string | null;
    precioCentavos?: number;
    costoCentavos?: number;
    stock?: number;
    escala?: string | null;
    notaTalla?: string | null;
    imagenPrincipal?: string | null;
    imagenesAdicionales?: string[];
    activo?: boolean;
}

export type EstadoPedido = 'PENDIENTE' | 'CONFIRMADO' | 'CANCELADO';
export type MetodoPago = 'EFECTIVO' | 'QR';

export interface CrearPedidoPayload {
    nombreCliente: string;
    telefonoCliente?: string | null;
    items: {
        productoId: number;
        cantidad: number;
        notaCliente?: string | null;
    }[];
}

export interface PedidoCreadoPublico {
    id: number;
    codigo: string;
    nombreCliente: string;
    telefonoCliente: string | null;
    totalCentavos: number;
    estado: 'PENDIENTE';
    fechaCreacion: string | number | Date;
    items: {
        productoId: number;
        nombreProducto: string;
        cantidad: number;
        precioCentavos: number;
        subtotalCentavos: number;
        notaCliente: string | null;
    }[];
}

export interface PedidoResumen {
    id: number;
    codigo: string;
    nombreCliente: string | null;
    telefonoCliente: string | null;
    totalCentavos: number;
    estado: EstadoPedido;
    fechaCreacion: string | number | Date;
    fechaConfirmacion: string | number | Date | null;
    vencido: boolean;
    cantidadItems: number;
}

export interface ItemPedidoDetalle {
    id: number;
    productoId: number;
    nombreProducto: string;
    imagenPrincipal: string | null;
    cantidad: number;
    precioCentavos: number;
    subtotalCentavos: number;
    notaCliente: string | null;
    stockActual: number;
    productoActivo: boolean;
}

export interface PedidoDetalle extends PedidoResumen {
    items: ItemPedidoDetalle[];
}

export interface ConfirmarPedidoPayload {
    metodoPago: MetodoPago;
    itemsAjustados?: {
        productoId: number;
        cantidad: number;
    }[];
}


export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type CanalVenta = 'MOSTRADOR' | 'ONLINE';

export interface CajaResumen {
    id: number;
    administradoraId: number;
    fechaApertura: string | number | Date;
    fechaCierre: string | number | Date | null;
    montoInicialCentavos: number;
    ventasEfectivoCentavos: number;
    ventasQrCentavos: number;
    devolucionesCentavos: number;
    cantidadVentas: number;
    cantidadDevoluciones: number;
    efectivoEsperadoCentavos: number;
    efectivoContadoCentavos: number | null;
    diferenciaCentavos: number | null;
    estado: EstadoCaja;
}

export interface DetalleVenta {
    id: number;
    productoId: number;
    nombreProducto: string;
    cantidad: number;
    cantidadDevuelta: number;
    cantidadDevolvible: number;
    precioCentavos: number;
    costoCentavos: number;
}

export interface DevolucionEnVenta {
    id: number;
    cajaId: number;
    motivo: string;
    montoCentavos: number;
    fecha: string | number | Date;
}

export interface Venta {
    id: number;
    cajaId: number | null;
    pedidoId: number | null;
    administradoraId: number;
    canal: CanalVenta;
    metodoPago: MetodoPago;
    totalCentavos: number;
    fecha: string | number | Date;
    items: DetalleVenta[];
    devoluciones: DevolucionEnVenta[];
}

export interface CrearVentaPayload {
    metodoPago: MetodoPago;
    items: { productoId: number; cantidad: number }[];
}

export interface CrearDevolucionPayload {
    ventaId: number;
    motivo: string;
    items: { productoId: number; cantidad: number }[];
}

export interface DevolucionRegistrada {
    id: number;
    ventaId: number;
    cajaId: number;
    motivo: string;
    montoCentavos: number;
    fecha: string | number | Date;
    items: { productoId: number; cantidad: number }[];
}
