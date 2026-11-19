import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';

@Component({
    selector: 'app-no-encontrado',
    standalone: true,
    imports: [RouterLink, EstadoVacioComponent],
    templateUrl: './no-encontrado.html',
})
export class NoEncontradoComponent {}
