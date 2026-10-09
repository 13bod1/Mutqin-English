import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { LectureService, filterLectures } from '../../core/data/lecture.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { AcademicStage, DurationBucket, LectureFilters, LectureTopic } from '../../core/models/lecture';
import { CtaBannerComponent } from '../../shared/ui/cta-banner.component';
import { MediaComponent } from '../../shared/ui/media-placeholder.component';
import { SectionHeaderComponent } from '../../shared/ui/section-header.component';
import { LectureCardComponent } from './lecture-card.component';
import { LecturePlayerComponent } from './lecture-player.component';

type SortKey = 'curriculum' | 'shortest' | 'longest';
const PAGE_SIZE = 6;

@Component({
  selector: 'app-lectures',
  imports: [
    FormsModule, RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe,
    CtaBannerComponent, MediaComponent, SectionHeaderComponent, LectureCardComponent, LecturePlayerComponent,
  ],
  templateUrl: './lectures.page.html',
})
export class LecturesPage {
  private readonly lectureService = inject(LectureService);
  private readonly i18n = inject(LanguageService);

  protected readonly lectures = toSignal(this.lectureService.getLectures());
  protected readonly continueWatching = toSignal(this.lectureService.getContinueWatching(), { initialValue: [] });
  protected readonly featured = toSignal(this.lectureService.getFeaturedLecture());

  protected readonly stages: AcademicStage[] = ['prep', 'sec1', 'sec2', 'sec3'];
  protected readonly topics: LectureTopic[] = ['grammar', 'phrasal', 'phonetics', 'exam'];
  protected readonly durations: DurationBucket[] = ['short', 'medium', 'long'];

  /** Text typed in the search box; applied on submit. */
  protected readonly searchDraft = signal('');
  protected readonly filters = signal<LectureFilters>({ query: '', stage: null, topic: null, duration: null });
  protected readonly sort = signal<SortKey>('curriculum');
  protected readonly visible = signal(PAGE_SIZE);

  protected readonly filtered = computed(() => {
    const list = filterLectures(this.lectures() ?? [], this.filters(), this.i18n.lang());
    const sorted = [...list];
    switch (this.sort()) {
      case 'shortest':
        sorted.sort((a, b) => a.durationMin - b.durationMin);
        break;
      case 'longest':
        sorted.sort((a, b) => b.durationMin - a.durationMin);
        break;
      default:
        sorted.sort((a, b) => a.order - b.order);
    }
    return sorted;
  });

  protected readonly shown = computed(() => this.filtered().slice(0, this.visible()));
  protected readonly hasFilters = computed(() => {
    const f = this.filters();
    return !!(f.query || f.stage || f.topic || f.duration);
  });

  protected search(): void {
    this.patch({ query: this.searchDraft() });
  }

  protected toggle<K extends 'stage' | 'topic' | 'duration'>(key: K, value: LectureFilters[K]): void {
    this.patch({ [key]: this.filters()[key] === value ? null : value } as Partial<LectureFilters>);
  }

  protected clear(): void {
    this.searchDraft.set('');
    this.filters.set({ query: '', stage: null, topic: null, duration: null });
    this.visible.set(PAGE_SIZE);
  }

  protected loadMore(): void {
    this.visible.update((n) => n + PAGE_SIZE);
  }

  private patch(change: Partial<LectureFilters>): void {
    this.filters.update((f) => ({ ...f, ...change }));
    this.visible.set(PAGE_SIZE);
  }
}
