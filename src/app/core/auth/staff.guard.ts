import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { AuthService } from '../data/auth.service';

/**
 * Lets admins and assistants into /admin and the live studio.
 * Awaits authentication initialization and fails closed.
 * Zero isDevMode bypass to prevent unauthorized access in development/preview builds.
 */
export const staffGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.revalidateRoleProfile();
  const role = user?.role;

  if (role === 'admin' || role === 'assistant') {
    return true;
  }

  const redirect = '/' + segments.map((s) => s.path).join('/');
  return router.createUrlTree(user ? ['/'] : ['/login'], {
    queryParams: user ? {} : { redirect },
  });
};

/**
 * Admin-only route guard.
 * Restricts access strictly to users with verified role === 'admin'.
 * Assistant role is redirected directly to '/assistant'.
 * Students and other non-staff roles are redirected to '/'.
 * Unauthenticated users are redirected to '/login?redirect=...'.
 */
export const adminGuard: CanMatchFn = async (_route, segments) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  const user = await auth.revalidateRoleProfile();
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
