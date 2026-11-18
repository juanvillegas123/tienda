import { Injectable, inject } from '@angular/core';
import {
    HttpInterceptorFn,
    HttpRequest,
    HttpHandlerFn,
    HttpErrorResponse,
} from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
) => {
    const router = inject(Router);
    const authService = inject(AuthService);

    // Agregar withCredentials y encabezado anti-CSRF en todas las peticiones
    const reqConCredenciales = req.clone({
        withCredentials: true,
        setHeaders: {
            'X-Requested-With': 'XMLHttpRequest',
        },
    });

    return next(reqConCredenciales).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                authService.sesion.set(null);
                void router.navigate(['/admin/login']);
            }
            return throwError(() => error);
        }),
    );
};
