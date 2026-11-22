import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConfigSeoRuta, SeoService } from './core/seo.service';

@Component({
    imports: [RouterOutlet],
    selector: 'app-root',
    template: '<router-outlet />',
})
export class App implements OnInit {
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly seo = inject(SeoService);
    private readonly destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.router.events
            .pipe(
                filter((e): e is NavigationEnd => e instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                this.aplicarSeoDeRuta();
            });
    }

    private aplicarSeoDeRuta(): void {
        let actual: ActivatedRoute | null = this.route;
        let seoHeredado: Partial<ConfigSeoRuta> = {};

        while (actual) {
            const seoData = actual.snapshot.data['seo'] as Partial<ConfigSeoRuta> | undefined;
            if (seoData) {
                seoHeredado = { ...seoHeredado, ...seoData };
            }
            actual = actual.firstChild;
        }

        if (seoHeredado.titulo || seoHeredado.robots) {
            this.seo.limpiarJsonLd();
            this.seo.actualizar({
                titulo:
                    seoHeredado.titulo ??
                    'Figuras de colección y merchandising anime en Sucre | Onii-Chan Store',
                descripcion:
                    seoHeredado.descripcion ??
                    'Figuras de colección, poleras, peluches y accesorios anime en Sucre, Bolivia. Onii-Chan Store.',
                robots: seoHeredado.robots ?? 'index, follow',
                rutaCanonica: this.router.url.split(/[?#]/)[0] || '/',
            });
        }
    }
}
