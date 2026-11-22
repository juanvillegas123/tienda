import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../../core/auth.service';
import { ConfiguracionService } from '../../../core/configuracion.service';

@Component({
    selector: 'app-perfil-admin',
    standalone: true,
    imports: [ReactiveFormsModule, DatePipe],
    templateUrl: './perfil.html',
})
export class PerfilAdminComponent implements OnInit {
    private readonly authService = inject(AuthService);
    private readonly configService = inject(ConfiguracionService);
    private readonly fb = inject(FormBuilder);
    private readonly router = inject(Router);

    readonly sesion = this.authService.sesion;
    readonly pestana = signal<'seguridad' | 'tienda'>('seguridad');

    // Cambio de usuario
    readonly guardandoUsuario = signal(false);
    readonly exitoUsuario = signal<string | null>(null);
    readonly errorUsuario = signal<string | null>(null);

    readonly formUsuario = this.fb.nonNullable.group({
        nuevoUsuario: [
            this.sesion()?.usuario ?? '',
            [
                Validators.required,
                Validators.minLength(3),
                Validators.maxLength(30),
                Validators.pattern(/^[a-zA-Z0-9._-]+$/),
            ],
        ],
        contrasenaActual: ['', [Validators.required]],
    });

    // Cambio de contraseña
    readonly guardandoContrasena = signal(false);
    readonly exitoContrasena = signal<string | null>(null);
    readonly errorContrasena = signal<string | null>(null);
    readonly nuevaContrasenaPreview = signal('');

