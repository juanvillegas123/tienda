import { Component } from '@angular/core';

/**
 * Ícono SVG de shuriken de 4 aspas curvas con orificio central.
 * Hereda color vía `currentColor` y dimensiones vía clases de Tailwind en el host o `svgClass`.
 */
@Component({
    selector: 'app-icono-shuriken',
    standalone: true,
    host: {
        class: 'inline-flex items-center justify-center shrink-0',
        'aria-hidden': 'true',
    },
    template: `
      <svg
        class="w-full h-full"
        viewBox="0 0 64 64"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fill-rule="evenodd"
          d="M 25 24
             C 28 23, 28 21, 24 21
             C 24 13, 30 6, 38 4
             C 34 12, 34 18, 38 22
             C 40 23, 40 24, 40 25
             C 41 28, 43 28, 43 24
             C 51 24, 58 30, 60 38
             C 52 34, 46 34, 42 38
             C 41 40, 40 40, 39 40
             C 36 41, 36 43, 40 43
             C 40 51, 34 58, 26 60
             C 30 52, 30 46, 26 42
             C 24 41, 24 40, 24 39
             C 23 36, 21 36, 21 40
             C 13 40, 6 34, 4 26
             C 12 30, 18 30, 22 26
             C 23 24, 24 24, 25 24 Z
             M 32 26.5
             A 5.5 5.5 0 1 0 32 37.5
             A 5.5 5.5 0 1 0 32 26.5 Z"
        />
      </svg>
    `,
})
export class IconoShurikenComponent {}
