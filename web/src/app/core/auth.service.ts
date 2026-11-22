import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AdminSesion } from '../core/modelos';

@Injectable({ providedIn: 'root' })
export class AuthService {
    private readonly http = inject(HttpClient);
    private readonly base = environment.apiUrl;

    readonly sesion = signal<AdminSesion | null>(null);
    readonly cargando = signal(false);

    login(usuario: string, contrasena: string): Observable<unknown> {
        return this.http
            .post(`${this.base}/auth/login`, { usuario, contrasena })
            .pipe(tap(() => this.cargarSesion().subscribe()));
    }

    logout(): Observable<unknown> {
        return this.http
            .post(`${this.base}/auth/logout`, {})
            .pipe(tap(() => this.sesion.set(null)));
    }

    cargarSesion(): Observable<AdminSesion> {
        return this.http
            .get<AdminSesion>(`${this.base}/auth/me`)
            .pipe(tap((admin) => this.sesion.set(admin)));
    }

    estaAutenticada(): boolean {
        return this.sesion() !== null;
    }

    cambiarUsuario(
        nuevoUsuario: string,
        contrasenaActual: string,
    ): Observable<{ usuario: string; mensaje: string }> {
        return this.http
            .patch<{ usuario: string; mensaje: string }>(`${this.base}/auth/perfil/usuario`, {
                nuevoUsuario,
                contrasenaActual,
            })
            .pipe(
                tap((res) => {
                    const actual = this.sesion();
                    if (actual) {
                        this.sesion.set({ ...actual, usuario: res.usuario });
                    }
                }),
            );
    }

    cambiarContrasena(
        contrasenaActual: string,
        nuevaContrasena: string,
    ): Observable<{ mensaje: string }> {
        return this.http.patch<{ mensaje: string }>(`${this.base}/auth/perfil/contrasena`, {
            contrasenaActual,
            nuevaContrasena,
        });
    }
}
