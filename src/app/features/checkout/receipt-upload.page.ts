import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { switchMap } from 'rxjs';
import { AuthService } from '../../core/data/auth.service';
import { CommerceService, EG_PHONE, normalizePhone } from '../../core/data/commerce.service';
import { LocalizePipe, TranslatePipe } from '../../core/i18n/translate.pipe';
import { ManualMethod, PurchasableKind } from '../../core/models/commerce';
import { StatePanelComponent } from '../../shared/ui/state-panel.component';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = /\.(jpe?g|png|pdf)$/i;

/** /checkout/:kind/:id/manual — InstaPay / Vodafone Cash transfer + receipt upload. */
@Component({
  selector: 'app-receipt-upload',
  imports: [ReactiveFormsModule, RouterLink, LucideAngularModule, TranslatePipe, LocalizePipe, DecimalPipe, StatePanelComponent],
  template: `
    <section class="container-page py-8 md:py-12">
      <nav class="flex flex-wrap items-center gap-2 text-sm text-ink-muted" [attr.aria-label]="'pay.breadcrumb' | t">
        <a [routerLink]="kind() === 'live' ? '/live' : '/lectures'" class="hover:text-ink">{{ (kind() === 'live' ? 'nav.live' : 'nav.lectures') | t }}</a>
        <lucide-icon name="chevron-right" [size]="14" class="flip-rtl" />
        <a [routerLink]="['/checkout', kind(), id()]" class="hover:text-ink">{{ 'pay.checkout.crumb' | t }}</a>
        <lucide-icon name="chevron-right" [size]="14" class="flip-rtl" />
        <span class="font-medium text-ink">{{ 'pay.manual.crumb' | t }}</span>
      </nav>

      @if (item() === undefined) {
        <div class="mt-8 h-96 animate-pulse rounded-card-lg bg-surface-tint3"></div>
      } @else if (item() === null || !auth.user()) {
        <app-state-panel class="mt-10" icon="circle-alert" [title]="(item() === null ? 'pay.notFound.title' : 'pay.login.title') | t"
          [text]="(item() === null ? 'pay.notFound.text' : 'pay.login.text') | t">
          <a actions [routerLink]="item() === null ? '/live' : '/login'" class="btn btn-primary">{{ (item() === null ? 'pay.backTo' : 'nav.login') | t }}</a>
        </app-state-panel>
      } @else {
        @let it = item()!;
        <header class="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 class="font-display text-[1.75rem] font-bold leading-9 md:text-[2rem] md:leading-10">{{ 'pay.manual.pageTitle' | t }}</h1>
            <p class="mt-2 max-w-2xl text-ink-body">{{ 'pay.manual.pageText' | t: { n: (it.priceEgp | number) ?? '' } }}</p>
          </div>
          <span class="tag tone-warning self-start px-3 py-1 text-xs md:self-auto"><lucide-icon name="hourglass" [size]="13" /> {{ 'pay.manual.pending' | t }}</span>
        </header>

        <div class="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside class="card space-y-5 p-5 sm:p-6">
            <h2 class="font-display text-lg font-bold">{{ 'pay.manual.howTitle' | t }}</h2>
            <ol class="space-y-4">
              @for (s of [1, 2, 3]; track s) {
                <li class="flex gap-3">
                  <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-display text-xs font-bold text-white">{{ s }}</span>
                  <span>
                    <span class="block font-display text-sm font-semibold text-ink">{{ 'pay.manual.step' + s + 'Title' | t: { n: (it.priceEgp | number) ?? '' } }}</span>
                    <span class="block text-[0.8125rem] leading-5 text-ink-body">{{ 'pay.manual.step' + s + 'Text' | t }}</span>
                  </span>
                </li>
              }
            </ol>
            <p class="note tone-gold border-t-0">
              <lucide-icon name="info" [size]="16" class="mt-0.5 shrink-0" /> {{ 'pay.manual.seatNote' | t }}
            </p>
            <div class="kv-box">
              <div class="kv"><span>{{ 'pay.item' | t }}</span><span>{{ it.title | loc }}</span></div>
              <div class="kv"><span>{{ 'pay.summary.total' | t }}</span><span>{{ 'access.price' | t: { n: (it.priceEgp | number) ?? '' } }}</span></div>
            </div>
          </aside>

          <form class="card min-w-0 space-y-6 p-5 sm:p-6" [formGroup]="form" (ngSubmit)="submit()" novalidate>
            <fieldset>
              <legend class="font-display text-lg font-bold">{{ 'pay.manual.transferTo' | t }}</legend>
              <div class="mt-4 space-y-3" role="radiogroup">
                @for (acc of accounts(); track acc.method) {
                  <label class="flex cursor-pointer items-center gap-3 rounded-card-lg border p-4 transition"
                    [class]="form.controls.method.value === acc.method ? 'border-primary bg-surface-warm ring-1 ring-primary' : 'border-line hover:border-primary/40'">
                    <input type="radio" class="sr-only" formControlName="method" [value]="acc.method" />
                    <span class="grid h-5 w-5 shrink-0 place-items-center rounded-full border-[1.5px]" [class]="form.controls.method.value === acc.method ? 'border-primary' : 'border-ink-muted'">
                      @if (form.controls.method.value === acc.method) { <span class="h-2.5 w-2.5 rounded-full bg-primary"></span> }
                    </span>
                    <span class="icon-tile" [class.bg-surface-highlight]="form.controls.method.value === acc.method"><lucide-icon [name]="acc.icon" [size]="18" /></span>
                    <span class="min-w-0 flex-1">
                      <span class="block font-display text-[0.9375rem] font-bold text-ink">{{ 'pay.manual.' + acc.method | t }}</span>
                      <span class="block truncate text-sm font-medium text-ink-body" dir="ltr">{{ acc.value }}</span>
                    </span>
                    <button type="button" class="btn btn-soft btn-sm shrink-0" (click)="copy(acc.value, acc.method)">
                      <lucide-icon [name]="copied() === acc.method ? 'check' : 'copy'" [size]="14" />
                      <span class="hide-mobile">{{ (copied() === acc.method ? 'pay.manual.copied' : 'pay.manual.copy') | t }}</span>
                    </button>
                  </label>
                }
              </div>
            </fieldset>

            <div class="grid gap-5 border-t border-line/70 pt-6 sm:grid-cols-2">
              <div>
                <label for="r-phone" class="field-label">{{ 'pay.manual.sender' | t }}</label>
                <div class="relative">
                  <lucide-icon name="phone" [size]="18" class="input-icon" />
                  <input id="r-phone" formControlName="phone" type="tel" inputmode="tel" placeholder="010 1234 5678"
                    class="input [unicode-bidi:plaintext]" [class.input-invalid]="phoneErr()" />
                </div>
                @if (phoneErr()) { <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'pay.errors.phone' | t }}</p> }
              </div>
              <div>
                <label for="r-ref" class="field-label">{{ 'pay.manual.reference' | t }}</label>
                <div class="relative">
                  <lucide-icon name="receipt" [size]="18" class="input-icon" />
                  <input id="r-ref" formControlName="reference" placeholder="IP-88412097"
                    class="input [unicode-bidi:plaintext]" [class.input-invalid]="refErr()" />
                </div>
                @if (refErr()) {
                  <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'pay.errors.reference' | t }}</p>
                } @else {
                  <p class="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted"><lucide-icon name="info" [size]="13" />{{ 'pay.manual.referenceHint' | t }}</p>
                }
              </div>
            </div>

            <div>
              <p class="field-label">{{ 'pay.manual.screenshot' | t }}</p>
              <label for="r-file" (dragover)="$event.preventDefault(); drag.set(true)" (dragleave)="drag.set(false)" (drop)="drop($event)"
                class="flex cursor-pointer flex-col items-center gap-2 rounded-card-lg border-2 border-dashed p-6 text-center transition sm:p-8"
                [class]="drag() ? 'border-primary bg-surface-tint' : (fileErr() ? 'border-danger bg-danger-soft/40' : 'border-primary-light/50 bg-surface-warm hover:border-primary')">
                <span class="icon-tile h-12 w-12 bg-surface-highlight/70"><lucide-icon name="cloud-upload" [size]="22" /></span>
                <span class="font-display text-[0.9375rem] font-semibold text-ink">{{ 'pay.manual.drop' | t }}</span>
                <span class="text-[0.8125rem] text-ink-muted">{{ 'pay.manual.dropHint' | t }}</span>
                <input id="r-file" type="file" accept=".jpg,.jpeg,.png,.pdf" class="sr-only" (change)="pick($event)" />
              </label>
              @if (fileErr()) { <p class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ fileErr()! | t }}</p> }
              @if (file(); as f) {
                <div class="mt-3 flex items-center gap-3 rounded-card border border-line bg-white p-3.5">
                  <span class="icon-tile tone-success"><lucide-icon [name]="f.name.endsWith('.pdf') ? 'file-text' : 'image'" [size]="18" /></span>
                  <span class="min-w-0 flex-1">
                    <span class="flex items-center justify-between gap-3">
                      <span class="truncate font-display text-sm font-semibold text-ink" dir="ltr">{{ f.name }}</span>
                      <span class="shrink-0 text-xs text-ink-muted">{{ (f.size / 1048576) | number: '1.1-1' }} MB</span>
                    </span>
                    <span class="progress-track mt-2 block h-1.5"><span class="progress-fill block w-full bg-success-mid"></span></span>
                  </span>
                  <button type="button" class="btn-icon border-0" (click)="file.set(null)" [attr.aria-label]="'pay.manual.remove' | t">
                    <lucide-icon name="trash-2" [size]="16" />
                  </button>
                </div>
              }
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-full" [disabled]="busy()">
              @if (busy()) {
                <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"></span>
              } @else {
                <lucide-icon name="send" [size]="16" class="flip-rtl" />
              }
              {{ 'pay.manual.submit' | t }}
            </button>
          </form>
        </div>
      }
    </section>
  `,
})
export class ReceiptUploadPage {
  readonly kind = input.required<PurchasableKind>();
  readonly id = input.required<string>();

