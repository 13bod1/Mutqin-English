import { Component, computed, ElementRef, inject, input, signal, viewChild } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { FeaturedLecture } from '../../core/models/lecture';
import { PdfNotesService } from '../../core/services/pdf-notes.service';

type Quality = '360p' | '720p' | '1080p';

@Component({
  selector: 'app-lecture-player',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe],
  host: { class: 'block' },
  template: `
    <div class="card overflow-hidden shadow-lift border border-line/60">
      <div class="flex flex-col gap-4 border-b border-line/70 p-5 md:flex-row md:items-center md:justify-between md:p-6 bg-surface-warm/40">
        <div>
          <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
            <lucide-icon name="video" [size]="14" class="text-primary" /> {{ 'lectures.player.eyebrow' | t }}
          </p>
          <h3 class="mt-1.5 font-display text-xl font-bold md:text-2xl text-ink">{{ lecture().title | loc }}</h3>
          <p class="mt-1 text-sm text-ink-body">{{ lecture().subtitle | loc }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-soft btn-sm" (click)="downloadNotes()"><lucide-icon name="download" [size]="14" />{{ 'lectures.player.downloadNotes' | t }}</button>
          <button type="button" (click)="toggleAudioMode()" [attr.aria-pressed]="audioMode()"
            class="btn btn-soft btn-sm" [class.!border-primary]="audioMode()" [class.!bg-surface-tint]="audioMode()">
            <lucide-icon name="headphones" [size]="14" />{{ 'lectures.player.audioMode' | t }}
            <span class="relative ms-1 inline-block h-4 w-7 rounded-full transition" [class]="audioMode() ? 'bg-primary' : 'bg-line'">
              <span class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" [class]="audioMode() ? 'end-0.5' : 'start-0.5'"></span>
            </span>
          </button>
        </div>
      </div>

      <div class="grid bg-black lg:grid-cols-[1fr_260px]">
        <!-- Video area -->
        <div class="relative aspect-video overflow-hidden bg-neutral-950 text-white group">
          <!-- Actual Video Element -->
          <video
            #videoRef
            class="h-full w-full object-contain bg-black"
            playsinline
            preload="metadata"
            [src]="lecture().videoUrl"
            (timeupdate)="onTimeUpdate()"
            (loadedmetadata)="onLoadedMetadata()"
            (ended)="onEnded()"
            (play)="playing.set(true)"
            (pause)="playing.set(false)"
            (click)="togglePlay()"
          ></video>

          <!-- Badges -->
          <div class="pointer-events-none absolute start-3 top-3 flex gap-2 z-10">
            <span class="rounded-md bg-danger px-2.5 py-1 font-display text-[0.6875rem] font-semibold text-white shadow-sm">
              {{ 'lectures.player.preview' | t }} · {{ lecture().lessonLabel | loc }}
            </span>
          </div>
          <span class="pointer-events-none absolute end-3 top-3 rounded-md bg-black/60 px-2.5 py-1 font-display text-[0.6875rem] font-semibold backdrop-blur text-white shadow-sm z-10">
            {{ 'lectures.player.hd' | t: { q: quality() } }}
          </span>

          <!-- Play Overlay when paused -->
          @if (!playing()) {
            <div
              (click)="togglePlay()"
              class="absolute inset-0 z-20 flex cursor-pointer flex-col items-center justify-center bg-black/45 backdrop-blur-[1px] transition hover:bg-black/35"
            >
              <button
                type="button"
                class="grid h-20 w-20 place-items-center rounded-full bg-primary text-white shadow-2xl transition-transform duration-300 hover:scale-110 active:scale-95 ring-4 ring-white/30"
                [attr.aria-label]="(playing() ? 'lectures.player.pause' : 'lectures.player.play') | t"
              >
                <lucide-icon name="play" [size]="32" class="fill-white ms-1" />
              </button>
              <span class="mt-3 rounded-full bg-black/75 px-4 py-1.5 font-display text-xs font-semibold text-white tracking-wide border border-white/20">
                {{ lecture().title | loc }}
              </span>
            </div>
          }

          <!-- Caption overlay -->
          @if (lecture().captionHighlight && !audioMode()) {
            <div class="pointer-events-none absolute inset-x-3 bottom-14 flex flex-col items-center gap-1.5 sm:bottom-16 z-10">
              <p class="rounded-md bg-black/75 px-3.5 py-1.5 text-center text-xs font-medium sm:text-sm backdrop-blur border border-white/10" dir="ltr" lang="en">
                {{ lecture().captionBefore }}<span class="text-gold font-bold underline decoration-gold/60 underline-offset-4">{{ lecture().captionHighlight }}</span>{{ lecture().captionAfter }}
              </p>
            </div>
          }

          <!-- Video Controls Bar -->
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-3 pb-3 pt-8 z-20">
            <!-- Scrubber -->
            <div
              (click)="seek($event)"
              class="relative h-2 w-full cursor-pointer overflow-hidden rounded-full bg-white/25 hover:h-2.5 transition-all"
              role="progressbar"
              [attr.aria-valuenow]="percent()"
              aria-valuemin="0"
              aria-valuemax="100"
            >
              <div class="h-full rounded-full bg-gold transition-all" [style.width.%]="percent()"></div>
            </div>

            <div class="mt-2.5 flex items-center justify-between gap-3 text-xs" dir="ltr">
              <div class="flex items-center gap-3">
                <button type="button" (click)="togglePlay()" class="hover:text-gold transition text-white"
                  [attr.aria-label]="(playing() ? 'lectures.player.pause' : 'lectures.player.play') | t">
                  <lucide-icon [name]="playing() ? 'pause' : 'play'" [size]="16" class="fill-current" />
                </button>
                <button type="button" (click)="toggleMute()" class="hover:text-gold transition text-white">
                  <lucide-icon [name]="isMuted() ? 'volume-x' : 'volume-2'" [size]="16" />
                </button>
                <span class="tabular-nums text-white/90">{{ format(currentTime()) }} / {{ format(duration() || lecture().durationSec) }}</span>
              </div>
              <div class="flex items-center gap-2">
                <div class="hidden items-center gap-1 sm:flex">
                  @for (s of speeds; track s) {
                    <button type="button" (click)="setSpeed(s)" class="rounded px-1.5 py-0.5 font-semibold transition text-xs"
                      [class]="speed() === s ? 'bg-white text-ink' : 'text-white/75 hover:bg-white/15'">{{ s }}x</button>
                  }
                </div>
                <button type="button" (click)="cycleQuality()" class="rounded bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25 text-xs text-white">
                  {{ quality() }}
                </button>
                <button type="button" (click)="toggleFullscreen()" class="p-1 hover:text-gold transition text-white" [attr.aria-label]="'lectures.player.fullscreen' | t">
                  <lucide-icon name="maximize" [size]="15" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Side panel -->
        <aside class="hidden flex-col gap-4 border-s border-white/10 bg-[#1c1412] p-4 text-white lg:flex">
          <p class="font-display text-xs font-bold uppercase tracking-wider text-white/60">{{ 'lectures.player.resources' | t }}</p>
          @for (r of resources; track r.key) {
            <button type="button" class="flex items-center gap-2.5 rounded-card bg-white/5 px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10 hover:text-white">
              <lucide-icon [name]="r.icon" [size]="15" class="text-gold" />{{ r.key | t }}
            </button>
          }
          <div class="mt-auto rounded-card bg-white/5 p-3 text-xs leading-5 text-white/70" dir="ltr" lang="en">
            <p class="mb-1 font-display font-bold text-white/90">{{ 'lectures.player.transcript' | t }}</p>
            English lesson by <span class="text-gold font-semibold">Mr. Adel Mostafa</span>. Practice real-world grammar and fluency patterns.
          </div>
        </aside>
      </div>

      <!-- Speed Selector on mobile -->
      <div class="flex flex-wrap items-center gap-2 border-t border-line/70 p-4 text-xs bg-surface-warm/30">
        <span class="font-display font-semibold text-ink-soft sm:hidden">{{ 'lectures.player.speed' | t }}</span>
        @for (s of speeds; track s) {
          <button type="button" (click)="setSpeed(s)" class="rounded-full border px-2.5 py-1 font-semibold transition sm:hidden"
            [class]="speed() === s ? 'border-primary bg-primary text-white' : 'border-line text-ink-body'">{{ s }}x</button>
        }
        <span class="hidden flex-1 sm:block"></span>
        @for (q of qualities; track q.value) {
          <button type="button" (click)="quality.set(q.value)" class="rounded-full border px-3 py-1 font-semibold transition"
            [class]="quality() === q.value ? 'border-primary bg-primary text-white' : 'border-line text-ink-body hover:border-primary/40'">
            {{ q.key | t }}
          </button>
        }
      </div>
    </div>
  `,
})
export class LecturePlayerComponent {
  readonly lecture = input.required<FeaturedLecture>();
  private readonly pdfNotes = inject(PdfNotesService);
  protected readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

