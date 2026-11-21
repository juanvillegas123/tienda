import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER } from '@nestjs/core';
import { AuthModule } from './auth/auth.module';
import { CategoriasModule } from './categorias/categorias.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { ProductosModule } from './productos/productos.module';
import { PedidosModule } from './pedidos/pedidos.module';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { CajasModule } from './cajas/cajas.module';
import { VentasModule } from './ventas/ventas.module';
import { DevolucionesModule } from './devoluciones/devoluciones.module';
import { InventarioModule } from './inventario/inventario.module';
import { ReportesModule } from './reportes/reportes.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { HttpExceptionFilter } from './common/http-exception.filter';

@Module({
    imports: [
        AuthModule,
        CategoriasModule,
        ProveedoresModule,
        ProductosModule,
        PedidosModule,
        ConfiguracionModule,
        CajasModule,
        VentasModule,
        DevolucionesModule,
        InventarioModule,
        ReportesModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: JwtAuthGuard,
        },
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule {}
