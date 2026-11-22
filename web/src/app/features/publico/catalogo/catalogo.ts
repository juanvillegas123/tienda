import { Component, inject, signal, computed, effect, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { debounceTime, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../../core/catalogo.service';
import { CarritoService } from '../../../core/carrito.service';
import { ConfiguracionService } from '../../../core/configuracion.service';
import { SeoService } from '../../../core/seo.service';
import { Categoria, ProductoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';
import { generarSlug } from '../../../shared/slug';
import {
    POCAS_UNIDADES,
    esNotaTallaVisible,
    etiquetaEscala,
    rutaProducto,
} from '../../../shared/catalogo-ui.utils';

const MAX_LARGO_BUSQUEDA = 60;

@Component({
    selector: 'app-catalogo-publico',
    standalone: true,
    imports: [RouterLink, BsPipe, EstadoVacioComponent],
    templateUrl: './catalogo.html',
})
export class CatalogoComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly catalogoService = inject(CatalogoService);
    private readonly configService = inject(ConfiguracionService);
    private readonly seo = inject(SeoService);
    readonly carrito = inject(CarritoService);
    readonly infoTienda = this.configService.infoTienda;
    private readonly destroyRef = inject(DestroyRef);

    private readonly busquedaTexto$ = new Subject<void>();
    private readonly recargar$ = new Subject<void>();

    readonly pocasUnidades = POCAS_UNIDADES;
    readonly maxLargoBusqueda = MAX_LARGO_BUSQUEDA;
    readonly esNotaTallaVisible = esNotaTallaVisible;
    readonly etiquetaEscala = etiquetaEscala;
    readonly rutaProducto = rutaProducto;
    readonly slugCategoria = (nombre: string): string => generarSlug(nombre);

    readonly categorias = signal<Categoria[]>([]);
    readonly categoriasCargadas = signal(false);
    readonly productos = signal<ProductoPublico[]>([]);
    readonly productosBase = signal<ProductoPublico[]>([]);
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);
    readonly categoriaNoEncontrada = signal(false);

    readonly filtroTexto = signal('');
    readonly filtroCategoriaId = signal<number | null>(null);
    readonly slugCategoriaRuta = signal<string | null>(null);
    readonly logoHeroFallido = signal(false);
    readonly esRutaInicio = signal(false);

    readonly categoriaActiva = computed(() => {
        const id = this.filtroCategoriaId();
        if (id === null) return null;
        return this.categorias().find((c) => c.id === id) ?? null;
    });

    readonly destacados = computed(() => {
        const lista = this.productosBase().length > 0 ? this.productosBase() : this.productos();
        return lista.filter((p) => !!p.imagenPrincipal).slice(0, 8);
    });

    readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
    private avisoTimer: ReturnType<typeof setTimeout> | null = null;
    private categoriaIdLegacyPendiente: number | null = null;

    constructor() {
        // Actualizar JSON-LD Store reactivamente cuando lleguen datos de la API en la ruta de inicio
        effect(() => {
            const info = this.infoTienda();
            if (this.esRutaInicio()) {
                this.seo.establecerJsonLdTienda(info);
            }
        });
    }

    ngOnInit(): void {
        const rutaActual = this.router.url.split(/[?#]/)[0] || '/';
        this.esRutaInicio.set(rutaActual === '/');

        this.catalogoService.listarCategorias().subscribe({
            next: (cats) => {
                this.categorias.set(cats);
                this.categoriasCargadas.set(true);
                this.resolverCategoriaDesdeRuta();
            },
            error: () => {
                this.categoriasCargadas.set(true);
                this.resolverCategoriaDesdeRuta();
            },
        });

        this.route.paramMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const slug = params.get('categoria')?.trim().toLowerCase() || null;
                this.slugCategoriaRuta.set(slug);
                if (this.categoriasCargadas()) {
                    this.resolverCategoriaDesdeRuta();
                }
            });

        this.route.queryParamMap
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((params) => {
                const catRaw = params.get('categoria');
                const qRaw = params.get('q');

                if (catRaw && /^\d+$/.test(catRaw)) {
                    const id = Number(catRaw);
                    if (Number.isSafeInteger(id) && id > 0) {
                        this.categoriaIdLegacyPendiente = id;
                        if (this.categoriasCargadas()) {
                            this.redirigirCategoriaLegacySiAplica();
                        }
                    }
                } else {
                    this.categoriaIdLegacyPendiente = null;
                }

                const qLimpio = qRaw ? qRaw.trim().slice(0, MAX_LARGO_BUSQUEDA) : '';
                if (qLimpio !== this.filtroTexto()) {
                    this.filtroTexto.set(qLimpio);
                    if (this.categoriasCargadas() && !this.categoriaNoEncontrada()) {
                        this.recargar$.next();
                    }
                }
            });

        merge(this.busquedaTexto$.pipe(debounceTime(250)), this.recargar$)
            .pipe(
                tap(() => {
                    this.cargando.set(true);
                    this.errorCarga.set(null);
                    this.sincronizarQueryBusqueda();
                }),
                switchMap(() => {
                    if (this.categoriaNoEncontrada()) {
                        return of([] as ProductoPublico[]);
                    }
                    const q = this.filtroTexto().trim().slice(0, MAX_LARGO_BUSQUEDA);
                    const categoriaId = this.filtroCategoriaId() ?? undefined;

                    return this.catalogoService
                        .listarProductos({
                            categoriaId,
                            q: q.length > 0 ? q : undefined,
                        })
                        .pipe(
                            catchError(() => {
                                this.errorCarga.set(
                                    'No pudimos cargar el catálogo en este momento. Intenta nuevamente.',
                                );
                                return of([] as ProductoPublico[]);
                            }),
                        );
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((prods) => {
                this.productos.set(prods);
                if (
                    this.productosBase().length === 0 &&
                    !this.filtroTexto().trim() &&
                    this.filtroCategoriaId() === null &&
                    prods.length > 0
                ) {
                    this.productosBase.set(prods);
                }
                this.cargando.set(false);
            });
    }

    private redirigirCategoriaLegacySiAplica(): boolean {
        const legacyId = this.categoriaIdLegacyPendiente;
        if (legacyId === null) return false;

        const encontrada = this.categorias().find((c) => c.id === legacyId);
        this.categoriaIdLegacyPendiente = null;

        if (!encontrada) {
            this.categoriaNoEncontrada.set(true);
            this.filtroCategoriaId.set(null);
            this.cargando.set(false);
            this.actualizarSeoCategoriaInexistente();
            return true;
        }

        const slug = generarSlug(encontrada.nombre);
        const q = this.filtroTexto().trim();
        void this.router.navigate(['/catalogo', slug], {
            queryParams: q ? { q } : {},
            replaceUrl: true,
        });
        return true;
    }

    private resolverCategoriaDesdeRuta(): void {
        if (this.redirigirCategoriaLegacySiAplica()) {
            return;
        }

        const slug = this.slugCategoriaRuta();
        if (!slug) {
            this.categoriaNoEncontrada.set(false);
            this.filtroCategoriaId.set(null);
            this.actualizarSeoCatalogoGeneral();
            this.recargar$.next();
            return;
        }

        const encontrada = this.categorias().find(
            (c) => generarSlug(c.nombre) === slug || c.slug.toLowerCase() === slug,
        );

        if (!encontrada) {
            this.categoriaNoEncontrada.set(true);
            this.filtroCategoriaId.set(null);
            this.productos.set([]);
            this.cargando.set(false);
            this.actualizarSeoCategoriaInexistente();
            return;
        }

        this.categoriaNoEncontrada.set(false);
        this.filtroCategoriaId.set(encontrada.id);
        this.actualizarSeoCategoria(encontrada, generarSlug(encontrada.nombre));
        this.recargar$.next();
    }

    private actualizarSeoCatalogoGeneral(): void {
        if (this.esRutaInicio()) {
            this.seo.actualizar({
                titulo: 'Figuras de colección y merchandising anime en Sucre | Onii-Chan Store',
                descripcion:
                    'Figuras de colección, poleras, peluches, pines y accesorios anime en Sucre, Bolivia. Calidad en figuras — Onii-Chan Store.',
                rutaCanonica: '/',
            });
            this.seo.establecerJsonLdTienda(this.infoTienda());
            return;
        }

        this.seo.limpiarJsonLd(['product', 'faq']);
        this.seo.actualizar({
            titulo: 'Catálogo de figuras y merchandising anime en Sucre | Onii-Chan Store',
            descripcion:
                'Explora todo el catálogo disponible de figuras anime, poleras, peluches y accesorios en Onii-Chan Store, Sucre.',
            rutaCanonica: '/catalogo',
        });
        this.seo.establecerJsonLdMigas([
            { nombre: 'Inicio', ruta: '/' },
            { nombre: 'Catálogo', ruta: '/catalogo' },
        ]);
    }

    private actualizarSeoCategoria(categoria: Categoria, slug: string): void {
        this.seo.limpiarJsonLd(['product', 'faq']);
        this.seo.actualizar({
            titulo: `${categoria.nombre} de colección en Sucre | Onii-Chan Store`,
            descripcion: `Descubre nuestra selección de ${categoria.nombre.toLowerCase()} de colección disponibles en Onii-Chan Store, Calle Loa #406, Sucre.`,
            rutaCanonica: `/catalogo/${slug}`,
        });
        this.seo.establecerJsonLdMigas([
            { nombre: 'Inicio', ruta: '/' },
            { nombre: 'Catálogo', ruta: '/catalogo' },
            { nombre: categoria.nombre, ruta: `/catalogo/${slug}` },
        ]);
    }

    private actualizarSeoCategoriaInexistente(): void {
        this.seo.limpiarJsonLd();
        this.seo.actualizar({
            titulo: 'Página no encontrada | Onii-Chan Store',
            descripcion: 'La categoría que buscas no está disponible.',
            robots: 'noindex, nofollow',
        });
    }

    private sincronizarQueryBusqueda(): void {
        if (this.categoriaNoEncontrada()) return;
        const q = this.filtroTexto().trim().slice(0, MAX_LARGO_BUSQUEDA);
        const qActual = this.route.snapshot.queryParamMap.get('q') ?? '';
        if (q === qActual && !this.route.snapshot.queryParamMap.has('categoria')) {
            return;
        }
        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { q: q.length > 0 ? q : null, categoria: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
        });
    }

    queryParamsBusqueda(): Record<string, string> | null {
        const q = this.filtroTexto().trim().slice(0, MAX_LARGO_BUSQUEDA);
        return q.length > 0 ? { q } : null;
    }

    onErrorLogoHero(): void {
        this.logoHeroFallido.set(true);
    }

    irACatalogo(): void {
        const el = document.getElementById('catalogo-grilla');
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    actualizarBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value.slice(0, MAX_LARGO_BUSQUEDA);
        this.filtroTexto.set(valor);
        this.busquedaTexto$.next();
    }

    limpiarBusqueda(): void {
        this.filtroTexto.set('');
        this.recargar$.next();
    }

    limpiarFiltros(): void {
        this.filtroTexto.set('');
        void this.router.navigate(['/catalogo']);
    }

    reintentar(): void {
        this.recargar$.next();
    }

    agregarRapido(prod: ProductoPublico, event: Event): void {
        event.preventDefault();
        event.stopPropagation();

        const res = this.carrito.agregar(prod, 1);
        this.mostrarAviso(res.ok ? 'ok' : 'error', res.mensaje);
    }

    alcanzoLimiteStock(prod: ProductoPublico): boolean {
        return this.carrito.cantidadEnCarrito(prod.id) >= prod.stock;
    }

    private mostrarAviso(tipo: 'ok' | 'error', texto: string): void {
        this.aviso.set({ tipo, texto });
        if (this.avisoTimer) {
            clearTimeout(this.avisoTimer);
        }
        this.avisoTimer = setTimeout(() => {
            this.aviso.set(null);
        }, 3000);
    }
}
