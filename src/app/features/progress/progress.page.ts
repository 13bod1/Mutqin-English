import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { ProgressService } from '../../core/data/progress.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { BadgeIcon, SkillKey, SkillLevel } from '../../core/models/progress';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { ProgressRingComponent } from '../../shared/ui/progress-ring.component';
import { WeeklyChartComponent } from './weekly-chart.component';

@Component({
  selector: 'app-progress',
  imports: [
    RouterLink, DatePipe, DecimalPipe, LucideAngularModule, TranslatePipe, LocalizePipe,
    AvatarComponent, CtaBannerComponent, ProgressRingComponent, WeeklyChartComponent,
  ],
  templateUrl: './progress.page.html',
})
export class ProgressPage {
  private readonly progress = inject(ProgressService);
  protected readonly i18n = inject(LanguageService);
  protected readonly admin = inject(AdminService);

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
}
