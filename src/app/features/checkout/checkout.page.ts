import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/data/auth.service';
import { CommerceService, EG_PHONE, normalizePhone } from '../../core/data/commerce.service';
import { LanguageService } from '../../core/i18n/language.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { PurchasableKind } from '../../core/models/commerce';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

type Method = 'online' | 'manual';

/** /checkout/:kind/:id — choose a payment method for a paid lecture or live session. */
@Component({
  selector: 'app-checkout',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DecimalPipe, DatePipe, StatePanelComponent],
  template: `
    <section class="container-page py-8 md:py-12">
      <nav class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" [attr.aria-label]="'pay.breadcrumb' | t">
        <a [routerLink]="backLink()" class="hover:text-ink">{{ (kind() === 'live' ? 'nav.live' : 'nav.lectures') | t }}</a>
        <lucide-icon name="chevron-right" [size]="14" class="flip-rtl" />
        <span class="font-medium text-ink">{{ 'pay.checkout.crumb' | t }}</span>
      </nav>

      @if (item() === undefined) {
        <div class="mt-8 h-96 animate-pulse rounded-card-lg bg-surface-tint3"></div>
      } @else if (item() === null) {
        <app-state-panel class="mt-10" icon="circle-alert" [title]="'pay.notFound.title' | t" [text]="'pay.notFound.text' | t">
          <a actions [routerLink]="backLink()" class="btn btn-primary">{{ 'pay.backTo' | t }}</a>
        </app-state-panel>
      } @else if (!auth.user()) {
        <app-state-panel class="mt-10" icon="lock" [title]="'pay.login.title' | t" [text]="'pay.login.text' | t">
          <a actions routerLink="/login" class="btn btn-primary">{{ 'nav.login' | t }}</a>
          <a actions routerLink="/signup" class="btn btn-soft">{{ 'nav.signup' | t }}</a>
        </app-state-panel>
      } @else if (owned(); as p) {
        <!-- Duplicate notice -->
        <app-state-panel class="mt-10" icon="badge-check" [title]="'pay.duplicate.title' | t"
          [text]="'pay.duplicate.text' | t: { date: (p.paidAt | date: 'd MMM y' : 'Africa/Cairo' : i18n.lang()) ?? '' }">
          <div details class="kv-box">
            <div class="kv"><span>{{ 'pay.item' | t }}</span><span>{{ item()!.title | loc }}</span></div>
            <div class="kv"><span>{{ 'pay.paidWith' | t }}</span><span>{{ p.method }}</span></div>
            <div class="kv"><span>{{ 'pay.reference' | t }}</span><span dir="ltr">{{ p.reference }}</span></div>
          </div>
          <p details class="note tone-brand">
            <lucide-icon name="info" [size]="18" class="mt-0.5 shrink-0" />
            {{ 'pay.duplicate.note' | t }}
          </p>
          <a actions href="https://wa.me/" target="_blank" rel="noopener" class="btn btn-soft">
            <lucide-icon name="message-circle" [size]="16" /> {{ 'pay.contactSupport' | t }}
          </a>
          <a actions [routerLink]="itemLink()" class="btn btn-primary">
            {{ 'pay.goToItem' | t }} <lucide-icon name="arrow-right" [size]="16" class="flip-rtl" />
          </a>
        </app-state-panel>
      } @else {
        @let it = item()!;
        <header class="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="font-display text-[1.75rem] font-bold leading-9 md:text-[2rem] md:leading-10">{{ 'pay.checkout.title' | t }}</h1>
            <p class="mt-2 max-w-2xl text-ink-body">{{ 'pay.checkout.subtitle' | t }}</p>
          </div>
          <span class="pill self-start bg-white md:self-auto">
            <lucide-icon name="shield-check" [size]="14" /> {{ 'pay.checkout.step' | t }}
          </span>
        </header>

        <div class="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div class="space-y-6">
            <!-- Methods -->
            <div class="card p-5 sm:p-6" role="radiogroup" [attr.aria-label]="'pay.checkout.methods' | t">
              <h2 class="font-display text-xl font-bold">{{ 'pay.checkout.methods' | t }}</h2>
              <p class="mt-1 text-sm text-ink-muted">{{ 'pay.checkout.hold' | t: { n: settings()?.seatHoldMinutes ?? 15 } }}</p>

              <div class="mt-5 space-y-4">
                <button type="button" role="radio" [attr.aria-checked]="method() === 'online'" (click)="method.set('online')"
                  class="w-full rounded-card-lg border p-4 text-start transition sm:p-5"
                  [class]="method() === 'online' ? 'border-primary bg-surface-warm ring-1 ring-primary' : 'border-line bg-white hover:border-primary/40'">
                  <div class="flex items-start gap-3 sm:items-center sm:gap-4">
                    <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] sm:mt-0" [class]="method() === 'online' ? 'border-primary' : 'border-ink-muted'">
                      @if (method() === 'online') { <span class="h-2.5 w-2.5 rounded-full bg-primary"></span> }
                    </span>
                    <span class="icon-tile h-11 w-11 bg-surface-highlight/60"><lucide-icon name="credit-card" [size]="20" /></span>
                    <span class="flex-1">
                      <span class="flex flex-wrap items-center gap-2">
                        <span class="font-display text-base font-bold text-ink">{{ 'pay.online.title' | t }}</span>
                        <span class="tag tone-success">{{ 'pay.online.badge' | t }}</span>
                      </span>
                      <span class="mt-1 block text-sm text-ink-body">{{ 'pay.online.text' | t }}</span>
                    </span>
                  </div>
                  @if (method() === 'online') {
                    <span class="mt-4 flex flex-wrap gap-2 ps-8 sm:ps-[4.25rem]">
                      @for (b of brands; track b) {
                        <span class="rounded-lg border border-line bg-white px-2.5 py-1 font-display text-xs font-semibold text-ink-soft">{{ b }}</span>
                      }
                    </span>
                    <span class="note tone-brand mt-4 bg-surface-tint">
                      <lucide-icon name="shield-check" [size]="18" class="mt-0.5 shrink-0 text-success" />
                      {{ 'pay.online.redirect' | t }}
                    </span>
                    @if (settings() && !settings()!.providerConnected) {
                      <span class="note tone-warning mt-3">
                        <lucide-icon name="info" [size]="18" class="mt-0.5 shrink-0" />
                        {{ 'pay.online.demo' | t }}
                      </span>
                    }
                  }
                </button>

                @if (settings()?.manualEnabled) {
                  <button type="button" role="radio" [attr.aria-checked]="method() === 'manual'" (click)="method.set('manual')"
                    class="w-full rounded-card-lg border p-4 text-start transition sm:p-5"
                    [class]="method() === 'manual' ? 'border-primary bg-surface-warm ring-1 ring-primary' : 'border-line bg-white hover:border-primary/40'">
                    <div class="flex items-start gap-3 sm:items-center sm:gap-4">
                      <span class="mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px] sm:mt-0" [class]="method() === 'manual' ? 'border-primary' : 'border-ink-muted'">
                        @if (method() === 'manual') { <span class="h-2.5 w-2.5 rounded-full bg-primary"></span> }
                      </span>
                      <span class="icon-tile h-11 w-11"><lucide-icon name="smartphone" [size]="20" /></span>
                      <span class="flex-1">
                        <span class="flex flex-wrap items-center gap-2">
                          <span class="font-display text-base font-bold text-ink">{{ 'pay.manual.title' | t }}</span>
                          <span class="tag tone-warning">{{ 'pay.manual.badge' | t }}</span>
                        </span>
                        <span class="mt-1 block text-sm text-ink-body">{{ 'pay.manual.text' | t }}</span>
                      </span>
                    </div>
                  </button>
                }
              </div>
            </div>

            <!-- Billing details -->
            @if (method() === 'online') {
              <form class="card space-y-5 p-5 sm:p-6" [formGroup]="form" (ngSubmit)="pay()" novalidate id="billing">
                <h2 class="font-display text-lg font-bold">{{ 'pay.billing.title' | t }}</h2>
                <div class="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label for="bill-name" class="field-label">{{ 'pay.billing.name' | t }}</label>
                    <div class="relative">
                      <lucide-icon name="user" [size]="18" class="input-icon" />
                      <input id="bill-name" formControlName="name" autocomplete="name" class="input" [class.input-invalid]="err('name')" />
                    </div>
                    @if (err('name')) { <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'pay.errors.name' | t }}</p> }
                  </div>
                  <div>
                    <label for="bill-phone" class="field-label">{{ 'pay.billing.phone' | t }}</label>
                    <div class="relative">
                      <lucide-icon name="phone" [size]="18" class="input-icon" />
                      <input id="bill-phone" formControlName="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="010 1234 5678"
                        class="input [unicode-bidi:plaintext]" [class.input-invalid]="err('phone')" />
                    </div>
                    @if (err('phone')) { <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'pay.errors.phone' | t }}</p> }
                  </div>
                </div>
                <div>
                  <label for="bill-email" class="field-label">{{ 'pay.billing.email' | t }}</label>
                  <div class="relative">
                    <lucide-icon name="mail" [size]="18" class="input-icon" />
                    <input id="bill-email" formControlName="email" type="email" autocomplete="email" class="input [unicode-bidi:plaintext]" [class.input-invalid]="err('email')" />
                  </div>
                  @if (err('email')) {
                    <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'auth.errors.emailInvalid' | t }}</p>
                  } @else {
                    <p class="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted"><lucide-icon name="info" [size]="13" />{{ 'pay.billing.emailHint' | t }}</p>
                  }
                </div>
              </form>
            }
          </div>

          <!-- Order summary -->
          <aside class="card space-y-5 p-5 shadow-lift sm:p-6 lg:sticky lg:top-24">
            <h2 class="font-display text-lg font-bold">{{ 'pay.summary.title' | t }}</h2>
            <div class="flex gap-3.5">
              <span class="icon-tile h-12 w-12 bg-primary text-white"><lucide-icon [name]="it.kind === 'live' ? 'radio' : 'circle-play'" [size]="22" /></span>
              <div>
                <p class="font-display text-[0.9375rem] font-bold leading-5 text-ink">{{ it.title | loc }}</p>
                <p class="mt-1 text-[0.8125rem] text-ink-muted">{{ it.subtitle | loc }}</p>
              </div>
            </div>
            <div class="space-y-3 border-y border-line/70 py-5 text-sm">
              <div class="kv"><span>{{ 'pay.summary.price' | t }}</span><span>{{ 'access.price' | t: { n: (it.priceEgp | number) ?? '' } }}</span></div>
              <div class="kv"><span>{{ 'pay.summary.includes' | t }}</span><span class="!font-medium !text-ink-body">{{ it.includes | loc }}</span></div>
              <div class="kv"><span>{{ 'pay.summary.fee' | t }}</span><span>{{ 'access.price' | t: { n: 0 } }}</span></div>
              <div class="flex gap-2 pt-2">
                <div class="relative flex-1">
                  <lucide-icon name="tag" [size]="16" class="input-icon" />
                  <input [value]="promo()" (input)="promo.set($any($event.target).value)" [placeholder]="'pay.summary.promo' | t"
                    class="input h-10 text-sm" [attr.aria-label]="'pay.summary.promo' | t" />
                </div>
                <button type="button" class="btn btn-soft" (click)="applyPromo()">{{ 'pay.summary.apply' | t }}</button>
              </div>
              @if (promoMsg()) { <p class="field-error">{{ 'pay.summary.promoInvalid' | t }}</p> }
            </div>
            <div class="flex items-center justify-between">
              <span class="font-display text-base font-bold text-ink">{{ 'pay.summary.total' | t }}</span>
              <span class="font-display text-[1.75rem] font-extrabold text-ink">{{ 'access.price' | t: { n: (it.priceEgp | number) ?? '' } }}</span>
            </div>
            @if (method() === 'online') {
              <button type="submit" form="billing" class="btn btn-primary btn-lg w-full" [disabled]="busy()">
                @if (busy()) {
                  <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span> {{ 'pay.redirecting' | t }}
                } @else {
                  <lucide-icon name="lock" [size]="16" /> {{ 'pay.online.cta' | t }} <lucide-icon name="arrow-right" [size]="16" class="flip-rtl" />
                }
              </button>
            } @else {
              <a [routerLink]="['/checkout', it.kind, it.id, 'manual']" class="btn btn-primary btn-lg w-full">
                {{ 'pay.manual.cta' | t }} <lucide-icon name="arrow-right" [size]="16" class="flip-rtl" />
              </a>
            }
            <p class="flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
              <lucide-icon name="shield-check" [size]="14" class="text-success" /> {{ 'pay.summary.secure' | t }}
            </p>
          </aside>
        </div>
      }
    </section>
  `,
})
export class CheckoutPage {
  readonly kind = input.required<PurchasableKind>();
  readonly id = input.required<string>();

