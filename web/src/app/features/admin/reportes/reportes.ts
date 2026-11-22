import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { DatePipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { ReportesService } from '../../../core/reportes.service';
import {
    ReporteVentasPorCanal,
    ReporteVentasPorDia,
    ReporteVentasPorCategoria,
    ReporteMasVendidos,
    ReporteMargen,
    ReporteCierresCaja,
    DetalleCierreCaja,
    ReporteInteligenciaStock,
} from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { POCAS_UNIDADES } from '../../../shared/catalogo-ui.utils';
import {
    descargarCsv,
    formatearFechaIsoADmy,
    formatearFechaHoraCsv,
    centavosADecimalCsv,
} from '../../../shared/csv.utils';
import { PdfService } from '../../../shared/pdf.service';

function formatearFechaInput(fecha: Date): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

const DIAS_SEMANA_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

@Component({
    selector: 'app-reportes-admin',
    standalone: true,
    imports: [DatePipe, BsPipe],
    templateUrl: './reportes.html',
})
export class ReportesAdminComponent implements OnInit {
    private readonly reportesService = inject(ReportesService);
    private readonly pdfService = inject(PdfService);

    readonly umbralStockBajo = POCAS_UNIDADES;
    readonly formatearFechaIsoADmy = formatearFechaIsoADmy;

    readonly pestana = signal<
        'canales' | 'mas-vendidos' | 'margen' | 'cierres' | 'salud-stock'
    >('canales');

    readonly desde = signal('');
    readonly hasta = signal('');
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);

    readonly ventasPorCanal = signal<ReporteVentasPorCanal | null>(null);
    readonly ventasPorDia = signal<ReporteVentasPorDia | null>(null);
    readonly ventasPorCategoria = signal<ReporteVentasPorCategoria | null>(null);
    readonly masVendidos = signal<ReporteMasVendidos | null>(null);
    readonly margen = signal<ReporteMargen | null>(null);
    readonly cierres = signal<ReporteCierresCaja | null>(null);
    readonly inteligenciaStock = signal<ReporteInteligenciaStock | null>(null);

    // Modal detalle de cierre de caja (Bloque 4)
    readonly detalleCierre = signal<DetalleCierreCaja | null>(null);
    readonly cargandoDetalleCierre = signal(false);

    readonly maxUnidadesMasVendidos = computed(() => {
        const items = this.masVendidos()?.items ?? [];
        return Math.max(1, ...items.map((i) => Math.max(0, i.unidadesNetas)));
    });

    readonly top5Productos = computed(() => (this.masVendidos()?.items ?? []).slice(0, 5));

    readonly maxIngresoCanal = computed(() => {
        const canales = this.ventasPorCanal()?.canales ?? [];
        return Math.max(1, ...canales.map((c) => Math.max(0, c.ventasNetasCentavos)));
    });

    readonly maxVentaDiaria = computed(() => {
        const dias = this.ventasPorDia()?.dias ?? [];
        return Math.max(
            1,
            ...dias.map((d) => Math.max(0, d.mostradorNetoCentavos) + Math.max(0, d.onlineNetoCentavos)),
        );
    });

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.detalleCierre()) {
            this.cerrarDetalleCierre();
        }
    }

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
            porDia: this.reportesService.ventasPorDia(filtro),
            porCategoria: this.reportesService.ventasPorCategoria(filtro),
            masVendidos: this.reportesService.masVendidos({ ...filtro, limite: 25 }),
            margen: this.reportesService.margen(filtro),
            cierres: this.reportesService.cierresDeCaja(filtro),
            inteligencia: this.reportesService.inteligenciaStock(),
        }).subscribe({
            next: (res) => {
                this.ventasPorCanal.set(res.canales);
                this.ventasPorDia.set(res.porDia);
                this.ventasPorCategoria.set(res.porCategoria);
                this.masVendidos.set(res.masVendidos);
                this.margen.set(res.margen);
                this.cierres.set(res.cierres);
                this.inteligenciaStock.set(res.inteligencia);
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

    abrirDetalleCierre(cajaId: number): void {
        this.cargandoDetalleCierre.set(true);
        this.reportesService.detalleCierre(cajaId).subscribe({
            next: (det) => {
                this.detalleCierre.set(det);
                this.cargandoDetalleCierre.set(false);
            },
            error: () => {
                this.cargandoDetalleCierre.set(false);
                this.errorCarga.set('No se pudo cargar el detalle del cierre de caja.');
            },
        });
    }

    cerrarDetalleCierre(): void {
        this.detalleCierre.set(null);
    }

    imprimirCierre(): void {
        window.print();
    }

    etiquetaDiaCorto(iso: string): string {
        const [y, m, d] = iso.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        return `${DIAS_SEMANA_CORTOS[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
    }

    alturaBarraSvg(valorCentavos: number, maxAltura = 140): number {
        const max = this.maxVentaDiaria();
        if (max <= 0 || valorCentavos <= 0) return 0;
        return Math.max(2, Math.round((valorCentavos / max) * maxAltura));
    }

    porcentajeBarra(valor: number, maximo: number): number {
        if (maximo <= 0 || valor <= 0) return 0;
        return Math.min(100, Math.round((valor / maximo) * 100));
    }

    anchoMargen(porcentaje: number): number {
        return Math.max(0, Math.min(100, porcentaje));
    }

    // --- Exportaciones CSV (Bloque 4) ---

    exportarVentasDiariasCsv(): void {
        const rep = this.ventasPorDia();
        if (!rep) return;
        descargarCsv(
            `ventas-diarias-${rep.desde}-a-${rep.hasta}.csv`,
            ['Fecha', 'Cantidad ventas', 'Mostrador neto (Bs)', 'Online neto (Bs)', 'Devoluciones (Bs)', 'Total neto (Bs)'],
            rep.dias.map((d) => [
                formatearFechaIsoADmy(d.fecha),
                d.cantidadVentas,
                centavosADecimalCsv(d.mostradorNetoCentavos),
                centavosADecimalCsv(d.onlineNetoCentavos),
                centavosADecimalCsv(d.devolucionesCentavos),
                centavosADecimalCsv(d.totalNetoCentavos),
            ]),
        );
    }

    exportarMasVendidosCsv(): void {
        const rep = this.masVendidos();
        if (!rep) return;
        descargarCsv(
            `mas-vendidos-${rep.desde}-a-${rep.hasta}.csv`,
            ['Producto', 'Categoría', 'Vendidas', 'Devueltas', 'Netas', 'Ingresos netos (Bs)', 'Stock actual'],
            rep.items.map((i) => [
                i.nombre,
                i.categoriaNombre,
                i.unidadesVendidas,
                i.unidadesDevueltas,
                i.unidadesNetas,
                centavosADecimalCsv(i.ingresosNetosCentavos),
                i.stockActual,
            ]),
        );
    }

    exportarMargenCsv(): void {
        const rep = this.margen();
        if (!rep) return;
        descargarCsv(
            `margen-productos-${rep.desde}-a-${rep.hasta}.csv`,
            ['Producto', 'Categoría', 'Unidades netas', 'Ingresos netos (Bs)', 'Costo neto (Bs)', 'Ganancia (Bs)', 'Margen %'],
            rep.items.map((i) => [
                i.nombre,
                i.categoriaNombre,
                i.unidadesNetas,
                centavosADecimalCsv(i.ingresosNetosCentavos),
                centavosADecimalCsv(i.costoNetoCentavos),
                centavosADecimalCsv(i.margenCentavos),
                `${i.margenPorcentaje}%`,
            ]),
        );
    }

    exportarCierresCsv(): void {
        const rep = this.cierres();
        if (!rep) return;
        descargarCsv(
            `cierres-caja-${rep.desde}-a-${rep.hasta}.csv`,
            ['Caja #', 'Apertura', 'Cierre', 'Inicial (Bs)', 'Esperado (Bs)', 'Contado (Bs)', 'Diferencia (Bs)'],
            rep.cierres.map((c) => [
                c.id,
                formatearFechaHoraCsv(c.fechaApertura),
                formatearFechaHoraCsv(c.fechaCierre),
                centavosADecimalCsv(c.montoInicialCentavos),
                centavosADecimalCsv(c.efectivoEsperadoCentavos),
                centavosADecimalCsv(c.efectivoContadoCentavos),
                centavosADecimalCsv(c.diferenciaCentavos),
            ]),
        );
    }

    exportarInteligenciaStockCsv(): void {
        const rep = this.inteligenciaStock();
        if (!rep) return;
        descargarCsv(
            `salud-stock-${this.hasta()}.csv`,
            ['Sección', 'Producto', 'Categoría', 'Stock actual', 'Vend. 30d', 'Días cobertura', 'Sugerencia pedir', 'Valor inmovilizado (Bs)'],
            [
                ...rep.cobertura.map((c) => [
                    'Con rotación',
                    c.nombre,
                    c.categoriaNombre,
                    c.stockActual,
                    c.unidadesNetas30d,
                    c.diasCobertura,
                    c.sugerenciaReposicion,
                    '',
                ]),
                ...rep.sinRotacion30d.map((s) => [
                    'Sin ventas 30d',
                    s.nombre,
                    s.categoriaNombre,
                    s.stockActual,
                    0,
                    '',
                    0,
                    centavosADecimalCsv(s.valorInmovilizadoCentavos),
                ]),
            ],
        );
    }

    descargarReporteEjecutivoPdf(): void {
        void this.pdfService.descargarReporteEjecutivo({
            desde: this.desde(),
            hasta: this.hasta(),
            ventasPorCanal: this.ventasPorCanal(),
            masVendidos: this.masVendidos(),
            margen: this.margen(),
        });
    }

    descargarCierrePdf(): void {
        const det = this.detalleCierre();
        if (!det) return;
        void this.pdfService.descargarCierreCaja(det);
    }

    descargarReposicionPdf(): void {
        const rep = this.inteligenciaStock();
        if (!rep) return;
        void this.pdfService.descargarReposicionInventario(rep);
    }
}
