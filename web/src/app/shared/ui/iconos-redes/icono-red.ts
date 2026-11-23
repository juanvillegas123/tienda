import { Component, input } from '@angular/core';

export type RedSocialTipo = 'instagram' | 'tiktok' | 'facebook' | 'whatsapp';

/**
 * Logos vectoriales limpios de redes sociales adaptados a `currentColor`
 * para integrarse con la estética papel y tinta de Onii-Chan Store.
 */
@Component({
    selector: 'app-icono-red',
    standalone: true,
    host: {
        class: 'inline-flex items-center justify-center shrink-0',
        'aria-hidden': 'true',
    },
    template: `
      @switch (red()) {
        @case ('instagram') {
          <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 2A3.75 3.75 0 0 0 4 7.75v8.5A3.75 3.75 0 0 0 7.75 20h8.5A3.75 3.75 0 0 0 20 16.25v-8.5A3.75 3.75 0 0 0 16.25 4h-8.5Zm9.5 1.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
          </svg>
        }
        @case ('tiktok') {
          <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1-2.6-2.59 2.59 2.59 0 0 1 2.6-2.59c.27 0 .52.04.77.12V9.66a5.7 5.7 0 0 0-.77-.05A5.68 5.68 0 0 0 4.18 15.3 5.68 5.68 0 0 0 9.86 21a5.68 5.68 0 0 0 5.68-5.68V9.01a7.35 7.35 0 0 0 4.28 1.38V7.3a4.28 4.28 0 0 1-3.22-1.48Z" />
          </svg>
        }
        @case ('facebook') {
          <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M13.5 21v-8.2h2.76l.41-3.2H13.5V7.56c0-.93.26-1.56 1.59-1.56h1.7V3.14c-.3-.04-1.31-.14-2.49-.14-2.47 0-4.16 1.5-4.16 4.27v2.33H7.34v3.2h2.8V21h3.36Z" />
          </svg>
        }
        @case ('whatsapp') {
          <svg class="w-full h-full" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2a9.94 9.94 0 0 0-8.6 14.92L2 22l5.25-1.38A9.94 9.94 0 1 0 12.04 2Zm0 18.14a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.22 8.22 0 1 1 6.97 3.86Zm4.51-6.15c-.25-.12-1.46-.72-1.69-.8-.22-.08-.39-.12-.55.12-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06a6.73 6.73 0 0 1-1.98-1.22 7.4 7.4 0 0 1-1.37-1.7c-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.55-1.34-.76-1.83-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.66.31-.22.25-.86.84-.86 2.05s.88 2.38 1 2.54c.13.17 1.73 2.65 4.2 3.71.59.25 1.04.4 1.4.51.59.19 1.12.16 1.54.1.47-.07 1.46-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.29Z" />
          </svg>
        }
      }
    `,
})
export class IconoRedComponent {
    readonly red = input.required<RedSocialTipo>();
}
