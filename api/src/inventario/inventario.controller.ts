import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import {
    crearEntradaInventarioSchema,
    crearAjusteInventarioSchema,
    listarMovimientosQuerySchema,
} from './inventario.schemas';
import type {
    CrearEntradaInventarioDto,
    CrearAjusteInventarioDto,
    ListarMovimientosQueryDto,
} from './inventario.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('inventario')
export class InventarioController {
    constructor(private readonly inventarioService: InventarioService) {}

    @Post('entradas')
    registrarEntrada(
        @Body(new ZodValidationPipe(crearEntradaInventarioSchema))
        dto: CrearEntradaInventarioDto,
    ) {
        return this.inventarioService.registrarEntrada(dto);
    }

    @Post('ajustes')
    registrarAjuste(
        @Body(new ZodValidationPipe(crearAjusteInventarioSchema))
        dto: CrearAjusteInventarioDto,
    ) {
        return this.inventarioService.registrarAjuste(dto);
    }

    @Get('movimientos')
    listarMovimientos(
        @Query(new ZodValidationPipe(listarMovimientosQuerySchema))
        query: ListarMovimientosQueryDto,
    ) {
        return this.inventarioService.listarMovimientos(query);
    }
}