  protected readonly speeds = [1, 1.25, 1.5];
  protected readonly qualities: { value: Quality; key: string }[] = [
    { value: '360p', key: 'lectures.player.dataSaver' },
    { value: '720p', key: 'lectures.player.hd720' },
    { value: '1080p', key: 'lectures.player.hd1080' },
  ];
  protected readonly resources = [
    { key: 'lectures.player.quiz', icon: 'list-checks' },
    { key: 'lectures.player.transcript', icon: 'captions' },
    { key: 'lectures.player.notes', icon: 'file-text' },
  ];

  protected readonly playing = signal(false);
  protected readonly isMuted = signal(false);
  protected readonly audioMode = signal(false);
  protected readonly speed = signal(1);
  protected readonly quality = signal<Quality>('720p');
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);

  protected readonly percent = computed(() => {
    const d = this.duration() || this.lecture().durationSec || 1;
    return Math.min(100, Math.max(0, (this.currentTime() / d) * 100));
  });

  protected togglePlay(): void {
    const v = this.videoRef()?.nativeElement;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => this.playing.set(true)).catch(() => {});
    } else {
      v.pause();
      this.playing.set(false);
    }
  }

  protected toggleMute(): void {
    const v = this.videoRef()?.nativeElement;
    if (!v) return;
    v.muted = !v.muted;
    this.isMuted.set(v.muted);
  }

  protected toggleAudioMode(): void {
    this.audioMode.update((a) => !a);
  }

  protected setSpeed(s: number): void {
    this.speed.set(s);
    const v = this.videoRef()?.nativeElement;
    if (v) v.playbackRate = s;
  }

  protected onTimeUpdate(): void {
    const v = this.videoRef()?.nativeElement;
    if (v) this.currentTime.set(v.currentTime);
  }

  protected onLoadedMetadata(): void {
    const v = this.videoRef()?.nativeElement;
    if (v) this.duration.set(v.duration);
  }

  protected onEnded(): void {
    this.playing.set(false);
  }

  protected seek(event: MouseEvent): void {
    const v = this.videoRef()?.nativeElement;
    const target = event.currentTarget as HTMLElement;
    if (!v || !target) return;
    const rect = target.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const d = this.duration() || this.lecture().durationSec;
    v.currentTime = ratio * d;
    this.currentTime.set(v.currentTime);
  }

  protected toggleFullscreen(): void {
    const v = this.videoRef()?.nativeElement;
    if (!v) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      v.requestFullscreen?.().catch(() => {});
    }
  }

  protected cycleQuality(): void {
    const order: Quality[] = ['360p', '720p', '1080p'];
    this.quality.set(order[(order.indexOf(this.quality()) + 1) % order.length]);
  }

  protected format(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  protected downloadNotes(): void {
    const lec = this.lecture();
    // FeaturedLecture has title & subtitle but no id — use 'featured' as key
    const titleEn = typeof lec.title === 'string' ? lec.title : lec.title['en'];
    const subtitleEn = typeof lec.subtitle === 'string' ? lec.subtitle : lec.subtitle['en'];
    this.pdfNotes.downloadNotes('featured', titleEn, subtitleEn);
  }
}
