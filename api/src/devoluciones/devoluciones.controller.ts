import { Controller, Post, Body } from '@nestjs/common';
import { DevolucionesService } from './devoluciones.service';
import { crearDevolucionSchema } from './devoluciones.schemas';
import type { CrearDevolucionDto } from './devoluciones.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('devoluciones')
export class DevolucionesController {
    constructor(private readonly devolucionesService: DevolucionesService) {}

    @Post()
    crear(@Body(new ZodValidationPipe(crearDevolucionSchema)) dto: CrearDevolucionDto) {
        return this.devolucionesService.crear(dto);
    }
}
