import { Component, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subject, merge, of } from 'rxjs';
import { debounceTime, switchMap, tap, catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../../core/catalogo.service';
import { CarritoService } from '../../../core/carrito.service';
import { Categoria, ProductoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { EstadoVacioComponent } from '../../../shared/estado-vacio';
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
    readonly carrito = inject(CarritoService);
    private readonly destroyRef = inject(DestroyRef);

    private readonly busquedaTexto$ = new Subject<void>();
    private readonly recargar$ = new Subject<void>();

    readonly pocasUnidades = POCAS_UNIDADES;
    readonly maxLargoBusqueda = MAX_LARGO_BUSQUEDA;
    readonly esNotaTallaVisible = esNotaTallaVisible;
    readonly etiquetaEscala = etiquetaEscala;
    readonly rutaProducto = rutaProducto;

    readonly categorias = signal<Categoria[]>([]);
    readonly productos = signal<ProductoPublico[]>([]);
    readonly productosBase = signal<ProductoPublico[]>([]);
    readonly cargando = signal(true);
    readonly errorCarga = signal<string | null>(null);

    readonly filtroTexto = signal('');
    readonly filtroCategoriaId = signal<number | null>(null);
    readonly logoHeroFallido = signal(false);

    readonly destacados = computed(() => {
        const lista = this.productosBase().length > 0 ? this.productosBase() : this.productos();
        return lista.filter((p) => !!p.imagenPrincipal).slice(0, 8);
    });

    readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
    private avisoTimer: ReturnType<typeof setTimeout> | null = null;

    ngOnInit(): void {
        this.inicializarFiltrosDesdeUrl();

        this.catalogoService.listarCategorias().subscribe({
            next: (cats) => this.categorias.set(cats),
            error: () => {
                // El catálogo sigue funcionando aunque fallen las categorías
            },
        });

        merge(this.busquedaTexto$.pipe(debounceTime(250)), this.recargar$)
            .pipe(
                tap(() => {
                    this.cargando.set(true);
                    this.errorCarga.set(null);
                    this.sincronizarUrl();
                }),
                switchMap(() => {
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

        this.recargar$.next();
    }

    private inicializarFiltrosDesdeUrl(): void {
        const params = this.route.snapshot.queryParamMap;
        const catRaw = params.get('categoria');
        const qRaw = params.get('q');

        if (catRaw && /^\d+$/.test(catRaw)) {
            const id = Number(catRaw);
            if (Number.isSafeInteger(id) && id > 0) {
                this.filtroCategoriaId.set(id);
            }
        }

        if (qRaw) {
            const limpio = qRaw.trim().slice(0, MAX_LARGO_BUSQUEDA);
            if (limpio.length > 0) {
                this.filtroTexto.set(limpio);
            }
        }
    }

    private sincronizarUrl(): void {
        const q = this.filtroTexto().trim().slice(0, MAX_LARGO_BUSQUEDA);
        const catId = this.filtroCategoriaId();

        const queryParams: Record<string, string | null> = {
            categoria: catId !== null ? String(catId) : null,
            q: q.length > 0 ? q : null,
        };

        void this.router.navigate([], {
            relativeTo: this.route,
            queryParams,
            replaceUrl: true,
        });
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

    seleccionarCategoria(id: number | null): void {
        if (this.filtroCategoriaId() === id) return;
        this.filtroCategoriaId.set(id);
        this.recargar$.next();
    }

    limpiarFiltros(): void {
        this.filtroTexto.set('');
        this.filtroCategoriaId.set(null);
        this.recargar$.next();
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