  protected readonly auth = inject(AuthService);
  protected readonly i18n = inject(LanguageService);
  private readonly commerce = inject(CommerceService);
  private readonly router = inject(Router);

  protected readonly brands = ['Visa', 'Mastercard', 'Meeza', 'Wallets'];
  protected readonly method = signal<Method>('online');
  protected readonly busy = signal(false);
  protected readonly submitted = signal(false);
  protected readonly promo = signal('');
  protected readonly promoMsg = signal(false);

  protected readonly settings = toSignal(this.commerce.getSettings());
  protected readonly item = toSignal(
    toObservable(computed(() => [this.kind(), this.id()] as const)).pipe(
      switchMap(([k, id]) => this.commerce.getPurchasable(k, id)),
    ),
  );
  protected readonly owned = computed(() => this.commerce.purchase(this.kind(), this.id()));

  protected readonly backLink = computed(() => (this.kind() === 'live' ? '/live' : '/lectures'));
  protected readonly itemLink = computed(() => (this.kind() === 'live' ? ['/live', this.id()] : ['/lectures']));

  protected readonly form = inject(NonNullableFormBuilder).group({
    name: [this.auth.user()?.fullName ?? '', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required]],
    email: [this.auth.user()?.email ?? '', [Validators.required, Validators.email]],
  });

  protected err(name: 'name' | 'phone' | 'email'): boolean {
    const c = this.form.controls[name];
    if (name === 'phone') {
      const bad = !EG_PHONE.test(normalizePhone(c.value));
      return bad && (c.touched || this.submitted());
    }
    return c.invalid && (c.touched || this.submitted());
  }

  protected applyPromo(): void {
    this.promoMsg.set(!!this.promo().trim());
  }

  protected pay(): void {
    this.submitted.set(true);
    if (this.form.invalid || !EG_PHONE.test(normalizePhone(this.form.controls.phone.value))) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.commerce.startOnlinePayment(this.kind(), this.id()).subscribe(({ reference, redirectUrl }) => {
      if (redirectUrl) {
        window.location.href = redirectUrl;
        return;
      }
      // No provider yet: simulate the provider redirecting back to us.
      this.router.navigate(['/checkout/result'], {
        queryParams: { status: 'processing', kind: this.kind(), id: this.id(), ref: reference },
      });
    });
  }
}
