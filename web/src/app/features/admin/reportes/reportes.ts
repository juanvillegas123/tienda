import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportesService } from '../../../core/reportes.service';
import {
    ReporteVentasPorCanal,
    ReporteMasVendidos,
    ReporteMargen,
    ReporteCierresCaja,
} from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';

function formatearFechaInput(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

@Component({
    selector: 'app-reportes-admin',
    standalone: true,
    imports: [DatePipe, BsPipe],
    templateUrl: './reportes.html',
})
export class ReportesAdminComponent implements OnInit {
    private readonly reportesService = inject(ReportesService);

    readonly pestana = signal<'canales' | 'mas-vendidos' | 'margen' | 'cierres'>('canales');

    readonly desde = signal('');
    readonly hasta = signal('');
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);

    readonly ventasPorCanal = signal<ReporteVentasPorCanal | null>(null);
    readonly masVendidos = signal<ReporteMasVendidos | null>(null);
    readonly margen = signal<ReporteMargen | null>(null);
    readonly cierres = signal<ReporteCierresCaja | null>(null);

    readonly maxUnidadesMasVendidos = computed(() => {
        const items = this.masVendidos()?.items ?? [];
        return Math.max(1, ...items.map((i) => Math.max(0, i.unidadesNetas)));
    });

    readonly maxIngresoCanal = computed(() => {
        const canales = this.ventasPorCanal()?.canales ?? [];
        return Math.max(1, ...canales.map((c) => Math.max(0, c.ventasNetasCentavos)));
    });

    ngOnInit(): void {
        this.aplicarAtajo('30d');
    }

    aplicarAtajo(atajo: 'hoy' | '7d' | '30d' | 'mes'): void {
        const hoy = new Date();
        const inicio = new Date(hoy);

        if (atajo === '7d') {
            inicio.setDate(hoy.getDate() - 6);
        } else if (atajo === '30d') {
            inicio.setDate(hoy.getDate() - 29);
        } else if (atajo === 'mes') {
            inicio.setDate(1);
        }

        this.desde.set(formatearFechaInput(inicio));
        this.hasta.set(formatearFechaInput(hoy));
        this.cargarTodos();
    }

    actualizarDesde(event: Event): void {
        this.desde.set((event.target as HTMLInputElement).value);
    }

    actualizarHasta(event: Event): void {
        this.hasta.set((event.target as HTMLInputElement).value);
    }

    cargarTodos(): void {
        const d = this.desde();
        const h = this.hasta();

        if (d && h && d > h) {
            this.errorCarga.set('La fecha "Desde" no puede ser posterior a la fecha "Hasta".');
            return;
        }

        this.cargando.set(true);
        this.errorCarga.set(null);

        const filtro = { desde: d || undefined, hasta: h || undefined };

        forkJoin({
            canales: this.reportesService.ventasPorCanal(filtro),
            masVendidos: this.reportesService.masVendidos({ ...filtro, limite: 20 }),
            margen: this.reportesService.margen(filtro),
            cierres: this.reportesService.cierresDeCaja(filtro),
        }).subscribe({
            next: (res) => {
                this.ventasPorCanal.set(res.canales);
                this.masVendidos.set(res.masVendidos);
                this.margen.set(res.margen);
                this.cierres.set(res.cierres);
                this.cargando.set(false);
            },
            error: (err: unknown) => {
                this.cargando.set(false);
                if (err instanceof HttpErrorResponse) {
                    const body = err.error as Record<string, unknown> | null;
                    this.errorCarga.set(
                        (body?.['mensaje'] as string) || 'No se pudieron cargar los reportes.',
                    );
                } else {
                    this.errorCarga.set('No se pudieron cargar los reportes.');
                }
            },
        });
    }

    porcentajeBarra(valor: number, maximo: number): number {
        if (maximo <= 0 || valor <= 0) return 0;
        return Math.min(100, Math.round((valor / maximo) * 100));
    }

    anchoMargen(porcentaje: number): number {
        return Math.max(0, Math.min(100, porcentaje));
    }
}
