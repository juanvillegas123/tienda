import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    CrearPedidoPayload,
    PedidoCreadoPublico,
    PedidoResumen,
    PedidoDetalle,
    ConfirmarPedidoPayload,
    EstadoPedido,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class PedidosService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/pedidos`;

    crear(payload: CrearPedidoPayload): Observable<PedidoCreadoPublico> {
        return this.http.post<PedidoCreadoPublico>(this.base, payload);
    }

    listar(estado?: EstadoPedido, q?: string): Observable<PedidoResumen[]> {
        let params = new HttpParams();
        if (estado) {
            params = params.set('estado', estado);
        }
        if (q && q.trim().length > 0) {
            params = params.set('q', q.trim());
        }
        return this.http.get<PedidoResumen[]>(this.base, { params });
    }

    obtenerPorId(id: number): Observable<PedidoDetalle> {
        return this.http.get<PedidoDetalle>(`${this.base}/${id}`);
    }

    confirmar(
        id: number,
        payload: ConfirmarPedidoPayload,
    ): Observable<{ pedido: PedidoDetalle; ventaId: number }> {
        return this.http.post<{ pedido: PedidoDetalle; ventaId: number }>(
            `${this.base}/${id}/confirmar`,
            payload,
        );
    }

    cancelar(id: number): Observable<PedidoDetalle> {
        return this.http.post<PedidoDetalle>(`${this.base}/${id}/cancelar`, {});
    }
}
