import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ProductoAdmin, CrearProductoPayload, EditarProductoPayload } from './modelos';

@Injectable({ providedIn: 'root' })
export class ProductosService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/productos`;

    listarAdmin(filtro?: { categoriaId?: number; q?: string; activo?: string }): Observable<ProductoAdmin[]> {
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

        return this.http.get<ProductoAdmin[]>(`${this.base}/admin/lista`, { params });
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

    subirImagen(archivo: File): Observable<{ url: string; nombreOriginal: string }> {
        const formData = new FormData();
        formData.append('file', archivo);
        return this.http.post<{ url: string; nombreOriginal: string }>(
            `${this.base}/imagenes/subir`,
            formData,
        );
    }
}
