import { Component, HostListener, inject, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { PdfPreviewModalComponent } from '../../../shared/ui/pdf-preview-modal/pdf-preview-modal';

interface NavItem {
    nombre: string;
    ruta: string;
    queryParams?: Record<string, string>;
    exacto?: boolean;
    id:
        | 'dashboard'
        | 'pedidos'
        | 'pos'
        | 'ventas'
        | 'caja'
        | 'productos'
        | 'categorias'
        | 'inventario'
        | 'proveedores'
        | 'reportes';
}

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [RouterOutlet, RouterLink, RouterLinkActive, PdfPreviewModalComponent],
    templateUrl: './admin-layout.html',
})
export class AdminLayoutComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);

    readonly sesion = this.authService.sesion;
    readonly menuMovilAbierto = signal(false);

    readonly navItems: NavItem[] = [
        { nombre: 'Inicio', ruta: '/admin/dashboard', id: 'dashboard' },
        { nombre: 'Pedidos', ruta: '/admin/pedidos', id: 'pedidos' },
        { nombre: 'Punto de venta', ruta: '/admin/pos', exacto: true, id: 'pos' },
        {
            nombre: 'Ventas y devoluciones',
            ruta: '/admin/pos',
            queryParams: { tab: 'historial' },
            id: 'ventas',
        },
        { nombre: 'Caja', ruta: '/admin/caja', id: 'caja' },
        { nombre: 'Productos', ruta: '/admin/productos', id: 'productos' },
        { nombre: 'Categorías', ruta: '/admin/categorias', id: 'categorias' },
        { nombre: 'Inventario', ruta: '/admin/inventario', id: 'inventario' },
        { nombre: 'Proveedores', ruta: '/admin/proveedores', id: 'proveedores' },
        { nombre: 'Reportes', ruta: '/admin/reportes', id: 'reportes' },
    ];

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.menuMovilAbierto()) {
            this.menuMovilAbierto.set(false);
        }
    }

    ngOnInit(): void {
        if (!this.authService.estaAutenticada()) {
            this.authService.cargarSesion().subscribe({
                error: () => void this.router.navigate(['/admin/login']),
            });
        }
    }

    alternarMenuMovil(): void {
        this.menuMovilAbierto.update((v) => !v);
    }

    cerrarMenuMovil(): void {
        this.menuMovilAbierto.set(false);
    }

    cerrarSesion(): void {
        this.menuMovilAbierto.set(false);
        this.authService.logout().subscribe({
            next: () => void this.router.navigate(['/admin/login']),
            error: () => void this.router.navigate(['/admin/login']),
        });
    }
}
