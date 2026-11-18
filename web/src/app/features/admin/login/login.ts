import { Component, inject, signal, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
    selector: 'app-login',
    standalone: true,
    imports: [ReactiveFormsModule],
    templateUrl: './login.html',
})
export class LoginComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    private readonly authService = inject(AuthService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    readonly cargando = signal(false);
    readonly error = signal<string | null>(null);

    readonly form = this.fb.nonNullable.group({
        usuario: ['', Validators.required],
        contrasena: ['', Validators.required],
    });

    ngOnInit(): void {
        // Si ya tiene sesión, redirigir
        if (this.authService.estaAutenticada()) {
            void this.router.navigate(['/admin/pedidos']);
        }
    }

    campoInvalido(campo: 'usuario' | 'contrasena'): boolean {
        const ctrl = this.form.get(campo);
        return !!(ctrl?.invalid && ctrl.touched);
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        if (this.cargando()) return;

        this.cargando.set(true);
        this.error.set(null);

        const { usuario, contrasena } = this.form.getRawValue();

        this.authService.login(usuario, contrasena).subscribe({
            next: () => {
                const returnUrl =
                    (this.route.snapshot.queryParams['returnUrl'] as string) ??
                    '/admin/pedidos';
                void this.router.navigate([returnUrl]);
            },
            error: (err: unknown) => {
                this.cargando.set(false);
                if (err instanceof HttpErrorResponse) {
                    const body = err.error as Record<string, unknown> | null;
                    this.error.set(
                        (body?.['mensaje'] as string) ??
                            'Error al iniciar sesión. Intente más tarde.',
                    );
                } else {
                    this.error.set('Error al iniciar sesión. Intente más tarde.');
                }
            },
            complete: () => this.cargando.set(false),
        });
    }
}
