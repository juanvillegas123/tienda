import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

interface NavItem {
    nombre: string;
    ruta: string;
    id: 'pedidos' | 'pos' | 'caja' | 'productos' | 'categorias' | 'inventario' | 'proveedores' | 'reportes';
}

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly sesion = this.authService.sesion;

    readonly navItems: NavItem[] = [
        { nombre: 'Pedidos', ruta: '/admin/pedidos', id: 'pedidos' },
        { nombre: 'Punto de venta', ruta: '/admin/pos', id: 'pos' },
        { nombre: 'Caja', ruta: '/admin/caja', id: 'caja' },
        { nombre: 'Productos', ruta: '/admin/productos', id: 'productos' },
        { nombre: 'Categorías', ruta: '/admin/categorias', id: 'categorias' },
        { nombre: 'Inventario', ruta: '/admin/inventario', id: 'inventario' },
        { nombre: 'Proveedores', ruta: '/admin/proveedores', id: 'proveedores' },
        { nombre: 'Reportes', ruta: '/admin/reportes', id: 'reportes' },
    ];

    ngOnInit(): void {
        if (!this.authService.estaAutenticada()) {
            this.authService.cargarSesion().subscribe({
                error: () => void this.router.navigate(['/admin/login']),
            });
        }
    }

    cerrarSesion(): void {
        this.authService.logout().subscribe({
            next: () => void this.router.navigate(['/admin/login']),
            error: () => void this.router.navigate(['/admin/login']),
        });
    }
}
