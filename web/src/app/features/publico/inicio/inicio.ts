import { DOCUMENT } from '@angular/common';
import {
    Component,
    DestroyRef,
    ElementRef,
    OnInit,
    computed,
    effect,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogoService } from '../../../core/catalogo.service';
import { CarritoService } from '../../../core/carrito.service';
import { ConfiguracionService } from '../../../core/configuracion.service';
import { SeoService } from '../../../core/seo.service';
import { Categoria, ProductoPublico } from '../../../core/modelos';
import { BsPipe } from '../../../shared/bs.pipe';
import { FranjaCapituloComponent } from '../../../shared/ui/franja-capitulo/franja-capitulo';
import { IconoShurikenComponent } from '../../../shared/ui/icono-shuriken/icono-shuriken';
import { IconoRedComponent } from '../../../shared/ui/iconos-redes/icono-red';
import { ProgresoScrollDirective } from '../../../shared/directivas/progreso-scroll.directive';
import { VinetaDirective } from '../../../shared/directivas/vineta.directive';
import { ScrollEfectosService } from '../../../shared/directivas/scroll-efectos.service';
import { NEGOCIO_CONFIG } from '../../../shared/negocio.config';
import { generarSlug } from '../../../shared/slug';
import {
    POCAS_UNIDADES,
    esNotaTallaVisible,
    etiquetaEscala,
    rutaProducto,
} from '../../../shared/catalogo-ui.utils';

const LIMITE_RECIEN_LLEGADOS = 6;
const LIMITE_CATEGORIAS_INICIO = 3;
const LIMITE_PRODUCTOS_POR_CATEGORIA = 6;

interface TiraCategoria {
    categoria: Categoria;
    slug: string;
    productos: ProductoPublico[];
}

const DIAS_EN_A_NUM: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
};

function calcularAbiertoEnBolivia(ahora: Date = new Date()): boolean {
    const horario = NEGOCIO_CONFIG.horarioEstructurado;
    try {
        const partes = new Intl.DateTimeFormat('en-US', {
            timeZone: horario.zonaHoraria,
            weekday: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
        }).formatToParts(ahora);

        const diaTxt = partes.find((p) => p.type === 'weekday')?.value ?? '';
        const horaTxt = partes.find((p) => p.type === 'hour')?.value ?? '0';
        const minTxt = partes.find((p) => p.type === 'minute')?.value ?? '0';

        const diaNum = DIAS_EN_A_NUM[diaTxt];
        if (diaNum === undefined || !horario.diasAbiertos.includes(diaNum)) {
            return false;
        }

        const hora = Number(horaTxt) % 24;
        const minuto = Number(minTxt);
        const minutosActuales = hora * 60 + minuto;
        const inicio = horario.horaApertura * 60 + horario.minutoApertura;
        const fin = horario.horaCierre * 60 + horario.minutoCierre;
        return minutosActuales >= inicio && minutosActuales < fin;
    } catch {
        return false;
    }
}

