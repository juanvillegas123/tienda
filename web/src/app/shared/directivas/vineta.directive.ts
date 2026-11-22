import { DestroyRef, Directive, ElementRef, NgZone, OnInit, inject, input } from '@angular/core';

@Directive({
    selector: '[appVineta]',
    standalone: true,
})
export class VinetaDirective implements OnInit {
    private readonly elRef = inject(ElementRef<HTMLElement>);
    private readonly ngZone = inject(NgZone);
    private readonly destroyRef = inject(DestroyRef);

    /** Índice opcional para retardo escalonado (--i) */
    readonly indice = input<number>(0, { alias: 'appVineta' });

    ngOnInit(): void {
        const el = this.elRef.nativeElement;
        el.classList.add('vineta-corte');
        el.style.setProperty('--i', String(this.indice() || 0));

        const reducido =
            typeof window !== 'undefined' &&
            window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

        if (reducido || typeof IntersectionObserver === 'undefined') {
            el.classList.add('in');
            return;
        }

        let observer: IntersectionObserver | null = null;
        let revelado = false;

        const revelar = () => {
            if (revelado) return;
            revelado = true;
            el.classList.add('in');
            observer?.disconnect();
            observer = null;
            window.removeEventListener('scroll', comprobarPosicion);
        };

        const comprobarPosicion = () => {
            if (revelado) return;
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight || 800;
            // Revelar si está dentro del viewport o ya quedó por encima tras un salto de ancla
            if (rect.top <= vh + 40) {
                revelar();
            }
        };

        this.ngZone.runOutsideAngular(() => {
            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting || entry.boundingClientRect.top <= window.innerHeight) {
                            revelar();
                            break;
                        }
                    }
                },
                { threshold: 0, rootMargin: '60px 0px 40px 0px' },
            );
            observer.observe(el);
            window.addEventListener('scroll', comprobarPosicion, { passive: true });
            requestAnimationFrame(comprobarPosicion);
        });

        this.destroyRef.onDestroy(() => {
            observer?.disconnect();
            observer = null;
            window.removeEventListener('scroll', comprobarPosicion);
        });
    }
}
