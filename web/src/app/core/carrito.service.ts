import { Injectable, signal, computed } from '@angular/core';
import { ItemCarrito, ProductoPublico } from './modelos';

const STORAGE_KEY = 'oniichan_carrito_v1';

export interface ResultadoCarrito {
    ok: boolean;
    mensaje: string;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
    private readonly _items = signal<ItemCarrito[]>(this.cargarDesdeStorage());

    readonly items = this._items.asReadonly();

    readonly cantidadTotal = computed(() =>
        this._items().reduce((acc, item) => acc + item.cantidad, 0),
    );

    readonly totalCentavos = computed(() =>
        this._items().reduce((acc, item) => acc + item.precioCentavos * item.cantidad, 0),
    );

    cantidadEnCarrito(productoId: number): number {
        const encontrado = this._items().find((i) => i.productoId === productoId);
        return encontrado ? encontrado.cantidad : 0;
    }

    agregar(producto: ProductoPublico, cantidad = 1, notaCliente = ''): ResultadoCarrito {
        if (!producto.activo || producto.stock <= 0) {
            return { ok: false, mensaje: 'Este producto está agotado.' };
        }

        const cantValida = Math.max(1, Math.trunc(cantidad));
        const notaLimpia = notaCliente.trim().slice(0, 200);
        const lista = this._items();
        const existente = lista.find((i) => i.productoId === producto.id);

        if (existente) {
            const nuevaCantidad = existente.cantidad + cantValida;
            if (nuevaCantidad > producto.stock) {
                return {
                    ok: false,
                    mensaje: `Solo hay ${producto.stock} ${producto.stock === 1 ? 'unidad disponible' : 'unidades disponibles'} de "${producto.nombre}".`,
                };
            }

            const actualizada = lista.map((i) =>
                i.productoId === producto.id
                    ? {
                          ...i,
                          nombre: producto.nombre,
                          precioCentavos: producto.precioCentavos,
                          imagenPrincipal: producto.imagenPrincipal,
                          stockMaximo: producto.stock,
                          notaTallaInformativa: producto.notaTalla,
                          cantidad: nuevaCantidad,
                          notaCliente: notaLimpia.length > 0 ? notaLimpia : i.notaCliente,
                      }
                    : i,
            );
            this.guardar(actualizada);
            return { ok: true, mensaje: `"${producto.nombre}" actualizado en tu carrito.` };
        }

        if (cantValida > producto.stock) {
            return {
                ok: false,
                mensaje: `Solo hay ${producto.stock} ${producto.stock === 1 ? 'unidad disponible' : 'unidades disponibles'}.`,
            };
        }

        const nuevoItem: ItemCarrito = {
            productoId: producto.id,
            nombre: producto.nombre,
            precioCentavos: producto.precioCentavos,
            imagenPrincipal: producto.imagenPrincipal,
            stockMaximo: producto.stock,
            notaTallaInformativa: producto.notaTalla,
            cantidad: cantValida,
            notaCliente: notaLimpia,
        };

        this.guardar([...lista, nuevoItem]);
        return { ok: true, mensaje: `"${producto.nombre}" agregado al carrito.` };
    }

    actualizarCantidad(productoId: number, nuevaCantidad: number): ResultadoCarrito {
        const cant = Math.trunc(nuevaCantidad);
        const lista = this._items();
        const item = lista.find((i) => i.productoId === productoId);
        if (!item) {
            return { ok: false, mensaje: 'Producto no encontrado en el carrito.' };
        }

        if (cant <= 0) {
            this.eliminar(productoId);
            return { ok: true, mensaje: `"${item.nombre}" eliminado del carrito.` };
        }

        if (cant > item.stockMaximo) {
            return {
                ok: false,
                mensaje: `Stock máximo disponible: ${item.stockMaximo} ${item.stockMaximo === 1 ? 'unidad' : 'unidades'}.`,
            };
        }

        this.guardar(
            lista.map((i) => (i.productoId === productoId ? { ...i, cantidad: cant } : i)),
        );
        return { ok: true, mensaje: 'Cantidad actualizada.' };
    }

    actualizarNota(productoId: number, nota: string): void {
        const notaLimpia = nota.slice(0, 200);
        this.guardar(
            this._items().map((i) =>
                i.productoId === productoId ? { ...i, notaCliente: notaLimpia } : i,
            ),
        );
    }

    eliminar(productoId: number): void {
        this.guardar(this._items().filter((i) => i.productoId !== productoId));
    }

    vaciar(): void {
        this.guardar([]);
    }

    private guardar(items: ItemCarrito[]): void {
        this._items.set(items);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignorar si localStorage no está disponible (modo privado estricto)
        }
    }

    private cargarDesdeStorage(): ItemCarrito[] {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw) as unknown;
            if (!Array.isArray(parsed)) return [];

            return parsed.filter(
                (item): item is ItemCarrito =>
                    typeof item === 'object' &&
                    item !== null &&
                    typeof (item as ItemCarrito).productoId === 'number' &&
                    typeof (item as ItemCarrito).nombre === 'string' &&
                    typeof (item as ItemCarrito).precioCentavos === 'number' &&
                    typeof (item as ItemCarrito).stockMaximo === 'number' &&
                    typeof (item as ItemCarrito).cantidad === 'number' &&
                    (item as ItemCarrito).cantidad > 0,
            );
        } catch {
            return [];
        }
    }
}
