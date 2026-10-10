import { Component, inject, input, output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { Lecture } from '../../core/models/lecture';
import { PdfNotesService } from '../../core/services/pdf-notes.service';

@Component({
  selector: 'app-lecture-card',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe],
  host: { class: 'block' },
  template: `
    <article class="card flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift border border-line/60">
      <!-- Video Element & Preview (No placeholder) -->
      <div class="relative aspect-[16/9] overflow-hidden bg-neutral-950 group">
        <video
          #cardVideo
          class="h-full w-full object-cover cursor-pointer"
          playsinline
          controlsList="nodownload"
          preload="metadata"
          [controls]="isPlaying()"
          [src]="lecture().videoUrl"
          (play)="isPlaying.set(true)"
          (pause)="isPlaying.set(false)"
          (ended)="isPlaying.set(false)"
          (click)="togglePlay(cardVideo)"
        ></video>

        <!-- Stage & Duration Badges -->
        <span class="pointer-events-none absolute start-3 top-3 rounded-md bg-white/95 px-2.5 py-1 font-display text-[0.6875rem] font-semibold text-ink shadow-card z-10">
          {{ 'stagesShort.' + lecture().stage | t }}
        </span>
        <span class="pointer-events-none absolute bottom-3 end-3 rounded-md bg-black/80 px-2.5 py-0.5 font-display text-[0.6875rem] font-semibold text-white z-10 backdrop-blur">
          {{ 'common.minutes' | t: { n: lecture().durationMin } }}
        </span>

        <!-- Play overlay button -->
        @if (!isPlaying()) {
          <div
            (click)="togglePlay(cardVideo)"
            class="absolute inset-0 z-20 flex cursor-pointer items-center justify-center bg-black/35 backdrop-blur-[1px] transition-all hover:bg-black/20"
          >
            <div class="grid h-12 w-12 place-items-center rounded-full bg-primary text-white shadow-xl transition-transform duration-300 group-hover:scale-110 active:scale-95 ring-2 ring-white/40">
              <lucide-icon name="play" [size]="20" class="fill-white ms-0.5" />
            </div>
          </div>
        }
      </div>

      <div class="flex flex-1 flex-col p-5">
        <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
          <lucide-icon name="layers" [size]="13" class="text-primary" />
          {{ lecture().unit | loc }}
        </p>
        <h3 class="mt-2 font-display text-base font-bold leading-6 text-ink">{{ lecture().title | loc }}</h3>
        <p class="mt-2 line-clamp-2 flex-1 text-sm leading-6 text-ink-body">{{ lecture().description | loc }}</p>
        
        <div class="mt-4 flex items-center justify-between gap-3 border-t border-line/70 pt-3 text-xs text-ink-muted">
          <span class="font-display font-semibold text-ink-soft">{{ lecture().instructor | loc }}</span>
          <span class="flex items-center gap-1"><lucide-icon name="file-text" [size]="13" />{{ lecture().resources | loc }}</span>
        </div>

        <button type="button" (click)="onWatch(cardVideo)" class="btn btn-primary mt-4 w-full">
          <lucide-icon name="circle-play" [size]="16" />
          {{ 'lectures.catalog.watch' | t }}
        </button>
        <button type="button" (click)="downloadPdf()" class="btn btn-soft mt-2 w-full">
          <lucide-icon name="download" [size]="14" />
          Download Notes
        </button>
      </div>
    </article>
  `,
})
export class LectureCardComponent {
  readonly lecture = input.required<Lecture>();
  readonly watch = output<Lecture>();
  protected readonly isPlaying = signal(false);
  private readonly pdfNotes = inject(PdfNotesService);

  protected downloadPdf(): void {
    const lec = this.lecture();
    this.pdfNotes.downloadNotes(lec.id, lec.title['en'], lec.unit['en']);
  }

  protected togglePlay(video: HTMLVideoElement): void {
    if (video.paused) {
      video.play().then(() => this.isPlaying.set(true)).catch(() => {});
    } else {
      video.pause();
      this.isPlaying.set(false);
    }
  }

  protected onWatch(video: HTMLVideoElement): void {
    this.watch.emit(this.lecture());
    this.togglePlay(video);
  }
}
