import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AdminService } from '../../core/data/admin.service';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Announcement } from '../../core/models/admin';

type AnnouncementFilter = 'all' | 'pinned' | 'general' | 'live' | 'exams';

@Component({
  selector: 'app-announcements-page',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, DatePipe],
  template: `
    <div class="min-h-dvh bg-surface-page py-10 md:py-14">
      <div class="container-page space-y-8">
        <!-- Page Header -->
        <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-line/60 pb-6">
          <div>
            <div class="flex items-center gap-2">
              <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-display text-xs font-bold text-primary">
                <lucide-icon name="megaphone" [size]="14" />
                {{ i18n.lang() === 'ar' ? 'التحديثات والتبليغات الرسمية' : 'Official Bulletins & Notices' }}
              </span>
              <span class="rounded-full bg-surface-warm px-2.5 py-0.5 text-xs font-bold text-ink-muted">
                {{ publishedList().length }} {{ i18n.lang() === 'ar' ? 'إعلان' : 'notices' }}
              </span>
            </div>
            <h1 class="h-section mt-2.5 font-bold text-ink">
              {{ i18n.lang() === 'ar' ? 'لوحة الإعلانات والتنبيهات المدرسية' : 'Academy Announcements' }}
            </h1>
            <p class="mt-1 text-sm text-ink-body max-w-2xl">
              {{ i18n.lang() === 'ar'
                ? 'تابع أهم إشعارات المحاضرات الجديدة، مواعيد حصص البث المباشر، وتوجيهات الأستاذ عادل مصطفى وفريق المساعدين أولاً بأول.'
                : 'Stay fully updated with lecture drops, live session timings, revision notes, and direct announcements from Mr. Adel Mostafa and the assistant team.' }}
            </p>
          </div>

          <!-- Quick shortcuts -->
          <div class="flex items-center gap-2.5 shrink-0">
            <a routerLink="/live" class="btn btn-outline btn-sm">
              <lucide-icon name="radio" [size]="14" class="text-red-600" />
              <span>{{ i18n.lang() === 'ar' ? 'جدول المباشر' : 'Live Schedule' }}</span>
            </a>
            <a routerLink="/lectures" class="btn btn-primary btn-sm">
              <lucide-icon name="book-open" [size]="14" />
              <span>{{ i18n.lang() === 'ar' ? 'المحاضرات' : 'Lectures' }}</span>
            </a>
          </div>
        </header>

        <!-- Filter bar -->
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="seg" role="tablist">
            @for (f of filters; track f.id) {
              <button type="button" role="tab" [class.seg-on]="selectedFilter() === f.id" (click)="selectedFilter.set(f.id)">
                <lucide-icon [name]="f.icon" [size]="15" class="inline me-1.5" />
                {{ i18n.lang() === 'ar' ? f.labelAr : f.labelEn }}
                @if (f.id === 'pinned') {
                  <span class="ms-1 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[0.6875rem] font-bold text-amber-700">
                    {{ pinnedCount() }}
                  </span>
                }
              </button>
            }
          </div>

          <span class="text-xs text-ink-muted">
            {{ i18n.lang() === 'ar' ? 'يتم التحديث تلقائياً في الوقت الفعلي' : 'Real-time updates enabled' }}
          </span>
        </div>

        <!-- Announcements Feed -->
        <div class="space-y-4">
          @for (a of filteredList(); track a.id) {
            <article class="card p-5 sm:p-6 transition shadow-xs hover:shadow-card space-y-4"
              [class]="a.pinned ? 'border-primary/40 bg-surface-warm/50 ring-1 ring-primary/20' : 'border-line'">
              <!-- Header -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div class="flex items-start gap-3">
                  <span class="icon-tile h-10 w-10 shrink-0 mt-0.5"
                    [class]="a.pinned ? 'bg-primary text-white' : 'bg-surface-tint text-primary'">
                    <lucide-icon [name]="a.icon || 'megaphone'" [size]="20" />
                  </span>

                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h2 class="font-display text-base font-bold text-ink" dir="auto">{{ a.title }}</h2>
                      @if (a.pinned) {
                        <span class="tag tone-gold">
                          <lucide-icon name="pin" [size]="12" class="me-1" />
                          {{ i18n.lang() === 'ar' ? 'مثبت هام' : 'Pinned' }}
                        </span>
                      }
                      <span class="tag tone-brand text-[0.6875rem]">
                        {{ 'admin.ann.aud.' + a.audience | t }}
                      </span>
                    </div>

                    <!-- Author & Date -->
                    <div class="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                      <span class="inline-flex items-center gap-1 font-semibold text-ink">
                        <lucide-icon name="user-check" [size]="13" class="text-primary" />
                        {{ getAuthorLabel(a) }}
                      </span>
                      <span>•</span>
                      <span class="inline-flex items-center gap-1">
                        <lucide-icon name="clock" [size]="13" />
                        {{ a.at | date: 'd MMMM y, h:mm a' : 'Africa/Cairo' : i18n.lang() }}
                      </span>
                    </div>
                  </div>
                </div>

                <div class="flex items-center gap-2 self-start sm:self-center">
                  @if (a.audience) {
                    <span class="rounded-md border border-line bg-surface-page px-2 py-0.5 font-display text-[0.6875rem] font-bold text-ink-soft">
                      {{ a.audience === 'sec3' ? (i18n.lang() === 'ar' ? 'الثانوية العامة' : 'Sec 3') : a.audience === 'sec2' ? (i18n.lang() === 'ar' ? 'تانية ثانوي' : 'Sec 2') : a.audience === 'sec1' ? (i18n.lang() === 'ar' ? 'أولى ثانوي' : 'Sec 1') : (i18n.lang() === 'ar' ? 'جميع الطلاب' : 'All Students') }}
                    </span>
                  }
                </div>
              </div>

              <!-- Message Body -->
              <p class="text-sm leading-6 text-ink-body whitespace-pre-line bg-surface-page/80 p-4 rounded-card border border-line/50" dir="auto">
                {{ a.body }}
              </p>
            </article>
          } @empty {
            <div class="card p-12 text-center text-ink-muted space-y-3">
              <lucide-icon name="bell" [size]="36" class="mx-auto text-ink-muted/60" />
              <p class="font-display font-semibold text-ink text-base">
                {{ i18n.lang() === 'ar' ? 'لا توجد إعلانات في هذا القسم حالياً' : 'No announcements in this category yet' }}
              </p>
              <p class="text-xs text-ink-muted max-w-sm mx-auto">
                {{ i18n.lang() === 'ar'
                  ? 'سيتم نشر التبليغات الجديدة والمواعيد الهامة فور اعتمادها من مستر عادل مصطفى وفريق المساعدين.'
                  : 'New schedule updates and notices will appear here once published by Mr. Adel Mostafa and the assistant team.' }}
              </p>
            </div>
          }
        </div>
      </div>
    </div>
  `,
})
export class AnnouncementsPage {
  protected readonly admin = inject(AdminService);
  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);

  protected readonly selectedFilter = signal<AnnouncementFilter>('all');

  protected readonly filters: { id: AnnouncementFilter; labelEn: string; labelAr: string; icon: string }[] = [
    { id: 'all', labelEn: 'All Updates', labelAr: 'كافة التحديثات', icon: 'layers' },
    { id: 'pinned', labelEn: 'Pinned & Urgent', labelAr: 'المثبتة والعاجلة', icon: 'pin' },
    { id: 'general', labelEn: 'Academy Notices', labelAr: 'تبليغات الأكاديمية', icon: 'megaphone' },
    { id: 'live', labelEn: 'Live Broadcasts', labelAr: 'البث المباشر', icon: 'radio' },
  ];

  protected readonly publishedList = computed(() =>
    this.admin.announcements().filter((a) => a.state !== 'draft')
  );

  protected readonly pinnedCount = computed(() =>
    this.publishedList().filter((a) => a.pinned).length
  );

  protected readonly filteredList = computed(() => {
    const list = this.publishedList();
    const filter = this.selectedFilter();
    let result = [...list];

    if (filter === 'pinned') {
      result = result.filter((a) => a.pinned);
    } else if (filter === 'live') {
      result = result.filter((a) => a.icon === 'radio' || a.title.toLowerCase().includes('live') || a.title.includes('مباشر'));
    } else if (filter === 'general') {
      result = result.filter((a) => a.audience === 'all');
    }

    // Sort pinned to top, then by date descending
    result.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.at || '').localeCompare(a.at || '');
    });

    return result;
  });

  protected getAuthorLabel(a: Announcement): string {
    if (a.icon === 'user-check' || a.title.toLowerCase().includes('assistant') || a.body.toLowerCase().includes('assistant') || a.body.includes('المساعد')) {
      return this.i18n.lang() === 'ar' ? 'مكتب المساعدين الأكاديمي' : 'Teaching Assistant Desk';
    }
    return this.i18n.lang() === 'ar' ? 'الأستاذ عادل مصطفى (المعلم)' : 'Mr. Adel Mostafa (Lead Instructor)';
  }
}
