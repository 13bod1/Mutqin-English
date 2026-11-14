import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  OnInit,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { FeaturedLecture, Lecture, TranscriptItem } from '../../core/models/lecture';
import { PdfNotesService } from '../../core/services/pdf-notes.service';
import { SessionProtectionService } from '../../core/services/session-protection.service';

type Quality = '360p' | '720p' | '1080p';
type PlayerTab = 'transcript' | 'notes' | 'playlist';

@Component({
  selector: 'app-lecture-player',
  imports: [LucideAngularModule, TranslatePipe, LocalizePipe],
  host: { class: 'block' },
  template: `
    <div class="card overflow-hidden shadow-lift border border-line/60 select-none" (contextmenu)="$event.preventDefault()">
      <!-- Player Header -->
      <div class="flex flex-col gap-4 border-b border-line/70 p-5 md:flex-row md:items-center md:justify-between md:p-6 bg-surface-warm/40">
        <div>
          <p class="flex items-center gap-1.5 font-display text-xs font-semibold text-ink-soft">
            <lucide-icon name="shield-check" [size]="14" class="text-primary" /> {{ 'lectures.player.eyebrow' | t }} · DRM Hardened
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

      <div class="grid bg-black lg:grid-cols-[1fr_320px]">
        <!-- Video area -->
        <div class="relative aspect-video overflow-hidden bg-neutral-950 text-white group" (contextmenu)="$event.preventDefault()">
          
          <!-- Anti-Recording / Anti-Capture Security Blackout Overlay -->
          @if (isBlackedOut()) {
            <div class="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/95 p-6 text-center text-white backdrop-blur-md">
              <span class="grid h-16 w-16 place-items-center rounded-full bg-red-600/20 text-red-500 animate-pulse">
                <lucide-icon name="shield-alert" [size]="36" />
              </span>
              <p class="font-display text-lg font-bold sm:text-xl">{{ 'protection.screenCaptureAlert' | t }}</p>
              <p class="max-w-md text-xs leading-relaxed text-white/80 sm:text-sm">
                {{ blackoutMessage() || ('protection.focusLostPaused' | t) }}
              </p>
              <button type="button" (click)="resumeFromBlackout()" class="btn btn-primary btn-sm mt-3">
                <lucide-icon name="play" [size]="14" class="fill-white" /> {{ 'protection.resumePlay' | t }}
              </button>
            </div>
          }

          <!-- Blocked Playback Overlay (Concurrent session or security stop) -->
          @if (blockedReason()) {
            <div class="absolute inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-neutral-950/95 p-6 text-center text-white backdrop-blur-md">
              <span class="grid h-16 w-16 place-items-center rounded-full bg-red-600/20 text-red-500">
                <lucide-icon name="shield-alert" [size]="32" />
              </span>
              <p class="font-display text-lg font-bold sm:text-xl">{{ 'protection.recordingBlocked' | t }}</p>
              <p class="max-w-md text-xs leading-relaxed text-white/80 sm:text-sm">{{ blockedReason() }}</p>
              <button type="button" (click)="resumeSession()" class="btn btn-light btn-sm mt-2">
                <lucide-icon name="refresh-cw" [size]="14" /> Refresh Authorization
              </button>
            </div>
          }

          <!-- Actual Video Element with hardened attributes -->
          <video
            #videoRef
            class="h-full w-full object-contain bg-black transition-filter"
            [class.blur-md]="isBlurred() || isBlackedOut()"
            playsinline
            preload="metadata"
            disablePictureInPicture
            controlsList="nodownload noplaybackrate"
            [src]="signedVideoUrl()"
            (timeupdate)="onTimeUpdate()"
            (loadedmetadata)="onLoadedMetadata()"
            (ended)="onEnded()"
            (play)="playing.set(true)"
            (pause)="playing.set(false)"
            (click)="togglePlay()"
            (contextmenu)="$event.preventDefault()"
          ></video>

          <!-- Layer 1: Diagonal Full-Frame Security Matrix Watermark (Deters phone filming & OBS capture) -->
          <div class="pointer-events-none absolute inset-0 z-20 flex flex-wrap items-center justify-around opacity-[0.06] overflow-hidden select-none text-[0.625rem] font-bold uppercase tracking-widest text-white rotate-[-15deg] scale-125">
            @for (n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; track n) {
              <div class="p-6 whitespace-nowrap">
                ADEL MOSTAFA ACADEMY • {{ watermarkStudentTag() }} • PROTECTED
              </div>
            }
          </div>

          <!-- Layer 2: Moving Dynamic Watermark overlay (animating / repositioning smoothly) -->
          <div
            class="pointer-events-none absolute z-30 select-none text-[0.625rem] font-bold tracking-wider text-white/30 sm:text-xs"
            [style.top.%]="watermarkTop()"
            [style.left.%]="watermarkLeft()"
            style="text-shadow: 1px 1px 2px rgba(0,0,0,0.85); transition: top 3.5s ease, left 3.5s ease;"
          >
            {{ dynamicWatermark() }}
          </div>

          <!-- Badges -->
          <div class="pointer-events-none absolute start-3 top-3 flex gap-2 z-10">
            <span class="rounded-md bg-danger px-2.5 py-1 font-display text-[0.6875rem] font-semibold text-white shadow-sm flex items-center gap-1">
              <lucide-icon name="shield-check" [size]="12" /> DRM Protected · {{ lecture().lessonLabel | loc }}
            </span>
          </div>
          <span class="pointer-events-none absolute end-3 top-3 rounded-md bg-black/60 px-2.5 py-1 font-display text-[0.6875rem] font-semibold backdrop-blur text-white shadow-sm z-10">
            {{ 'lectures.player.hd' | t: { q: quality() } }}
          </span>

          <!-- Play Overlay when paused -->
          @if (!playing() && !blockedReason() && !isBlackedOut()) {
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
          @if (lecture().captionHighlight && !audioMode() && !isBlackedOut()) {
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

        <!-- Interactive Studio Side Panel (Transcript, Notes & All Videos) -->
        <aside class="flex flex-col border-s border-white/10 bg-[#17100e] text-white h-[420px] lg:h-auto overflow-hidden">
          <!-- Side Panel Navigation Tabs -->
          <div class="flex border-b border-white/10 bg-black/40 text-xs font-semibold">
            <button
              type="button"
              (click)="activeTab.set('transcript')"
              class="flex-1 py-3 px-2 text-center transition flex items-center justify-center gap-1.5 border-b-2"
              [class]="activeTab() === 'transcript' ? 'border-primary text-gold bg-white/5' : 'border-transparent text-white/60 hover:text-white'"
            >
              <lucide-icon name="captions" [size]="14" />
              <span>{{ 'protection.transcriptTab' | t }}</span>
            </button>
            <button
              type="button"
              (click)="activeTab.set('notes')"
              class="flex-1 py-3 px-2 text-center transition flex items-center justify-center gap-1.5 border-b-2"
              [class]="activeTab() === 'notes' ? 'border-primary text-gold bg-white/5' : 'border-transparent text-white/60 hover:text-white'"
            >
              <lucide-icon name="file-text" [size]="14" />
              <span>{{ 'protection.notesTab' | t }}</span>
            </button>
            <button
              type="button"
              (click)="activeTab.set('playlist')"
              class="flex-1 py-3 px-2 text-center transition flex items-center justify-center gap-1.5 border-b-2"
              [class]="activeTab() === 'playlist' ? 'border-primary text-gold bg-white/5' : 'border-transparent text-white/60 hover:text-white'"
            >
              <lucide-icon name="layers" [size]="14" />
              <span>{{ 'protection.playlistTab' | t }}</span>
            </button>
          </div>

          <!-- TAB 1: INTERACTIVE TRANSCRIPT -->
          @if (activeTab() === 'transcript') {
            <div class="flex flex-1 flex-col overflow-hidden p-3">
              <div class="flex items-center justify-between mb-2 pb-2 border-b border-white/10 text-xs">
                <span class="text-white/60 font-medium">{{ (lecture().transcript?.length || 0) }} sections</span>
                <!-- Language Toggle for Transcript -->
                <div class="flex items-center gap-1 bg-white/10 rounded p-0.5">
                  <button
                    type="button"
                    (click)="transcriptLang.set('ar')"
                    class="px-2 py-0.5 rounded text-[0.6875rem] font-semibold transition"
                    [class]="transcriptLang() === 'ar' ? 'bg-primary text-white' : 'text-white/70 hover:text-white'"
                  >عربي</button>
                  <button
                    type="button"
                    (click)="transcriptLang.set('en')"
                    class="px-2 py-0.5 rounded text-[0.6875rem] font-semibold transition"
                    [class]="transcriptLang() === 'en' ? 'bg-primary text-white' : 'text-white/70 hover:text-white'"
                  >EN</button>
                </div>
              </div>

              <!-- Scrollable Transcript Lines synced with video -->
              <div class="flex-1 overflow-y-auto space-y-2 pe-1 text-xs">
                @for (item of lecture().transcript; track item.startSec) {
                  <div
                    (click)="seekTo(item.startSec)"
                    class="group flex gap-2.5 p-2 rounded-card transition cursor-pointer border border-transparent"
                    [class]="isLineActive(item) ? 'bg-primary/20 border-primary/50 text-white shadow-sm' : 'hover:bg-white/5 text-white/75'"
                    [attr.title]="'protection.seekToLine' | t"
                  >
                    <span
                      class="shrink-0 tabular-nums px-1.5 py-0.5 rounded font-mono text-[0.6875rem] transition"
                      [class]="isLineActive(item) ? 'bg-primary text-white font-bold' : 'bg-white/10 text-white/60 group-hover:text-gold'"
                    >
                      {{ format(item.startSec) }}
                    </span>
                    <p class="leading-relaxed" [dir]="transcriptLang() === 'ar' ? 'rtl' : 'ltr'">
                      {{ transcriptLang() === 'ar' ? item.textAr : item.textEn }}
                    </p>
                  </div>
                } @empty {
                  <div class="flex flex-col items-center justify-center h-full p-4 text-center text-white/50">
                    <lucide-icon name="captions" [size]="24" class="mb-2 opacity-40" />
                    <p>{{ 'protection.noTranscript' | t }}</p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- TAB 2: STUDY NOTES & RESOURCES -->
          @if (activeTab() === 'notes') {
            <div class="flex flex-1 flex-col overflow-y-auto p-4 space-y-4 text-xs">
              <div class="rounded-card bg-white/5 p-3.5 border border-white/10">
                <p class="font-display font-bold text-sm text-gold mb-1.5">{{ 'lectures.player.note' | t }}</p>
                <p class="leading-relaxed text-white/80">{{ lecture().note | loc }}</p>
              </div>

              <div>
                <p class="font-display font-bold text-white/60 uppercase tracking-wider mb-2">{{ 'lectures.player.resources' | t }}</p>
                <div class="space-y-2">
                  <button type="button" (click)="downloadNotes()" class="w-full flex items-center justify-between rounded-card bg-white/5 p-2.5 text-white/85 hover:bg-white/10 transition">
                    <span class="flex items-center gap-2">
                      <lucide-icon name="file-text" [size]="15" class="text-gold" />
                      {{ 'lectures.player.downloadNotes' | t }}
                    </span>
                    <lucide-icon name="download" [size]="13" class="text-white/60" />
                  </button>
                  <a routerLink="/quizzes" class="w-full flex items-center justify-between rounded-card bg-white/5 p-2.5 text-white/85 hover:bg-white/10 transition">
                    <span class="flex items-center gap-2">
                      <lucide-icon name="list-checks" [size]="15" class="text-gold" />
                      {{ 'lectures.player.quiz' | t }}
                    </span>
                    <lucide-icon name="arrow-right" [size]="13" class="text-white/60 flip-rtl" />
                  </a>
                </div>
              </div>

              <div class="mt-auto rounded-card bg-white/5 p-3 text-white/70 border border-white/5">
                <p class="font-bold text-white/90 mb-1">Instructor</p>
                <p>English course by <span class="text-gold font-semibold">Mr. Adel Mostafa</span>.</p>
              </div>
            </div>
          }

          <!-- TAB 3: PLAYLIST (WATCH ALL VIDEOS IN STUDIO PREVIEW) -->
          @if (activeTab() === 'playlist') {
            <div class="flex flex-1 flex-col overflow-y-auto p-3 space-y-2 text-xs">
              <p class="text-white/60 font-semibold px-1 py-1">Available Recorded Lectures ({{ allLectures().length || 9 }})</p>
              @for (lec of (allLectures().length ? allLectures() : defaultLecturesList); track lec.id) {
                <div
                  (click)="selectLecture(lec)"
                  class="flex items-start gap-2.5 p-2.5 rounded-card transition cursor-pointer border"
                  [class]="isCurrentLecture(lec) ? 'bg-primary/25 border-primary text-white shadow-sm ring-1 ring-primary/40' : 'bg-white/5 border-transparent hover:bg-white/10 text-white/80'"
                >
                  <span class="grid h-7 w-7 shrink-0 place-items-center rounded bg-black/40 text-[0.6875rem] font-bold"
                    [class.text-gold]="isCurrentLecture(lec)">
                    @if (isCurrentLecture(lec) && playing()) {
                      <lucide-icon name="volume-2" [size]="14" class="text-gold animate-pulse" />
                    } @else {
                      {{ lec.order }}
                    }
                  </span>
                  <div class="min-w-0 flex-1">
                    <p class="font-display font-semibold line-clamp-1" [class.text-gold]="isCurrentLecture(lec)">
                      {{ lec.title | loc }}
                    </p>
                    <p class="text-[0.6875rem] text-white/60 line-clamp-1 mt-0.5">
                      {{ 'stagesShort.' + lec.stage | t }} • {{ 'common.minutes' | t: { n: lec.durationMin } }}
                    </p>
                  </div>
                  @if (isCurrentLecture(lec)) {
                    <span class="shrink-0 text-[0.625rem] font-bold text-gold bg-gold/15 px-1.5 py-0.5 rounded">
                      Playing
                    </span>
                  }
                </div>
              }
            </div>
          }
        </aside>
      </div>

      <!-- Speed & Quality Selector Bar -->
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
export class LecturePlayerComponent implements OnInit {
  readonly lecture = input.required<FeaturedLecture>();
  readonly allLectures = input<Lecture[]>([]);
  readonly lectureSelect = output<Lecture>();

  private readonly pdfNotes = inject(PdfNotesService);
  private readonly protection = inject(SessionProtectionService);
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoRef');

  protected readonly speeds = [1, 1.25, 1.5];
  protected readonly qualities: { value: Quality; key: string }[] = [
    { value: '360p', key: 'lectures.player.dataSaver' },
    { value: '720p', key: 'lectures.player.hd720' },
    { value: '1080p', key: 'lectures.player.hd1080' },
  ];

  protected readonly playing = signal(false);
  protected readonly isMuted = signal(false);
  protected readonly audioMode = signal(false);
  protected readonly speed = signal(1);
  protected readonly quality = signal<Quality>('720p');
  protected readonly currentTime = signal(0);
  protected readonly duration = signal(0);

  // Tabs & Transcripts
  protected readonly activeTab = signal<PlayerTab>('transcript');
  protected readonly transcriptLang = signal<'ar' | 'en'>('ar');

  // Hardened Anti-Recording & DRM Session State
  protected readonly signedVideoUrl = signal<string>('');
  protected readonly blockedReason = signal<string | null>(null);
  protected readonly isBlurred = signal<boolean>(false);
  protected readonly isBlackedOut = signal<boolean>(false);
  protected readonly blackoutMessage = signal<string>('');
  protected readonly watermarkTop = signal<number>(20);
  protected readonly watermarkLeft = signal<number>(20);
  protected readonly dynamicWatermark = signal<string>('');
  protected readonly watermarkStudentTag = signal<string>('');

  private deviceId = 'dev_' + Math.random().toString(36).substring(2, 8);

  protected readonly defaultLecturesList: Lecture[] = [];

  protected readonly percent = computed(() => {
    const d = this.duration() || this.lecture().durationSec || 1;
    return Math.min(100, Math.max(0, (this.currentTime() / d) * 100));
  });

  constructor() {
    // Whenever lecture changes, immediately refresh signed url and reinitialize video for THAT lecture!
    effect(() => {
      const l = this.lecture();
      this.onLectureChanged(l);
    });
  }

  ngOnInit(): void {
    const user = this.auth.user();
    const userId = user?.id || 'guest_student';
    const userName = user?.fullName || 'Guest Student';

    this.watermarkStudentTag.set(`${userName} (${userId})`);

    // 1. Dynamic Watermark text with student ID & obscured phone
    this.dynamicWatermark.set(this.protection.getWatermarkText(userId, userName, '01012345678'));

    // 2. Generate signed, short-lived video playback URL
    this.refreshSignedUrl();

    // 3. Register viewing session
    const reg = this.protection.registerViewingSession(userId, this.deviceId);
    if (reg.previousTerminated) {
      this.protection.flagSuspiciousActivity(
        userId,
        `Started viewing lecture ${this.lecture().title} while another device was active.`
      );
    }

    // 4. Reposition watermark periodically
    const wmInterval = setInterval(() => {
      this.watermarkTop.set(Math.floor(Math.random() * 70) + 10);
      this.watermarkLeft.set(Math.floor(Math.random() * 65) + 5);
    }, 3500);

    // 5. Anti-recording & Anti-Capture Event Listeners
    const onVisibilityChange = () => {
      if (typeof document !== 'undefined' && document.hidden) {
        this.triggerSecurityBlackout('Playback paused because tab was hidden to protect lecture copyright.');
      }
    };

    const onWindowBlur = () => {
      if (this.playing()) {
        this.triggerSecurityBlackout('Playback paused because the window lost focus to protect lecture content.');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isSnippingTool = (e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 's' || e.key === 'S');
      const isMacScreenCapture = e.metaKey && e.shiftKey && ['3', '4', '5'].includes(e.key);
      const isDevTools = ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) || e.key === 'F12';

      if (isPrintScreen || isSnippingTool || isMacScreenCapture || isDevTools) {
        e.preventDefault();
        e.stopPropagation();
        this.triggerSecurityBlackout('Screen capture shortcut detected (' + (e.key || 'PrintScreen') + ').');
        
        // Clean clipboard
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
          navigator.clipboard.writeText('⚠️ محتوى منصة مستر عادل مصطفى محمي بحقوق الطبع والنشر. تسجيل وتصوير الشاشة محظور تماماً.').catch(() => {});
        }
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
      window.addEventListener('blur', onWindowBlur);
      window.addEventListener('keydown', onKeyDown);
    }

    // 6. Monkey-patch screen capture API (getDisplayMedia) to block in-browser recording extensions
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && (navigator.mediaDevices as any).getDisplayMedia) {
      try {
        const origGetDisplayMedia = (navigator.mediaDevices as any).getDisplayMedia.bind(navigator.mediaDevices);
        (navigator.mediaDevices as any).getDisplayMedia = async (...args: any[]) => {
          this.triggerSecurityBlackout('In-browser screen sharing or recording attempt blocked.');
          throw new DOMException('Screen recording is strictly prohibited during lecture playback.', 'NotAllowedError');
        };
      } catch {}
    }

    this.destroyRef.onDestroy(() => {
      clearInterval(wmInterval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('blur', onWindowBlur);
        window.removeEventListener('keydown', onKeyDown);
      }
      this.protection.stopViewingSession(userId, this.deviceId);
    });
  }

  private triggerSecurityBlackout(msg: string): void {
    const v = this.videoRef()?.nativeElement;
    if (v && !v.paused) {
      v.pause();
      this.playing.set(false);
    }
    this.isBlackedOut.set(true);
    this.blackoutMessage.set(msg);
    const user = this.auth.user();
    this.protection.flagSuspiciousActivity(user?.id || 'guest', msg);
  }

  protected resumeFromBlackout(): void {
    this.isBlackedOut.set(false);
    this.blackoutMessage.set('');
    this.togglePlay();
  }

  private onLectureChanged(l: FeaturedLecture): void {
    this.refreshSignedUrl();
    this.currentTime.set(0);
    this.duration.set(l.durationSec);
    this.blockedReason.set(null);
    this.isBlackedOut.set(false);
    const v = this.videoRef()?.nativeElement;
    if (v) {
      v.src = this.signedVideoUrl();
      v.load();
      v.play().then(() => this.playing.set(true)).catch(() => {});
    }
  }

  private refreshSignedUrl(): void {
    const user = this.auth.user();
    const userId = user?.id || 'guest_student';
    const raw = this.lecture().videoUrl || '';
    // Expire in 10 minutes
    const signed = this.protection.generateSignedVideoUrl(raw, userId, 600);
    this.signedVideoUrl.set(signed);
  }

  protected resumeSession(): void {
    this.blockedReason.set(null);
    const user = this.auth.user();
    const userId = user?.id || 'guest_student';
    this.protection.registerViewingSession(userId, this.deviceId);
    this.refreshSignedUrl();
  }

  protected togglePlay(): void {
    const v = this.videoRef()?.nativeElement;
    if (!v) return;
    if (v.paused) {
      // Check session heartbeat
      const user = this.auth.user();
      const userId = user?.id || 'guest_student';
      const check = this.protection.sessionHeartbeat(userId, this.deviceId);
      if (!check.active) {
        this.blockedReason.set(check.reason || 'Session stopped: Account is active on another device.');
        return;
      }

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

  protected seekTo(sec: number): void {
    const v = this.videoRef()?.nativeElement;
    if (!v) return;
    v.currentTime = sec;
    this.currentTime.set(sec);
    if (v.paused) {
      v.play().then(() => this.playing.set(true)).catch(() => {});
    }
  }

  protected isLineActive(item: TranscriptItem): boolean {
    const ct = this.currentTime();
    return ct >= item.startSec && ct <= item.endSec;
  }

  protected isCurrentLecture(lec: Lecture): boolean {
    const cur = this.lecture();
    return cur.id === lec.id || (cur.title.en === lec.title.en);
  }

  protected selectLecture(lec: Lecture): void {
    this.lectureSelect.emit(lec);
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
    const titleEn = typeof lec.title === 'string' ? lec.title : lec.title['en'];
    const subtitleEn = typeof lec.subtitle === 'string' ? lec.subtitle : lec.subtitle['en'];
    this.pdfNotes.downloadNotes(lec.id || 'featured', titleEn, subtitleEn);
  }
}
