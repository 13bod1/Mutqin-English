import { Injectable, signal, Optional } from '@angular/core';
import { PushSubscriptionRecord } from '../models/sprint3';
import { SupabaseService } from '../supabase/supabase.service';
import { environment } from '../../../environments/environment';

export interface NotificationTemplate {
  title: { en: string; ar: string };
  body: { en: string; ar: string };
  targetUrl: string;
}

export const NOTIFICATION_TEMPLATES: Record<string, (data: any) => NotificationTemplate> = {
  announcement: (data) => ({
    title: {
      en: `📢 New Announcement: ${data.title_en || 'Important Update'}`,
      ar: `📢 إعلان جديد: ${data.title_ar || 'تنبيه هام'}`,
    },
    body: {
      en: data.preview_en || 'Tap to read the latest update from Mr. Adel Mostafa.',
      ar: data.preview_ar || 'اضغط لقراءة آخر إعلان وتوجيهات الأستاذ عادل مصطفى.',
    },
    targetUrl: '/announcements',
  }),
  liveStarting: (data) => ({
    title: {
      en: `🔴 Live Class Starting: ${data.title_en || 'Thanawya Revision'}`,
      ar: `🔴 حصة البث المباشر تبدأ الآن: ${data.title_ar || 'مراجعة الثانوية العامة'}`,
    },
    body: {
      en: 'The studio is now live! Join Mr. Adel Mostafa and ask your questions.',
      ar: 'البث بدأ الآن! انضم إلى أ. عادل مصطفى وشارك بأسئلتك في الحصة المباشرة.',
    },
    targetUrl: `/live/${data.id || 'live_grammar_1'}`,
  }),
  quizPublished: (data) => ({
    title: {
      en: `📝 New Diagnostic Quiz: ${data.title_en || 'Weekly Practice'}`,
      ar: `📝 اختبار تفاعلي جديد: ${data.title_ar || 'تدريب الأسبوع'}`,
    },
    body: {
      en: 'Test your understanding and earn extra XP points.',
      ar: 'اختبر استيعابك واجمع نقاط الخبرة XP لرفع ترتيبك في الأكاديمية.',
    },
    targetUrl: '/quizzes',
  }),
};

@Injectable({
  providedIn: 'root',
})
export class PwaNotificationService {
  // PWA installation state
  readonly installPromptEvent = signal<any>(null);
  readonly canInstall = signal<boolean>(false);
  readonly isInstalled = signal<boolean>(false);

  // Network offline state
  readonly isOnline = signal<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Push notifications state
  readonly pushPermission = signal<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  readonly pushEnabled = signal<boolean>(false);
  readonly pushError = signal<string | null>(null);
  readonly isSubscribing = signal<boolean>(false);

  // Simulated push subscription registry (for local/dev fallback)
  private subscriptions: PushSubscriptionRecord[] = [];

  constructor(@Optional() private readonly supabase?: SupabaseService) {
    this.initPwaListeners();
    this.initNetworkListeners();
    this.loadPushPreference();
  }

  private initPwaListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('beforeinstallprompt', (e: Event) => {
      // Prevent automatic prompt to respect acceptance criteria
      e.preventDefault();
      this.installPromptEvent.set(e);
      this.canInstall.set(true);
    });