  protected readonly auth = inject(AuthService);
  private readonly commerce = inject(CommerceService);
  private readonly router = inject(Router);

  protected readonly settings = toSignal(this.commerce.getSettings());
  protected readonly item = toSignal(
    toObservable(computed(() => [this.kind(), this.id()] as const)).pipe(
      switchMap(([k, id]) => this.commerce.getPurchasable(k, id)),
    ),
  );
  protected readonly accounts = computed(() => {
    const s = this.settings();
    if (!s) return [];
    return [
      { method: 'instapay' as ManualMethod, icon: 'landmark', value: s.instapayAddress },
      { method: 'vodafone' as ManualMethod, icon: 'smartphone', value: s.vodafoneNumber },
    ];
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    method: ['instapay' as ManualMethod],
    phone: ['', Validators.required],
    reference: ['', [Validators.required, Validators.minLength(6)]],
  });

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly drag = signal(false);
  protected readonly copied = signal<ManualMethod | null>(null);
  protected readonly file = signal<File | null>(null);
  protected readonly fileErr = signal<string | null>(null);

  protected phoneErr(): boolean {
    const c = this.form.controls.phone;
    return !EG_PHONE.test(normalizePhone(c.value)) && (c.touched || this.submitted());
  }

  protected refErr(): boolean {
    const c = this.form.controls.reference;
    return c.invalid && (c.touched || this.submitted());
  }

