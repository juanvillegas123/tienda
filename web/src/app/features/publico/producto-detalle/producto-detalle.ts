import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogoService } from '../../../core/catalogo.service';
import { CarritoService } from '../../../core/carrito.service';
import { ProductoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';

@Component({
    selector: 'app-producto-detalle',
    standalone: true,
    imports: [RouterLink, BsPipe],
    templateUrl: './producto-detalle.html',
})
export class ProductoDetalleComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly catalogoService = inject(CatalogoService);
    readonly carrito = inject(CarritoService);

    readonly producto = signal<ProductoPublico | null>(null);
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);

    readonly imagenSeleccionada = signal<string | null>(null);
    readonly cantidad = signal(1);
    readonly notaCliente = signal('');
    readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

    readonly galeria = computed(() => {
        const prod = this.producto();
        if (!prod) return [];
        const urls: string[] = [];
        if (prod.imagenPrincipal) {
            urls.push(prod.imagenPrincipal);
        }
        for (const img of prod.imagenes ?? []) {
            if (img.url && !urls.includes(img.url)) {
                urls.push(img.url);
            }
        }
        return urls;
    });

    readonly enCarrito = computed(() => {
        const prod = this.producto();
        return prod ? this.carrito.cantidadEnCarrito(prod.id) : 0;
    });

    readonly disponibleParaAgregar = computed(() => {
        const prod = this.producto();
        if (!prod || prod.stock <= 0) return 0;
        return Math.max(0, prod.stock - this.enCarrito());
    });

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id');
        const id = Number(idParam);
        if (!idParam || !Number.isInteger(id) || id <= 0) {
            this.errorCarga.set('Producto no encontrado.');
            this.cargando.set(false);
            return;
        }

        this.cargarProducto(id);
    }

    cargarProducto(id: number): void {
        this.cargando.set(true);
        this.errorCarga.set(null);

        this.catalogoService.obtenerProducto(id).subscribe({
            next: (prod) => {
                this.producto.set(prod);
                const primera = prod.imagenPrincipal ?? prod.imagenes?.[0]?.url ?? null;
                this.imagenSeleccionada.set(primera);
                this.cantidad.set(1);
                this.cargando.set(false);
            },
            error: () => {
                this.errorCarga.set('Este producto no existe o ya no está disponible.');
                this.cargando.set(false);
            },
        });
    }

    seleccionarImagen(url: string): void {
        this.imagenSeleccionada.set(url);
    }

    incrementar(): void {
        const max = this.disponibleParaAgregar();
        if (this.cantidad() < max) {
            this.cantidad.update((c) => c + 1);
        }
    }

    decrementar(): void {
        if (this.cantidad() > 1) {
            this.cantidad.update((c) => c - 1);
        }
    }

    actualizarNota(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.notaCliente.set(valor);
    }

    agregarAlCarrito(): void {
        const prod = this.producto();
        if (!prod) return;

        const res = this.carrito.agregar(prod, this.cantidad(), this.notaCliente());
        this.mensaje.set({ tipo: res.ok ? 'ok' : 'error', texto: res.mensaje });

        if (res.ok) {
            this.cantidad.set(1);
            this.notaCliente.set('');
        }
    }
}
