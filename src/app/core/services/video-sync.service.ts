import { Injectable } from '@angular/core';

/**
 * Ensures only ONE video plays at any given time across the entire application.
 * When any video begins playback, all other video elements in the DOM are immediately paused.
 */
@Injectable({
  providedIn: 'root',
})
export class VideoSyncService {
  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener(
        'play',
        (event: Event) => {
          const playingEl = event.target as HTMLVideoElement;
          if (playingEl && playingEl.tagName === 'VIDEO') {
            const allVideos = document.querySelectorAll('video');
            allVideos.forEach((v) => {
              if (v !== playingEl && !v.paused) {
                v.pause();
              }
            });
          }
        },
        true // Capture phase ensures it triggers immediately on every video play
      );
    }
  }
}
