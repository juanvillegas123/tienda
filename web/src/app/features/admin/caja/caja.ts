import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import {
    FormBuilder,
    ReactiveFormsModule,
    Validators,
    AbstractControl,
    ValidationErrors,
} from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { CajasService } from '../../../core/cajas.service';
import { ReportesService } from '../../../core/reportes.service';
import { CajaResumen } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { PdfService } from '../../../shared/pdf.service';
import { parsearBsACentavosEstricto } from '../../../shared/dinero.utils';

function parsearBsACentavos(valor: unknown): number | null {
    return parsearBsACentavosEstricto(valor);
}

function validadorMonto(control: AbstractControl): ValidationErrors | null {
    if (control.value === null || control.value === undefined || String(control.value).trim() === '') {
        return { requerido: true };
    }
    return parsearBsACentavos(control.value) === null ? { montoInvalido: true } : null;
}

@Component({
    selector: 'app-caja-admin',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, DatePipe, BsPipe],
    templateUrl: './caja.html',
})
export class CajaAdminComponent implements OnInit {
    private readonly cajasService = inject(CajasService);
    private readonly reportesService = inject(ReportesService);
    private readonly pdfService = inject(PdfService);
    private readonly fb = inject(FormBuilder);

    readonly cajaActual = signal<CajaResumen | null>(null);
    readonly historial = signal<CajaResumen[]>([]);
    readonly cargando = signal(true);
    readonly procesando = signal(false);
    readonly descargandoPdfId = signal<number | null>(null);

    readonly modalCerrarAbierto = signal(false);
    readonly efectivoContadoTexto = signal('');

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly formAbrir = this.fb.group({
        montoInicialBs: ['', [Validators.required, validadorMonto]],
    });

    readonly efectivoContadoCentavos = computed(() =>
        parsearBsACentavos(this.efectivoContadoTexto()),
    );

    readonly diferenciaPreviaCentavos = computed(() => {
        const caja = this.cajaActual();
        const contado = this.efectivoContadoCentavos();
        if (!caja || contado === null) return null;
        return contado - caja.efectivoEsperadoCentavos;
    });

    readonly cierresAnteriores = computed(() =>
        this.historial().filter((c) => c.estado === 'CERRADA'),
    );

    ngOnInit(): void {
        this.cargarDatos();
    }

    cargarDatos(): void {
        this.cargando.set(true);
        this.mensajeError.set(null);

        this.cajasService.obtenerActual().subscribe({
            next: (actual) => {
                this.cajaActual.set(actual);
                this.cajasService.listarHistorial().subscribe({
                    next: (hist) => {
                        this.historial.set(hist);
                        this.cargando.set(false);
                    },
                    error: () => {
                        this.cargando.set(false);
                    },
                });
            },
            error: (err: unknown) => {
                this.cargando.set(false);
                this.manejarError(err, 'No se pudo consultar el estado de la caja.');
            },
        });
    }

    abrirCaja(): void {
        if (this.formAbrir.invalid) {
            this.formAbrir.markAllAsTouched();
            return;
        }

        const montoCentavos = parsearBsACentavos(this.formAbrir.value.montoInicialBs);
        if (montoCentavos === null) return;

        this.procesando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.cajasService.abrir(montoCentavos).subscribe({
            next: (caja) => {
                this.cajaActual.set(caja);
                this.formAbrir.reset({ montoInicialBs: '' });
                this.procesando.set(false);
                this.mensajeExito.set(`Caja #${caja.id} abierta correctamente.`);
                this.cargarHistorialSilencioso();
            },
            error: (err: unknown) => {
                this.procesando.set(false);
                this.manejarError(err, 'No se pudo abrir la caja.');
            },
        });
    }

    abrirModalCerrar(): void {
        this.efectivoContadoTexto.set('');
        this.mensajeError.set(null);
        this.modalCerrarAbierto.set(true);
    }

    cerrarModalCerrar(): void {
        this.modalCerrarAbierto.set(false);
        this.efectivoContadoTexto.set('');
    }

    actualizarEfectivoContado(event: Event): void {
        this.efectivoContadoTexto.set((event.target as HTMLInputElement).value);
    }

    confirmarCierre(): void {
        const contado = this.efectivoContadoCentavos();
        if (contado === null) return;

        this.procesando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        this.cajasService.cerrar(contado).subscribe({
            next: (cerrada) => {
                this.cajaActual.set(null);
                this.procesando.set(false);
                this.cerrarModalCerrar();
                this.mensajeExito.set(
                    `Caja #${cerrada.id} cerrada correctamente. El cierre quedó registrado en el historial.`,
                );
                this.cargarHistorialSilencioso();
            },
            error: (err: unknown) => {
                this.procesando.set(false);
                this.manejarError(err, 'No se pudo cerrar la caja.');
            },
        });
    }

    descargarPdfCierre(cajaId: number): void {
        if (this.descargandoPdfId() !== null) return;
        this.descargandoPdfId.set(cajaId);
        this.mensajeError.set(null);
        this.reportesService.detalleCierre(cajaId).subscribe({
            next: (detalle) => {
                void this.pdfService
                    .descargarCierreCaja(detalle)
                    .finally(() => this.descargandoPdfId.set(null));
            },
            error: (err: unknown) => {
                this.descargandoPdfId.set(null);
                this.manejarError(err, 'No se pudo generar el PDF del cierre de caja.');
            },
        });
    }

    campoAbrirInvalido(): boolean {
        const ctrl = this.formAbrir.get('montoInicialBs');
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    private cargarHistorialSilencioso(): void {
        this.cajasService.listarHistorial().subscribe({
            next: (hist) => this.historial.set(hist),
        });
    }

    private manejarError(err: unknown, fallback: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            this.mensajeError.set((body?.['mensaje'] as string) || fallback);
        } else {
            this.mensajeError.set(fallback);
        }
    }
}
