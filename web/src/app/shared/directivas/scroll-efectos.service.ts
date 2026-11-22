import { DOCUMENT } from '@angular/common';
import { Injectable, NgZone, inject } from '@angular/core';

export type ModoProgresoScroll = 'capitulo' | 'franja' | 'pincelada';

interface RegistroScroll {
    el: HTMLElement;
    modo: ModoProgresoScroll;
}

@Injectable({ providedIn: 'root' })
export class ScrollEfectosService {
    private readonly ngZone = inject(NgZone);
    private readonly doc = inject(DOCUMENT);

    private readonly registros = new Map<HTMLElement, RegistroScroll>();
    private readonly visibles = new Set<HTMLElement>();
    private barraProgresoEl: HTMLElement | null = null;

    private observer: IntersectionObserver | null = null;
    private listenersActivos = false;
    private rafPendiente = false;
    private mediaQuery: MediaQueryList | null = null;

    private readonly onScrollOResize = (): void => {
        if (this.rafPendiente || this.movimientoReducido()) return;
        this.rafPendiente = true;
        requestAnimationFrame(() => {
            this.rafPendiente = false;
            this.actualizarVisibles();
        });
    };

    private readonly onCambioPreferencia = (): void => {
        if (this.movimientoReducido()) {
            this.aplicarValoresEstaticosATodos();
        } else {
            this.onScrollOResize();
        }
    };

    movimientoReducido(): boolean {
        if (typeof window === 'undefined' || !window.matchMedia) return false;
        if (!this.mediaQuery) {
            this.mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
            this.mediaQuery.addEventListener?.('change', this.onCambioPreferencia);
        }
        return this.mediaQuery.matches;
    }

    registrarElemento(el: HTMLElement, modo: ModoProgresoScroll): void {
        this.registros.set(el, { el, modo });

        if (this.movimientoReducido()) {
            this.aplicarEstatico(el, modo);
            return;
        }

        this.asegurarObserverYListeners();
        this.observer?.observe(el);
        // Cálculo inicial inmediato para elementos ya visibles al cargar
        this.visibles.add(el);
        this.onScrollOResize();
    }

    desregistrarElemento(el: HTMLElement): void {
        this.registros.delete(el);
        this.visibles.delete(el);
        this.observer?.unobserve(el);
        this.limpiarSiVacio();
    }

    registrarBarraProgreso(el: HTMLElement | null): void {
        this.barraProgresoEl = el;
        if (el) {
            if (this.movimientoReducido()) {
                el.style.transform = 'scaleX(0)';
                return;
            }
            this.asegurarObserverYListeners();
            this.onScrollOResize();
        } else {
            this.limpiarSiVacio();
        }
    }

    private asegurarObserverYListeners(): void {
        if (typeof window === 'undefined') return;

        if (!this.observer && typeof IntersectionObserver !== 'undefined') {
            this.ngZone.runOutsideAngular(() => {
                this.observer = new IntersectionObserver(
                    (entries) => {
                        for (const entry of entries) {
                            const target = entry.target as HTMLElement;
                            if (entry.isIntersecting) {
                                this.visibles.add(target);
                            } else {
                                this.visibles.delete(target);
                            }
                        }
                        if (this.visibles.size > 0) {
                            this.onScrollOResize();
                        }
                    },
                    { rootMargin: '120px 0px 120px 0px' },
                );
            });
        }

        if (!this.listenersActivos) {
            this.listenersActivos = true;
            this.ngZone.runOutsideAngular(() => {
                window.addEventListener('scroll', this.onScrollOResize, { passive: true });
                window.addEventListener('resize', this.onScrollOResize, { passive: true });
            });
        }
    }

    private limpiarSiVacio(): void {
        if (this.registros.size === 0 && !this.barraProgresoEl && this.listenersActivos) {
            this.listenersActivos = false;
            window.removeEventListener('scroll', this.onScrollOResize);
            window.removeEventListener('resize', this.onScrollOResize);
            this.observer?.disconnect();
            this.observer = null;
        }
    }

    private aplicarValoresEstaticosATodos(): void {
        for (const reg of this.registros.values()) {
            this.aplicarEstatico(reg.el, reg.modo);
        }
        if (this.barraProgresoEl) {
            this.barraProgresoEl.style.transform = 'scaleX(0)';
        }
    }

    private aplicarEstatico(el: HTMLElement, modo: ModoProgresoScroll): void {
        const esMovil = typeof window !== 'undefined' && window.innerWidth < 640;
        if (modo === 'capitulo') {
            el.style.setProperty('--p', '0.5');
        } else if (modo === 'franja') {
            el.style.setProperty('--a', esMovil ? '10px' : '18px');
        } else if (modo === 'pincelada') {
            el.style.setProperty('--d', '1');
        }
    }

    /**
     * Fase 1: leer medidas del DOM; Fase 2: escribir variables CSS y transform.
     */
    private actualizarVisibles(): void {
        const vh = window.innerHeight || 1;
        const vw = window.innerWidth || 1024;
        const esMovil = vw < 640;

        // 1. Lecturas
        const scrollTop = window.scrollY || this.doc.documentElement.scrollTop || 0;
        const maxScroll = Math.max(
            1,
            (this.doc.documentElement.scrollHeight || 0) - vh,
        );
        const progresoGlobal = Math.min(1, Math.max(0, scrollTop / maxScroll));

        const lecturas: { reg: RegistroScroll; rect: DOMRect }[] = [];
        for (const el of this.visibles) {
            const reg = this.registros.get(el);
            if (!reg) continue;
            lecturas.push({ reg, rect: el.getBoundingClientRect() });
        }

        // 2. Escrituras
        if (this.barraProgresoEl) {
            this.barraProgresoEl.style.transform = `scaleX(${progresoGlobal.toFixed(4)})`;
        }

        for (const { reg, rect } of lecturas) {
            const total = vh + rect.height;
            const progreso = total > 0 ? Math.min(1, Math.max(0, (vh - rect.top) / total)) : 0.5;

            if (reg.modo === 'capitulo') {
                reg.el.style.setProperty('--p', progreso.toFixed(3));
            } else if (reg.modo === 'franja') {
                const minPx = esMovil ? 6 : 8;
                const maxPx = esMovil ? 22 : 54;
                const angulo = minPx + progreso * (maxPx - minPx);
                reg.el.style.setProperty('--a', `${angulo.toFixed(1)}px`);
            } else if (reg.modo === 'pincelada') {
                // Se dibuja completamente mientras el título entra entre el 95% y el 42% del viewport
                const entrada = Math.min(1, Math.max(0, (vh * 0.95 - rect.top) / (vh * 0.53)));
                reg.el.style.setProperty('--d', entrada.toFixed(3));
            }
        }
    }
}
