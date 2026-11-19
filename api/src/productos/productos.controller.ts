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
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { writeFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import { ProductosService } from './productos.service';
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
    constructor(private readonly productosService: ProductosService) {}

    /**
     * Subir imagen local desde el equipo (administradora).
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

        const permitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!permitidos.includes(file.mimetype)) {
            throw new BadRequestException('Formato no permitido. Solo se aceptan imágenes JPG, PNG o WEBP');
        }

        const uploadsDir = join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) {
            mkdirSync(uploadsDir, { recursive: true });
        }

        const ext = file.filename.split('.').pop()?.toLowerCase() || 'jpg';
        const nombreSeguro = `prod-${Date.now()}-${randomUUID()}.${ext}`;
        const rutaCompleta = join(uploadsDir, nombreSeguro);

        const buffer = await file.toBuffer();
        await writeFile(rutaCompleta, buffer);

        const appUrl = process.env.APP_URL ?? 'http://localhost:3000';
        return {
            url: `${appUrl}/uploads/${nombreSeguro}`,
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
