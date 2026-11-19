import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria, ProductoPublico } from './modelos';

@Injectable({ providedIn: 'root' })
export class CatalogoService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    listarCategorias(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(`${this.base}/categorias`);
    }

    listarProductos(filtro?: { categoriaId?: number; q?: string }): Observable<ProductoPublico[]> {
        let params = new HttpParams();
        if (filtro?.categoriaId) {
            params = params.set('categoriaId', filtro.categoriaId.toString());
        }
        if (filtro?.q && filtro.q.trim().length > 0) {
            params = params.set('q', filtro.q.trim());
        }
        return this.http.get<ProductoPublico[]>(`${this.base}/productos`, { params });
    }

    obtenerProducto(id: number): Observable<ProductoPublico> {
        return this.http.get<ProductoPublico>(`${this.base}/productos/${id}`);
    }
}
