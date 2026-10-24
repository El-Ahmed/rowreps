import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TuiAxes } from '@taiga-ui/addon-charts/components/axes';
import { TuiLineChart } from '@taiga-ui/addon-charts/components/line-chart';
import { TUI_PLATFORM } from '@taiga-ui/cdk';
import { TuiButton } from '@taiga-ui/core';
import { TuiSegmented } from '@taiga-ui/kit';
import { Lift } from '../db';
import { MuscleFigure } from '../muscle-figure/muscle-figure';
import { Sessions } from '../sessions';

// The how-to steps of a free-exercise-db exercise, only read for this sheet.
interface Instructions {
  id: string;
  instructions: string[];
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The sheet a lift opens from its toolbar: how to do the exercise, and its progress so far.
@Component({
  selector: 'app-lift-sheet',
  imports: [DatePipe, MuscleFigure, TuiAxes, TuiButton, TuiLineChart, TuiSegmented],
  templateUrl: './lift-sheet.html',
  styleUrl: './lift-sheet.css',
})
export class LiftSheet {
  private readonly sessions = inject(Sessions);
  private readonly exercises = toSignal(
    inject(HttpClient).get<Instructions[]>('free-exercise-db/exercises.json'),
  );

  readonly lift = input.required<Lift>();

  protected readonly history = computed(() => this.sessions.history(this.lift().id));
  // 0 is How to, 1 is Progress. It opens on Progress once the lift has been logged.
  protected readonly tab = linkedSignal(() => (this.history().length ? 1 : 0));

  protected readonly primary = computed(() =>
    this.lift().primaryMuscles.map(capitalize).join(', '),
  );
  protected readonly secondary = computed(() =>
    this.lift().secondaryMuscles.map(capitalize).join(', '),
  );
  protected readonly instructions = computed(
    () => this.exercises()?.find((exercise) => exercise.id === this.lift().id)?.instructions ?? [],
  );
  protected readonly youTube = computed(
    () =>
      `https://www.youtube.com/results?search_query=${encodeURIComponent(`${this.lift().name} proper form`)}`,
  );
  // TikTok's website drops the search on phones, so phones open the TikTok app's search instead.
  // The app link is undocumented and shows an error when TikTok isn't installed.
  protected readonly mobile = inject(TUI_PLATFORM) !== 'web';
  protected readonly tikTok = computed(() => {
    const search = encodeURIComponent(`${this.lift().name} form`);
    return this.mobile
      ? `snssdk1233://search?keyword=${search}`
      : `https://www.tiktok.com/search?q=${search}`;
  });

  // The heaviest set of each session, oldest first, as [session, kg] chart points.
  protected readonly points = computed(() =>
    this.history()
      .map(({ lift }) => Math.max(...lift.sets.map((set) => set.weight)))
      .reverse()
      .map((weight, index) => [index, weight] as const),
  );
  protected readonly gain = computed(() => {
    const points = this.points();
    const gain = points.at(-1)![1] - points[0][1];
    return `${gain > 0 ? '+' : gain < 0 ? '−' : ''}${Math.abs(gain)} kg`;
  });
  protected readonly chartLabel = computed(
    () =>
      `Heaviest set per session: ${this.points()
        .map(([, weight]) => weight)
        .join(', ')} kg`,
  );
  // The chart's weight range, with some room above and below the line.
  protected readonly range = computed(() => {
    const weights = this.points().map(([, weight]) => weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const room = (max - min) / 4 || 2.5;
    return { y: min - room, height: max - min + 2 * room };
  });

  protected sets(lift: Lift): string {
    return lift.sets.map((set) => `${set.weight} × ${set.reps}`).join(' · ');
  }
}
