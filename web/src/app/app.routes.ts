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
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
                title: 'Pedidos',
            },
            {
                path: 'pos',
                loadComponent: () =>
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
                title: 'Punto de venta',
            },
            {
                path: 'caja',
                loadComponent: () =>
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
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
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
                title: 'Inventario',
            },
            {
                path: 'proveedores',
                loadComponent: () =>
                    import('./shared/placeholder').then((m) => m.PlaceholderComponent),
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
                path: 'producto/:id',
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
        ],
    },

    // Catch-all
    { path: '**', redirectTo: '' },
];
