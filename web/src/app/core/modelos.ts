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
