import { computed, inject, Injectable, signal } from '@angular/core';
import { from, Observable, of, switchMap, throwError, timeout } from 'rxjs';
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

/**
 * Public administrative metadata references for compiler & component consumers.
 * NOTE: Passwords have been completely removed. Staff members must authenticate
 * via Supabase Auth (signInWithPassword) with server-side role validation.
 */
export const ADMIN_CREDENTIALS = {
  email: 'adel@adelmostafa.com',
  user: {
    id: 's0-adel-mostafa-admin',
    fullName: 'Mr. Adel Mostafa',
    email: 'adel@adelmostafa.com',
    stage: 'sec3' as AcademicStage,
    initials: 'AM',
    role: 'admin' as UserRole,
  },
} as const;

export const ASSISTANT_CREDENTIALS = {
  email: 'assistant@adelmostafa.com',
  user: {
    id: 's1-assistant-sara',
    fullName: 'Sara Hassan (Assistant)',
    email: 'assistant@adelmostafa.com',
    stage: 'sec3' as AcademicStage,
    initials: 'SH',
    role: 'assistant' as UserRole,
  },
} as const;

export const ASSISTANT_ACCOUNTS_KEY = 'mutqin_assistant_accounts';

export interface AssistantAccount {
  id: string;
  fullName: string;
  email: string;
  password?: string;
  initials: string;
  role: 'assistant';
  createdAt: string;
  scopes?: string[];
  serverProvisioningRequired?: boolean;
}

export function getCustomAssistantAccounts(): AssistantAccount[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ASSISTANT_ACCOUNTS_KEY);
    const list: AssistantAccount[] = raw ? JSON.parse(raw) : [];
    return list.map(({ password, ...acc }) => ({ ...acc, serverProvisioningRequired: true }));
  } catch {
    return [];
  }
}

