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
import { CategoriasService } from './categorias.service';
import {
    crearCategoriaSchema,
    editarCategoriaSchema,
} from './categorias.schemas';
import type {
    CrearCategoriaDto,
    EditarCategoriaDto,
} from './categorias.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';

@Controller('categorias')
export class CategoriasController {
    constructor(private readonly categoriasService: CategoriasService) {}

    @Public()
    @Get()
    listarActivas() {
        return this.categoriasService.listarActivas();
    }

    @Get('admin')
    listarAdmin() {
        return this.categoriasService.listarAdmin();
    }

    @Get(':id')
    obtenerPorId(@Param('id', ParseIntPipe) id: number) {
        return this.categoriasService.obtenerPorId(id);
    }

    @Post()
    @UsePipes(new ZodValidationPipe(crearCategoriaSchema))
    crear(@Body() dto: CrearCategoriaDto) {
        return this.categoriasService.crear(dto);
    }

    @Patch(':id')
    editar(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(editarCategoriaSchema)) dto: EditarCategoriaDto,
    ) {
        return this.categoriasService.editar(id, dto);
    }

    @Patch(':id/baja')
    darDeBaja(@Param('id', ParseIntPipe) id: number) {
        return this.categoriasService.darDeBaja(id);
    }
}
