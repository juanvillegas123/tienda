import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CajaResumen } from './modelos';

@Injectable({ providedIn: 'root' })
export class CajasService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/cajas`;

    obtenerActual(): Observable<CajaResumen | null> {
        return this.http.get<CajaResumen | null>(`${this.base}/actual`);
    }

    abrir(montoInicialCentavos: number): Observable<CajaResumen> {
        return this.http.post<CajaResumen>(`${this.base}/abrir`, { montoInicialCentavos });
    }

    cerrar(efectivoContadoCentavos: number): Observable<CajaResumen> {
        return this.http.post<CajaResumen>(`${this.base}/cerrar`, { efectivoContadoCentavos });
    }

    listarHistorial(): Observable<CajaResumen[]> {
        return this.http.get<CajaResumen[]>(this.base);
    }
}
