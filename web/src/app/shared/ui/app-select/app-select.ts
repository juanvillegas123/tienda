import {
    Component,
    ElementRef,
    HostListener,
    computed,
    forwardRef,
    inject,
    input,
    output,
    signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export interface OpcionSelect {
    valor: string | number | null;
    etiqueta: string;
    subtitulo?: string;
}

@Component({
    selector: 'app-select',
    standalone: true,
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => AppSelectComponent),
            multi: true,
        },
    ],
    template: `
      <div class="relative w-full">
        <button
          type="button"
          [disabled]="deshabilitado()"
          (click)="alternar()"
          (keydown)="onKeydown($event)"
          [attr.aria-expanded]="abierto()"
          [attr.aria-label]="ariaLabel() || placeholder()"
          class="w-full px-3 py-2 border rounded-xl text-sm bg-white text-left flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-vino/25 focus:border-vino"
          [class.border-peligro]="invalido()"
          [class.border-vino]="abierto() && !invalido()"
          [class.border-black/15]="!abierto() && !invalido()"
        >
          <span
            class="truncate"
            [class.text-negro]="etiquetaSeleccionada() !== null"
            [class.text-negro/45]="etiquetaSeleccionada() === null"
          >
            {{ etiquetaSeleccionada() ?? placeholder() }}
          </span>
          <svg
            class="w-4 h-4 text-negro/45 shrink-0 transition-transform duration-150"
            [class.rotate-180]="abierto()"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="2"
          >
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        @if (abierto()) {
          <div
            class="absolute z-50 mt-1.5 w-full bg-tarjeta rounded-xl border border-black/12 shadow-xl overflow-hidden"
            role="listbox"
          >
            @if (buscable()) {
              <div class="p-2 border-b border-black/8 bg-fondo/60">
                <input
                  type="text"
                  [value]="busqueda()"
                  (input)="actualizarBusqueda($event)"
                  (click)="$event.stopPropagation()"
                  placeholder="Buscar..."
                  class="w-full px-2.5 py-1.5 text-xs bg-white border border-black/15 rounded-lg text-negro focus:outline-none focus:ring-2 focus:ring-vino/25 focus:border-vino"
                  autofocus
                />
              </div>
            }

            <div class="max-h-60 overflow-y-auto py-1">
              @if (opcionesFiltradas().length === 0) {
                <div class="px-3 py-4 text-center text-xs text-negro/45">
                  Sin resultados
                </div>
              } @else {
                @for (op of opcionesFiltradas(); track op.etiqueta + '-' + $index) {
                  <button
                    type="button"
                    role="option"
                    [attr.aria-selected]="esSeleccionada(op.valor)"
                    (click)="seleccionar(op.valor)"
                    class="w-full px-3 py-2 text-left text-sm flex items-center justify-between gap-2 transition-colors cursor-pointer"
                    [class.bg-perla]="esSeleccionada(op.valor)"
                    [class.text-vino]="esSeleccionada(op.valor)"
                    [class.font-semibold]="esSeleccionada(op.valor)"
                    [class.text-negro/80]="!esSeleccionada(op.valor)"
                    [class.hover:bg-fondo]="!esSeleccionada(op.valor)"
                  >
                    <span class="truncate">
                      {{ op.etiqueta }}
                      @if (op.subtitulo) {
                        <span class="text-xs text-negro/45 ml-1 font-normal">{{ op.subtitulo }}</span>
                      }
                    </span>
                    @if (esSeleccionada(op.valor)) {
                      <svg class="w-4 h-4 text-vino shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    }
                  </button>
                }
              }
            </div>
          </div>
        }
      </div>
    `,
})
export class AppSelectComponent implements ControlValueAccessor {
    private readonly elRef = inject(ElementRef<HTMLElement>);

    readonly opciones = input.required<OpcionSelect[]>();
    readonly placeholder = input<string>('Seleccionar...');
    readonly ariaLabel = input<string>('');
    readonly buscable = input<boolean>(false);
    readonly invalido = input<boolean>(false);
    readonly valor = input<string | number | null | undefined>(undefined);

    readonly valorChange = output<string | number | null>();

    readonly abierto = signal(false);
    readonly busqueda = signal('');
    readonly deshabilitado = signal(false);
    private readonly valorInterno = signal<string | number | null>(null);

    private onChange: (val: string | number | null) => void = () => {};
    private onTouched: () => void = () => {};

    readonly valorActual = computed(() => {
        const externo = this.valor();
        return externo !== undefined ? externo : this.valorInterno();
    });

    readonly opcionesFiltradas = computed(() => {
        const q = this.busqueda().trim().toLowerCase();
        const lista = this.opciones();
        if (!q) return lista;
        return lista.filter(
            (o) =>
                o.etiqueta.toLowerCase().includes(q) ||
                (o.subtitulo && o.subtitulo.toLowerCase().includes(q)),
        );
    });

    readonly etiquetaSeleccionada = computed(() => {
        const actual = this.valorActual();
        const encontrada = this.opciones().find((o) => this.valoresIguales(o.valor, actual));
        return encontrada ? encontrada.etiqueta : null;
    });

    @HostListener('document:click', ['$event'])
    onClickFuera(event: MouseEvent): void {
        if (!this.abierto()) return;
        const target = event.target as Node | null;
        if (target && !this.elRef.nativeElement.contains(target)) {
            this.cerrar();
        }
    }

    alternar(): void {
        if (this.deshabilitado()) return;
        if (this.abierto()) {
            this.cerrar();
        } else {
            this.busqueda.set('');
            this.abierto.set(true);
        }
    }

    cerrar(): void {
        this.abierto.set(false);
        this.busqueda.set('');
        this.onTouched();
    }

    actualizarBusqueda(event: Event): void {
        this.busqueda.set((event.target as HTMLInputElement).value);
    }

    seleccionar(val: string | number | null): void {
        this.valorInterno.set(val);
        this.onChange(val);
        this.valorChange.emit(val);
        this.cerrar();
    }

    esSeleccionada(val: string | number | null): boolean {
        return this.valoresIguales(val, this.valorActual());
    }

    onKeydown(event: KeyboardEvent): void {
        if (event.key === 'Escape' && this.abierto()) {
            event.preventDefault();
            this.cerrar();
        } else if (event.key === 'ArrowDown' && !this.abierto()) {
            event.preventDefault();
            this.alternar();
        }
    }

    writeValue(val: string | number | null): void {
        this.valorInterno.set(val ?? null);
    }

    registerOnChange(fn: (val: string | number | null) => void): void {
        this.onChange = fn;
    }

    registerOnTouched(fn: () => void): void {
        this.onTouched = fn;
    }

    setDisabledState(isDisabled: boolean): void {
        this.deshabilitado.set(isDisabled);
    }

    private valoresIguales(
        a: string | number | null | undefined,
        b: string | number | null | undefined,
    ): boolean {
        if (a === b) return true;
        if (a === null || a === undefined || b === null || b === undefined) return false;
        return String(a) === String(b);
    }
}
