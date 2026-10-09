import { Injectable, signal } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { AcademicStage } from '../models/lecture';

export interface LoginRequest {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignupRequest {
  fullName: string;
  stage: AcademicStage;
  email: string;
  password: string;
}

export interface AuthUser {
  fullName: string;
  email: string;
}

/**
 * Placeholder auth. TODO(backend): POST /api/auth/login, /api/auth/register, Google OAuth.
 * Mock rule so the error state can be tested: the password "wrongpass" always fails.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly user = signal<AuthUser | null>(null);

  login(req: LoginRequest): Observable<AuthUser> {
    if (req.password === 'wrongpass') {
      return throwError(() => new Error('invalid_credentials')).pipe(delay(600));
    }
    const user: AuthUser = { fullName: req.email.split('@')[0], email: req.email };
    this.user.set(user);
    return of(user).pipe(delay(600));
  }

  signup(req: SignupRequest): Observable<AuthUser> {
    const user: AuthUser = { fullName: req.fullName, email: req.email };
    this.user.set(user);
    return of(user).pipe(delay(700));
  }

  /** Placeholder for Google OAuth redirect. */
  continueWithGoogle(): void {
    console.info('[AuthService] Google sign-in is not connected yet.');
  }

  logout(): void {
    this.user.set(null);
  }
}
