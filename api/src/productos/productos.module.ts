import { Module } from '@nestjs/common';
import { ProductosController } from './productos.controller';
import { ProductosService } from './productos.service';
import { AlmacenamientoModule } from '../almacenamiento/almacenamiento.module';

@Module({
    imports: [AlmacenamientoModule],
    controllers: [ProductosController],
    providers: [ProductosService],
    exports: [ProductosService],
})
export class ProductosModule {}
