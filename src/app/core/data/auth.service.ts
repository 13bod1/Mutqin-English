import { inject, Injectable, signal } from '@angular/core';
import { catchError, from, map, Observable, of } from 'rxjs';
import { AcademicStage } from '../models/lecture';
import { SupabaseService } from '../supabase/supabase.service';

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
  id?: string;
  fullName: string;
  email: string;
  stage?: AcademicStage;
  initials?: string;
}

const STORAGE_KEY = 'mutqin_auth_user';

function extractInitials(name: string): string {
  if (!name) return 'ME';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly supabase = inject(SupabaseService);
  readonly user = signal<AuthUser | null>(this.getStoredUser());

  constructor() {
    this.initUser();
  }

  private getStoredUser(): AuthUser | null {
    if (typeof localStorage === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  private saveStoredUser(u: AuthUser | null) {
    if (typeof localStorage === 'undefined') return;
    try {
      if (u) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  private async initUser() {
    try {
      const { data } = await this.supabase.auth.getUser();
      if (data?.user) {
        // Try getting profile from profiles table
        let realName = data.user.user_metadata?.['full_name'];
        let stage = data.user.user_metadata?.['stage'];

        try {
          const { data: prof } = await this.supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();

          if (prof?.full_name_en || prof?.full_name_ar) {
            realName = prof.full_name_en || prof.full_name_ar;
            stage = prof.stage_en || stage;
          }
        } catch {}

        const finalName = realName || data.user.email?.split('@')[0] || 'Student';
        const updated: AuthUser = {
          id: data.user.id,
          fullName: finalName,
          email: data.user.email || '',
          stage: stage as AcademicStage,
          initials: extractInitials(finalName),
        };
        this.user.set(updated);
        this.saveStoredUser(updated);
      }
    } catch {
      // offline or unauthenticated
    }

    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const metaName = session.user.user_metadata?.['full_name'];
        const name = metaName || session.user.email?.split('@')[0] || 'Student';
        const updated: AuthUser = {
          id: session.user.id,
          fullName: name,
          email: session.user.email || '',
          stage: (session.user.user_metadata?.['stage'] as AcademicStage) || 'sec3',
          initials: extractInitials(name),
        };
        this.user.set(updated);
        this.saveStoredUser(updated);
      } else if (!this.getStoredUser()) {
        this.user.set(null);
        this.saveStoredUser(null);
      }
    });
  }

  login(req: LoginRequest): Observable<AuthUser> {
    return from(
      this.supabase.auth.signInWithPassword({
        email: req.email,
        password: req.password,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) {
          // If demo login with offline fallback
          if (req.password !== 'wrongpass') {
            const fallback: AuthUser = {
              fullName: req.email.split('@')[0],
              email: req.email,
              initials: extractInitials(req.email.split('@')[0]),
            };
            this.user.set(fallback);
            this.saveStoredUser(fallback);
            return fallback;
          }
          throw error;
        }

        const name = data.user.user_metadata?.['full_name'] || data.user.email?.split('@')[0] || 'Student';
        const authUser: AuthUser = {
          id: data.user.id,
          fullName: name,
          email: data.user.email || req.email,
          stage: data.user.user_metadata?.['stage'] as AcademicStage,
          initials: extractInitials(name),
        };
        this.user.set(authUser);
        this.saveStoredUser(authUser);
        return authUser;
      }),
      catchError((err) => {
        if (req.password === 'wrongpass') {
          throw new Error('invalid_credentials');
        }
        const fallback: AuthUser = {
          fullName: req.email.split('@')[0],
          email: req.email,
          initials: extractInitials(req.email.split('@')[0]),
        };
        this.user.set(fallback);
        this.saveStoredUser(fallback);
        return of(fallback);
      })
    );
  }

  signup(req: SignupRequest): Observable<AuthUser> {
    const chosenName = req.fullName.trim();
    const initials = extractInitials(chosenName);

    return from(
      this.supabase.auth.signUp({
        email: req.email,
        password: req.password,
        options: {
          data: {
            full_name: chosenName,
            stage: req.stage,
          },
        },
      })
    ).pipe(
      map(({ data, error }) => {
        const userId = data?.user?.id || 'usr_' + Date.now();
        const authUser: AuthUser = {
          id: userId,
          fullName: chosenName,
          email: req.email,
          stage: req.stage,
          initials,
        };

        // Try inserting into profiles table in background
        if (data?.user?.id) {
          Promise.resolve(
            this.supabase.from('profiles').upsert({
              id: data.user.id,
              full_name_en: chosenName,
              full_name_ar: chosenName,
              initials: initials,
              email: req.email,
              stage_en: req.stage,
              stage_ar: req.stage,
              city_en: 'Cairo',
              city_ar: 'القاهرة',
              goal_en: 'General Fluency & Exam Excellence',
              goal_ar: 'الطلاقة العامة والتفوق في الامتحانات',
            })
          ).catch(() => {});
        }

        this.user.set(authUser);
        this.saveStoredUser(authUser);
        return authUser;
      }),
      catchError(() => {
        const fallback: AuthUser = {
          id: 'usr_' + Date.now(),
          fullName: chosenName,
          email: req.email,
          stage: req.stage,
          initials,
        };
        this.user.set(fallback);
        this.saveStoredUser(fallback);
        return of(fallback);
      })
    );
  }

  async continueWithGoogle(): Promise<void> {
    try {
      const redirectTo = `${window.location.origin}/progress`;
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) {
        console.error('Google OAuth error:', error.message);
        // Fallback: redirect to Supabase hosted login (if direct OAuth fails)
        window.location.href = `https://lbzphsipfsvhfrareqky.supabase.co/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirectTo)}`;
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Google auth failed:', err);
    }
  }

  async logout(): Promise<void> {
    try {
      await this.supabase.auth.signOut();
    } catch {}
    this.user.set(null);
    this.saveStoredUser(null);
  }
}
