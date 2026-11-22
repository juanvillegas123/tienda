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
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            {
                path: 'dashboard',
                loadComponent: () =>
                    import('./features/admin/dashboard/dashboard').then(
                        (m) => m.DashboardAdminComponent,
                    ),
                title: 'Inicio — Panel de administración',
            },
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
                    import('./features/admin/reportes/reportes').then(
                        (m) => m.ReportesAdminComponent,
                    ),
                title: 'Reportes',
            },
            {
                path: 'perfil',
                loadComponent: () =>
                    import('./features/admin/perfil/perfil').then((m) => m.PerfilAdminComponent),
                title: 'Mi perfil y seguridad',
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
                title: 'Catálogo — Onii-Chan Store',
            },
            {
                path: 'producto/:ruta',
                loadComponent: () =>
                    import('./features/publico/producto-detalle/producto-detalle').then(
                        (m) => m.ProductoDetalleComponent,
                    ),
                title: 'Detalle de producto — Onii-Chan Store',
            },
            {
                path: 'tienda',
                loadComponent: () =>
                    import('./features/publico/tienda/tienda').then((m) => m.TiendaPublicaComponent),
                title: 'La Tienda — Onii-Chan Store',
            },
            {
                path: 'carrito',
                loadComponent: () =>
                    import('./features/publico/carrito/carrito').then((m) => m.CarritoComponent),
                title: 'Carrito — Onii-Chan Store',
            },
            {
                path: '**',
                loadComponent: () =>
                    import('./features/publico/no-encontrado/no-encontrado').then(
                        (m) => m.NoEncontradoComponent,
                    ),
                title: 'Página no encontrada — Onii-Chan Store',
            },
        ],
    },
];
