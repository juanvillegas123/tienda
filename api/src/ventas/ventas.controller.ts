import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { crearVentaSchema, listarVentasQuerySchema } from './ventas.schemas';
import type { CrearVentaDto, ListarVentasQueryDto } from './ventas.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SesionActual } from '../auth/sesion-actual.decorator';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('ventas')
export class VentasController {
    constructor(private readonly ventasService: VentasService) {}

    @Post()
    crear(
        @Body(new ZodValidationPipe(crearVentaSchema)) dto: CrearVentaDto,
        @SesionActual() sesion: JwtPayload,
    ) {
        return this.ventasService.crear(dto, sesion.sub);
    }

    @Get()
    listar(
        @Query(new ZodValidationPipe(listarVentasQuerySchema))
        query: ListarVentasQueryDto,
    ) {
        return this.ventasService.listar(query);
    }
}
