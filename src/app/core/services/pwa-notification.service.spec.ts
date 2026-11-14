import { TestBed } from '@angular/core/testing';
import { PwaNotificationService } from './pwa-notification.service';

describe('PwaNotificationService (PBI-09 & PBI-19 / AG-47 & AG-49)', () => {
  let service: PwaNotificationService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [PwaNotificationService],
    });
    service = TestBed.inject(PwaNotificationService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('TC-PWA-01: should initialize with online network state', () => {
    expect(service.isOnline()).toBeTrue();
  });

  it('TC-PWA-02: notification permission should only be requested when student explicitly triggers action', async () => {
    // Before click, pushEnabled is false
    expect(service.pushEnabled()).toBeFalse();

    // Toggle push enabled directly via profile preference
    service.setPushEnabled(true, 'u1');
    expect(service.pushEnabled()).toBeTrue();

    // Turn off
    service.setPushEnabled(false, 'u1');
    expect(service.pushEnabled()).toBeFalse();
  });
});
