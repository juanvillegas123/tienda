import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CategoriasService } from '../../../core/categorias.service';
import { Categoria } from '../../../core/modelos';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-categorias-admin',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './categorias.html',
})
export class CategoriasAdminComponent implements OnInit {
    private readonly categoriasService = inject(CategoriasService);
    private readonly fb = inject(FormBuilder);

    readonly categorias = signal<Categoria[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly terminoBusqueda = signal('');

    readonly modalAbierto = signal(false);
    readonly categoriaEnEdicion = signal<Categoria | null>(null);
    readonly categoriaParaBaja = signal<Categoria | null>(null);

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        nombre: ['', [Validators.required, Validators.maxLength(100)]],
        slug: ['', [Validators.maxLength(100)]],
        activa: [true],
    });

    readonly categoriasFiltradas = computed(() => {
        const termino = this.terminoBusqueda().trim().toLowerCase();
        const lista = this.categorias();
        if (!termino) return lista;
        return lista.filter(
            (c) =>
                c.nombre.toLowerCase().includes(termino) ||
                c.slug.toLowerCase().includes(termino),
        );
    });

    ngOnInit(): void {
        this.cargarCategorias();
    }

    cargarCategorias(): void {
        this.cargando.set(true);
        this.categoriasService.listarAdmin().subscribe({
            next: (data) => {
                this.categorias.set(data);
                this.cargando.set(false);
            },
            error: () => {
                this.mensajeError.set('No se pudieron cargar las categorías');
                this.cargando.set(false);
            },
        });
    }

    actualizarBusqueda(event: Event): void {
        const valor = (event.target as HTMLInputElement).value;
        this.terminoBusqueda.set(valor);
    }

    campoInvalido(campo: 'nombre' | 'slug'): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    abrirModalCrear(): void {
        this.categoriaEnEdicion.set(null);
        this.form.reset({ nombre: '', slug: '', activa: true });
        this.modalAbierto.set(true);
    }

    abrirModalEditar(cat: Categoria): void {
        this.categoriaEnEdicion.set(cat);
        this.form.reset({
            nombre: cat.nombre,
            slug: cat.slug,
            activa: cat.activa,
        });
        this.modalAbierto.set(true);
    }

    cerrarModal(): void {
        this.modalAbierto.set(false);
        this.categoriaEnEdicion.set(null);
        this.form.reset();
    }

    guardar(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.guardando.set(true);
        this.mensajeError.set(null);
        this.mensajeExito.set(null);

        const { nombre, slug, activa } = this.form.getRawValue();
        const enEdicion = this.categoriaEnEdicion();

        if (enEdicion) {
            this.categoriasService
                .editar(enEdicion.id, {
                    nombre,
                    slug: slug.trim().length > 0 ? slug.trim() : undefined,
                    activa,
                })
                .subscribe({
                    next: (actualizada) => {
                        this.categorias.update((lista) =>
                            lista.map((c) => (c.id === actualizada.id ? actualizada : c)),
                        );
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Categoría "${actualizada.nombre}" actualizada.`);
                    },
                    error: (err: unknown) => {
                        this.guardando.set(false);
                        this.manejarError(err, 'Error al editar categoría');
                    },
                });
        } else {
            this.categoriasService
                .crear({
                    nombre,
                    slug: slug.trim().length > 0 ? slug.trim() : undefined,
                })
                .subscribe({
                    next: (creada) => {
                        this.categorias.update((lista) => [...lista, creada]);
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Categoría "${creada.nombre}" creada.`);
                    },
                    error: (err: unknown) => {
                        this.guardando.set(false);
                        this.manejarError(err, 'Error al crear categoría');
                    },
                });
        }
    }

    confirmarDarDeBaja(cat: Categoria): void {
        this.categoriaParaBaja.set(cat);
    }

    ejecutarBaja(): void {
        const cat = this.categoriaParaBaja();
        if (!cat) return;

        this.categoriasService.darDeBaja(cat.id).subscribe({
            next: (actualizada) => {
                this.categorias.update((lista) =>
                    lista.map((c) => (c.id === actualizada.id ? actualizada : c)),
                );
                this.categoriaParaBaja.set(null);
                this.mensajeExito.set(`Categoría "${actualizada.nombre}" desactivada.`);
            },
            error: () => {
                this.categoriaParaBaja.set(null);
                this.mensajeError.set('No se pudo desactivar la categoría.');
            },
        });
    }

    reactivarCategoria(cat: Categoria): void {
        this.categoriasService.editar(cat.id, { activa: true }).subscribe({
            next: (actualizada) => {
                this.categorias.update((lista) =>
                    lista.map((c) => (c.id === actualizada.id ? actualizada : c)),
                );
                this.mensajeExito.set(`Categoría "${actualizada.nombre}" reactivada.`);
            },
            error: () => {
                this.mensajeError.set('No se pudo reactivar la categoría.');
            },
        });
    }

    private manejarError(err: unknown, defaultMsg: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            const msg = (body?.['mensaje'] as string) ?? defaultMsg;
            this.mensajeError.set(msg);
        } else {
            this.mensajeError.set(defaultMsg);
        }
    }
}
