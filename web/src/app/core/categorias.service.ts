import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Categoria } from './modelos';

@Injectable({ providedIn: 'root' })
export class CategoriasService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/categorias`;

    listarActivas(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.base);
    }

    listarAdmin(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(`${this.base}/admin`);
    }

    obtenerPorId(id: number): Observable<Categoria> {
        return this.http.get<Categoria>(`${this.base}/${id}`);
    }

    crear(datos: { nombre: string; slug?: string }): Observable<Categoria> {
        return this.http.post<Categoria>(this.base, datos);
    }

    editar(id: number, datos: { nombre?: string; slug?: string; activa?: boolean }): Observable<Categoria> {
        return this.http.patch<Categoria>(`${this.base}/${id}`, datos);
    }

    darDeBaja(id: number): Observable<Categoria> {
        return this.http.patch<Categoria>(`${this.base}/${id}/baja`, {});
    }
}
