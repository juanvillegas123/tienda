import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../../core/catalogo.service';
import { CarritoService } from '../../../core/carrito.service';
import { SeoService } from '../../../core/seo.service';
import { ProductoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';
import { IconoShurikenComponent } from '../../../shared/ui/icono-shuriken/icono-shuriken';
import { generarSlug } from '../../../shared/slug';
import {
    POCAS_UNIDADES,
    esNotaTallaVisible,
    etiquetaEscala,
    extraerIdDeRuta,
    rutaProducto,
} from '../../../shared/catalogo-ui.utils';

@Component({
    selector: 'app-producto-detalle',
    standalone: true,
    imports: [RouterLink, BsPipe, EstadoVacioComponent, IconoShurikenComponent],
    templateUrl: './producto-detalle.html',
})
export class ProductoDetalleComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly catalogoService = inject(CatalogoService);
    private readonly seo = inject(SeoService);
    readonly carrito = inject(CarritoService);

    readonly pocasUnidades = POCAS_UNIDADES;
    readonly esNotaTallaVisible = esNotaTallaVisible;
    readonly etiquetaEscala = etiquetaEscala;

    readonly producto = signal<ProductoPublico | null>(null);
    readonly cargando = signal(true);
    readonly noEncontrado = signal(false);

    readonly imagenSeleccionada = signal<string | null>(null);
    readonly cantidad = signal(1);
    readonly notaCliente = signal('');
    readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

    private ultimoIdCargado: number | null = null;

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
        this.route.paramMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const ruta = params.get('ruta');
                const id = extraerIdDeRuta(ruta);

                if (!id) {
                    this.ultimoIdCargado = null;
                    this.producto.set(null);
                    this.noEncontrado.set(true);
                    this.cargando.set(false);
                    this.aplicarSeoNoEncontrado();
                    return;
                }

                // Evitar recarga doble cuando ocurre la redirección canónica al mismo ID
                if (this.ultimoIdCargado === id && this.producto()?.id === id) {
                    return;
                }

                this.cargarProducto(id, ruta ?? '');
            });
    }

    cargarProducto(id: number, rutaActual: string): void {
        this.cargando.set(true);
        this.noEncontrado.set(false);
        this.mensaje.set(null);

        this.catalogoService.obtenerProducto(id).subscribe({
            next: (prod) => {
                this.ultimoIdCargado = prod.id;
                this.producto.set(prod);
                const primera = prod.imagenPrincipal ?? prod.imagenes?.[0]?.url ?? null;
                this.imagenSeleccionada.set(primera);
                this.cantidad.set(1);
                this.cargando.set(false);

                const canonica = rutaProducto(prod.id, prod.nombre);
                const rutaCanonicaCompleta = `/producto/${canonica}`;
                if (rutaActual !== canonica) {
                    void this.router.navigate(['/producto', canonica], { replaceUrl: true });
                }

                const precioTexto = (prod.precioCentavos / 100).toFixed(2).replace('.', ',');
                const descLimpia = prod.descripcion?.trim()
                    ? prod.descripcion.trim().slice(0, 155)
                    : `${prod.nombre} (${prod.categoriaNombre}) disponible en Onii-Chan Store, Sucre.`;

                this.seo.limpiarJsonLd(['store', 'faq']);
                this.seo.actualizar({
                    titulo: `${prod.nombre} – Bs. ${precioTexto} | Onii-Chan Store`,
                    descripcion: descLimpia,
                    rutaCanonica: rutaCanonicaCompleta,
                    imagen: prod.imagenPrincipal || '/img/logo-512.png',
                    tipoOg: 'product',
                });
                this.seo.establecerJsonLdProducto(prod, rutaCanonicaCompleta);
                this.seo.establecerJsonLdMigas([
                    { nombre: 'Inicio', ruta: '/' },
                    { nombre: 'Catálogo', ruta: '/catalogo' },
                    {
                        nombre: prod.categoriaNombre,
                        ruta: `/catalogo/${generarSlug(prod.categoriaNombre)}`,
                    },
                    { nombre: prod.nombre, ruta: rutaCanonicaCompleta },
                ]);
            },
            error: () => {
                this.ultimoIdCargado = null;
                this.producto.set(null);
                this.noEncontrado.set(true);
                this.cargando.set(false);
                this.aplicarSeoNoEncontrado();
            },
        });
    }

    private aplicarSeoNoEncontrado(): void {
        this.seo.limpiarJsonLd();
        this.seo.actualizar({
            titulo: 'Página no encontrada | Onii-Chan Store',
            descripcion: 'El producto que buscas no está disponible.',
            robots: 'noindex, nofollow',
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