export function saveCustomAssistantAccount(account: AssistantAccount): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const list = getCustomAssistantAccounts();
    const { password, ...metadataOnly } = account;
    const sanitizedAccount: AssistantAccount = {
      ...metadataOnly,
      serverProvisioningRequired: true,
    };
    const idx = list.findIndex((a) => a.email.toLowerCase() === sanitizedAccount.email.toLowerCase());
    if (idx !== -1) {
      list[idx] = sanitizedAccount;
    } else {
      list.push(sanitizedAccount);
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

  /**
   * User signal starts strictly NULL.
   * Authorization roles are NEVER trusted from localStorage.
   */
  readonly user = signal<AuthUser | null>(null);

  /**
   * Explicit error state set when privilege validation or profile query fails.
   * Fails closed to prevent unauthorized retention of administrative roles.
   */
  readonly privilegeValidationError = signal<string | null>(null);

  readonly isStaff = computed(() => {
    const role = this.user()?.role;
    return role === 'admin' || role === 'assistant';
  });

  private inFlightAuthPromise: Promise<AuthUser | null> | null = null;
  private sessionEpoch = 0;
  private bootCompleted = false;

  constructor() {
    this.inFlightAuthPromise = this.initUser();
  }

  /**
   * Returns the currently authenticated and validated user profile.
   * Strictly fails closed to null if no verified session exists.
   */
  getValidatedRoleProfile(): AuthUser | null {
    return this.user();
  }

  /**
   * Awaits authenticated session initialization with a bounded timeout (sensible 15s max).
   * Awaits any in-flight auth/profile work, then returns the CURRENT validated user signal.
   * Never returns a stale boot promise if the user has subsequently logged in or updated.
   */
  async awaitInitialized(timeoutMs = 15000): Promise<AuthUser | null> {
    if (!this.inFlightAuthPromise && !this.bootCompleted) {
      this.inFlightAuthPromise = this.initUser();
    }

    if (this.inFlightAuthPromise) {
      const timer = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
      await Promise.race([
        this.inFlightAuthPromise.catch(() => null),
        timer,
      ]);
    }

    return this.user();
  }

  /**
   * Revalidates current backend role from database before staff/admin navigation.
   * Recognizes active user revocation even if local session or memory state was privileged.
   * Bounded by timeout to prevent hanging navigation (max 15s).
   */
  async revalidateRoleProfile(timeoutMs = 15000): Promise<AuthUser | null> {
    await this.awaitInitialized(Math.min(timeoutMs, 2500));

    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (error || !data?.user) {
        this.clearLocalSession();
        return null;
      }

      const currentEpoch = ++this.sessionEpoch;
      const revalidateTask = this.resolveUserProfile(data.user, currentEpoch, 'REVALIDATE');
      let timerHandle: any;
      const timer = new Promise<AuthUser | null>((resolve) => {
        timerHandle = setTimeout(() => {
          this.sessionEpoch++;
          const cur = this.user();
          if (cur && (cur.role === 'admin' || cur.role === 'assistant')) {
            const safeStudent = { ...cur, role: 'student' as UserRole };
            this.user.set(safeStudent);
            this.saveStoredUser(safeStudent);
            resolve(safeStudent);
          } else {
            resolve(cur);
          }
        }, timeoutMs);
      });

      const res = await Promise.race([
        revalidateTask.catch(() => {
          const cur = this.user();
          if (cur && (cur.role === 'admin' || cur.role === 'assistant')) {
            const safeStudent = { ...cur, role: 'student' as UserRole };
            this.user.set(safeStudent);
            return safeStudent;
          }
          return cur;
        }),
        timer,
      ]);
      clearTimeout(timerHandle);
      return res;
    } catch {
      this.clearLocalSession();
      return null;
    }
  }

  private clearLocalSession(): void {
    this.recoveryAuthorized.set(false);
    this.recoveryUserId = null;
    this.user.set(null);
    this.saveStoredUser(null);
    this.privilegeValidationError.set(null);
    this.inFlightAuthPromise = null;
  }

  private saveStoredUser(u: AuthUser | null): void {
    if (typeof localStorage === 'undefined') return;
    try {
      if (u) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }

  private async initUser(): Promise<AuthUser | null> {
    const currentEpoch = ++this.sessionEpoch;
    try {
      const { data, error } = await this.supabase.auth.getUser();
      if (this.sessionEpoch !== currentEpoch) {
        return this.user();
      }
      if (!error && data?.user) {
        const authUser = await this.resolveUserProfile(data.user, currentEpoch, 'INITIAL_BOOT');
        return authUser;
      } else {
        this.clearLocalSession();
        return null;
      }
    } catch {
      if (this.sessionEpoch === currentEpoch) {
        this.clearLocalSession();
      }
      return null;
    } finally {
      this.bootCompleted = true;
      this.inFlightAuthPromise = null;
      this.listenAuthStateChanges();
    }
  }

  readonly recoveryAuthorized = signal(false);
  private recoveryUserId: string | null = null;
  private authListenerSetup = false;
  private listenAuthStateChanges(): void {
    if (this.authListenerSetup) return;
    this.authListenerSetup = true;

    this.supabase.auth.onAuthStateChange((event, session) => {
      const currentEpoch = ++this.sessionEpoch;
      if (event === 'PASSWORD_RECOVERY' && session?.user?.id) { this.recoveryUserId = session.user.id; this.recoveryAuthorized.set(true); }
      if (event === 'SIGNED_OUT' || !session || !session.user) {
        this.clearLocalSession();
        return;
      }

      // Clear privileged user immediately while deferred profile validation is pending
      // Fails closed so that unvalidated/revoked sessions cannot exploit callback delays
      const cur = this.user();
      if (cur && (cur.role === 'admin' || cur.role === 'assistant')) {
        this.user.set(null);
      }

      // SEC-AUTH-CALLBACK-DEADLOCK-RISK fix:
      // Defer profile resolution outside GoTrue synchronous callback frame
      // to avoid holding GoTrue internal auth state locks during PostgREST network calls.
      const deferredTask = new Promise<AuthUser | null>((resolve) => {
        setTimeout(async () => {
          try {
            if (this.sessionEpoch !== currentEpoch) {
              resolve(this.user());
              return;
            }
            const authUser = await this.resolveUserProfile(session.user, currentEpoch, event);
            resolve(authUser);
          } catch {
            resolve(this.user());
          } finally {
            if (this.inFlightAuthPromise === deferredTask) {
              this.inFlightAuthPromise = null;
            }
          }
        }, 0);
      });

      this.inFlightAuthPromise = deferredTask;
    });
  }

  private async resolveUserProfile(supabaseUser: any, epoch: number, event?: string): Promise<AuthUser> {
    let realName = supabaseUser.user_metadata?.['full_name'];
    let stage = supabaseUser.user_metadata?.['stage'] as AcademicStage;
    let role: UserRole = 'student'; // Strict fail-closed default

    const currentUser = this.user();
    const isSameUser = currentUser?.id === supabaseUser.id;
    const existingRole = isSameUser ? currentUser?.role : undefined;

    try {
      const { data: prof, error: profErr } = await this.supabase
        .from('profiles')
        .select('role, full_name_en, full_name_ar, stage_en')
        .eq('id', supabaseUser.id)
        .maybeSingle();

      if (!profErr && prof) {
        this.privilegeValidationError.set(null);
        if (prof.full_name_en || prof.full_name_ar) {
          realName = prof.full_name_en || prof.full_name_ar;
        }
        if (prof.stage_en) {
          stage = prof.stage_en as AcademicStage;
        }
        if (prof.role === 'admin' || prof.role === 'assistant') {
          role = prof.role;
        } else {
          role = 'student';
        }
      } else if (profErr) {
        // FAIL-CLOSED SECURITY: If privilege validation fails with an error,
        // strictly fail closed to 'student'. Never preserve unauthorized admin/assistant roles.
        const errMsg = profErr.message || 'Privilege validation failed';
        console.error('[AuthService] Profile query failed; failing closed to student role:', errMsg);
        this.privilegeValidationError.set(errMsg);
        role = 'student';
      } else {
        // No profile found in database
        this.privilegeValidationError.set('Profile not found; defaulting to student role');
        role = 'student';
      }
    } catch (err: any) {
      // FAIL-CLOSED SECURITY: If privilege validation throws an error,
      // strictly fail closed to 'student'. Never preserve unauthorized admin/assistant roles.
      const errMsg = err?.message || 'Privilege validation query threw exception';
      console.error('[AuthService] Profile query threw error; failing closed to student role:', errMsg);
      this.privilegeValidationError.set(errMsg);
      role = 'student';
    }

    const finalName = realName || supabaseUser.email?.split('@')[0] || 'Student';
    const updated: AuthUser = {
      id: supabaseUser.id,
      fullName: finalName,
      email: supabaseUser.email || '',
      stage: stage || 'sec3',
      initials: extractInitials(finalName),
      role,
    };

    if (this.sessionEpoch === epoch) {
      this.user.set(updated);
      this.saveStoredUser(updated);

      if (updated.role !== 'admin' && updated.role !== 'assistant') {
        this.recordStudentActivity(updated, 'login');
      }
    }

    return updated;
  }

  /** Record student login/signup in local database with strict input sanitization */
  recordStudentActivity(user: AuthUser, type: 'login' | 'signup'): void {
    if (typeof localStorage === 'undefined' || !user || user.role === 'admin' || user.role === 'assistant') return;
    try {
      const nowIso = new Date().toISOString();
      const todayDate = nowIso.split('T')[0];

      const cleanName = typeof user.fullName === 'string' ? user.fullName.replace(/[<>"'&]/g, '').trim().slice(0, 100) : 'Student';
      const cleanEmail = typeof user.email === 'string' ? user.email.trim().slice(0, 100) : '';
      const cleanStage = (user.stage === 'sec1' || user.stage === 'sec2' || user.stage === 'sec3') ? user.stage : 'sec3';
      const cleanId = typeof user.id === 'string' ? user.id.slice(0, 64) : 'u_' + Date.now();
      const cleanInitials = typeof user.initials === 'string' ? user.initials.replace(/[^A-Za-z0-9]/g, '').slice(0, 4) : 'ST';

      // 1. Update/Add to Registered Students Database
      const rawStudents = localStorage.getItem(REGISTERED_STUDENTS_KEY);
      let list: any[] = rawStudents ? JSON.parse(rawStudents) : [];
      if (!Array.isArray(list)) list = [];

      const existingIdx = list.findIndex(
        (s) => (cleanId && s.id === cleanId) || (cleanEmail && s.email?.toLowerCase() === cleanEmail.toLowerCase())
      );

      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          name: cleanName || list[existingIdx].name,
          stage: cleanStage || list[existingIdx].stage || 'sec3',
          status: 'active',
          lastLoginAt: nowIso,
        };
      } else {
        const newStudent = {
          id: cleanId,
          name: cleanName || cleanEmail.split('@')[0],
          email: cleanEmail,
          stage: cleanStage,
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
        id: cleanId,
        who: cleanInitials,
        name: cleanName || cleanEmail,
        email: cleanEmail,
        stage: cleanStage,
        type,
        time: nowIso,
      });
      if (logins.length > 30) logins = logins.slice(0, 30);
      localStorage.setItem(STUDENT_LOGINS_KEY, JSON.stringify(logins));

      // Broadcast storage event for reactive admin views
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new Event('storage'));
      }
    } catch (e) {
      console.warn('Failed to record student activity', e);
    }
  }

  login(req: LoginRequest): Observable<AuthUser> {
    const cleanEmail = req.email.trim();
    const currentEpoch = ++this.sessionEpoch;

    const loginTask = (async () => {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: req.password,
      });

      if (error || !data?.user || !data?.session || !data.session.user || (data.session.user.id && data.session.user.id !== data.user.id)) {
        throw error || new Error('Invalid login credentials or unconfirmed session');
      }

      return await this.resolveUserProfile(data.user, currentEpoch, 'SIGNED_IN');
    })();

    this.inFlightAuthPromise = loginTask.catch(() => null);
    return from(loginTask).pipe(
      timeout({ each: 15000, with: () => throwError(() => new Error('Login request timed out')) })
    );
  }

  signup(req: SignupRequest): Observable<AuthUser> {
    const chosenName = req.fullName.trim();
    const initials = extractInitials(chosenName);
    const cleanEmail = req.email.trim();
    const currentEpoch = ++this.sessionEpoch;

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
      timeout({ each: 15000, with: () => throwError(() => new Error('Signup request timed out')) }),
      switchMap(async ({ data, error }) => {
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

        // Fail-closed session check:
        // Requires verified session object matching auth user id. Explicitly rejects null/undefined or mismatched session.
        const sessionActive = !!(data?.session && data.session.user && data.session.user.id === data.user.id);

        // Upsert auth profile ONLY after confirmed active session
        if (sessionActive && data.user.id) {
          try {
            await this.supabase.from('profiles').upsert({
              id: data.user.id,
              full_name_en: chosenName,
              full_name_ar: chosenName,
              initials: initials,
              email: cleanEmail,
              stage_en: req.stage,
              stage_ar: req.stage,
              role: 'student',
              phone: '',
              grade_level_en: req.stage,
              grade_level_ar: req.stage,
              governorate_en: 'Cairo',
              governorate_ar: 'القاهرة',
              city_en: 'Cairo',
              city_ar: 'القاهرة',
              goal_en: 'General Fluency & Exam Excellence',
              goal_ar: 'الطلاقة العامة والتفوق في الامتحانات',
            });
          } catch (upsertErr) {
            console.warn('[AuthService] Profile upsert deferred/failed:', upsertErr);
          }
        }

        if (sessionActive && this.sessionEpoch === currentEpoch) {
          this.user.set(authUser);
          this.saveStoredUser(authUser);
          this.recordStudentActivity(authUser, 'signup');
        } else if (!sessionActive) {
          if (this.sessionEpoch === currentEpoch) {
            this.clearLocalSession();
          }
        }

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

  /** Provider-acknowledged recovery: email alone never authorizes a password change. */
  requestPasswordReset(email: string, newPassword?: string): Observable<{ success: boolean; message: string; accountFound: boolean; updated?: boolean }> {
    if (newPassword) return throwError(() => new Error('A verified recovery session is required. Use the recovery email link.'));
    return from((async () => {
      const { error } = await this.supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/login` : undefined,
      });
      if (error) throw error;
      return { success: true, accountFound: false, updated: false, message: 'If eligible, recovery instructions will be sent.' };
    })());
  }

  updateRecoveredPassword(password: string): Observable<void> {
    return from((async () => {
      if (!this.recoveryAuthorized() || !this.recoveryUserId) throw new Error('No password-recovery session');
      if (password.length < 12) throw new Error('Use at least 12 characters');
      const verified = await this.supabase.auth.getUser();
      if (verified.error || verified.data?.user?.id !== this.recoveryUserId) throw new Error('Recovery session could not be verified');
      const result = await this.supabase.auth.updateUser({ password });
      if (result.error) throw result.error;
      this.recoveryAuthorized.set(false); this.recoveryUserId = null;
    })());
  }

  async logout(): Promise<void> {
    this.sessionEpoch++;
    this.clearLocalSession();
    try {
      await this.supabase.auth.signOut();
    } catch {}
  }
}
