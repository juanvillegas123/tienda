import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActualizarInfoTiendaPayload, InfoTienda } from './modelos';

export const INFO_TIENDA_RESPALDO: InfoTienda = {
    descripcion:
        'Tienda especializada en figuras de colección, poleras, peluches, pines y accesorios anime seleccionados para tu vitrina.',
    direccion: 'Calle Loa #406',
    referencia: 'Zona céntrica — Sucre',
    ciudad: 'Sucre, Bolivia',
    horarios: 'Lunes a Sábado de 12:30 a 20:00',
    googleMapsUrl: 'https://maps.app.goo.gl/vD5J2k5nz5jXTPVb6',
    googleMapsEmbedUrl: '',
    instagramUrl: 'https://www.instagram.com/onii.chan_store.bo',
    instagramUsuario: '@onii.chan_store.bo',
    tiktokUrl: 'https://www.tiktok.com/@onii.chan.store',
    tiktokUsuario: '@onii.chan.store',
    facebookUrl: 'https://www.facebook.com/profile.php?id=61553764629367',
    facebookUsuario: 'Onii-Chan Store',
    whatsappNumero: environment.whatsappNumero,
};

@Injectable({ providedIn: 'root' })
export class ConfiguracionService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/configuracion`;

    readonly infoTienda = signal<InfoTienda>(INFO_TIENDA_RESPALDO);
    private cargada = false;

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

    cargarInfoTienda(forzar = false): Observable<InfoTienda> {
        if (this.cargada && !forzar) {
            return of(this.infoTienda());
        }
        return this.http.get<InfoTienda>(`${this.base}/tienda`).pipe(
            map((res) => ({
                ...INFO_TIENDA_RESPALDO,
                ...res,
                whatsappNumero: res.whatsappNumero || environment.whatsappNumero,
            })),
            tap((info) => {
                this.infoTienda.set(info);
                this.cargada = true;
            }),
            catchError(() => of(this.infoTienda())),
        );
    }

    actualizarInfoTienda(payload: ActualizarInfoTiendaPayload): Observable<InfoTienda> {
        return this.http.patch<InfoTienda>(`${this.base}/tienda`, payload).pipe(
            map((res) => ({
                ...INFO_TIENDA_RESPALDO,
                ...res,
                whatsappNumero: res.whatsappNumero || environment.whatsappNumero,
            })),
            tap((info) => {
                this.infoTienda.set(info);
                this.cargada = true;
            }),
        );
    }
}
