import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CanalVenta, CrearVentaPayload, Venta } from './modelos';

@Injectable({ providedIn: 'root' })
export class VentasService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/ventas`;

    crear(payload: CrearVentaPayload): Observable<Venta> {
        return this.http.post<Venta>(this.base, payload);
    }

    listar(filtro?: { canal?: CanalVenta; cajaId?: number; limite?: number }): Observable<Venta[]> {
        let params = new HttpParams();
        if (filtro?.canal) {
            params = params.set('canal', filtro.canal);
        }
        if (filtro?.cajaId) {
            params = params.set('cajaId', filtro.cajaId.toString());
        }
        if (filtro?.limite) {
            params = params.set('limite', filtro.limite.toString());
        }
        return this.http.get<Venta[]>(this.base, { params });
    }
}
