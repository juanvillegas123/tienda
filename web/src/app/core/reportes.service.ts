import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    ResumenDashboard,
    ReporteMasVendidos,
    ReporteVentasPorCanal,
    ReporteVentasPorDia,
    ReporteVentasPorCategoria,
    ReporteCierresCaja,
    DetalleCierreCaja,
    ReporteMargen,
    ReporteInteligenciaStock,
    ReporteDescuentos,
} from './modelos';

export interface FiltroFechasReporte {
    desde?: string;
    hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
    private readonly http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/reportes`;

    obtenerResumenDashboard(): Observable<ResumenDashboard> {
        return this.http.get<ResumenDashboard>(`${this.base}/resumen-dashboard`);
    }

    masVendidos(filtro?: FiltroFechasReporte & { limite?: number }): Observable<ReporteMasVendidos> {
        let params = this.crearParams(filtro);
        if (filtro?.limite) {
            params = params.set('limite', filtro.limite.toString());
        }
        return this.http.get<ReporteMasVendidos>(`${this.base}/mas-vendidos`, { params });
    }

    ventasPorCanal(filtro?: FiltroFechasReporte): Observable<ReporteVentasPorCanal> {
        return this.http.get<ReporteVentasPorCanal>(`${this.base}/ventas-por-canal`, {
            params: this.crearParams(filtro),
        });
    }

    ventasPorDia(filtro?: FiltroFechasReporte): Observable<ReporteVentasPorDia> {
        return this.http.get<ReporteVentasPorDia>(`${this.base}/ventas-por-dia`, {
            params: this.crearParams(filtro),
        });
    }

    ventasPorCategoria(filtro?: FiltroFechasReporte): Observable<ReporteVentasPorCategoria> {
        return this.http.get<ReporteVentasPorCategoria>(`${this.base}/ventas-por-categoria`, {
            params: this.crearParams(filtro),
        });
    }

    cierresDeCaja(filtro?: FiltroFechasReporte): Observable<ReporteCierresCaja> {
        return this.http.get<ReporteCierresCaja>(`${this.base}/cierres-de-caja`, {
            params: this.crearParams(filtro),
        });
    }

    detalleCierre(cajaId: number): Observable<DetalleCierreCaja> {
        return this.http.get<DetalleCierreCaja>(`${this.base}/cierres-de-caja/${cajaId}`);
    }

    margen(filtro?: FiltroFechasReporte): Observable<ReporteMargen> {
        return this.http.get<ReporteMargen>(`${this.base}/margen`, {
            params: this.crearParams(filtro),
        });
    }

    inteligenciaStock(): Observable<ReporteInteligenciaStock> {
        return this.http.get<ReporteInteligenciaStock>(`${this.base}/inteligencia-stock`);
    }

    descuentos(filtro?: FiltroFechasReporte): Observable<ReporteDescuentos> {
        return this.http.get<ReporteDescuentos>(`${this.base}/descuentos`, {
            params: this.crearParams(filtro),
        });
    }

    private crearParams(filtro?: FiltroFechasReporte): HttpParams {
        let params = new HttpParams();
        if (filtro?.desde) params = params.set('desde', filtro.desde);
        if (filtro?.hasta) params = params.set('hasta', filtro.hasta);
        return params;
    }
}
