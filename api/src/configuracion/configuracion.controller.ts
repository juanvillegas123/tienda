import { Controller, Get, Patch, Body } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import {
    actualizarWhatsappSchema,
    actualizarInfoTiendaSchema,
} from './configuracion.schemas';
import type {
    ActualizarWhatsappDto,
    ActualizarInfoTiendaDto,
} from './configuracion.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';

@Controller('configuracion')
export class ConfiguracionController {
    constructor(private readonly configuracionService: ConfiguracionService) {}

    @Public()
    @Get('whatsapp')
    obtenerWhatsapp() {
        return this.configuracionService.obtenerWhatsapp();
    }

    @Patch('whatsapp')
    actualizarWhatsapp(
        @Body(new ZodValidationPipe(actualizarWhatsappSchema)) dto: ActualizarWhatsappDto,
    ) {
        return this.configuracionService.actualizarWhatsapp(dto.whatsappNumero);
    }

    @Public()
    @Get('tienda')
    obtenerInfoTienda() {
        return this.configuracionService.obtenerInfoTienda();
    }

    @Patch('tienda')
    actualizarInfoTienda(
        @Body(new ZodValidationPipe(actualizarInfoTiendaSchema)) dto: ActualizarInfoTiendaDto,
    ) {
        return this.configuracionService.actualizarInfoTienda(dto);
    }
}
