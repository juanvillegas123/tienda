import { Controller, Get, Query } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { rangoFechasSchema, masVendidosQuerySchema } from './reportes.schemas';
import type { RangoFechasDto, MasVendidosQueryDto } from './reportes.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('reportes')
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) {}

    @Get('resumen-dashboard')
    resumenDashboard() {
        return this.reportesService.obtenerResumenDashboard();
    }

    @Get('mas-vendidos')
    masVendidos(
        @Query(new ZodValidationPipe(masVendidosQuerySchema))
        query: MasVendidosQueryDto,
    ) {
        return this.reportesService.masVendidos(query);
    }

    @Get('ventas-por-canal')
    ventasPorCanal(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.ventasPorCanal(query);
    }

    @Get('cierres-de-caja')
    cierresDeCaja(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.cierresDeCaja(query);
    }

    @Get('margen')
    margen(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.margenPorProducto(query);
    }
}
