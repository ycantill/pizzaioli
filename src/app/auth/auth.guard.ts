import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { toObservable } from '@angular/core/rxjs-interop';
import { filter, map, take } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    filter((user) => user !== undefined),
    take(1),
    map((user) => (user !== null ? true : router.createUrlTree(['/login']))),
  );
};

export const noAuthGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return toObservable(authService.currentUser).pipe(
    filter((user) => user !== undefined),
    take(1),
    map((user) => (user === null ? true : router.createUrlTree(['/']))),
  );
};
