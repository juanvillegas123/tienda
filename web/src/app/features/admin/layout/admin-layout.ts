import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';

interface NavItem {
    nombre: string;
    ruta: string;
    icono: string;
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
        { nombre: 'Pedidos', ruta: '/admin/pedidos', icono: '📦' },
        { nombre: 'Punto de venta', ruta: '/admin/pos', icono: '🛒' },
        { nombre: 'Caja', ruta: '/admin/caja', icono: '💰' },
        { nombre: 'Productos', ruta: '/admin/productos', icono: '🏷️' },
        { nombre: 'Categorías', ruta: '/admin/categorias', icono: '🗂️' },
        { nombre: 'Inventario', ruta: '/admin/inventario', icono: '📊' },
        { nombre: 'Proveedores', ruta: '/admin/proveedores', icono: '🚚' },
        { nombre: 'Reportes', ruta: '/admin/reportes', icono: '📈' },
    ];

    ngOnInit(): void {
        // Cargar sesión si no está en memoria
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
