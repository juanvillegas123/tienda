import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    Proveedor,
    CrearProveedorPayload,
    EditarProveedorPayload,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/proveedores`;

    listarActivos(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.base);
    }

    listarAdmin(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(`${this.base}/admin`);
    }

    crear(payload: CrearProveedorPayload): Observable<Proveedor> {
        return this.http.post<Proveedor>(this.base, payload);
    }

    editar(id: number, payload: EditarProveedorPayload): Observable<Proveedor> {
        return this.http.patch<Proveedor>(`${this.base}/${id}`, payload);
    }

    darDeBaja(id: number): Observable<Proveedor> {
        return this.http.patch<Proveedor>(`${this.base}/${id}/baja`, {});
    }

    reactivar(id: number): Observable<Proveedor> {
        return this.http.patch<Proveedor>(`${this.base}/${id}`, { activo: true });
    }
}
