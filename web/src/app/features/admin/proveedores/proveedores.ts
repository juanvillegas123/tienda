import { Component, inject, signal, computed, OnInit, HostListener } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ProveedoresService } from '../../../core/proveedores.service';
import { Proveedor } from '../../../core/modelos';

@Component({
    selector: 'app-proveedores-admin',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './proveedores.html',
})
export class ProveedoresAdminComponent implements OnInit {
    private readonly proveedoresService = inject(ProveedoresService);
    private readonly fb = inject(FormBuilder);

    readonly proveedores = signal<Proveedor[]>([]);
    readonly cargando = signal(true);
    readonly guardando = signal(false);
    readonly procesandoBaja = signal(false);
    readonly reactivandoId = signal<number | null>(null);

    readonly filtroTexto = signal('');
    readonly filtroEstado = signal<'activos' | 'inactivos' | 'todos'>('activos');

    readonly modalAbierto = signal(false);
    readonly proveedorEnEdicion = signal<Proveedor | null>(null);
    readonly proveedorParaBaja = signal<Proveedor | null>(null);

    readonly mensajeExito = signal<string | null>(null);
    readonly mensajeError = signal<string | null>(null);

    readonly form = this.fb.group({
        nombre: ['', [Validators.required, Validators.maxLength(150)]],
        contacto: ['', [Validators.maxLength(100)]],
        telefono: ['', [Validators.maxLength(30)]],
        correo: ['', [Validators.email, Validators.maxLength(100)]],
        activo: [true],
    });

    readonly proveedoresFiltrados = computed(() => {
        const q = this.filtroTexto().trim().toLowerCase();
        const est = this.filtroEstado();

        return this.proveedores().filter((p) => {
            if (est === 'activos' && !p.activo) return false;
            if (est === 'inactivos' && p.activo) return false;
            if (q.length > 0) {
                const coincideNombre = p.nombre.toLowerCase().includes(q);
                const coincideContacto = (p.contacto ?? '').toLowerCase().includes(q);
                const coincideTel = (p.telefono ?? '').toLowerCase().includes(q);
                return coincideNombre || coincideContacto || coincideTel;
            }
            return true;
        });
    });

    @HostListener('document:keydown.escape')
    onEscape(): void {
        if (this.modalAbierto()) {
            this.cerrarModal();
        } else if (this.proveedorParaBaja()) {
            this.proveedorParaBaja.set(null);
        }
    }

    ngOnInit(): void {
        this.cargarProveedores();
    }

    cargarProveedores(): void {
        this.cargando.set(true);
        this.proveedoresService.listarAdmin().subscribe({
            next: (lista) => {
                this.proveedores.set(lista);
                this.cargando.set(false);
            },
            error: () => {
                this.cargando.set(false);
                this.mensajeError.set('No se pudo cargar la lista de proveedores.');
            },
        });
    }

    actualizarBusqueda(event: Event): void {
        this.filtroTexto.set((event.target as HTMLInputElement).value);
    }

    actualizarEstado(event: Event): void {
        this.filtroEstado.set(
            (event.target as HTMLSelectElement).value as 'activos' | 'inactivos' | 'todos',
        );
    }

    campoInvalido(campo: string): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && (ctrl.dirty || ctrl.touched));
    }

    abrirModalCrear(): void {
        this.proveedorEnEdicion.set(null);
        this.mensajeError.set(null);
        this.form.reset({
            nombre: '',
            contacto: '',
            telefono: '',
            correo: '',
            activo: true,
        });
        this.modalAbierto.set(true);
    }

    abrirModalEditar(prov: Proveedor): void {
        this.proveedorEnEdicion.set(prov);
        this.mensajeError.set(null);
        this.form.reset({
            nombre: prov.nombre,
            contacto: prov.contacto ?? '',
            telefono: prov.telefono ?? '',
            correo: prov.correo ?? '',
            activo: prov.activo,
        });
        this.modalAbierto.set(true);
    }

    cerrarModal(): void {
        this.modalAbierto.set(false);
        this.proveedorEnEdicion.set(null);
        this.mensajeError.set(null);
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

        const v = this.form.getRawValue();
        const payloadBase = {
            nombre: v.nombre!.trim(),
            contacto: v.contacto?.trim() || null,
            telefono: v.telefono?.trim() || null,
            correo: v.correo?.trim() || null,
        };

        const enEdicion = this.proveedorEnEdicion();
        if (enEdicion) {
            this.proveedoresService
                .editar(enEdicion.id, { ...payloadBase, activo: Boolean(v.activo) })
                .subscribe({
                    next: (actualizado) => {
                        this.guardando.set(false);
                        this.cerrarModal();
                        this.mensajeExito.set(`Proveedor "${actualizado.nombre}" actualizado.`);
                        this.cargarProveedores();
                    },
                    error: (err: unknown) => {
                        this.guardando.set(false);
                        this.manejarError(err, 'No se pudo actualizar el proveedor.');
                    },
                });
        } else {
            this.proveedoresService.crear(payloadBase).subscribe({
                next: (creado) => {
                    this.guardando.set(false);
                    this.cerrarModal();
                    this.mensajeExito.set(`Proveedor "${creado.nombre}" registrado exitosamente.`);
                    this.cargarProveedores();
                },
                error: (err: unknown) => {
                    this.guardando.set(false);
                    this.manejarError(err, 'No se pudo registrar el proveedor.');
                },
            });
        }
    }

    confirmarBaja(): void {
        const prov = this.proveedorParaBaja();
        if (!prov) return;

        this.procesandoBaja.set(true);
        this.proveedoresService.darDeBaja(prov.id).subscribe({
            next: (actualizado) => {
                this.procesandoBaja.set(false);
                this.proveedorParaBaja.set(null);
                this.mensajeExito.set(`Proveedor "${actualizado.nombre}" dado de baja.`);
                this.cargarProveedores();
            },
            error: (err: unknown) => {
                this.procesandoBaja.set(false);
                this.proveedorParaBaja.set(null);
                this.manejarError(err, 'No se pudo dar de baja al proveedor.');
            },
        });
    }

    reactivar(prov: Proveedor): void {
        if (this.reactivandoId() !== null) return;
        this.reactivandoId.set(prov.id);
        this.proveedoresService.reactivar(prov.id).subscribe({
            next: (actualizado) => {
                this.reactivandoId.set(null);
                this.mensajeExito.set(`Proveedor "${actualizado.nombre}" reactivado.`);
                this.cargarProveedores();
            },
            error: (err: unknown) => {
                this.reactivandoId.set(null);
                this.manejarError(err, 'No se pudo reactivar al proveedor.');
            },
        });
    }

    private manejarError(err: unknown, fallback: string): void {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            this.mensajeError.set((body?.['mensaje'] as string) || fallback);
        } else {
            this.mensajeError.set(fallback);
        }
    }
}
