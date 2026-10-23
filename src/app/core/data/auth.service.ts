import { computed, inject, Injectable, signal } from '@angular/core';
import { from, map, Observable, of } from 'rxjs';
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

export const ADMIN_CREDENTIALS = {
  email: 'adel@adelmostafa.com',
  password: '3:hhL-Ds7zVYCg:',
  user: {
    id: 's0-adel-mostafa-admin',
    fullName: 'Mr. Adel Mostafa',
    email: 'adel@adelmostafa.com',
    stage: 'sec3' as AcademicStage,
    initials: 'AM',
    role: 'admin' as UserRole,
  },
};

export const ASSISTANT_CREDENTIALS = {
  email: 'assistant@adelmostafa.com',
  password: 'Assist@Adel#2026',
  user: {
    id: 's1-assistant-sara',
    fullName: 'Sara Hassan (Assistant)',
    email: 'assistant@adelmostafa.com',
    stage: 'sec3' as AcademicStage,
    initials: 'SH',
    role: 'assistant' as UserRole,
  },
};

export const ASSISTANT_ACCOUNTS_KEY = 'mutqin_assistant_accounts';

export interface AssistantAccount {
  id: string;
  fullName: string;
  email: string;
  password: string;
  initials: string;
  role: 'assistant';
  createdAt: string;
  scopes?: string[];
}

export function getCustomAssistantAccounts(): AssistantAccount[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ASSISTANT_ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCustomAssistantAccount(account: AssistantAccount): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getCustomAssistantAccounts();
    const idx = list.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
    if (idx !== -1) {
      list[idx] = account;
    } else {
      list.push(account);
    }
    localStorage.setItem(ASSISTANT_ACCOUNTS_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event('storage'));
  } catch {}
}

export const STUDENT_LOGINS_KEY = 'mutqin_student_logins';
export const REGISTERED_STUDENTS_KEY = 'mutqin_admin_students';

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
    // Preserve local admin / assistant session across reloads
    const stored = this.getStoredUser();
    if (stored?.role === 'admin' || stored?.role === 'assistant') {
      this.user.set(stored);
      return;
    }

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
        if (updated.role !== 'admin' && updated.role !== 'assistant') {
          this.recordStudentActivity(updated, 'login');
        }
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
      const cur = this.user();
      if (cur?.role === 'admin' || cur?.role === 'assistant') {
        return;
      }
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
        if (updated.role !== 'admin' && updated.role !== 'assistant') {
          this.recordStudentActivity(updated, 'login');
        }
      } else {
        this.user.set(null);
        this.saveStoredUser(null);
      }
    });
  }

  /** Record student login/signup in local database so it immediately reflects in the admin dashboard */
  recordStudentActivity(user: AuthUser, type: 'login' | 'signup'): void {
    if (typeof localStorage === 'undefined' || !user || user.role === 'admin' || user.role === 'assistant') return;
    try {
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];

      // 1. Update/Add to Registered Students Database
      const rawStudents = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      let list: any[] = rawStudents ? JSON.parse(rawStudents) : [];
      if (!Array.isArray(list)) list = [];

      const existingIdx = list.findIndex(
        (s) => (user.id && s.id === user.id) || (user.email && s.email?.toLowerCase() === user.email.toLowerCase())
      );

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          name: user.fullName || list[existingIdx].name,
          stage: user.stage || list[existingIdx].stage || 'sec3',
          status: 'active',
          lastLoginAt: nowIso,
        };
      } else {
        const newStudent = {
          id: user.id || 'u_' + Date.now(),
          name: user.fullName || user.email.split('@')[0],
          email: user.email,
          stage: user.stage || 'sec3',
          joinedAt: todayDate,
          lastLoginAt: nowIso,
          lecturesDone: 0,
          lecturesTotal: 40,
          avgScore: null,
          status: 'active',
        };
        list.unshift(newStudent);
      }
      localStorage.setItem(REGISTERED_STUDENTS_KEY, JSON.stringify(list));

      // 2. Add to Recent Student Logins Log
      const rawLogins = localStorage.getItem(STUDENT_LOGINS_KEY);
      let logins: any[] = rawLogins ? JSON.parse(rawLogins) : [];
      if (!Array.isArray(logins)) logins = [];

      logins.unshift({
        id: user.id || 'log_' + Date.now(),
        who: user.initials || 'ST',
        name: user.fullName || user.email,
        email: user.email,
        stage: user.stage || 'sec3',
        type,
        time: nowIso,
      });
      if (logins.length > 30) logins = logins.slice(0, 30);
      localStorage.setItem(STUDENT_LOGINS_KEY, JSON.stringify(logins));

      // Broadcast storage event for reactive admin views
      window.dispatchEvent(new Event('storage'));
    } catch (e) {
      console.warn('Failed to record student activity', e);
    }
  }

  login(req: LoginRequest): Observable<AuthUser> {
    const cleanEmail = req.email.trim();
    if (cleanEmail.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() && req.password === ADMIN_CREDENTIALS.password) {
      const adminUser: AuthUser = { ...ADMIN_CREDENTIALS.user };
      this.user.set(adminUser);
      this.saveStoredUser(adminUser);
      return of(adminUser);
    }

    if (cleanEmail.toLowerCase() === ASSISTANT_CREDENTIALS.email.toLowerCase() && req.password === ASSISTANT_CREDENTIALS.password) {
      const assistantUser: AuthUser = { ...ASSISTANT_CREDENTIALS.user };
      this.user.set(assistantUser);
      this.saveStoredUser(assistantUser);
      return of(assistantUser);
    }

    // Check custom assistant accounts created from Admin Panel
    const customAssistants = getCustomAssistantAccounts();
    const matched = customAssistants.find(
      (a) => a.email.toLowerCase() === cleanEmail.toLowerCase() && a.password === req.password
    );
    if (matched) {
      const customAssistantUser: AuthUser = {
        id: matched.id,
        fullName: matched.fullName,
        email: matched.email,
        initials: matched.initials,
        role: 'assistant',
      };
      this.user.set(customAssistantUser);
      this.saveStoredUser(customAssistantUser);
      return of(customAssistantUser);
    }

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
          role: 'student',
        };
        this.user.set(authUser);
        this.saveStoredUser(authUser);
        this.recordStudentActivity(authUser, 'login');
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
          role: 'student',
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
              role: 'student',
              city_en: 'Cairo',
              city_ar: 'القاهرة',
              goal_en: 'General Fluency & Exam Excellence',
              goal_ar: 'الطلاقة العامة والتفوق في الامتحانات',
            })
          ).catch(() => {});
        }

        this.user.set(authUser);
        this.saveStoredUser(authUser);
        this.recordStudentActivity(authUser, 'signup');
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
