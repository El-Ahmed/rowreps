import { Injectable, signal } from '@angular/core';

// When a lift's rest ends, and how long it is in all, in seconds.
export type RestTimer = { end: number; total: number };

// Each lift's rest timer, by exercise id. It lives outside the lift screen,
// so leaving a lift and coming back finds its rest where it got to.
// It counts from the clock, so it keeps going while the screen or the app is away.
@Injectable({ providedIn: 'root' })
export class RestTimers {
  readonly byLift = signal<Record<string, RestTimer>>({});

  start(id: string, seconds: number): void {
    this.byLift.update((timers) => ({
      ...timers,
      [id]: { end: Date.now() + seconds * 1000, total: seconds },
    }));
  }

  // Adds to what is left, or to now once the rest is over.
  add(id: string, seconds: number): void {
    this.byLift.update((timers) => {
      const end = Math.max(timers[id].end, Date.now()) + seconds * 1000;
      const left = Math.ceil((end - Date.now()) / 1000);
      return { ...timers, [id]: { end, total: Math.max(timers[id].total, left) } };
    });
  }
}
