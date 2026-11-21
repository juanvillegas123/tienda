import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ReportesService } from '../../../core/reportes.service';
import { ResumenDashboard } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';

@Component({
    selector: 'app-dashboard-admin',
    standalone: true,
    imports: [RouterLink, DatePipe, BsPipe],
    templateUrl: './dashboard.html',
})
export class DashboardAdminComponent implements OnInit {
    private readonly reportesService = inject(ReportesService);

    readonly resumen = signal<ResumenDashboard | null>(null);
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);

    ngOnInit(): void {
        this.cargar();
    }

    cargar(): void {
        this.cargando.set(true);
        this.errorCarga.set(null);

        this.reportesService.obtenerResumenDashboard().subscribe({
            next: (data) => {
                this.resumen.set(data);
                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
                this.errorCarga.set('No se pudo cargar el resumen del dashboard.');
            },
        });
    }
}
