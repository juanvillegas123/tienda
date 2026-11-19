import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductoAdmin, CrearProductoPayload, EditarProductoPayload, PaginatedResult } from './modelos';

export interface FiltroProductosAdmin {
    categoriaId?: number;
    q?: string;
    activo?: string;
    agotado?: boolean;
    pagina?: number;
    limite?: number;
    ordenCampo?: 'nombre' | 'fecha';
    ordenDir?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class ProductosService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/productos`;

    listarAdmin(filtro?: FiltroProductosAdmin): Observable<PaginatedResult<ProductoAdmin>> {
        let params = new HttpParams();
        if (filtro?.categoriaId) {
            params = params.set('categoriaId', filtro.categoriaId.toString());
        }
        if (filtro?.q && filtro.q.trim().length > 0) {
            params = params.set('q', filtro.q.trim());
        }
        if (filtro?.activo !== undefined && filtro.activo !== '') {
            params = params.set('activo', filtro.activo);
        }
        if (filtro?.agotado !== undefined) {
            params = params.set('agotado', String(filtro.agotado));
        }
        if (filtro?.pagina !== undefined) {
            params = params.set('pagina', filtro.pagina.toString());
        }
        if (filtro?.limite !== undefined) {
            params = params.set('limite', filtro.limite.toString());
        }
        if (filtro?.ordenCampo) {
            params = params.set('ordenCampo', filtro.ordenCampo);
        }
        if (filtro?.ordenDir) {
            params = params.set('ordenDir', filtro.ordenDir);
        }

        return this.http.get<PaginatedResult<ProductoAdmin>>(`${this.base}/admin/lista`, { params });
    }

    obtenerAdminPorId(id: number): Observable<ProductoAdmin> {
        return this.http.get<ProductoAdmin>(`${this.base}/admin/detalle/${id}`);
    }

    crear(payload: CrearProductoPayload): Observable<ProductoAdmin> {
        return this.http.post<ProductoAdmin>(this.base, payload);
    }

    editar(id: number, payload: EditarProductoPayload): Observable<ProductoAdmin> {
        return this.http.patch<ProductoAdmin>(`${this.base}/${id}`, payload);
    }

    darDeBaja(id: number): Observable<ProductoAdmin> {
        return this.http.patch<ProductoAdmin>(`${this.base}/${id}/baja`, {});
    }

    reactivar(id: number): Observable<ProductoAdmin> {
        return this.http.patch<ProductoAdmin>(`${this.base}/${id}`, { activo: true });
    }

    subirImagen(archivo: File): Observable<{ url: string; nombreOriginal: string }> {
        const formData = new FormData();
        formData.append('file', archivo);
        return this.http.post<{ url: string; nombreOriginal: string }>(
            `${this.base}/imagenes/subir`,
            formData,
        );
    }
}
