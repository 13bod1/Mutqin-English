import { DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { ContentService } from '../../core/data/content.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AvatarComponent } from '../../shared/ui/avatar.component';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { MediaComponent } from '../../shared/ui/media-placeholder.component';
import { SectionHeaderComponent } from '../../shared/ui/section-header.component';

@Component({
  selector: 'app-landing',
  imports: [
    RouterLink, DecimalPipe, LucideAngularModule, TranslatePipe, LocalizePipe,
    AvatarComponent, CtaBannerComponent, MediaComponent, SectionHeaderComponent,
  ],
  templateUrl: './landing.page.html',
})
export class LandingPage {
  private readonly content = inject(ContentService);

  protected readonly stats = toSignal(this.content.getPlatformStats());
  protected readonly instructor = toSignal(this.content.getFeaturedInstructor());
  protected readonly testimonials = toSignal(this.content.getTestimonials(), { initialValue: [] });

  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly proofAvatars = ['Omar M', 'Fatima Z', 'Yousef H'];

  protected readonly features = [
    { key: 'lectures', icon: 'video', footerIcon: 'captions' },
    { key: 'quizzes', icon: 'list-checks', footerIcon: 'zap' },
    { key: 'progress', icon: 'trending-up', footerIcon: 'award' },
    { key: 'pace', icon: 'infinity', footerIcon: 'download' },
  ];
}
