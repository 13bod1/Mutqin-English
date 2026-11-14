import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AuthService } from '../../core/data/auth.service';
import { ProgressService } from '../../core/data/progress.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { GuardianContact } from '../../core/models/sprint3';
import { BadgeIcon, SkillKey, SkillLevel } from '../../core/models/progress';
import { GuardianReportService } from '../../core/services/guardian-report.service';
import { PwaNotificationService } from '../../core/services/pwa-notification.service';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { WeeklyChartComponent } from './weekly-chart.component';

@Component({
  selector: 'app-progress',
  imports: [
    FormsModule,
    RouterLink,
    DatePipe,
    DecimalPipe,
    LucideAngularModule,
    TranslatePipe,
    LocalizePipe,
    AvatarComponent,
    CtaBannerComponent,
    ProgressRingComponent,
    WeeklyChartComponent,
  ],
  templateUrl: './progress.page.html',
})
export class ProgressPage {
  private readonly progress = inject(ProgressService);
  protected readonly i18n = inject(LanguageService);
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly pwa = inject(PwaNotificationService);
  protected readonly guardianService = inject(GuardianReportService);

  protected readonly profile = toSignal(this.progress.getProfile());
  protected readonly summary = toSignal(this.progress.getSummary());
  protected readonly leaderboard = toSignal(this.progress.getLeaderboard(), { initialValue: [] });
  protected readonly achievements = toSignal(this.progress.getAchievements(), { initialValue: [] });

  protected readonly activeAnnouncements = computed(() =>
    this.admin.announcements().filter((a) => a.state === 'sent')
  );
  protected readonly activeLive = computed(() =>
    this.admin.liveClasses().find((s) => s.status === 'live')
  );

  // Guardian contact state
  protected readonly guardianName = signal('Hany Saeed');
  protected readonly guardianPhone = signal('01012345678');
  protected readonly guardianEmail = signal('hany.saeed@gmail.com');
  protected readonly contactSavedMsg = signal(false);

  // Default demo token hash for guardian weekly report
  protected readonly sampleGuardianToken = 'tok_nour_saeed_7d_valid_hash_98a72b1';

  protected readonly skillIcon: Record<SkillKey, string> = {
    grammar: 'spell-check',
    vocabulary: 'book-a',
    speaking: 'mic',
  };
  protected readonly levelClass: Record<SkillLevel, string> = {
    excellent: 'text-success',
    proficient: 'text-primary',
    good: 'text-gold-dark',
    developing: 'text-ink-muted',
  };
  protected readonly badgeIcon: Record<BadgeIcon, string> = {
    trophy: 'trophy',
    flame: 'flame',
    headphones: 'headphones',
    medal: 'medal',
  };

  protected readonly syllabusPercent = computed(() => {
    const s = this.summary()?.syllabus;
    return s ? Math.round((s.completed / s.total) * 100) : 0;
  });

  protected readonly averageMinutes = computed(() => {
    const a = this.summary()?.weeklyActivity ?? [];
    return a.length ? Math.round(a.reduce((t, d) => t + d.minutes, 0) / a.length) : 0;
  });

  protected readonly peakDay = computed(() => {
    const a = this.summary()?.weeklyActivity ?? [];
    return a.reduce((best, d) => (d.minutes > best.minutes ? d : best), a[0] ?? { day: 'sat', minutes: 0 }).day;
  });

  /** The student just above the signed-in user, for the "XP to next rank" nudge. */
  protected readonly rival = computed(() => {
    const list = this.leaderboard();
    const me = list.findIndex((e) => e.isCurrentUser);
    return me > 0 ? { entry: list[me - 1], gap: list[me - 1].xp - list[me].xp } : null;
  });

  protected readonly ctaText = computed(() => {
    const r = this.rival();
    if (!r) return '';
    return this.i18n.t('progress.cta.text', { xp: r.gap, name: this.i18n.pick(r.entry.name), rank: r.entry.rank });
  });

  async requestNotifications(): Promise<void> {
    const user = this.auth.user();
    const uid = user?.id || 'guest_user';
    await this.pwa.requestNotificationPermission(uid);
  }

  saveGuardianContact(): void {
    const user = this.auth.user();
    const uid = user?.id || 'u1';
    const contact: GuardianContact = {
      name: this.guardianName(),
      phone: this.guardianPhone(),
      email: this.guardianEmail(),
    };
    this.guardianService.saveGuardianContact(uid, contact);
    this.contactSavedMsg.set(true);
    setTimeout(() => this.contactSavedMsg.set(false), 3000);
  }

  deleteGuardianContact(): void {
    const user = this.auth.user();
    const uid = user?.id || 'u1';
    this.guardianService.deleteGuardianContact(uid);
    this.guardianName.set('');
    this.guardianPhone.set('');
    this.guardianEmail.set('');
    alert(this.i18n.t('guardian.contactDeleted'));
  }
}
