import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/configuracion`;

    obtenerWhatsapp(): Observable<string> {
        return this.http.get<{ whatsappNumero: string | null }>(`${this.base}/whatsapp`).pipe(
            map((res) => res.whatsappNumero || environment.whatsappNumero),
            catchError(() => of(environment.whatsappNumero)),
        );
    }

    actualizarWhatsapp(whatsappNumero: string): Observable<{ whatsappNumero: string }> {
        return this.http.patch<{ whatsappNumero: string }>(`${this.base}/whatsapp`, {
            whatsappNumero,
        });
    }
}
