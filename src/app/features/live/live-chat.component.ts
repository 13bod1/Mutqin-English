import { DatePipe } from '@angular/common';
import { Component, ElementRef, computed, inject, input, linkedSignal, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../core/data/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { ChatMessage } from '../../core/models/live';

export type ChatMode = 'open' | 'closed' | 'locked' | 'notStarted';

/**
 * Live chat panel. `moderator` adds pin / delete / mute actions (teacher & assistants).
 * Backend plan: Supabase Realtime channel per session; messages table with RLS.
 */
@Component({
  selector: 'app-live-chat',
  imports: [FormsModule, LucideAngularModule, TranslatePipe, DatePipe],
  host: { class: 'card flex min-h-0 flex-col overflow-hidden' },
  template: `
    <header class="flex items-center justify-between gap-3 border-b border-line/60 px-5 py-4">
      <h2 class="flex items-center gap-2 font-display text-[0.9375rem] font-bold text-ink">
        <lucide-icon name="message-square" [size]="18" class="text-primary" />
        {{ (moderator() ? 'live.chat.moderation' : mode() === 'closed' ? 'live.chat.readOnly' : 'live.chat.title') | t }}
      </h2>
      @switch (mode()) {
        @case ('open') { <span class="tag tone-success"><lucide-icon name="users" [size]="12" />{{ 'live.chat.online' | t: { n: online() } }}</span> }
        @case ('closed') { <span class="tag tone-neutral">{{ 'live.chat.closed' | t }}</span> }
        @case ('notStarted') { <span class="tag tone-brand">{{ 'live.chat.opensAt' | t: { time: opensAt() } }}</span> }
      }
    </header>

    <div #list class="flex-1 space-y-4 overflow-y-auto p-5" role="log" aria-live="polite">
      @if (mode() === 'locked' || mode() === 'notStarted' || items().length === 0) {
        <div class="flex h-full min-h-48 flex-col items-center justify-center gap-2 text-center">
          <span class="icon-tile h-12 w-12"><lucide-icon [name]="mode() === 'locked' ? 'lock' : 'message-circle'" [size]="20" /></span>
          <p class="font-display text-[0.9375rem] font-bold text-ink">{{ (mode() === 'locked' ? 'live.chat.lockedTitle' : 'live.chat.emptyTitle') | t }}</p>
          <p class="max-w-[240px] text-[0.8125rem] leading-5 text-ink-muted">{{ (mode() === 'locked' ? 'live.chat.lockedText' : 'live.chat.emptyText') | t }}</p>
        </div>
      } @else {
        @for (m of items(); track m.id) {
          <div class="flex gap-2.5" [class]="m.pinned ? 'rounded-card bg-gold-soft p-3' : ''">
            <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full font-display text-[0.625rem] font-bold"
              [class]="m.teacher ? 'bg-primary text-white' : 'bg-surface-highlight text-primary'">{{ m.initials }}</span>
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-1.5">
                <span class="font-display text-[0.8125rem] font-bold text-ink">{{ m.author }}</span>
                @if (m.teacher) { <span class="tag bg-primary text-white">{{ 'live.chat.teacher' | t }}</span> }
                @if (m.pinned) {
                  <span class="tag bg-gold text-white"><lucide-icon name="pin" [size]="11" />{{ 'live.chat.pinned' | t }}</span>
                } @else {
                  <span class="text-[0.6875rem] text-ink-muted">{{ m.at | date: 'h:mm a' : 'Africa/Cairo' : i18n.lang() }}</span>
                }
              </p>
              <p class="mt-0.5 break-words text-[0.8125rem] leading-[1.2rem] text-ink-body" dir="auto">{{ m.text }}</p>
            </div>
            @if (moderator() && !m.teacher) {
              <div class="flex shrink-0 gap-1">
                <button type="button" class="btn-icon h-7 w-7" (click)="pin(m)" [attr.aria-label]="'live.chat.pin' | t"><lucide-icon name="pin" [size]="13" /></button>
                <button type="button" class="btn-icon h-7 w-7 text-danger" (click)="remove(m)" [attr.aria-label]="'live.chat.delete' | t"><lucide-icon name="trash-2" [size]="13" /></button>
                <button type="button" class="btn-icon h-7 w-7" [attr.aria-label]="'live.chat.mute' | t"><lucide-icon name="user-x" [size]="13" /></button>
              </div>
            }
          </div>
        }
      }
    </div>

    <form class="flex items-center gap-2 border-t border-line/60 px-4 py-3" [class.bg-surface-tint]="mode() !== 'open'" (ngSubmit)="send()">
      <label class="relative flex-1">
        <span class="sr-only">{{ 'live.chat.placeholder' | t }}</span>
        @if (mode() !== 'open') { <lucide-icon name="lock" [size]="14" class="input-icon start-3" /> }
        <input [(ngModel)]="draft" name="msg" maxlength="300" autocomplete="off" [disabled]="mode() !== 'open'"
          [placeholder]="placeholder() | t" dir="auto"
          class="input h-10 text-[0.8125rem] disabled:bg-surface-tint2" [class]="mode() !== 'open' ? 'ps-9' : 'ps-3.5'" />
      </label>
      <button type="submit" class="grid h-10 w-10 shrink-0 place-items-center rounded-card bg-primary text-white transition hover:bg-primary-hover disabled:bg-surface-tint3 disabled:text-ink-muted"
        [disabled]="mode() !== 'open' || !draft().trim()" [attr.aria-label]="'live.chat.send' | t">
        <lucide-icon name="send" [size]="16" class="flip-rtl" />
      </button>
    </form>
  `,
})
export class LiveChatComponent {
  readonly messages = input<ChatMessage[]>([]);
  readonly mode = input<ChatMode>('open');
  readonly moderator = input(false);
  readonly online = input(0);
  readonly opensAt = input('');

  protected readonly i18n = inject(LanguageService);
  private readonly auth = inject(AuthService);
  private readonly listEl = viewChild<ElementRef<HTMLElement>>('list');

  protected readonly items = linkedSignal(() => this.messages());
  protected readonly draft = signal('');
  protected readonly placeholder = computed(() => {
    switch (this.mode()) {
      case 'locked': return 'live.chat.phLocked';
      case 'closed': return 'live.chat.phClosed';
      case 'notStarted': return 'live.chat.phNotStarted';
      default: return this.moderator() ? 'live.chat.phTeacher' : 'live.chat.placeholder';
    }
  });

  protected send(): void {
    const text = this.draft().trim();
    if (!text || this.mode() !== 'open') return;
    const u = this.auth.user();
    this.items.update((l) => [
      ...l,
      {
        id: crypto.randomUUID?.() ?? String(Date.now()),
        author: this.moderator() ? 'Mr. Adel Mostafa' : u?.fullName ?? 'Student',
        initials: this.moderator() ? 'AM' : u?.initials ?? 'ME',
        teacher: this.moderator(),
        text,
        at: new Date().toISOString(),
      },
    ]);
    this.draft.set('');
    queueMicrotask(() => {
      const el = this.listEl()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }

  protected pin(m: ChatMessage): void {
    this.items.update((l) => l.map((x) => ({ ...x, pinned: x.id === m.id ? !x.pinned : x.pinned })));
  }

  protected remove(m: ChatMessage): void {
    this.items.update((l) => l.filter((x) => x.id !== m.id));
  }
}
