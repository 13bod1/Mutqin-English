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