    readonly formContrasena = this.fb.nonNullable.group({
        contrasenaActual: ['', [Validators.required]],
        nuevaContrasena: [
            '',
            [
                Validators.required,
                Validators.minLength(8),
                Validators.maxLength(100),
                Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/),
            ],
        ],
        confirmarContrasena: ['', [Validators.required]],
    });

    // Información pública de la tienda
    readonly guardandoTienda = signal(false);
    readonly exitoTienda = signal<string | null>(null);
    readonly errorTienda = signal<string | null>(null);

    readonly formTienda = this.fb.nonNullable.group({
        descripcion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(400)]],
        direccion: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
        referencia: ['', [Validators.maxLength(200)]],
        ciudad: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
        horarios: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200)]],
        googleMapsUrl: ['', [Validators.maxLength(500)]],
        googleMapsEmbedUrl: ['', [Validators.maxLength(1000)]],
        instagramUrl: ['', [Validators.maxLength(500)]],
        instagramUsuario: ['', [Validators.maxLength(80)]],
        tiktokUrl: ['', [Validators.maxLength(500)]],
        tiktokUsuario: ['', [Validators.maxLength(80)]],
        facebookUrl: ['', [Validators.maxLength(500)]],
        facebookUsuario: ['', [Validators.maxLength(80)]],
    });

    readonly fortaleza = computed(() => {
        const val = this.nuevaContrasenaPreview();
        let puntos = 0;
        if (val.length >= 8) puntos++;
        if (/[A-Z]/.test(val)) puntos++;
        if (/[a-z]/.test(val)) puntos++;
        if (/\d/.test(val)) puntos++;
        if (/[^a-zA-Z0-9]/.test(val) || val.length >= 12) puntos++;

        if (!val) return { nivel: 0, texto: '', clase: '' };
        if (puntos <= 2) return { nivel: 1, texto: 'Débil', clase: 'bg-peligro' };
        if (puntos === 3) return { nivel: 2, texto: 'Media', clase: 'bg-alerta' };
        if (puntos === 4) return { nivel: 3, texto: 'Fuerte', clase: 'bg-exito' };
        return { nivel: 4, texto: 'Muy segura', clase: 'bg-exito' };
    });

    ngOnInit(): void {
        this.configService.cargarInfoTienda(true).subscribe((info) => {
            this.formTienda.patchValue({
                descripcion: info.descripcion,
                direccion: info.direccion,
                referencia: info.referencia,
                ciudad: info.ciudad,
                horarios: info.horarios,
                googleMapsUrl: info.googleMapsUrl,
                googleMapsEmbedUrl: info.googleMapsEmbedUrl,
                instagramUrl: info.instagramUrl,
                instagramUsuario: info.instagramUsuario,
                tiktokUrl: info.tiktokUrl,
                tiktokUsuario: info.tiktokUsuario,
                facebookUrl: info.facebookUrl,
                facebookUsuario: info.facebookUsuario,
            });
        });
    }

    onInputNuevaContrasena(event: Event): void {
        this.nuevaContrasenaPreview.set((event.target as HTMLInputElement).value);
    }

    /**
     * Si la propietaria pega el código completo `<iframe src="https://www.google.com/maps/embed?...">`,
     * extraemos automáticamente solo la URL segura del atributo src.
     */
    onPegarMapaEmbed(event: Event): void {
        const valor = (event.target as HTMLInputElement).value.trim();
        const match = valor.match(/src=["'](https:\/\/(?:www\.)?google\.com\/maps\/embed[^"']+)["']/i);
        if (match?.[1]) {
            this.formTienda.patchValue({ googleMapsEmbedUrl: match[1] });
        }
    }

    guardarUsuario(): void {
        if (this.formUsuario.invalid) {
            this.formUsuario.markAllAsTouched();
            return;
        }

        this.guardandoUsuario.set(true);
        this.exitoUsuario.set(null);
        this.errorUsuario.set(null);

        const { nuevoUsuario, contrasenaActual } = this.formUsuario.getRawValue();
        this.authService.cambiarUsuario(nuevoUsuario.trim(), contrasenaActual).subscribe({
            next: (res) => {
                this.guardandoUsuario.set(false);
                this.exitoUsuario.set(res.mensaje);
                this.formUsuario.patchValue({ nuevoUsuario: res.usuario, contrasenaActual: '' });
                this.formUsuario.markAsPristine();
            },
            error: (err: unknown) => {
                this.guardandoUsuario.set(false);
                this.errorUsuario.set(this.extraerMensaje(err, 'No se pudo actualizar el usuario.'));
            },
        });
    }

    guardarContrasena(): void {
        if (this.formContrasena.invalid) {
            this.formContrasena.markAllAsTouched();
            return;
        }

        const { contrasenaActual, nuevaContrasena, confirmarContrasena } =
            this.formContrasena.getRawValue();

        if (nuevaContrasena !== confirmarContrasena) {
            this.errorContrasena.set('La confirmación no coincide con la nueva contraseña.');
            return;
        }

        this.guardandoContrasena.set(true);
        this.exitoContrasena.set(null);
        this.errorContrasena.set(null);

        this.authService.cambiarContrasena(contrasenaActual, nuevaContrasena).subscribe({
            next: (res) => {
                this.guardandoContrasena.set(false);
                this.exitoContrasena.set(res.mensaje);
                this.formContrasena.reset();
                this.nuevaContrasenaPreview.set('');
            },
            error: (err: unknown) => {
                this.guardandoContrasena.set(false);
                this.errorContrasena.set(
                    this.extraerMensaje(err, 'No se pudo actualizar la contraseña.'),
                );
            },
        });
    }

    guardarInfoTienda(): void {
        if (this.formTienda.invalid) {
            this.formTienda.markAllAsTouched();
            return;
        }

        this.guardandoTienda.set(true);
        this.exitoTienda.set(null);
        this.errorTienda.set(null);

        const v = this.formTienda.getRawValue();
        this.configService
            .actualizarInfoTienda({
                descripcion: v.descripcion.trim(),
                direccion: v.direccion.trim(),
                referencia: v.referencia.trim(),
                ciudad: v.ciudad.trim(),
                horarios: v.horarios.trim(),
                googleMapsUrl: v.googleMapsUrl.trim(),
                googleMapsEmbedUrl: v.googleMapsEmbedUrl.trim(),
                instagramUrl: v.instagramUrl.trim(),
                instagramUsuario: v.instagramUsuario.trim(),
                tiktokUrl: v.tiktokUrl.trim(),
                tiktokUsuario: v.tiktokUsuario.trim(),
                facebookUrl: v.facebookUrl.trim(),
                facebookUsuario: v.facebookUsuario.trim(),
            })
            .subscribe({
                next: () => {
                    this.guardandoTienda.set(false);
                    this.exitoTienda.set(
                        'Información pública de la tienda actualizada correctamente.',
                    );
                },
                error: (err: unknown) => {
                    this.guardandoTienda.set(false);
                    this.errorTienda.set(
                        this.extraerMensaje(err, 'No se pudo guardar la información de la tienda.'),
                    );
                },
            });
    }

    cerrarSesion(): void {
        this.authService.logout().subscribe({
            next: () => void this.router.navigate(['/admin/login']),
            error: () => void this.router.navigate(['/admin/login']),
        });
    }

    private extraerMensaje(err: unknown, fallback: string): string {
        if (err instanceof HttpErrorResponse) {
            const body = err.error as Record<string, unknown> | null;
            return (body?.['mensaje'] as string) || fallback;
        }
        return fallback;
    }
}
