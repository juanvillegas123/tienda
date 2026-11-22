import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../environments/environment';
import { InfoTienda, ProductoPublico } from './modelos';
import { NEGOCIO_CONFIG, PreguntaFrecuenteNegocio } from '../shared/negocio.config';

export interface ConfigSeoRuta {
    titulo: string;
    descripcion: string;
    rutaCanonica?: string;
    robots?: 'index, follow' | 'noindex, nofollow';
    imagen?: string;
    tipoOg?: 'website' | 'product';
}

export interface ItemMigaPan {
    nombre: string;
    ruta: string;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
    private readonly title = inject(Title);
    private readonly meta = inject(Meta);
    private readonly doc = inject(DOCUMENT);
    private avisoSiteUrlEmitido = false;

    obtenerUrlBase(): string {
        const configurada = environment.siteUrl?.trim().replace(/\/+$/, '');
        if (configurada) {
            return configurada;
        }
        if (environment.production && !this.avisoSiteUrlEmitido) {
            this.avisoSiteUrlEmitido = true;
            console.warn(
                '[SeoService] environment.siteUrl no está definido en producción; usando window.location.origin.',
            );
        }
        return this.doc.location?.origin?.replace(/\/+$/, '') || '';
    }

    construirUrlAbsoluta(ruta: string): string {
        if (/^https?:\/\//i.test(ruta)) {
            return ruta;
        }
        const base = this.obtenerUrlBase();
        const normalizada = ruta.startsWith('/') ? ruta : `/${ruta}`;
        return `${base}${normalizada}`;
    }

    actualizar(config: ConfigSeoRuta): void {
        const robots = config.robots ?? 'index, follow';
        const rutaCanonica = config.rutaCanonica ?? this.doc.location?.pathname ?? '/';
        const urlCanonica = this.construirUrlAbsoluta(rutaCanonica);
        const imagen = this.construirUrlAbsoluta(config.imagen || '/img/logo-512.png');
        const tipoOg = config.tipoOg ?? 'website';

        this.title.setTitle(config.titulo);
        this.meta.updateTag({ name: 'description', content: config.descripcion });
        this.meta.updateTag({ name: 'robots', content: robots });

        // Open Graph
        this.meta.updateTag({ property: 'og:site_name', content: NEGOCIO_CONFIG.nombre });
        this.meta.updateTag({ property: 'og:locale', content: 'es_BO' });
        this.meta.updateTag({ property: 'og:type', content: tipoOg });
        this.meta.updateTag({ property: 'og:title', content: config.titulo });
        this.meta.updateTag({ property: 'og:description', content: config.descripcion });
        this.meta.updateTag({ property: 'og:url', content: urlCanonica });
        this.meta.updateTag({ property: 'og:image', content: imagen });

        // Twitter Card
        this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
        this.meta.updateTag({ name: 'twitter:title', content: config.titulo });
        this.meta.updateTag({ name: 'twitter:description', content: config.descripcion });
        this.meta.updateTag({ name: 'twitter:image', content: imagen });

        this.actualizarCanonica(urlCanonica);
    }

    private actualizarCanonica(url: string): void {
        let link = this.doc.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!link) {
            link = this.doc.createElement('link');
            link.setAttribute('rel', 'canonical');
            this.doc.head.appendChild(link);
        }
        link.setAttribute('href', url);
    }

    establecerJsonLd(id: string, datos: Record<string, unknown>): void {
        const scriptId = `jsonld-${id}`;
        let script = this.doc.getElementById(scriptId) as HTMLScriptElement | null;
        if (!script) {
            script = this.doc.createElement('script');
            script.id = scriptId;
            script.type = 'application/ld+json';
            this.doc.head.appendChild(script);
        }
        // Escapar '<' evita ruptura de etiqueta </script>
        script.textContent = JSON.stringify(datos).replace(/</g, '\\u003c');
    }

    limpiarJsonLd(ids?: string[]): void {
        if (ids && ids.length > 0) {
            for (const id of ids) {
                this.doc.getElementById(`jsonld-${id}`)?.remove();
            }
            return;
        }
        const scripts = this.doc.querySelectorAll('script[type="application/ld+json"][id^="jsonld-"]');
        scripts.forEach((el) => el.remove());
    }

    establecerJsonLdTienda(info: InfoTienda): void {
        const sameAs = [info.instagramUrl, info.tiktokUrl, info.facebookUrl].filter(
            (u) => typeof u === 'string' && u.trim().length > 0,
        );

        const datos: Record<string, unknown> = {
            '@context': 'https://schema.org',
            '@type': 'Store',
            name: NEGOCIO_CONFIG.nombre,
            description: info.descripcion || NEGOCIO_CONFIG.descripcion,
            url: this.construirUrlAbsoluta('/'),
            logo: this.construirUrlAbsoluta('/img/logo-512.png'),
            image: this.construirUrlAbsoluta('/img/logo-512.png'),
            address: {
                '@type': 'PostalAddress',
                streetAddress: info.direccion || NEGOCIO_CONFIG.direccion,
                addressLocality: NEGOCIO_CONFIG.localidad,
                addressRegion: NEGOCIO_CONFIG.region,
                addressCountry: NEGOCIO_CONFIG.paisCodigo,
            },
            openingHoursSpecification: [
                {
                    '@type': 'OpeningHoursSpecification',
                    dayOfWeek: NEGOCIO_CONFIG.horarioEstructurado.schemaDias,
                    opens: NEGOCIO_CONFIG.horarioEstructurado.opens,
                    closes: NEGOCIO_CONFIG.horarioEstructurado.closes,
                },
            ],
            sameAs,
        };

        if (info.googleMapsUrl) {
            datos['hasMap'] = info.googleMapsUrl;
        }

        this.establecerJsonLd('store', datos);
    }

    establecerJsonLdFaq(preguntas: readonly PreguntaFrecuenteNegocio[]): void {
        if (preguntas.length === 0) return;
        this.establecerJsonLd('faq', {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: preguntas.map((p) => ({
                '@type': 'Question',
                name: p.pregunta,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: p.respuesta,
                },
            })),
        });
    }

    establecerJsonLdProducto(producto: ProductoPublico, rutaCanonica: string): void {
        const imagenes = [
            producto.imagenPrincipal,
            ...(producto.imagenes ?? []).map((i) => i.url),
        ].filter((u): u is string => Boolean(u));

        const precioDecimal = (producto.precioCentavos / 100).toFixed(2);
        const availability =
            producto.stock > 0
                ? 'https://schema.org/InStock'
                : 'https://schema.org/OutOfStock';

        this.establecerJsonLd('product', {
            '@context': 'https://schema.org',
            '@type': 'Product',
            name: producto.nombre,
            description:
                producto.descripcion?.trim() ||
                `${producto.nombre} disponible en ${NEGOCIO_CONFIG.nombre}, Sucre.`,
            category: producto.categoriaNombre,
            image:
                imagenes.length > 0
                    ? imagenes
                    : [this.construirUrlAbsoluta('/img/logo-512.png')],
            offers: {
                '@type': 'Offer',
                url: this.construirUrlAbsoluta(rutaCanonica),
                priceCurrency: 'BOB',
                price: precioDecimal,
                availability,
                itemCondition: 'https://schema.org/NewCondition',
            },
        });
    }

    establecerJsonLdMigas(items: ItemMigaPan[]): void {
        this.establecerJsonLd('breadcrumb', {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: items.map((item, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                name: item.nombre,
                item: this.construirUrlAbsoluta(item.ruta),
            })),
        });
    }
}
