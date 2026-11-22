import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

/**
 * Compatibilidad F3.3: redirige /?categoria=ID o /?q=texto a /catalogo conservando parámetros.
 */
const redirigirFiltrosInicioGuard: CanActivateFn = (route) => {
    const hasCategoria = route.queryParamMap.has('categoria');
    const hasQ = route.queryParamMap.has('q');
    if (hasCategoria || hasQ) {
        return inject(Router).createUrlTree(['/catalogo'], {
            queryParams: route.queryParams,
        });
    }
    return true;
};

const redirigirTiendaGuard: CanActivateFn = () =>
    inject(Router).createUrlTree(['/'], { fragment: 'cap-2' });

export const routes: Routes = [
    // Login de administración (noindex)
    {
        path: 'admin/login',
        loadComponent: () =>
            import('./features/admin/login/login').then((m) => m.LoginComponent),
        title: 'Iniciar sesión',
        data: {
            seo: {
                titulo: 'Iniciar sesión | Onii-Chan Store',
                descripcion: 'Acceso privado al panel de administración.',
                robots: 'noindex, nofollow',
            },
        },
    },

    // Panel admin — protegido por guard (noindex en todas las rutas hijas)
    {
        path: 'admin',
        loadComponent: () =>
            import('./features/admin/layout/admin-layout').then((m) => m.AdminLayoutComponent),
        canActivate: [authGuard],
        data: {
            seo: {
                titulo: 'Panel de administración | Onii-Chan Store',
                descripcion: 'Panel privado de administración.',
                robots: 'noindex, nofollow',
            },
        },
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

    // Tienda pública
    {
        path: '',
        loadComponent: () =>
            import('./features/publico/layout/public-layout').then((m) => m.PublicLayoutComponent),
        children: [
            {
                path: '',
                canActivate: [redirigirFiltrosInicioGuard],
                loadComponent: () =>
                    import('./features/publico/inicio/inicio').then((m) => m.InicioComponent),
                title: 'Figuras de colección y merchandising anime en Sucre | Onii-Chan Store',
                data: {
                    seo: {
                        titulo: 'Figuras de colección y merchandising anime en Sucre | Onii-Chan Store',
                        descripcion:
                            'Descubre figuras de colección, poleras, peluches, pines y accesorios anime en Sucre, Bolivia. Calidad en figuras — Onii-Chan Store.',
                        robots: 'index, follow',
                    },
                },
            },
            {
                path: 'catalogo',
                loadComponent: () =>
                    import('./features/publico/catalogo/catalogo').then((m) => m.CatalogoComponent),
                title: 'Catálogo de figuras y merchandising anime | Onii-Chan Store',
                data: {
                    seo: {
                        titulo: 'Catálogo de figuras y merchandising anime en Sucre | Onii-Chan Store',
                        descripcion:
                            'Explora todo el catálogo disponible de figuras anime, poleras, peluches y accesorios en Onii-Chan Store, Sucre.',
                        robots: 'index, follow',
                    },
                },
            },
            {
                path: 'catalogo/:categoria',
                loadComponent: () =>
                    import('./features/publico/catalogo/catalogo').then((m) => m.CatalogoComponent),
                title: 'Catálogo por categoría | Onii-Chan Store',
            },
            {
                path: 'producto/:ruta',
                loadComponent: () =>
                    import('./features/publico/producto-detalle/producto-detalle').then(
                        (m) => m.ProductoDetalleComponent,
                    ),
                title: 'Detalle de producto | Onii-Chan Store',
            },
            {
                path: 'tienda',
                canActivate: [redirigirTiendaGuard],
                loadComponent: () =>
                    import('./features/publico/no-encontrado/no-encontrado').then(
                        (m) => m.NoEncontradoComponent,
                    ),
            },
            {
                path: 'carrito',
                loadComponent: () =>
                    import('./features/publico/carrito/carrito').then((m) => m.CarritoComponent),
                title: 'Tu carrito | Onii-Chan Store',
                data: {
                    seo: {
                        titulo: 'Tu carrito | Onii-Chan Store',
                        descripcion: 'Revisa tu carrito y envía tu pedido por WhatsApp.',
                        robots: 'noindex, nofollow',
                    },
                },
            },
            {
                path: '**',
                loadComponent: () =>
                    import('./features/publico/no-encontrado/no-encontrado').then(
                        (m) => m.NoEncontradoComponent,
                    ),
                title: 'Página no encontrada | Onii-Chan Store',
                data: {
                    seo: {
                        titulo: 'Página no encontrada | Onii-Chan Store',
                        descripcion: 'La página que buscas no está disponible.',
                        robots: 'noindex, nofollow',
                    },
                },
            },
        ],
    },
];
