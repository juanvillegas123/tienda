import { Controller, Get, Patch, Body, UsePipes } from '@nestjs/common';
import { ConfiguracionService } from './configuracion.service';
import { actualizarWhatsappSchema } from './configuracion.schemas';
import type { ActualizarWhatsappDto } from './configuracion.schemas';
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
    @UsePipes(new ZodValidationPipe(actualizarWhatsappSchema))
    actualizarWhatsapp(@Body() dto: ActualizarWhatsappDto) {
        return this.configuracionService.actualizarWhatsapp(dto.whatsappNumero);
    }
}
