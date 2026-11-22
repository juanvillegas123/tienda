import { Component, ElementRef, HostListener, effect, inject, viewChild } from '@angular/core';
import { PdfService } from '../../pdf.service';

@Component({
    selector: 'app-pdf-preview-modal',
    standalone: true,
    template: `
      @if (pdfService.vistaPrevia(); as vp) {
        <div
          class="no-imprimir fixed inset-0 z-[70] flex items-center justify-center p-2 sm:p-5 bg-negro/70 backdrop-blur-xs"
          (click)="pdfService.cerrarVistaPrevia()"
        >
          <div
            class="bg-tarjeta rounded-2xl w-full max-w-5xl h-[92dvh] shadow-2xl border border-black/15 flex flex-col overflow-hidden"
            (click)="$event.stopPropagation()"
          >
            <!-- Cabecera -->
            <div class="px-4 sm:px-5 py-3.5 bg-negro text-perla flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div class="min-w-0">
                <p class="text-[11px] uppercase tracking-widest text-perla/60 font-semibold">
                  Vista previa de documento
                </p>
                <h3 class="text-sm sm:text-base font-bold text-perla truncate">
                  {{ vp.titulo }}
                </h3>
              </div>

              <div class="flex items-center gap-2 shrink-0">
                <a
                  [href]="vp.blobUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="px-3 py-1.5 text-xs font-semibold border border-perla/25 text-perla hover:bg-vino-oscuro rounded-lg transition-colors"
                >
                  Abrir aparte
                </a>
                <button
                  type="button"
                  (click)="pdfService.descargarVistaPrevia()"
                  class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-carmesi hover:bg-carmesi-claro text-perla rounded-lg transition-colors cursor-pointer"
                >
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v12m0 0-4-4m4 4 4-4M4 20h16" />
                  </svg>
                  Descargar PDF
                </button>
                <button
                  type="button"
                  (click)="pdfService.cerrarVistaPrevia()"
                  class="p-1.5 text-perla/70 hover:text-perla hover:bg-vino-oscuro rounded-lg transition-colors cursor-pointer"
                  aria-label="Cerrar vista previa"
                >
                  ✕
                </button>
              </div>
            </div>

            <!-- Visor PDF -->
            <div class="flex-1 bg-slate-800/95 relative overflow-hidden">
              <iframe
                #visorPdf
                title="Vista previa PDF"
                class="w-full h-full border-0 bg-white"
              ></iframe>
            </div>

            <!-- Pie informativo -->
            <div class="px-4 py-2 bg-fondo border-t border-black/8 flex flex-wrap items-center justify-between gap-2 text-[11px] text-negro/55 shrink-0">
              <span class="font-mono truncate">{{ vp.nombreArchivo }}</span>
              <span>Formato: {{ vp.formatoDescripcion }}</span>
            </div>
          </div>
        </div>
      }
    `,
})
export class PdfPreviewModalComponent {
    readonly pdfService = inject(PdfService);
    private readonly visorPdf = viewChild<ElementRef<HTMLIFrameElement>>('visorPdf');

    constructor() {
        effect(() => {
            const vp = this.pdfService.vistaPrevia();
            const iframe = this.visorPdf()?.nativeElement;
            if (vp && iframe) {
                iframe.src = vp.blobUrl;
            }
        });
    }

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.pdfService.vistaPrevia()) {
            this.pdfService.cerrarVistaPrevia();
        }
    }
}
