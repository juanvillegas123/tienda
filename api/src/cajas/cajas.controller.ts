import {
    Controller,
    Get,
    Post,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { CajasService } from './cajas.service';
import { abrirCajaSchema, cerrarCajaSchema } from './cajas.schemas';
import type { AbrirCajaDto, CerrarCajaDto } from './cajas.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { SesionActual } from '../auth/sesion-actual.decorator';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('cajas')
export class CajasController {
    constructor(private readonly cajasService: CajasService) {}

    @Post('abrir')
    abrir(
        @Body(new ZodValidationPipe(abrirCajaSchema)) dto: AbrirCajaDto,
        @SesionActual() sesion: JwtPayload,
    ) {
        return this.cajasService.abrir(dto, sesion.sub);
    }

    @Get('actual')
    obtenerActual() {
        return this.cajasService.obtenerActual();
    }

    @Post('cerrar')
    @HttpCode(HttpStatus.OK)
    cerrar(@Body(new ZodValidationPipe(cerrarCajaSchema)) dto: CerrarCajaDto) {
        return this.cajasService.cerrar(dto);
    }

    @Get()
    listarHistorial() {
        return this.cajasService.listarHistorial();
    }
}
