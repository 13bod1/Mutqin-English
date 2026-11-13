import { Injectable, signal } from '@angular/core';
import { PushSubscriptionRecord } from '../models/sprint3';

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

  // Simulated push subscription registry
  private subscriptions: PushSubscriptionRecord[] = [];

  constructor() {
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
    if (typeof localStorage === 'undefined') return;
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
   */
  async requestNotificationPermission(userId: string): Promise<boolean> {
    if (typeof Notification === 'undefined') return false;

    try {
      const permission = await Notification.requestPermission();
      this.pushPermission.set(permission);

      if (permission === 'granted') {
        this.pushEnabled.set(true);
        localStorage.setItem('mutqin_push_enabled', 'true');

        // Create subscription record
        const sub: PushSubscriptionRecord = {
          id: 'sub_' + Math.random().toString(36).substring(2, 9),
          userId,
          endpoint: `https://fcm.googleapis.com/fcm/send/fake_token_${userId}`,
          p256dh: 'BNcRdreAOm9yZ7G8',
          auth: 'tSDG1Wgn2K58vH',
          createdAt: new Date().toISOString(),
        };
        this.subscriptions.push(sub);
        localStorage.setItem('mutqin_push_subscriptions', JSON.stringify(this.subscriptions));
        return true;
      } else {
        this.pushEnabled.set(false);
        localStorage.setItem('mutqin_push_enabled', 'false');
        return false;
      }
    } catch {
      return false;
    }
  }

  /**
   * Student toggle to turn notifications on or off in profile/settings.
   */
  setPushEnabled(enabled: boolean, userId: string): void {
    this.pushEnabled.set(enabled);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('mutqin_push_enabled', enabled ? 'true' : 'false');
    }
    if (!enabled) {
      this.subscriptions = this.subscriptions.filter((s) => s.userId !== userId);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mutqin_push_subscriptions', JSON.stringify(this.subscriptions));
      }
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