  protected copy(value: string, method: ManualMethod): void {
    navigator.clipboard?.writeText(value.replace(/\s/g, '')).catch(() => {});
    this.copied.set(method);
    setTimeout(() => this.copied.set(null), 1500);
  }

  protected pick(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.setFile(input.files?.[0] ?? null);
    input.value = '';
  }

  protected drop(e: DragEvent): void {
    e.preventDefault();
    this.drag.set(false);
    this.setFile(e.dataTransfer?.files?.[0] ?? null);
  }

  private setFile(f: File | null): void {
    if (!f) return;
    if (!ALLOWED.test(f.name)) return this.fileErr.set('pay.errors.fileType');
    if (f.size > MAX_BYTES) return this.fileErr.set('pay.errors.fileSize');
    this.fileErr.set(null);
    this.file.set(f);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (!this.file()) this.fileErr.set('pay.errors.fileRequired');
    if (this.phoneErr() || this.form.invalid || !this.file()) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.busy.set(true);
    this.commerce
      .submitReceipt({
        kind: this.kind(),
        itemId: this.id(),
        method: v.method,
        senderPhone: normalizePhone(v.phone),
        reference: v.reference.trim(),
        fileName: this.file()!.name,
      })
      .subscribe(({ reference }) =>
        this.router.navigate(['/checkout/result'], {
          queryParams: { status: 'submitted', kind: this.kind(), id: this.id(), ref: reference },
        }),
      );
  }
}
