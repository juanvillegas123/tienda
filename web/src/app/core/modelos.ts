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

export interface CrearProveedorPayload {
    nombre: string;
    contacto?: string | null;
    telefono?: string | null;
    correo?: string | null;
}

export interface EditarProveedorPayload {
    nombre?: string;
    contacto?: string | null;
    telefono?: string | null;
    correo?: string | null;
    activo?: boolean;
}

export type TipoMovimientoInventario = 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DEVOLUCION';

export interface MovimientoInventario {
    id: number;
    productoId: number;
    productoNombre: string;
    proveedorId: number | null;
    proveedorNombre: string | null;
    tipo: TipoMovimientoInventario;
    cantidad: number;
    tipoReferencia: string | null;
    idReferencia: number | null;
    nota: string | null;
    fecha: string | number | Date;
}

export interface CrearEntradaInventarioPayload {
    productoId: number;
    proveedorId?: number | null;
    cantidad: number;
    costoCentavos: number;
    nota?: string | null;
}

export interface CrearAjusteInventarioPayload {
    productoId: number;
    nuevoStock: number;
    nota: string;
}

export interface ResumenDashboard {
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
        fechaApertura: string | number | Date;
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
        canal: CanalVenta;
        metodoPago: MetodoPago;
        totalCentavos: number;
        fecha: string | number | Date;
    }[];
    ultimosPedidos: {
        id: number;
        codigo: string;
        nombreCliente: string | null;
        estado: EstadoPedido;
        totalCentavos: number;
        fechaCreacion: string | number | Date;
        vencido: boolean;
    }[];
}

export interface ProductoMasVendido {
    productoId: number;
    nombre: string;
    categoriaNombre: string;
    stockActual: number;
    unidadesVendidas: number;
    unidadesDevueltas: number;
    unidadesNetas: number;
    ingresosNetosCentavos: number;
}

export interface ReporteMasVendidos {
    desde: string;
    hasta: string;
    items: ProductoMasVendido[];
}

export interface ReporteVentasPorCanal {
    desde: string;
    hasta: string;
    canales: {
        canal: CanalVenta;
        cantidadVentas: number;
        ventasBrutasCentavos: number;
        devolucionesCentavos: number;
        ventasNetasCentavos: number;
    }[];
    metodosPago: {
        metodoPago: MetodoPago;
        cantidadVentas: number;
        ventasBrutasCentavos: number;
    }[];
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

export interface VentaDiaria {
    fecha: string;
    mostradorNetoCentavos: number;
    onlineNetoCentavos: number;
    devolucionesCentavos: number;
    totalNetoCentavos: number;
    cantidadVentas: number;
}

export interface ReporteVentasPorDia {
    desde: string;
    hasta: string;
    dias: VentaDiaria[];
}

export interface VentaCategoria {
    categoriaId: number;
    nombre: string;
    unidadesNetas: number;
    ventasNetasCentavos: number;
    porcentaje: number;
}

export interface ReporteVentasPorCategoria {
    desde: string;
    hasta: string;
    totalNetoCentavos: number;
    categorias: VentaCategoria[];
}

export interface ReporteCierresCaja {
    desde: string;
    hasta: string;
    totales: {
        cantidadCierres: number;
        totalEsperadoCentavos: number;
        totalContadoCentavos: number;
        diferenciaAcumuladaCentavos: number;
    };
    cierres: {
        id: number;
        fechaApertura: string | number | Date;
        fechaCierre: string | number | Date | null;
        montoInicialCentavos: number;
        efectivoEsperadoCentavos: number;
        efectivoContadoCentavos: number;
        diferenciaCentavos: number;
    }[];
}

export interface DetalleCierreCaja {
    caja: {
        id: number;
        estado: EstadoCaja;
        fechaApertura: string | number | Date;
        fechaCierre: string | number | Date | null;
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
        canal: CanalVenta;
        metodoPago: MetodoPago;
        totalCentavos: number;
        fecha: string | number | Date;
        items: { nombreProducto: string; cantidad: number; precioCentavos: number }[];
    }[];
    devoluciones: {
        id: number;
        ventaId: number;
        motivo: string;
        montoCentavos: number;
        fecha: string | number | Date;
    }[];
}

export interface MargenProducto {
    productoId: number;
    nombre: string;
    categoriaNombre: string;
    unidadesNetas: number;
    ingresosNetosCentavos: number;
    costoNetoCentavos: number;
    margenCentavos: number;
    margenPorcentaje: number;
}

export interface ReporteMargen {
    desde: string;
    hasta: string;
    totales: {
        ingresosNetosCentavos: number;
        costoNetoCentavos: number;
        margenTotalCentavos: number;
        margenPorcentajePromedio: number;
    };
    items: MargenProducto[];
}

export interface ReporteInteligenciaStock {
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

export interface InfoTienda {
    descripcion: string;
    direccion: string;
    referencia: string;
    ciudad: string;
    horarios: string;
    googleMapsUrl: string;
    googleMapsEmbedUrl: string;
    instagramUrl: string;
    instagramUsuario: string;
    tiktokUrl: string;
    tiktokUsuario: string;
    facebookUrl: string;
    facebookUsuario: string;
    whatsappNumero: string | null;
}

export type ActualizarInfoTiendaPayload = Omit<InfoTienda, 'whatsappNumero'>;
