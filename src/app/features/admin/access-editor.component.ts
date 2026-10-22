import { Component, model } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { Access, AccessType } from '../../core/models/commerce';

/** Lets the owner choose how a lecture / live session is unlocked: free, included, or paid at a price. */
@Component({
  selector: 'app-access-editor',
  imports: [FormsModule, LucideAngularModule, TranslatePipe],
  template: `
    <fieldset>
      <legend class="field-label">{{ 'admin.access.label' | t }}</legend>
      <div class="grid gap-2 sm:grid-cols-3" role="radiogroup">
        @for (o of options; track o.type) {
          <button type="button" role="radio" [attr.aria-checked]="value().type === o.type" (click)="set(o.type)"
            class="flex flex-col items-start gap-1 rounded-card border p-3 text-start transition"
            [class]="value().type === o.type ? 'border-primary bg-surface-warm ring-1 ring-primary' : 'border-line hover:border-primary/40'">
            <span class="flex items-center gap-2 font-display text-sm font-bold text-ink"><lucide-icon [name]="o.icon" [size]="15" class="text-primary" />{{ 'admin.access.' + o.type | t }}</span>
            <span class="text-xs leading-4 text-ink-muted">{{ 'admin.access.' + o.type + 'Hint' | t }}</span>
          </button>
        }
      </div>
      @if (value().type === 'paid') {
        <label class="mt-4 block">
          <span class="field-label">{{ 'admin.access.price' | t }}</span>
          <span class="relative block">
            <input type="number" min="1" step="5" class="input input-plain pe-16" [ngModel]="value().priceEgp" (ngModelChange)="setPrice($event)" />
            <span class="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 font-display text-sm font-semibold text-ink-muted">{{ 'admin.egp' | t }}</span>
          </span>
          @if (!value().priceEgp || value().priceEgp! <= 0) {
            <span class="field-error"><lucide-icon name="circle-alert" [size]="14" />{{ 'admin.access.priceError' | t }}</span>
          }
        </label>
      }
    </fieldset>
  `,
})
export class AccessEditorComponent {
  readonly value = model.required<Access>();
  /** Price suggested when switching to paid. */
  readonly defaultPrice = model(350);

  protected readonly options: { type: AccessType; icon: string }[] = [
    { type: 'free', icon: 'globe' },
    { type: 'included', icon: 'users' },
    { type: 'paid', icon: 'ticket' },
  ];

  protected set(type: AccessType): void {
    this.value.set(type === 'paid' ? { type, priceEgp: this.value().priceEgp ?? this.defaultPrice() } : { type });
  }

  protected setPrice(p: number): void {
    this.value.set({ type: 'paid', priceEgp: Number(p) || 0 });
  }
}
