import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ContentService } from '../../core/data/content.service';
import { PublicSettingsService } from '../../core/services/public-settings.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { MediaComponent } from '../../shared/ui/media-placeholder.component';
import { SectionHeaderComponent } from '../../shared/ui/section-header.component';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink, DecimalPipe, DatePipe, LucideAngularModule, TranslatePipe, LocalizePipe,
    AvatarComponent, CtaBannerComponent, MediaComponent, SectionHeaderComponent,
  ],
  templateUrl: './landing.page.html',
})
export class LandingPage {
  private readonly content = inject(ContentService);
  protected readonly publicSettings = inject(PublicSettingsService);
  protected readonly i18n = inject(LanguageService);

  protected readonly announcements = this.publicSettings.announcements;
  protected readonly latestAnnouncement = computed(() => {
    const now = Date.now();
    const list = this.announcements().filter((a) => {
      if (a.state !== 'sent') return false;
      const t = new Date(a.at).getTime();
      return Number.isFinite(t) && t <= now;
    });
    if (!list || list.length === 0) return null;
    return list.slice().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())[0] ?? null;
  });

  protected readonly stats = toSignal(this.content.getPlatformStats());
  protected readonly instructor = toSignal(this.content.getFeaturedInstructor());
  protected readonly testimonials = toSignal(this.content.getTestimonials(), { initialValue: [] });
  protected readonly introVideo = toSignal(this.content.getIntroductoryVideo());

  protected readonly videoPlayer = viewChild<ElementRef<HTMLVideoElement>>('videoPlayer');
  protected readonly isPlaying = signal(false);
  protected readonly isMuted = signal(false);
  protected readonly isAudioPlaying = signal(false);

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly proofAvatars = ['Omar M', 'Fatima Z', 'Yousef H'];

  protected readonly features = [
    { key: 'lectures', icon: 'video', footerIcon: 'captions' },
    { key: 'quizzes', icon: 'list-checks', footerIcon: 'zap' },
    { key: 'progress', icon: 'trending-up', footerIcon: 'award' },
    { key: 'pace', icon: 'infinity', footerIcon: 'download' },
  ];

  protected toggleVideoPlay(): void {
    const el = this.videoPlayer()?.nativeElement;
    if (!el) return;

    if (el.paused) {
      el.play().then(() => {
        this.isPlaying.set(true);
      }).catch((err) => {
        console.warn('Playback error:', err);
      });
    } else {
      el.pause();
      this.isPlaying.set(false);
    }
  }

  protected toggleMute(): void {
    const el = this.videoPlayer()?.nativeElement;
    if (!el) return;
    el.muted = !el.muted;
    this.isMuted.set(el.muted);
  }

  protected onVideoEnded(): void {
    this.isPlaying.set(false);
  }

  protected watchIntroVideo(): void {
    const el = this.videoPlayer()?.nativeElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.play().then(() => {
        this.isPlaying.set(true);
      }).catch(() => {
        // user interaction might require unmute or direct click
      });
    }
  }

  protected toggleSampleAudio(): void {
    this.isAudioPlaying.update((v) => !v);
  }
}
