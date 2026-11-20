import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Body,
    ParseIntPipe,
    UsePipes,
} from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import {
    crearProveedorSchema,
    editarProveedorSchema,
} from './proveedores.schemas';
import type {
    CrearProveedorDto,
    EditarProveedorDto,
} from './proveedores.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';

@Controller('proveedores')
export class ProveedoresController {
    constructor(private readonly proveedoresService: ProveedoresService) {}

    @Get()
    listar() {
        return this.proveedoresService.listarActivos();
    }

    @Get('admin')
    listarAdmin() {
        return this.proveedoresService.listarTodos();
    }

    @Get(':id')
    obtenerPorId(@Param('id', ParseIntPipe) id: number) {
        return this.proveedoresService.obtenerPorId(id);
    }

    @Post()
    @UsePipes(new ZodValidationPipe(crearProveedorSchema))
    crear(@Body() dto: CrearProveedorDto) {
        return this.proveedoresService.crear(dto);
    }

    @Patch(':id')
    editar(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(editarProveedorSchema)) dto: EditarProveedorDto,
    ) {
        return this.proveedoresService.editar(id, dto);
    }

    @Patch(':id/baja')
    darDeBaja(@Param('id', ParseIntPipe) id: number) {
        return this.proveedoresService.darDeBaja(id);
    }
}
