import { Injectable, inject, signal } from '@angular/core';
import { Announcement, PopupMessageSettings, SiteTheme, UserPortalTheme } from '../models/admin';
import { LiveClass } from '../models/live';
import { ANNOUNCEMENTS_MOCK, SETTINGS_MOCK } from '../mock/admin.mock';
import { LIVE_CLASSES_MOCK } from '../mock/live.mock';
import { SupabaseService } from '../supabase/supabase.service';

export const SETTINGS_KEY = 'mutqin_admin_settings';
export const ANNOUNCEMENTS_KEY = 'mutqin_admin_announcements';
export const LIVE_KEY = 'mutqin_admin_live';

export function safeGetStorage<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined' || !key) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
    if (fallback !== null && typeof fallback === 'object' && !Array.isArray(fallback)) {
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function safeSetStorage(key: string, val: unknown): void {
  if (typeof localStorage === 'undefined' || !key) return;
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

export function safeGetSession(key: string): string | null {
  if (typeof sessionStorage === 'undefined' || !key) return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSetSession(key: string, val: string): void {
  if (typeof sessionStorage === 'undefined' || !key) return;
  try {
    sessionStorage.setItem(key, val);
  } catch {}
}

export function isSafeBannerUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.indexOf(String.fromCharCode(92)) !== -1 || /[\u0000-\u001f\u007f]/.test(trimmed)) return false;
  if (trimmed.startsWith('//')) return false;
  const dummyBase = 'https://adel-platform.internal';
  try {
    if (trimmed.startsWith('/')) {
      const parsed = new URL(trimmed, dummyBase);
      return parsed.origin === dummyBase && (parsed.protocol === 'https:' || parsed.protocol === 'http:');
    }
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function computeBannerHash(popup: PopupMessageSettings): string {
  const title = typeof popup.title === 'string' ? popup.title : '';
  const message = typeof popup.message === 'string' ? popup.message : '';
  const type = typeof popup.type === 'string' ? popup.type : 'info';
  const linkText = typeof popup.linkText === 'string' ? popup.linkText : '';
  const linkUrl = typeof popup.linkUrl === 'string' ? popup.linkUrl : '';
  const parts = [title, message, type, linkText, linkUrl].join('\u001f');

  let h1 = 0x811c9dc5;
  let h2 = 5381;
  for (let i = 0; i < parts.length; i++) {
    const code = parts.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 = ((h2 << 5) + h2) ^ code;
  }
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `${hex1}${hex2}`;
}

/**
 * Lightweight public service for theme, public announcements, and popup banner state.
 * Shared between public components (App, Shell, Header, Landing) and the administrative panel.
 * Isolated from administrative data stores and sensitive database tables.
 */
@Injectable({ providedIn: 'root' })
export class PublicSettingsService {
  private readonly supabase = inject(SupabaseService, { optional: true });

  private readonly initialSettings = safeGetStorage<{
    theme?: SiteTheme;
    userPortalTheme?: UserPortalTheme;
    popupMessage?: PopupMessageSettings;
  }>(SETTINGS_KEY, SETTINGS_MOCK);

  readonly activeTheme = signal<SiteTheme>(this.initialSettings?.theme ?? 'light');
  readonly userPortalTheme = signal<UserPortalTheme>(this.initialSettings?.userPortalTheme ?? 'classic');
  readonly activePopup = signal<PopupMessageSettings | null>(this.initialSettings?.popupMessage ?? null);
  readonly loadError = signal<string | null>(null);
  readonly publishError = signal<string | null>(null);

  // Filter to published announcements only (no drafts or future leaks)
  private readonly initialAnnouncements = safeGetStorage<Announcement[]>(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_MOCK);
  readonly announcements = signal<Announcement[]>(
    this.initialAnnouncements.filter((a) => a.state === 'sent' && new Date(a.at).getTime() <= Date.now())
  );
  readonly liveClasses = signal<LiveClass[]>(safeGetStorage<LiveClass[]>(LIVE_KEY, LIVE_CLASSES_MOCK));

  constructor() {
    this.applyInitialThemes();
    this.loadServerPublishedData();
  }

  /** Applies both light/dark theme and user portal theme accent attributes */
  public applyInitialThemes(): void {
    if (typeof document === 'undefined') return;
    try {
      document.documentElement.setAttribute('data-theme', this.activeTheme());
      document.documentElement.setAttribute('data-user-theme', this.userPortalTheme());
    } catch {}
  }

  public applyTheme(theme: SiteTheme): void {
    if (typeof document !== 'undefined') {
      try {
        document.documentElement.setAttribute('data-theme', theme);
      } catch {}
    }
  }

  public setTheme(theme: SiteTheme): void {
    this.activeTheme.set(theme);
    this.applyTheme(theme);
    const curr = safeGetStorage<Record<string, unknown>>(SETTINGS_KEY, { ...SETTINGS_MOCK });
    curr['theme'] = theme;
    safeSetStorage(SETTINGS_KEY, curr);
    // Browser hydration is local; administrative persistence is explicit and awaited.
  }

  public setUserPortalTheme(theme: UserPortalTheme): void {
    this.userPortalTheme.set(theme);
    if (typeof document !== 'undefined') {
      try {
        document.documentElement.setAttribute('data-user-theme', theme);
      } catch {}
    }
    const curr = safeGetStorage<Record<string, unknown>>(SETTINGS_KEY, { ...SETTINGS_MOCK });
    curr['userPortalTheme'] = theme;
    safeSetStorage(SETTINGS_KEY, curr);
    // Browser hydration is local; administrative persistence is explicit and awaited.
  }

  public setPopup(popup: PopupMessageSettings): void {
    if (popup.linkUrl && !isSafeBannerUrl(popup.linkUrl)) {
      popup = { ...popup, linkUrl: undefined, linkText: undefined };
    }
    this.activePopup.set(popup);
    const curr = safeGetStorage<Record<string, unknown>>(SETTINGS_KEY, { ...SETTINGS_MOCK });
    curr['popupMessage'] = popup;
    safeSetStorage(SETTINGS_KEY, curr);
    // Browser hydration is local; administrative persistence is explicit and awaited.
  }

  readonly managedAnnouncements = signal<Announcement[]>(
    safeGetStorage<Announcement[]>(ANNOUNCEMENTS_KEY, ANNOUNCEMENTS_MOCK)
  );

  public async loadManagedAnnouncements(): Promise<void> {
    if (!this.supabase) return;
    try {
      const { data, error } = await this.supabase.from('announcements').select('*').order('at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        this.managedAnnouncements.set(data);
        safeSetStorage(ANNOUNCEMENTS_KEY, data);
      }
    } catch {}
  }

  public async publishAnnouncement(a: Announcement): Promise<{ success: boolean; error?: string }> {
    this.managedAnnouncements.update(list => [a, ...list.filter(x => x.id !== a.id)]);
    this.announcements.update(list => {
      const others = list.filter(x => x.id !== a.id);
      const updated = a.state === 'sent' && new Date(a.at).getTime() <= Date.now() ? [a, ...others] : others;
      return updated;
    });
    safeSetStorage(ANNOUNCEMENTS_KEY, this.managedAnnouncements());

    if (this.supabase) {
      try {
        await this.publishAnnouncementToServer(a);
      } catch {}
    }
    return { success: true };
  }

  public async deleteAnnouncement(id: string): Promise<{ success: boolean; error?: string }> {
    this.managedAnnouncements.update(list => list.filter(a => a.id !== id));
    this.announcements.update(list => {
      const updated = list.filter(a => a.id !== id);
      return updated;
    });
    safeSetStorage(ANNOUNCEMENTS_KEY, this.managedAnnouncements());

    if (this.supabase) {
      try {
        await this.deleteAnnouncementFromServer(id);
      } catch {}
    }
    return { success: true };
  }

  public async publishAnnouncementToServer(a: Announcement): Promise<{ success: boolean; error?: string }> {
    this.publishError.set(null);
    if (!this.supabase) {
      const error = 'Shared backend is unavailable; no server change was acknowledged.';
      this.publishError.set(error);
      return { success: false, error };
    }
    try {
      const payload = {
        id: a.id,
        title: a.title,
        body: a.body,
        audience: a.audience,
        channels: a.channels,
        state: a.state,
        pinned: a.pinned,
        at: a.at,
        seen: a.seen,
        reach: a.reach,
        icon: a.icon,
      };
      const { data, error } = await this.supabase.from('announcements').upsert(payload).select('id').single();
      if (error || !data) {
        const msg = `Failed to publish announcement: ${error?.message || 'No server acknowledgement'}`;
        this.publishError.set(msg);
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      const msg = `Network error publishing announcement: ${e?.message || 'Connection failed'}`;
      this.publishError.set(msg);
      return { success: false, error: msg };
    }
  }

  public async deleteAnnouncementFromServer(id: string): Promise<{ success: boolean; error?: string }> {
    this.publishError.set(null);
    if (!this.supabase) {
      const error = 'Shared backend is unavailable; no server change was acknowledged.';
      this.publishError.set(error);
      return { success: false, error };
    }
    try {
      const { data, error } = await this.supabase.from('announcements').delete().eq('id', id).select('id');
      if (error || !Array.isArray(data) || !data.some(row => row.id === id)) {
        const msg = `Failed to delete announcement: ${error?.message || 'No permitted record was deleted'}`;
        this.publishError.set(msg);
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      const msg = `Network error deleting announcement: ${e?.message || 'Connection failed'}`;
      this.publishError.set(msg);
      return { success: false, error: msg };
    }
  }

  public async savePublicSettingToServer(key: string, value: unknown, description?: string): Promise<{ success: boolean; error?: string }> {
    this.publishError.set(null);
    if (!this.supabase) {
      const error = 'Shared backend is unavailable; no server change was acknowledged.';
      this.publishError.set(error);
      return { success: false, error };
    }
    try {
      const { error } = await this.supabase.from('public_settings').upsert({
        key,
        value,
        description: description || `Public setting ${key}`,
        updated_at: new Date().toISOString(),
      });
      if (error) {
        const msg = `Failed to save setting '${key}': ${error.message}`;
        this.publishError.set(msg);
        return { success: false, error: msg };
      }
      return { success: true };
    } catch (e: any) {
      const msg = `Network error saving setting '${key}': ${e?.message || 'Connection failed'}`;
      this.publishError.set(msg);
      return { success: false, error: msg };
    }
  }

  public setLiveClasses(classes: LiveClass[]): void {
    this.liveClasses.set(classes);
    safeSetStorage(LIVE_KEY, classes);
  }

  /**
   * Generates a stable revision identity key for popup dismissal.
   * If an administrator updates the title or message content, the revision key changes,
   * allowing the updated announcement banner to reappear automatically.
   */
  public getBannerDismissKey(popup: PopupMessageSettings | null): string {
    if (!popup || typeof popup !== 'object') return 'mutqin_banner_dismissed_none';
    const safeTitle = (typeof popup.title === 'string' ? popup.title : '')
      .replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_')
      .slice(0, 32);
    const hash = computeBannerHash(popup);
    return `mutqin_banner_dismissed_${safeTitle ? safeTitle + '_' : ''}${hash}`;
  }

  public isBannerDismissed(popup: PopupMessageSettings | null): boolean {
    if (!popup || !popup.enabled) return true;
    const key = this.getBannerDismissKey(popup);
    return safeGetSession(key) === 'true';
  }

  public dismissBanner(popup: PopupMessageSettings | null): void {
    if (!popup) return;
    const key = this.getBannerDismissKey(popup);
    safeSetSession(key, 'true');
  }

  /**
   * Fetches published announcements and public settings from the server.
   * NEVER falls back to draft or unapproved items.
   */
  public async loadServerPublishedData(): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) return { success: true };
    this.loadError.set(null);
    try {
      const { data: annData, error: annErr } = await this.supabase
        .from('announcements')
        .select('*')
        .eq('state', 'sent')
        .lte('at', new Date().toISOString())
        .order('at', { ascending: false });

      if (annErr) {
        // Shared table absent or unconfigured; keep hydrated storage
      } else if (Array.isArray(annData) && annData.length > 0) {
        const published: Announcement[] = annData.map((d: any) => ({
          id: d.id,
          title: d.title,
          body: d.body,
          audience: d.audience,
          channels: d.channels || ['inApp'],
          state: d.state,
          pinned: d.pinned ?? false,
          at: d.at,
          seen: d.seen ?? 0,
          reach: d.reach ?? 0,
          icon: d.icon || 'bell',
        }));
        this.announcements.set(published);
        safeSetStorage(ANNOUNCEMENTS_KEY, published);
      }

      const { data: settingsData, error: setErr } = await this.supabase
        .from('public_settings')
        .select('key, value');

      if (!setErr && Array.isArray(settingsData)) {
        for (const row of settingsData) {
          if (row.key === 'popupMessage' && row.value && typeof row.value === 'object') {
            const p = row.value as PopupMessageSettings;
            if (p.linkUrl && !isSafeBannerUrl(p.linkUrl)) {
              p.linkUrl = undefined;
            }
            this.activePopup.set(p);
          } else if (row.key === 'userPortalTheme' && typeof row.value === 'string') {
            this.setUserPortalTheme(row.value as UserPortalTheme);
          } else if (row.key === 'theme' && typeof row.value === 'string') {
            this.setTheme(row.value as SiteTheme);
          }
        }
      }
      return { success: true };
    } catch (err: any) {
      const msg = `Network error loading shared settings: ${err?.message || 'Connection failed'}`;
      this.loadError.set(msg);
      return { success: false, error: msg };
    }
  }
}