@Component({
    selector: 'app-inicio-publico',
    standalone: true,
    imports: [
        RouterLink,
        BsPipe,
        FranjaCapituloComponent,
        IconoShurikenComponent,
        IconoRedComponent,
        ProgresoScrollDirective,
        VinetaDirective,
    ],
    templateUrl: './inicio.html',
})
export class InicioComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly catalogoService = inject(CatalogoService);
    private readonly configService = inject(ConfiguracionService);
    private readonly seo = inject(SeoService);
    private readonly scrollEfectos = inject(ScrollEfectosService);
    private readonly destroyRef = inject(DestroyRef);
    private readonly doc = inject(DOCUMENT);
    readonly carrito = inject(CarritoService);

    readonly info = this.configService.infoTienda;
    readonly negocio = NEGOCIO_CONFIG;
    readonly pocasUnidades = POCAS_UNIDADES;
    readonly esNotaTallaVisible = esNotaTallaVisible;
    readonly etiquetaEscala = etiquetaEscala;
    readonly rutaProducto = rutaProducto;

    readonly categorias = signal<Categoria[]>([]);
    readonly productos = signal<ProductoPublico[]>([]);
    readonly cargandoCatalogo = signal(true);
    readonly errorCatalogo = signal(false);

    readonly logoHeroFallido = signal(false);
    readonly direccionCopiada = signal(false);
    readonly preguntaAbierta = signal<number | null>(0);
    readonly abiertoAhora = signal<boolean>(calcularAbiertoEnBolivia());

    readonly aviso = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
    private avisoTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly mapaIframe = viewChild<ElementRef<HTMLIFrameElement>>('mapaIframe');
    private readonly barraProgreso = viewChild<ElementRef<HTMLElement>>('barraProgreso');
    private fragmentoPendiente: string | null = null;

    readonly recienLlegados = computed(() => this.productos().slice(0, LIMITE_RECIEN_LLEGADOS));

    private readonly todasLasTirasConProductos = computed<TiraCategoria[]>(() => {
        const prods = this.productos();
        const cats = this.categorias();
        const resultado: TiraCategoria[] = [];

        for (const cat of cats) {
            const deCategoria = prods.filter((p) => p.categoriaId === cat.id);
            if (deCategoria.length > 0) {
                resultado.push({
                    categoria: cat,
                    slug: generarSlug(cat.nombre),
                    productos: deCategoria.slice(0, LIMITE_PRODUCTOS_POR_CATEGORIA),
                });
            }
        }
        return resultado.sort((a, b) => b.productos.length - a.productos.length);
    });

    readonly tirasPorCategoria = computed<TiraCategoria[]>(() =>
        this.todasLasTirasConProductos().slice(0, LIMITE_CATEGORIAS_INICIO),
    );

    readonly hayMasCategorias = computed(
        () => this.todasLasTirasConProductos().length > LIMITE_CATEGORIAS_INICIO,
    );

    /**
     * Solo genera enlace de WhatsApp si llegó un número real desde la API.
     */
    readonly enlaceWhatsapp = computed(() => {
        const num = this.info().whatsappNumero?.replace(/\D/g, '') || '';
        if (!num) return null;
        const msg = encodeURIComponent(
            'Hola Onii-Chan Store, tengo una consulta sobre sus productos.',
        );
        return `https://wa.me/${num}?text=${msg}`;
    });

    readonly mapaEmbedValido = computed(() => {
        const url = this.info().googleMapsEmbedUrl?.trim() || '';
        return /^https:\/\/(www\.)?google\.com\/maps(\/embed|\?[^\s]*output=embed)[^\s]*$/i.test(
            url,
        )
            ? url
            : null;
    });

    constructor() {
        // Actualizar JSON-LD Store reactivamente cuando lleguen datos de la API
        effect(() => {
            const infoActual = this.info();
            this.seo.establecerJsonLdTienda(infoActual);
        });

        effect(() => {
            const url = this.mapaEmbedValido();
            const iframe = this.mapaIframe()?.nativeElement;
            if (url && iframe && iframe.src !== url) {
                iframe.src = url;
            }
        });

        effect(() => {
            const barra = this.barraProgreso()?.nativeElement ?? null;
            this.scrollEfectos.registrarBarraProgreso(barra);
        });
    }

    ngOnInit(): void {
        this.seo.limpiarJsonLd(['product', 'breadcrumb']);
        this.seo.actualizar({
            titulo: 'Figuras de colección y merchandising anime en Sucre | Onii-Chan Store',
            descripcion:
                'Figuras de colección, poleras, peluches, pines y accesorios anime en Sucre, Bolivia. Calidad en figuras — Onii-Chan Store, Calle Loa #406.',
            rutaCanonica: '/',
        });
        this.seo.establecerJsonLdTienda(this.info());
        this.seo.establecerJsonLdFaq(this.negocio.preguntasFrecuentes);

        this.route.fragment
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((frag) => {
                if (frag) {
                    this.fragmentoPendiente = frag;
                    this.desplazarAFragmento(frag);
                }
            });

        this.destroyRef.onDestroy(() => {
            this.scrollEfectos.registrarBarraProgreso(null);
        });

        this.configService.cargarInfoTienda().subscribe();
        this.cargarDatosCatalogo();
        this.iniciarRelojHorarioBolivia();
    }

    cargarDatosCatalogo(): void {
        this.cargandoCatalogo.set(true);
        this.errorCatalogo.set(false);

        forkJoin({
            categorias: this.catalogoService
                .listarCategorias()
                .pipe(catchError(() => of([] as Categoria[]))),
            productos: this.catalogoService.listarProductos().pipe(
                catchError(() => {
                    this.errorCatalogo.set(true);
                    return of([] as ProductoPublico[]);
                }),
            ),
        }).subscribe(({ categorias, productos }) => {
            this.categorias.set(categorias);
            this.productos.set(productos);
            this.cargandoCatalogo.set(false);

            // Re-alinear al ancla (ej. /#cap-2 desde /catalogo) una vez que CAP. 01 tiene su altura real
            if (this.fragmentoPendiente) {
                const destino = this.fragmentoPendiente;
                this.fragmentoPendiente = null;
                this.desplazarAFragmento(destino);
            }
        });
    }

    private desplazarAFragmento(fragmento: string): void {
        if (typeof window === 'undefined') return;
        const reducido = this.scrollEfectos.movimientoReducido();
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const el = this.doc.getElementById(fragmento);
                if (el) {
                    el.scrollIntoView({
                        behavior: reducido ? 'auto' : 'smooth',
                        block: 'start',
                    });
                }
            });
        });
    }

    private iniciarRelojHorarioBolivia(): void {
        const actualizar = () => this.abiertoAhora.set(calcularAbiertoEnBolivia());
        actualizar();

        const intervalo = setInterval(actualizar, 60_000);
        const onVisibility = () => {
            if (this.doc.visibilityState === 'visible') {
                actualizar();
            }
        };
        this.doc.addEventListener('visibilitychange', onVisibility);

        this.destroyRef.onDestroy(() => {
            clearInterval(intervalo);
            this.doc.removeEventListener('visibilitychange', onVisibility);
            if (this.avisoTimer) {
                clearTimeout(this.avisoTimer);
            }
        });
    }

    alternarPregunta(idx: number): void {
        this.preguntaAbierta.update((actual) => (actual === idx ? null : idx));
    }

    async copiarDireccion(): Promise<void> {
        const i = this.info();
        const texto = `${i.direccion}, ${i.ciudad}`;
        try {
            await navigator.clipboard.writeText(texto);
            this.direccionCopiada.set(true);
            setTimeout(() => this.direccionCopiada.set(false), 2500);
        } catch {
            // Silencioso si el navegador restringe el portapapeles
        }
    }

    agregarRapido(prod: ProductoPublico, event: Event): void {
        event.preventDefault();
        event.stopPropagation();
        const res = this.carrito.agregar(prod, 1);
        this.aviso.set({ tipo: res.ok ? 'ok' : 'error', texto: res.mensaje });
        if (this.avisoTimer) clearTimeout(this.avisoTimer);
        this.avisoTimer = setTimeout(() => this.aviso.set(null), 3000);
    }

    alcanzoLimiteStock(prod: ProductoPublico): boolean {
        return this.carrito.cantidadEnCarrito(prod.id) >= prod.stock;
    }

    onErrorLogoHero(): void {
        this.logoHeroFallido.set(true);
    }
}
