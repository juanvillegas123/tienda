import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
    // Redirigir raíz al catálogo (F3)
    { path: '', pathMatch: 'full', redirectTo: 'catalogo' },

    // Catálogo público (placeholder hasta F3)
    {
        path: 'catalogo',
        loadComponent: () =>
            import('./shared/placeholder').then((m) => m.PlaceholderComponent),
        title: 'Catálogo',
    },

    // Login
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

    // Catch-all
    { path: '**', redirectTo: 'catalogo' },
];
