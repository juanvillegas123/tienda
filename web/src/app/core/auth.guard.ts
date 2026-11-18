import { Injectable, inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { catchError, map, of } from 'rxjs';

export const authGuard: CanActivateFn = (
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Si ya tenemos la sesión en memoria, permitir
    if (authService.estaAutenticada()) {
        return true;
    }

    // Intentar recuperar la sesión desde el servidor (cookie existente)
    return authService.cargarSesion().pipe(
        map(() => true),
        catchError(() => {
            void router.navigate(['/admin/login'], {
                queryParams: { returnUrl: state.url },
            });
            return of(false);
        }),
    );
};
