import { TestBed } from '@angular/core/testing';
import { LucideAngularModule } from 'lucide-angular';
import { APP_ICONS } from './app/core/icons';

beforeEach(() => {
  TestBed.configureTestingModule({
    imports: [LucideAngularModule.pick(APP_ICONS)],
  });
});
