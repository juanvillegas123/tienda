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
        this.ngZone.runOutsideAngular(() => {
            observer = new IntersectionObserver(
                (entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            el.classList.add('in');
                            observer?.unobserve(el);
                            observer?.disconnect();
                            observer = null;
                            break;
                        }
                    }
                },
                { threshold: 0.1, rootMargin: '0px 0px -24px 0px' },
            );
            observer.observe(el);
        });

        this.destroyRef.onDestroy(() => {
            observer?.disconnect();
            observer = null;
        });
    }
}
