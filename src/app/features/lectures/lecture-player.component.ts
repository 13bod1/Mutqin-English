import { Component, computed, input, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { FeaturedLecture } from '../../core/models/lecture';

type Quality = '360p' | '720p' | '1080p';

/** Interactive player shell. The real <video> source will come from the backend (FeaturedLecture.videoUrl). */
@Component({
  selector: 'app-lecture-player',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe],
  host: { class: 'block' },
  template: `
    <div class="card overflow-hidden">
      <div class="flex flex-col gap-4 border-b border-line/70 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
            <lucide-icon name="video" [size]="14" /> {{ 'lectures.player.eyebrow' | t }}
          </p>
          <h3 class="mt-1.5 font-display text-xl font-bold md:text-2xl">{{ lecture().title | loc }}</h3>
          <p class="mt-1 text-sm text-ink-body">{{ lecture().subtitle | loc }}</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn btn-soft btn-sm"><lucide-icon name="download" [size]="14" />{{ 'lectures.player.downloadNotes' | t }}</button>
          <button type="button" (click)="audioMode.set(!audioMode())" [attr.aria-pressed]="audioMode()"
            class="btn btn-soft btn-sm" [class.!border-primary]="audioMode()" [class.!bg-surface-tint]="audioMode()">
            <lucide-icon name="headphones" [size]="14" />{{ 'lectures.player.audioMode' | t }}
            <span class="relative ms-1 inline-block h-4 w-7 rounded-full transition" [class]="audioMode() ? 'bg-primary' : 'bg-line'">
              <span class="absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all" [class]="audioMode() ? 'end-0.5' : 'start-0.5'"></span>
            </span>
          </button>
        </div>
      </div>

      <div class="grid bg-ink lg:grid-cols-[1fr_260px]">
        <!-- Video area -->
        <div class="relative aspect-video overflow-hidden bg-gradient-to-br from-[#2b1d19] via-primary to-primary-mid text-white">
          <div class="absolute inset-0 grid place-items-center">
            <div class="flex flex-col items-center gap-3 text-center text-white/60">
              <button type="button" (click)="playing.set(!playing())"
                class="grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white ring-1 ring-white/30 backdrop-blur transition hover:bg-white/25"
                [attr.aria-label]="(playing() ? 'lectures.player.pause' : 'lectures.player.play') | t">
                <lucide-icon [name]="playing() ? 'pause' : 'play'" [size]="26" [class.fill-white]="true" />
              </button>
              <span class="hidden px-6 text-xs sm:block">{{ 'lectures.player.videoPlaceholder' | t }}</span>
            </div>
          </div>

          <div class="absolute start-3 top-3 flex gap-2">
            <span class="rounded-md bg-danger px-2 py-1 font-display text-[0.6875rem] font-semibold">
              {{ 'lectures.player.preview' | t }} · {{ lecture().lessonLabel | loc }}
            </span>
          </div>
          <span class="absolute end-3 top-3 rounded-md bg-black/40 px-2 py-1 font-display text-[0.6875rem] font-semibold backdrop-blur">
            {{ 'lectures.player.hd' | t: { q: quality() } }}
          </span>

          <!-- Caption + language note -->
          <div class="absolute inset-x-3 bottom-16 flex flex-col items-center gap-2 sm:bottom-20">
            <p class="rounded-md bg-black/60 px-3 py-1.5 text-center text-sm font-medium sm:text-base" dir="ltr" lang="en">
              {{ lecture().captionBefore }}<span class="text-gold underline decoration-gold/60 underline-offset-4">{{ lecture().captionHighlight }}</span>{{ lecture().captionAfter }}
            </p>
            <div class="hidden max-w-lg rounded-card border border-gold/40 bg-black/55 px-3 py-2 text-xs leading-5 text-white/90 backdrop-blur md:block" dir="rtl" lang="ar">
              <span class="font-display font-bold text-gold">ملاحظة لغوية: </span>{{ lecture().note.ar }}
            </div>
          </div>

          <!-- Controls -->
          <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8">
            <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/25" role="progressbar" [attr.aria-valuenow]="percent()" aria-valuemin="0" aria-valuemax="100">
              <div class="h-full rounded-full bg-gold" [style.width.%]="percent()"></div>
            </div>
            <div class="mt-2.5 flex items-center justify-between gap-3 text-xs" dir="ltr">
              <div class="flex items-center gap-3">
                <button type="button" (click)="playing.set(!playing())" class="hover:text-gold" [attr.aria-label]="(playing() ? 'lectures.player.pause' : 'lectures.player.play') | t">
                  <lucide-icon [name]="playing() ? 'pause' : 'play'" [size]="16" />
                </button>
                <lucide-icon name="volume-2" [size]="16" class="hidden sm:inline-flex" />
                <span class="tabular-nums">{{ format(lecture().positionSec) }} / {{ format(lecture().durationSec) }}</span>
              </div>
              <div class="flex items-center gap-1.5">
                <div class="hidden items-center gap-1 sm:flex">
                  @for (s of speeds; track s) {
                    <button type="button" (click)="speed.set(s)" class="rounded px-1.5 py-0.5 font-semibold transition"
                      [class]="speed() === s ? 'bg-white text-ink' : 'text-white/75 hover:bg-white/15'">{{ s }}x</button>
                  }
                </div>
                <button type="button" (click)="cycleQuality()" class="rounded bg-white/15 px-2 py-0.5 font-semibold hover:bg-white/25">{{ quality() }}</button>
                <button type="button" class="p-1 hover:text-gold" [attr.aria-label]="'lectures.player.fullscreen' | t">
                  <lucide-icon name="maximize" [size]="15" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Side panel -->
        <aside class="hidden flex-col gap-4 border-s border-white/10 bg-[#2b1d19] p-4 text-white lg:flex">
          <p class="font-display text-xs font-bold uppercase tracking-wider text-white/60">{{ 'lectures.player.resources' | t }}</p>
          @for (r of resources; track r.key) {
            <button type="button" class="flex items-center gap-2.5 rounded-card bg-white/5 px-3 py-2.5 text-sm text-white/85 transition hover:bg-white/10">
              <lucide-icon [name]="r.icon" [size]="15" class="text-gold" />{{ r.key | t }}
            </button>
          }
          <div class="mt-auto rounded-card bg-white/5 p-3 text-xs leading-5 text-white/70" dir="ltr" lang="en">
            <p class="mb-1 font-display font-bold text-white/90">{{ 'lectures.player.transcript' | t }}</p>
            She <span class="text-gold">has studied</span> English for three years now. Let's look at this structure…
          </div>
        </aside>
      </div>

      <!-- Quality selector (also visible on mobile) -->
      <div class="flex flex-wrap items-center gap-2 border-t border-line/70 p-4 text-xs">
        <span class="font-display font-semibold text-ink-soft sm:hidden">{{ 'lectures.player.speed' | t }}</span>
        @for (s of speeds; track s) {
          <button type="button" (click)="speed.set(s)" class="rounded-full border px-2.5 py-1 font-semibold transition sm:hidden"
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
  protected readonly audioMode = signal(false);
  protected readonly speed = signal(1);
  protected readonly quality = signal<Quality>('720p');
  protected readonly percent = computed(() => (this.lecture().positionSec / this.lecture().durationSec) * 100);

  protected cycleQuality(): void {
    const order: Quality[] = ['360p', '720p', '1080p'];
    this.quality.set(order[(order.indexOf(this.quality()) + 1) % order.length]);
  }

  protected format(sec: number): string {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}
