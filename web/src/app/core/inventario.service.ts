import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    MovimientoInventario,
    TipoMovimientoInventario,
    CrearEntradaInventarioPayload,
    CrearAjusteInventarioPayload,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class InventarioService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/inventario`;

    registrarEntrada(payload: CrearEntradaInventarioPayload): Observable<MovimientoInventario> {
        return this.http.post<MovimientoInventario>(`${this.base}/entradas`, payload);
    }

    registrarAjuste(payload: CrearAjusteInventarioPayload): Observable<MovimientoInventario> {
        return this.http.post<MovimientoInventario>(`${this.base}/ajustes`, payload);
    }

    listarMovimientos(filtro?: {
        productoId?: number;
        tipo?: TipoMovimientoInventario;
        q?: string;
        orden?: 'fecha-desc' | 'fecha-asc';
        limite?: number;
    }): Observable<MovimientoInventario[]> {
        let params = new HttpParams();
        if (filtro?.productoId) {
            params = params.set('productoId', filtro.productoId.toString());
        }
        if (filtro?.tipo) {
            params = params.set('tipo', filtro.tipo);
        }
        if (filtro?.q && filtro.q.trim().length > 0) {
            params = params.set('q', filtro.q.trim());
        }
        if (filtro?.orden) {
            params = params.set('orden', filtro.orden);
        }
        if (filtro?.limite) {
            params = params.set('limite', filtro.limite.toString());
        }
        return this.http.get<MovimientoInventario[]>(`${this.base}/movimientos`, { params });
    }
}
