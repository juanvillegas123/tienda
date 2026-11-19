import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CarritoService } from '../../../core/carrito.service';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './public-layout.html',
})
export class PublicLayoutComponent {
    readonly carrito = inject(CarritoService);
    readonly logoFallido = signal(false);

    onErrorLogo(): void {
        this.logoFallido.set(true);
    }
}
