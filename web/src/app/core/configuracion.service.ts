import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ActualizarInfoTiendaPayload, InfoTienda } from './modelos';
import { NEGOCIO_CONFIG } from '../shared/negocio.config';

export const INFO_TIENDA_RESPALDO: InfoTienda = {
    descripcion: NEGOCIO_CONFIG.descripcion,
    direccion: NEGOCIO_CONFIG.direccion,
    referencia: NEGOCIO_CONFIG.referencia,
    ciudad: NEGOCIO_CONFIG.ciudad,
    horarios: NEGOCIO_CONFIG.horarios,
    googleMapsUrl: NEGOCIO_CONFIG.googleMapsUrl,
    googleMapsEmbedUrl: NEGOCIO_CONFIG.googleMapsEmbedUrl,
    instagramUrl: NEGOCIO_CONFIG.redes.instagramUrl,
    instagramUsuario: NEGOCIO_CONFIG.redes.instagramUsuario,
    tiktokUrl: NEGOCIO_CONFIG.redes.tiktokUrl,
    tiktokUsuario: NEGOCIO_CONFIG.redes.tiktokUsuario,
    facebookUrl: NEGOCIO_CONFIG.redes.facebookUrl,
    facebookUsuario: NEGOCIO_CONFIG.redes.facebookUsuario,
    // Nunca enlazar a un número de respaldo falso en botones públicos de WhatsApp
    whatsappNumero: null,
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
                googleMapsEmbedUrl:
                    res.googleMapsEmbedUrl?.trim() || INFO_TIENDA_RESPALDO.googleMapsEmbedUrl,
                // Solo usar el número real devuelto por la API
                whatsappNumero: res.whatsappNumero?.trim() || null,
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
                whatsappNumero: res.whatsappNumero?.trim() || null,
            })),
            tap((info) => {
                this.infoTienda.set(info);
                this.cargada = true;
            }),
        );
    }
}
