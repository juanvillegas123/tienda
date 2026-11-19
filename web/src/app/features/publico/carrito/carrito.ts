import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CarritoService } from '../../../core/carrito.service';
import { ItemCarrito } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';
import { esNotaTallaVisible } from '../../../shared/catalogo-ui.utils';

@Component({
    selector: 'app-carrito-publico',
    standalone: true,
    imports: [RouterLink, BsPipe, EstadoVacioComponent],
    templateUrl: './carrito.html',
})
export class CarritoComponent {
    readonly carrito = inject(CarritoService);
    readonly esNotaTallaVisible = esNotaTallaVisible;

    readonly aviso = signal<string | null>(null);
    readonly confirmandoVaciar = signal(false);

    cambiarCantidad(item: ItemCarrito, delta: number): void {
        this.aviso.set(null);
        const res = this.carrito.actualizarCantidad(item.productoId, item.cantidad + delta);
        if (!res.ok) {
            this.aviso.set(res.mensaje);
        }
    }

    actualizarNota(item: ItemCarrito, event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.carrito.actualizarNota(item.productoId, valor);
    }

    eliminar(productoId: number): void {
        this.aviso.set(null);
        this.carrito.eliminar(productoId);
    }

    vaciarCarrito(): void {
        this.carrito.vaciar();
        this.confirmandoVaciar.set(false);
        this.aviso.set(null);
    }
}
