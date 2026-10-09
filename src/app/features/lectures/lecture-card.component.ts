import { Component, input } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { Lecture } from '../../core/models/lecture';
import { MediaComponent } from '../../shared/ui/media-placeholder.component';

@Component({
  selector: 'app-lecture-card',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe, MediaComponent],
  host: { class: 'block' },
  template: `
    <article class="card flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift">
      <app-media class="aspect-[16/9]" icon="video" [iconSize]="36" [src]="lecture().thumbnailUrl" [alt]="lecture().title | loc">
        <span class="absolute start-3 top-3 rounded-md bg-white/95 px-2 py-1 font-display text-[0.6875rem] font-semibold text-ink shadow-card">
          {{ 'stagesShort.' + lecture().stage | t }}
        </span>
        <span class="absolute bottom-3 end-3 rounded-md bg-ink/80 px-2 py-0.5 font-display text-[0.6875rem] font-semibold text-white">
          {{ 'common.minutes' | t: { n: lecture().durationMin } }}
        </span>
      </app-media>

      <div class="flex flex-1 flex-col p-5">
        <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
          <lucide-icon name="layers" [size]="13" />
          {{ lecture().unit | loc }}
        </p>
        <h3 class="mt-2 font-display text-base font-bold leading-6 text-ink">{{ lecture().title | loc }}</h3>
        <p class="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-ink-body">{{ lecture().description | loc }}</p>
        <div class="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3 text-xs text-ink-muted">
          <span class="font-display font-semibold text-ink-soft">{{ lecture().instructor | loc }}</span>
          <span class="flex items-center gap-1"><lucide-icon name="file-text" [size]="13" />{{ lecture().resources | loc }}</span>
        </div>
        <button type="button" class="btn btn-primary mt-4 w-full">
          <lucide-icon name="circle-play" [size]="16" />
          {{ 'lectures.catalog.watch' | t }}
        </button>
      </div>
    </article>
  `,
})
export class LectureCardComponent {
  readonly lecture = input.required<Lecture>();
}
