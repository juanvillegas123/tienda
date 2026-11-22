import { DestroyRef, Directive, ElementRef, OnInit, inject, input } from '@angular/core';
import { ModoProgresoScroll, ScrollEfectosService } from './scroll-efectos.service';

@Directive({
    selector: '[appProgresoScroll]',
    standalone: true,
})
export class ProgresoScrollDirective implements OnInit {
    private readonly elRef = inject(ElementRef<HTMLElement>);
    private readonly scrollService = inject(ScrollEfectosService);
    private readonly destroyRef = inject(DestroyRef);

    readonly modo = input<ModoProgresoScroll>('capitulo', { alias: 'appProgresoScroll' });

    ngOnInit(): void {
        const el = this.elRef.nativeElement;
        const modoFinal = this.modo() || 'capitulo';
        this.scrollService.registrarElemento(el, modoFinal);

        this.destroyRef.onDestroy(() => {
            this.scrollService.desregistrarElemento(el);
        });
    }
}
