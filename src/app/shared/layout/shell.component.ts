import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FooterComponent } from './footer.component';
import { HeaderComponent } from './header.component';
import { AdminService } from '../../core/data/admin.service';

/** Page frame shared by every route: header, content, footer. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, HeaderComponent, FooterComponent],
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    <app-header />
    <main id="main" class="flex-1"><router-outlet /></main>
    <app-footer />
  `,
})
export class ShellComponent {
  // Ensures theme is hydrated from mutqin_admin_settings
  protected readonly admin = inject(AdminService);
}
