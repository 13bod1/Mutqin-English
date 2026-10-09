import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { TranslatePipe } from '../core/i18n/translate.pipe';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, LucideAngularModule, TranslatePipe],
  template: `
    <section class="container-page grid min-h-[60vh] place-items-center py-20 text-center">
      <div>
        <span class="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-card-lg bg-surface-tint text-primary">
          <lucide-icon name="book-open" [size]="28" />
        </span>
        <h1 class="h-section">{{ 'notFound.title' | t }}</h1>
        <p class="mt-3 text-ink-body">{{ 'notFound.text' | t }}</p>
        <a routerLink="/" class="btn btn-primary mt-8">{{ 'notFound.back' | t }}</a>
      </div>
    </section>
  `,
})
export class NotFoundPage {}
