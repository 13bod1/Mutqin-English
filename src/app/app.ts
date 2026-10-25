import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminService } from './core/data/admin.service';
import { LanguageService } from './core/i18n/language.service';
import { VideoSyncService } from './core/services/video-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class App {
  // Instantiated at startup so <html lang/dir> is set before the first paint.
  protected readonly i18n = inject(LanguageService);
  // Ensures only one video plays at a time across the entire site
  protected readonly videoSync = inject(VideoSyncService);
  // Ensures global themes, announcements, and state are active across all pages
  protected readonly admin = inject(AdminService);
}
