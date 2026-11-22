import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CarritoService } from '../../../core/carrito.service';
import { ConfiguracionService } from '../../../core/configuracion.service';

@Component({
    selector: 'app-public-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './public-layout.html',
})
export class PublicLayoutComponent implements OnInit {
    readonly carrito = inject(CarritoService);
    private readonly configService = inject(ConfiguracionService);

    readonly info = this.configService.infoTienda;
    readonly logoFallido = signal(false);

    ngOnInit(): void {
        this.configService.cargarInfoTienda().subscribe();
    }

    onErrorLogo(): void {
        this.logoFallido.set(true);
    }
}
