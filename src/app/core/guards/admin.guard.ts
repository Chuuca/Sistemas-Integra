import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { switchMap, take, map } from 'rxjs/operators';
import { from } from 'rxjs';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUser$.pipe(
    take(1),
    switchMap(user => {
      if (!user) return from(Promise.resolve(false));
      return from(authService.getUserRol(user.uid)).pipe(
        map(rol => {
          if (rol === 'admin') return true;
          router.navigate(['/dashboard']);
          return false;
        })
      );
    })
  );
};