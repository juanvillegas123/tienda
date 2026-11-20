import {
    Controller,
    Get,
    Post,
    Patch,
    Param,
    Query,
    Body,
    Req,
    BadRequestException,
    ParseIntPipe,
    UsePipes,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ProductosService } from './productos.service';
import { AlmacenamientoService } from '../almacenamiento/almacenamiento.service';
import {
    crearProductoSchema,
    editarProductoSchema,
    filtroProductosSchema,
    filtroProductosPublicoSchema,
} from './productos.schemas';
import type {
    CrearProductoDto,
    EditarProductoDto,
    FiltroProductosDto,
    FiltroProductosPublicoDto,
} from './productos.schemas';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { Public } from '../auth/public.decorator';

@Controller('productos')
export class ProductosController {
    constructor(
        private readonly productosService: ProductosService,
        private readonly almacenamientoService: AlmacenamientoService,
    ) {}

    /**
     * Subir imagen desde el equipo: valida magic bytes, optimiza a 4:5 WebP y sube a Cloudflare R2.
     */
    @Post('imagenes/subir')
    async subirImagen(@Req() req: FastifyRequest) {
        if (!req.isMultipart()) {
            throw new BadRequestException('La petición debe ser multipart/form-data');
        }
        const file = await req.file();
        if (!file) {
            throw new BadRequestException('No se envió ningún archivo de imagen');
        }

        const buffer = await file.toBuffer();
        const { url } = await this.almacenamientoService.subirImagenProducto(buffer);

        return {
            url,
            nombreOriginal: file.filename,
        };
    }

    /**
     * Catálogo público: productos activos sin costos ni proveedores.
     */
    @Public()
    @Get()
    listarPublicos(
        @Query(new ZodValidationPipe(filtroProductosPublicoSchema)) filtro: FiltroProductosPublicoDto,
    ) {
        return this.productosService.listarPublicos(filtro);
    }

    /**
     * Detalle público de un producto.
     */
    @Public()
    @Get(':id')
    obtenerPublicoPorId(@Param('id', ParseIntPipe) id: number) {
        return this.productosService.obtenerPublicoPorId(id);
    }

    /**
     * Listado administrativo: incluye productos inactivos, costos y proveedores.
     */
    @Get('admin/lista')
    listarAdmin(@Query(new ZodValidationPipe(filtroProductosSchema)) filtro: FiltroProductosDto) {
        return this.productosService.listarAdmin(filtro);
    }

    /**
     * Detalle administrativo completo de un producto.
     */
    @Get('admin/detalle/:id')
    obtenerAdminPorId(@Param('id', ParseIntPipe) id: number) {
        return this.productosService.obtenerAdminPorId(id);
    }

    /**
     * Crear producto nuevo (administradora).
     */
    @Post()
    @UsePipes(new ZodValidationPipe(crearProductoSchema))
    crear(@Body() dto: CrearProductoDto) {
        return this.productosService.crear(dto);
    }

    /**
     * Editar producto existente (administradora).
     */
    @Patch(':id')
    editar(
        @Param('id', ParseIntPipe) id: number,
        @Body(new ZodValidationPipe(editarProductoSchema)) dto: EditarProductoDto,
    ) {
        return this.productosService.editar(id, dto);
    }

    /**
     * Dar de baja lógica un producto (administradora).
     */
    @Patch(':id/baja')
    darDeBaja(@Param('id', ParseIntPipe) id: number) {
        return this.productosService.darDeBaja(id);
    }
}
