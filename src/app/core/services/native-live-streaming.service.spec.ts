import { TestBed } from '@angular/core/testing';
import { take } from 'rxjs';
import { NativeLiveStreamingService } from './native-live-streaming.service';

describe('NativeLiveStreamingService (PBI-18 / AG-46 & AG-108)', () => {
  let service: NativeLiveStreamingService;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [NativeLiveStreamingService],
    });
    service = TestBed.inject(NativeLiveStreamingService);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('TC-LIVE-01: should initiate in-browser broadcaster session and update state signals', async () => {
    const started = await service.startBroadcast('live_session_101');
    expect(started).toBeTrue();
    expect(service.isBroadcasting()).toBeTrue();
    expect(service.isRecording()).toBeTrue();
  });

  it('TC-LIVE-02: delay should stay strictly under 10 seconds on 4G delivery', (done) => {
    service.streamStats$.pipe(take(1)).subscribe((stats) => {
      // Under 10,000ms threshold per acceptance criteria
      expect(stats.latencyMs).toBeLessThan(10000);
      expect(stats.latencyMs).toBeGreaterThan(0);
      expect(stats.connectionState).toBe('connected');
      done();
    });
  });

  it('TC-LIVE-03: should reconnect automatically after network drop simulation', (done) => {
    let reconnectingSeen = false;
    let finished = false;

    const sub = service.simulateNetworkDropAndReconnect().subscribe((stats) => {
      if (stats.connectionState === 'reconnecting') {
        reconnectingSeen = true;
      } else if (stats.connectionState === 'connected' && reconnectingSeen && !finished) {
        finished = true;
        expect(stats.latencyMs).toBeLessThan(10000);
        sub.unsubscribe();
        done();
      }
    });
  });

  it('TC-LIVE-04: stopping broadcast should auto-save recording and publish as a lecture', () => {
    service.startBroadcast('live_session_grammar');
    const res = service.stopBroadcastAndArchive('live_session_grammar', 'Thanawya Revision Grammar Masterclass');

    expect(service.isBroadcasting()).toBeFalse();
    expect(res.lectureId).toBeDefined();
    expect(res.lecture.title?.en).toContain('Thanawya Revision');

    // Stored in localStorage so it appears in lectures catalog
    const raw = localStorage.getItem('mutqin_admin_lectures');
    expect(raw).toBeTruthy();
    expect(raw).toContain(res.lectureId);
  });

  it('TC-LIVE-05: external streaming fallback link remains available as backup', () => {
    const backupUrl = service.externalBackupUrl();
    expect(backupUrl).toBeTruthy();
    expect(backupUrl).toContain('youtube.com');
  });
});
