import {
    Controller,
    Get,
    Post,
    Param,
    Query,
    Body,
    ParseIntPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import {
    crearPedidoSchema,
    listarPedidosQuerySchema,
    confirmarPedidoSchema,
} from './pedidos.schemas';
import type {
    CrearPedidoDto,
    ListarPedidosQueryDto,
    ConfirmarPedidoDto,
} from './pedidos.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';
import { SesionActual } from '../auth/sesion-actual.decorator';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('pedidos')
export class PedidosController {
    constructor(private readonly pedidosService: PedidosService) {}

    /**
     * Público: crea un pedido PENDIENTE y devuelve su código (PED-XXXX).
     */
    @Public()
    @Post()
    crear(@Body(new ZodValidationPipe(crearPedidoSchema)) dto: CrearPedidoDto) {
        return this.pedidosService.crear(dto);
    }

    /**
     * Administradora: lista pedidos con filtro opcional por estado.
     */
    @Get()
    listar(
        @Query(new ZodValidationPipe(listarPedidosQuerySchema))
        query: ListarPedidosQueryDto,
    ) {
        return this.pedidosService.listar(query);
    }

    /**
     * Administradora: detalle completo de un pedido con notas del cliente.
     */
    @Get(':id')
    obtenerPorId(@Param('id', ParseIntPipe) id: number) {
        return this.pedidosService.obtenerPorId(id);
    }

    /**
     * Administradora: confirma pedido, crea venta ONLINE y descuenta stock.
     */
    @Post(':id/confirmar')
    @HttpCode(HttpStatus.OK)
    confirmar(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(confirmarPedidoSchema)) dto: ConfirmarPedidoDto,
        @SesionActual() sesion: JwtPayload,
    ) {
        return this.pedidosService.confirmar(id, dto, sesion.sub);
    }

    /**
     * Administradora: cancela un pedido PENDIENTE sin afectar stock.
     */
    @Post(':id/cancelar')
    @HttpCode(HttpStatus.OK)
    cancelar(@Param('id', ParseIntPipe) id: number) {
        return this.pedidosService.cancelar(id);
    }
}
