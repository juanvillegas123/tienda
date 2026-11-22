import { Component, input } from '@angular/core';

@Component({
    selector: 'app-franja-capitulo',
    standalone: true,
    template: `
      <div
        [attr.id]="idAncla() || null"
        class="franja-capitulo scroll-mt-20 bg-negro text-perla"
        [class.franja-capitulo-invertida]="invertida()"
      >
        <div class="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 sm:py-7">
          <h2 class="font-display text-2xl sm:text-3xl md:text-4xl uppercase tracking-[0.09em] text-perla leading-none">
            {{ titulo() }}
          </h2>
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
    readonly titulo = input.required<string>();
    readonly subtitulo = input<string>('');
    readonly invertida = input<boolean>(false);
    readonly idAncla = input<string>('');
}
