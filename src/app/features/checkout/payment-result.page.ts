import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { of, switchMap } from 'rxjs';
import { CommerceService } from '../../core/data/commerce.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { CheckoutStatus, PurchasableKind } from '../../core/models/commerce';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

/**
 * /checkout/result?status=…&kind=…&id=…&ref=…
 * The payment provider redirects here after the hosted checkout. The real status always comes
 * from our server (webhook-confirmed order), never from the query string alone.
 */
@Component({
  selector: 'app-payment-result',
  imports: [RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DecimalPipe, DatePipe, StatePanelComponent],
  template: `
    <section class="container-page py-10 md:py-16">
      @let it = item();
      @switch (state()) {
        @case ('processing') {
          <app-state-panel tone="progress" [title]="'pay.result.processing.title' | t" [text]="'pay.result.processing.text' | t">
            <ul details class="kv-box space-y-3">
              <li class="flex items-center gap-3 text-ink"><lucide-icon name="circle-check" [size]="18" class="text-success" />{{ 'pay.result.processing.s1' | t }}</li>
              <li class="flex items-center gap-3 font-semibold text-ink"><lucide-icon name="loader-circle" [size]="18" class="animate-spin text-primary" />{{ 'pay.result.processing.s2' | t }}</li>
              <li class="flex items-center gap-3 text-ink-muted"><lucide-icon name="circle-dashed" [size]="18" class="text-line" />{{ 'pay.result.processing.s3' | t }}</li>
            </ul>
            <p class="mt-6 text-xs text-ink-muted">{{ 'pay.reference' | t }}: <span dir="ltr">{{ reference() }}</span></p>
          </app-state-panel>
        }
        @case ('success') {
          <app-state-panel tone="success" icon="circle-check" [title]="'pay.result.success.title' | t" [text]="'pay.result.success.text' | t">
            <div details class="kv-box">
              <div class="kv"><span>{{ 'pay.item' | t }}</span><span>{{ it?.title | loc }}</span></div>
              <div class="kv"><span>{{ 'pay.date' | t }}</span><span>{{ now | date: 'd MMM y, h:mm a' : 'Africa/Cairo' : i18n.lang() }}</span></div>
              <div class="kv"><span>{{ 'pay.amountPaid' | t }}</span><span>{{ 'access.price' | t: { n: (it?.priceEgp | number) ?? '' } }}</span></div>
              <div class="kv"><span>{{ 'pay.reference' | t }}</span><span dir="ltr">{{ reference() }}</span></div>
            </div>
            <button actions type="button" class="btn btn-soft" (click)="print()"><lucide-icon name="download" [size]="16" />{{ 'pay.result.success.receipt' | t }}</button>
            <a actions [routerLink]="itemLink()" class="btn btn-primary">{{ 'pay.goToItem' | t }}<lucide-icon name="arrow-right" [size]="16" class="flip-rtl" /></a>
          </app-state-panel>
        }
        @case ('failed') {
          <app-state-panel tone="danger" icon="circle-x" [title]="'pay.result.failed.title' | t" [text]="'pay.result.failed.text' | t">
            <div details class="note tone-danger border border-danger-line">
              <lucide-icon name="circle-alert" [size]="18" class="mt-0.5 shrink-0" />
              <span><strong class="block font-display">{{ 'pay.result.failed.reason' | t }}</strong>{{ 'pay.result.failed.hint' | t }}</span>
            </div>
            <div details class="kv-box">
              <div class="kv"><span>{{ 'pay.amount' | t }}</span><span>{{ 'access.price' | t: { n: (it?.priceEgp | number) ?? '' } }}</span></div>
              <div class="kv"><span>{{ 'pay.reference' | t }}</span><span dir="ltr">{{ reference() }}</span></div>
            </div>
            <a actions [routerLink]="['/checkout', kind(), id(), 'manual']" class="btn btn-soft"><lucide-icon name="smartphone" [size]="16" />{{ 'pay.result.useManual' | t }}</a>
            <a actions [routerLink]="['/checkout', kind(), id()]" class="btn btn-primary"><lucide-icon name="rotate-ccw" [size]="16" />{{ 'pay.result.tryAgain' | t }}</a>
          </app-state-panel>
        }
        @case ('cancelled') {
          <app-state-panel tone="warning" icon="ban" [title]="'pay.result.cancelled.title' | t" [text]="'pay.result.cancelled.text' | t">
            @if (kind() === 'live') {
              <p details class="note tone-gold font-display font-semibold">
                <lucide-icon name="clock" [size]="18" class="shrink-0" />
                {{ (holdLeft() > 0 ? 'pay.result.cancelled.hold' : 'pay.result.cancelled.released') | t: { time: holdText() } }}
              </p>
            }
            <a actions [routerLink]="itemLink()" class="btn btn-soft"><lucide-icon name="arrow-right" [size]="16" class="-scale-x-100 rtl:scale-x-100" />{{ 'pay.result.back' | t }}</a>
            <a actions [routerLink]="['/checkout', kind(), id()]" class="btn btn-primary">{{ 'pay.result.resume' | t }}<lucide-icon name="arrow-right" [size]="16" class="flip-rtl" /></a>
          </app-state-panel>
        }
        @case ('submitted') {
          <app-state-panel tone="warning" icon="hourglass" [title]="'pay.result.submitted.title' | t" [text]="'pay.result.submitted.text' | t">
            <div details class="kv-box">
              <div class="kv"><span>{{ 'pay.item' | t }}</span><span>{{ it?.title | loc }}</span></div>
              <div class="kv"><span>{{ 'pay.amount' | t }}</span><span>{{ 'access.price' | t: { n: (it?.priceEgp | number) ?? '' } }}</span></div>
              <div class="kv"><span>{{ 'pay.reference' | t }}</span><span dir="ltr">{{ reference() }}</span></div>
            </div>
            <a actions href="https://wa.me/" target="_blank" rel="noopener" class="btn btn-soft"><lucide-icon name="message-circle" [size]="16" />{{ 'pay.contactSupport' | t }}</a>
            <a actions [routerLink]="itemLink()" class="btn btn-primary">{{ 'pay.result.back' | t }}</a>
          </app-state-panel>
        }
        @default {
          <app-state-panel icon="circle-alert" [title]="'pay.notFound.title' | t" [text]="'pay.notFound.text' | t">
            <a actions routerLink="/" class="btn btn-primary">{{ 'pay.backHome' | t }}</a>
          </app-state-panel>
        }
      }

      @if (isDemo()) {
        <!-- Provider not connected yet: lets QA preview every return state. Removed once the provider is live. -->
        <div class="mx-auto mt-6 flex max-w-[560px] flex-wrap items-center justify-center gap-2 text-xs text-ink-muted">
          <span>{{ 'pay.result.demo' | t }}</span>
          @for (s of demoStates; track s) {
            <a [routerLink]="[]" [queryParams]="{ status: s }" queryParamsHandling="merge" class="tag tone-brand hover:bg-surface-tint3">{{ s }}</a>
          }
        </div>
      }
    </section>
  `,
})
export class PaymentResultPage {
  readonly status = input<CheckoutStatus | string>('');
  readonly kind = input<PurchasableKind>('live');
  readonly id = input('');
  readonly ref = input('');

