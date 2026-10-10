import { TestBed } from '@angular/core';
import { VideoSyncService } from './video-sync.service';

describe('VideoSyncService', () => {
  let service: VideoSyncService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [VideoSyncService],
    });
    service = TestBed.inject(VideoSyncService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should pause other playing videos when a video play event fires', () => {
    const video1 = document.createElement('video');
    const video2 = document.createElement('video');
    document.body.appendChild(video1);
    document.body.appendChild(video2);

    spyOnProperty(video1, 'paused', 'get').and.returnValue(false);
    const pauseSpy = spyOn(video1, 'pause');

    // Simulate play event on video2
    const playEvent = new Event('play', { bubbles: true });
    Object.defineProperty(playEvent, 'target', { value: video2, enumerable: true });

    document.dispatchEvent(playEvent);

    expect(pauseSpy).toHaveBeenCalled();

    document.body.removeChild(video1);
    document.body.removeChild(video2);
  });
});
