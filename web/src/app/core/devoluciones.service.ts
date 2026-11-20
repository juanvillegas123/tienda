import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { CrearDevolucionPayload, DevolucionRegistrada } from './modelos';

@Injectable({ providedIn: 'root' })
export class DevolucionesService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/devoluciones`;

    crear(payload: CrearDevolucionPayload): Observable<DevolucionRegistrada> {
        return this.http.post<DevolucionRegistrada>(this.base, payload);
    }
}