  protected readonly i18n = inject(LanguageService);
  private readonly commerce = inject(CommerceService);
  private readonly router = inject(Router);

  private readonly settings = toSignal(this.commerce.getSettings());
  protected readonly isDemo = computed(() => this.settings()?.providerConnected === false);
  protected readonly demoStates = ['processing', 'success', 'failed', 'cancelled', 'submitted'];
  protected readonly now = new Date();

  protected readonly state = computed(() => this.status());
  protected readonly reference = computed(() => this.ref() || 'ME-2026-11-04821');
  protected readonly item = toSignal(
    toObservable(computed(() => [this.kind(), this.id()] as const)).pipe(
      switchMap(([k, id]) => (id ? this.commerce.getPurchasable(k, id) : of(null))),
    ),
  );
  protected readonly itemLink = computed(() => (this.kind() === 'live' ? ['/live', this.id()] : ['/lectures']));

  /** Seat-hold countdown for the cancelled state (seconds). */
  protected readonly holdLeft = signal(12 * 60 + 40);
  protected readonly holdText = computed(() => {
    const s = this.holdLeft();
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  });

  constructor() {
    const timer = setInterval(() => this.holdLeft.update((s) => Math.max(0, s - 1)), 1000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));

    // Demo only: simulate the server confirming the order a moment after the provider returns.
    effect((onCleanup) => {
      if (this.state() === 'processing') {
        const t = setTimeout(() => {
          this.router.navigate([], { queryParams: { status: 'success' }, queryParamsHandling: 'merge', replaceUrl: true });
        }, 2500);
        onCleanup(() => clearTimeout(t));
      } else if (this.state() === 'success' && this.id()) {
        this.commerce.recordPurchase(this.kind(), this.id(), this.reference());
      }
    });
  }

  protected print(): void {
    window.print();
  }
}
