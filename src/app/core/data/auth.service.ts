import { computed, inject, Injectable, signal } from '@angular/core';
import { from, map, Observable } from 'rxjs';
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
  /** From profiles.role — 'admin' and 'assistant' can open /admin. Enforced server-side by RLS. */
  role?: UserRole;
}

export type UserRole = 'student' | 'assistant' | 'admin';

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
  readonly isStaff = computed(() => {
    const role = this.user()?.role;
    return role === 'admin' || role === 'assistant';
  });

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
      const { data, error } = await this.supabase.auth.getUser();
      if (!error && data?.user) {
        // Try getting profile from profiles table
        let realName = data.user.user_metadata?.['full_name'];
        let stage = data.user.user_metadata?.['stage'];
        let role: UserRole | undefined;

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
          role = prof?.role ?? undefined;
        } catch {}

        const finalName = realName || data.user.email?.split('@')[0] || 'Student';
        const updated: AuthUser = {
          id: data.user.id,
          fullName: finalName,
          email: data.user.email || '',
          stage: stage as AcademicStage,
          initials: extractInitials(finalName),
          role,
        };
        this.user.set(updated);
        this.saveStoredUser(updated);
      } else {
        // No active Supabase session — clear any stale local user
        this.user.set(null);
        this.saveStoredUser(null);
      }
    } catch {
      this.user.set(null);
      this.saveStoredUser(null);
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
          role: this.user()?.id === session.user.id ? this.user()?.role : undefined,
        };
        this.user.set(updated);
        this.saveStoredUser(updated);
      } else {
        this.user.set(null);
        this.saveStoredUser(null);
      }
    });
  }

  login(req: LoginRequest): Observable<AuthUser> {
    const cleanEmail = req.email.trim();
    return from(
      this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: req.password,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error || !data?.user) {
          throw error || new Error('Invalid login credentials');
        }

        const name = data.user.user_metadata?.['full_name'] || data.user.email?.split('@')[0] || 'Student';
        const authUser: AuthUser = {
          id: data.user.id,
          fullName: name,
          email: data.user.email || cleanEmail,
          stage: data.user.user_metadata?.['stage'] as AcademicStage,
          initials: extractInitials(name),
        };
        this.user.set(authUser);
        this.saveStoredUser(authUser);
        return authUser;
      })
    );
  }

  signup(req: SignupRequest): Observable<AuthUser> {
    const chosenName = req.fullName.trim();
    const initials = extractInitials(chosenName);
    const cleanEmail = req.email.trim();

    return from(
      this.supabase.auth.signUp({
        email: cleanEmail,
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
        if (error || !data?.user) {
          throw error || new Error('Signup failed');
        }

        const authUser: AuthUser = {
          id: data.user.id,
          fullName: chosenName,
          email: cleanEmail,
          stage: req.stage,
          initials,
        };

        // Try inserting into profiles table in background
        if (data.user.id) {
          Promise.resolve(
            this.supabase.from('profiles').upsert({
              id: data.user.id,
              full_name_en: chosenName,
              full_name_ar: chosenName,
              initials: initials,
              email: cleanEmail,
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
