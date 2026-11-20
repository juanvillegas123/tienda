import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    // Compatibilidad con ruta antigua /catalogo
    { path: 'catalogo', pathMatch: 'full', redirectTo: '' },

    // Login de administración
    {
        path: 'admin/login',
        loadComponent: () =>
            import('./features/admin/login/login').then((m) => m.LoginComponent),
        title: 'Iniciar sesión',
    },

    // Panel admin — protegido por guard
    {
        path: 'admin',
        loadComponent: () =>
            import('./features/admin/layout/admin-layout').then((m) => m.AdminLayoutComponent),
        canActivate: [authGuard],
        children: [
            { path: '', redirectTo: 'pedidos', pathMatch: 'full' },
            {
                path: 'pedidos',
                loadComponent: () =>
                    import('./features/admin/pedidos/pedidos').then((m) => m.PedidosAdminComponent),
                title: 'Pedidos',
            },
            {
                path: 'pos',
                loadComponent: () =>
                    import('./features/admin/pos/pos').then((m) => m.PosAdminComponent),
                title: 'Punto de venta',
            },
            {
                path: 'caja',
                loadComponent: () =>
                    import('./features/admin/caja/caja').then((m) => m.CajaAdminComponent),
                title: 'Caja',
            },
            {
                path: 'productos',
                loadComponent: () =>
                    import('./features/admin/productos/productos').then((m) => m.ProductosAdminComponent),
                title: 'Productos',
            },
            {
                path: 'categorias',
                loadComponent: () =>
                    import('./features/admin/categorias/categorias').then((m) => m.CategoriasAdminComponent),
                title: 'Categorías',
            },
            {
                path: 'inventario',
                loadComponent: () =>
                    import('./features/admin/inventario/inventario').then(
                        (m) => m.InventarioAdminComponent,
                    ),
                title: 'Inventario',
            },
            {
                path: 'proveedores',
                loadComponent: () =>
                    import('./features/admin/proveedores/proveedores').then(
                        (m) => m.ProveedoresAdminComponent,
                    ),
                title: 'Proveedores',
            },
            {
                path: 'reportes',
                loadComponent: () =>
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
                title: 'Reportes',
            },
        ],
    },

    // Tienda pública (F3)
    {
        path: '',
        loadComponent: () =>
            import('./features/publico/layout/public-layout').then((m) => m.PublicLayoutComponent),
        children: [
            {
                path: '',
                loadComponent: () =>
                    import('./features/publico/catalogo/catalogo').then((m) => m.CatalogoComponent),
                title: 'Catálogo — OniiChan Store',
            },
            {
                path: 'producto/:ruta',
                loadComponent: () =>
                    import('./features/publico/producto-detalle/producto-detalle').then(
                        (m) => m.ProductoDetalleComponent,
                    ),
                title: 'Detalle de producto — OniiChan Store',
            },
            {
                path: 'carrito',
                loadComponent: () =>
                    import('./features/publico/carrito/carrito').then((m) => m.CarritoComponent),
                title: 'Carrito — OniiChan Store',
            },
            {
                path: '**',
                loadComponent: () =>
                    import('./features/publico/no-encontrado/no-encontrado').then(
                        (m) => m.NoEncontradoComponent,
                    ),
                title: 'Página no encontrada — OniiChan Store',
            },
        ],
    },
];