    window.addEventListener('appinstalled', () => {
      this.canInstall.set(false);
      this.isInstalled.set(true);
      this.installPromptEvent.set(null);
    });
  }

  private initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.isOnline.set(true));
    window.addEventListener('offline', () => this.isOnline.set(false));
  }

  private loadPushPreference(): void {
    if (typeof localStorage === 'undefined' || environment.production) return;
    try {
      const stored = localStorage.getItem('mutqin_push_enabled');
      if (stored !== null) {
        this.pushEnabled.set(stored === 'true');
      }
      const rawSubs = localStorage.getItem('mutqin_push_subscriptions');
      if (rawSubs) {
        this.subscriptions = JSON.parse(rawSubs);
      }
    } catch {}
  }

  /**
   * Helper to retrieve public VAPID key from meta tag or environment config.
   * Never hardcodes secret or invented keys.
   */
  private getVapidPublicKey(): string | null {
    if (typeof document !== 'undefined') {
      const meta = document.querySelector('meta[name="vapid-public-key"]');
      const key = meta?.getAttribute('content')?.trim();
      if (key) return key;
    }
    const envKey = (environment as any)?.vapidPublicKey?.trim();
    if (envKey) return envKey;

    return null;
  }

  /**
   * Helper to convert base64 VAPID public key to Uint8Array for PushManager
   */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  /**
   * Helper to extract ArrayBuffer key to base64
   */
  private bufferToBase64(buffer: ArrayBuffer | null): string {
    if (!buffer) return '';
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Prompts the user to install the PWA after explicit button click.
   */
  async promptInstall(): Promise<boolean> {
    const promptEvent = this.installPromptEvent();
    if (!promptEvent) return false;

    promptEvent.prompt();
    const result = await promptEvent.userChoice;
    this.installPromptEvent.set(null);
    this.canInstall.set(false);
    return result.outcome === 'accepted';
  }

  /**
   * Requests push notification permissions.
   * Acceptance Criteria: "the permission is requested ONLY after the student taps a button".
   * Requires actual service worker readiness and valid VAPID public key.
   * Missing configuration fails cleanly without creating fake tokens.
   */
  async requestNotificationPermission(userId?: string): Promise<boolean> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      this.pushError.set('Web Notifications API is not supported in this environment');
      return false;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      this.pushError.set('Push Messaging / Service Worker is not supported in this browser');
      return false;
    }

    if (this.isSubscribing()) return false;
    if (environment.production && !this.supabase) { this.pushError.set('Shared backend unavailable.'); return false; }
    this.isSubscribing.set(true);
    this.pushError.set(null);

    try {
      const permission = await Notification.requestPermission();
      this.pushPermission.set(permission);

      if (permission !== 'granted') {
        this.pushEnabled.set(false);
        this.pushError.set('Notification permission denied by user');
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mutqin_push_enabled', 'false');
        }
        return false;
      }

      // Check VAPID public key
      const vapidKey = this.getVapidPublicKey();
      if (!vapidKey) {
        // Missing configuration fails cleanly without inventing fake keys
        const msg = 'VAPID public key not configured (missing meta tag "vapid-public-key")';
        this.pushError.set(msg);
        this.pushEnabled.set(false);
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('mutqin_push_enabled', 'false');
        }
        return false;
      }

      // Bounded wait for service worker readiness (max 4.5 seconds timeout)
      const swReadyPromise = navigator.serviceWorker.ready;
      const timeoutPromise = new Promise<ServiceWorkerRegistration>((_, reject) =>
        setTimeout(() => reject(new Error('Service worker registration timed out after 4.5s')), 4500)
      );
      const reg = await Promise.race([swReadyPromise, timeoutPromise]);

      if (!reg || !reg.pushManager) {
        this.pushError.set('PushManager is unavailable on the active ServiceWorkerRegistration');
        this.pushEnabled.set(false);
        return false;
      }

      // Convert VAPID key
      const appServerKey = this.urlBase64ToUint8Array(vapidKey);

      // Subscribe to PushManager
      const subscription = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey.buffer as ArrayBuffer,
      });

      const p256dh = this.bufferToBase64(subscription.getKey('p256dh'));
      const auth = this.bufferToBase64(subscription.getKey('auth'));

      if (!subscription.endpoint || !p256dh || !auth) {
        this.pushError.set('Invalid subscription object returned by pushManager');
        this.pushEnabled.set(false);
        return false;
      }

      // Store in Supabase via RPC register_push_subscription
      if (this.supabase) {
        const { data, error } = await this.supabase.client.rpc('register_push_subscription', {
          p_endpoint: subscription.endpoint,
          p_p256dh: p256dh,
          p_auth: auth,
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
        });

        if (error || data?.success !== true) {
          await subscription.unsubscribe();
          this.pushError.set(error?.message || 'Failed to register subscription in database');
          this.pushEnabled.set(false);
          return false;
        }
      }

      // Record in local cache
      const subRecord: PushSubscriptionRecord = {
        id: 'sub_' + Math.random().toString(36).substring(2, 9),
        userId: userId || 'current_user',
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        createdAt: new Date().toISOString(),
      };
      this.subscriptions.push(subRecord);

      this.pushEnabled.set(true);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mutqin_push_enabled', 'true');
        localStorage.setItem('mutqin_push_subscriptions', JSON.stringify(this.subscriptions));
      }

      return true;
    } catch (err: any) {
      this.pushError.set(err?.message || 'Error subscribing to push notifications');
      this.pushEnabled.set(false);
      return false;
    } finally {
      this.isSubscribing.set(false);
    }
  }

  /**
   * Student toggle to turn notifications on or off in profile/settings.
   * Preserves synchronous void signature expected by legacy unit tests.
   * Performs asynchronous unsubscribe and server revocation when turning off.
   */
  setPushEnabled(enabled: boolean, userId: string): void {
    if (environment.production && enabled) { void this.requestNotificationPermission(userId); return; }
    this.pushEnabled.set(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mutqin_push_enabled', enabled ? 'true' : 'false');
    }

    if (!enabled) {
      this.subscriptions = this.subscriptions.filter((s) => s.userId !== userId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mutqin_push_subscriptions', JSON.stringify(this.subscriptions));
      }

      // Trigger actual async browser unsubscription and server revocation
      this.disablePushAsync().catch(() => {});
    }
  }

  /**
   * Asynchronously unsubscribes from browser PushManager and revokes server registration.
   */
  async disablePushAsync(): Promise<boolean> {
    try {
      if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Service worker unavailable')), 4500))]);
        if (reg?.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            const endpoint = sub.endpoint;
            await sub.unsubscribe();

            if (this.supabase && endpoint) {
              const { error } = await this.supabase.client.rpc('revoke_push_subscription', { p_endpoint: endpoint });
              if (error) throw new Error(error.message);
            }
          }
        }
      }
      this.pushEnabled.set(false);
      return true;
    } catch (err: any) {
      this.pushError.set(err?.message || 'Failed to revoke push subscription');
      return false;
    }
  }

  /**
   * Dispatches push notification to subscribed students.
   * In-browser fallback: shows active Notification if granted.
   */
  dispatchPushNotification(templateKey: string, payload: any, lang: 'en' | 'ar' = 'ar'): void {
    if (!this.pushEnabled()) return;

    const builder = NOTIFICATION_TEMPLATES[templateKey];
    if (!builder) return;

    const template = builder(payload);
    const title = template.title[lang];
    const body = template.body[lang];

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icons/icon-192.png',
          data: { url: template.targetUrl },
        });
        notif.onclick = () => {
          window.focus();
          window.location.href = template.targetUrl;
        };
      } catch {
        // Fallback or service worker push
      }
    }
  }
}
