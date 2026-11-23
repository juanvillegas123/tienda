import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
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

    @Get('ventas-por-dia')
    ventasPorDia(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.ventasPorDia(query);
    }

    @Get('ventas-por-categoria')
    ventasPorCategoria(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.ventasPorCategoria(query);
    }

    @Get('cierres-de-caja')
    cierresDeCaja(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.cierresDeCaja(query);
    }

    @Get('cierres-de-caja/:id')
    detalleCierre(@Param('id', ParseIntPipe) id: number) {
        return this.reportesService.obtenerDetalleCierre(id);
    }

    @Get('margen')
    margen(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.margenPorProducto(query);
    }

    @Get('inteligencia-stock')
    inteligenciaStock() {
        return this.reportesService.inteligenciaStock();
    }

    @Get('descuentos')
    descuentos(
        @Query(new ZodValidationPipe(rangoFechasSchema))
        query: RangoFechasDto,
    ) {
        return this.reportesService.reporteDescuentos(query);
    }
}
