import { Component, input } from '@angular/core';

@Component({
    selector: 'app-placeholder',
    standalone: true,
    template: `
    <div class="p-8">
      <h2 class="text-xl font-semibold text-gray-700">{{ titulo() }}</h2>
      <p class="text-gray-400 mt-2 text-sm">Esta sección se implementa en la siguiente fase.</p>
    </div>
  `,
})
export class PlaceholderComponent {
    readonly titulo = input('Próximamente');
}
