import { inject, isDevMode } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../data/auth.service';

/**
 * Lets admins and assistants into /admin and the live studio.
 *
 * This only hides screens — the real protection is Supabase RLS, which must refuse
 * admin reads/writes for anyone whose profiles.role is not 'admin' / 'assistant'.
 * In development the guard is open so the team can preview the panel without a staff account.
 */
export const staffGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  if (isDevMode() || auth.isStaff()) return true;
  const redirect = '/' + segments.map((s) => s.path).join('/');
  return inject(Router).createUrlTree(auth.user() ? ['/'] : ['/login'], { queryParams: auth.user() ? {} : { redirect } });
};

/**
 * Admin-only route guard.
 * Restricts access strictly to users with role === 'admin'.
 * Assistant role is redirected directly to '/assistant'.
 * Students and other non-staff roles are redirected to '/'.
 * Unauthenticated users are redirected to '/login?redirect=...'.
 */
export const adminGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const user = auth.user();

  if (user?.role === 'admin') {
    return true;
  }

  if (user?.role === 'assistant') {
    return router.createUrlTree(['/assistant']);
  }

  const redirect = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(user ? ['/'] : ['/login'], {
    queryParams: user ? {} : { redirect },
  });
};
