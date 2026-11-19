import { Component, input, signal, computed } from '@angular/core';

@Component({
    selector: 'app-estado-vacio',
    standalone: true,
    templateUrl: './estado-vacio.html',
})
export class EstadoVacioComponent {
    readonly tipo = input<'vacio' | 'carrito-vacio' | 'error'>('vacio');
    readonly titulo = input.required<string>();
    readonly descripcion = input<string>('');

    readonly imagenFallida = signal(false);

    readonly rutaMascota = computed(() => {
        switch (this.tipo()) {
            case 'carrito-vacio':
                return 'img/mascota/carrito-vacio.webp';
            case 'error':
                return 'img/mascota/error.webp';
            case 'vacio':
            default:
                return 'img/mascota/vacio.webp';
        }
    });

    readonly altMascota = computed(() => {
        switch (this.tipo()) {
            case 'carrito-vacio':
                return 'Mascota de OniiChan Store con el carrito vacío';
            case 'error':
                return 'Mascota de OniiChan Store indicando un error';
            case 'vacio':
            default:
                return 'Mascota de OniiChan Store sin resultados';
        }
    });

    onErrorImagen(): void {
        this.imagenFallida.set(true);
    }
}
