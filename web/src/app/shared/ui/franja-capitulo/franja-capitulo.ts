import { Component, computed, input } from '@angular/core';
import { ProgresoScrollDirective } from '../../directivas/progreso-scroll.directive';
import { IconoShurikenComponent } from '../icono-shuriken/icono-shuriken';

@Component({
    selector: 'app-franja-capitulo',
    standalone: true,
    imports: [ProgresoScrollDirective, IconoShurikenComponent],
    template: `
      <div
        [attr.id]="idAncla() || null"
        appProgresoScroll="franja"
        class="franja-capitulo scroll-mt-20 bg-negro text-perla"
        [class.franja-capitulo-invertida]="invertida()"
      >
        <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 py-7 sm:py-9">
          <div class="inline-block max-w-full" appProgresoScroll="pincelada">
            <h2 class="font-display text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.09em] text-perla leading-none flex flex-wrap items-center gap-2.5 sm:gap-3">
              @if (prefijo()) {
                <span>{{ prefijo() }}</span>
                <app-icono-shuriken class="w-5 h-5 sm:w-6 sm:h-6 text-carmesi-claro -mt-0.5" />
                <span>{{ tituloPrincipal() }}</span>
              } @else {
                <span>{{ titulo() }}</span>
              }
            </h2>
            <!-- Pincelada vino dibujada con el scroll -->
            <svg
              class="pincelada-svg w-full h-3 mt-1 text-carmesi-claro overflow-visible"
              viewBox="0 0 260 12"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d="M2 8.5 C 58 2.5, 145 10.5, 258 4"
                fill="none"
                stroke="currentColor"
                stroke-width="3.2"
                stroke-linecap="round"
                pathLength="1"
              />
            </svg>
          </div>
          @if (subtitulo()) {
            <p class="text-xs sm:text-sm text-perla/70 mt-1.5 max-w-2xl">
              {{ subtitulo() }}
            </p>
          }
        </div>
      </div>
    `,
})
export class FranjaCapituloComponent {
    readonly numero = input<string>('');
    readonly titulo = input.required<string>();
    readonly subtitulo = input<string>('');
    readonly invertida = input<boolean>(false);
    readonly idAncla = input<string>('');

    readonly prefijo = computed(() => {
        const num = this.numero().trim();
        if (num) return num;
        const t = this.titulo();
        const idx = t.indexOf('✦');
        return idx > -1 ? t.slice(0, idx).trim() : '';
    });

    readonly tituloPrincipal = computed(() => {
        const num = this.numero().trim();
        const t = this.titulo();
        if (num) return t;
        const idx = t.indexOf('✦');
        return idx > -1 ? t.slice(idx + 1).trim() : t;
    });
}
