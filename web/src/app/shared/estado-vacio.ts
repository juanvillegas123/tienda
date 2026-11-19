import { Component, input, signal } from '@angular/core';

@Component({
    selector: 'app-estado-vacio',
    standalone: true,
    templateUrl: './estado-vacio.html',
})
export class EstadoVacioComponent {
    readonly tipo = input<'vacio' | 'carrito-vacio' | 'error'>('vacio');
    readonly titulo = input.required<string>();
    readonly descripcion = input<string>('');

    readonly siluetaFallida = signal(false);

    onErrorSilueta(): void {
        this.siluetaFallida.set(true);
    }
}
