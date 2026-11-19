import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Proveedor } from './modelos';

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/proveedores`;

    listarActivos(): Observable<Proveedor[]> {
        return this.http.get<Proveedor[]>(this.base);
    }
}
