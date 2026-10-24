import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, I18nPluralPipe, formatDate } from '@angular/common';
import { RouterLink } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiChip, TuiSegmented } from '@taiga-ui/kit';
import { Session } from '../db';
import { MUSCLES, MuscleFigure } from '../muscle-figure/muscle-figure';
import { Sessions } from '../sessions';

// The periods the muscles worked can be shown for, and how many sets in each count as a lot.
const PERIODS = [
  { days: 7, name: 'Last 7 days', aLot: 5 },
  { days: 30, name: 'Last 30 days', aLot: 10 },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

@Component({
  selector: 'app-history',
  imports: [
    DatePipe,
    I18nPluralPipe,
    MuscleFigure,
    RouterLink,
    TuiButton,
    TuiCell,
    TuiChip,
    TuiIcon,
    TuiSegmented,
    TuiTitle,
  ],
  templateUrl: './history.html',
  styleUrl: './history.css',
})
export class SessionHistory {
  private readonly sessions = inject(Sessions);
  private readonly locale = inject(LOCALE_ID);

  protected readonly loaded = computed(() => this.sessions.all() !== undefined);

  // Sessions under "This week", "Last week", then one heading per month. Weeks start on Monday.
  protected readonly groups = computed(() => {
    const today = TuiDay.currentLocal();
    const monday = today.append({ day: -today.dayOfWeek() });
    const groupName = (session: Session): string => {
      const day = TuiDay.jsonParse(session.date);
      if (day.daySameOrAfter(monday)) {
        return 'This week';
      }
      if (day.daySameOrAfter(monday.append({ day: -7 }))) {
        return 'Last week';
      }
      return formatDate(session.date, 'MMMM y', this.locale);
    };
    const sessions = this.sessions.all() ?? [];
    const names = [...new Set(sessions.map(groupName))];

    return names.map((name) => ({
      name,
      sessions: sessions.filter((session) => groupName(session) === name),
    }));
  });

  protected readonly lifts = { '=1': '1 lift', other: '# lifts' };
  protected readonly setCount = { '=1': '1 set', other: '# sets' };

  protected readonly periods = PERIODS;
  protected readonly period = signal(0);

  // The sets each muscle got in the period, most first. A set counts in full for the exercise's
  // main muscles and as half a set for the muscles that also work.
  protected readonly worked = computed(() => {
    const from = TuiDay.currentLocal()
      .append({ day: 1 - PERIODS[this.period()].days })
      .toJSON();
    const lifts = (this.sessions.all() ?? [])
      .filter((session) => session.date >= from)
      .flatMap((session) => session.exercises);
    const sets = (muscle: string) =>
      lifts
        .filter((lift) => lift.primaryMuscles.includes(muscle))
        .reduce((total, lift) => total + lift.sets.length, 0) +
      lifts
        .filter((lift) => lift.secondaryMuscles.includes(muscle))
        .reduce((total, lift) => total + lift.sets.length / 2, 0);

    return MUSCLES.map((muscle) => ({ muscle, name: capitalize(muscle), sets: sets(muscle) }))
      .filter((item) => item.sets > 0)
      .sort((a, b) => b.sets - a.sets);
  });
  protected readonly aLot = computed(() =>
    this.worked()
      .filter((item) => item.sets >= PERIODS[this.period()].aLot)
      .map((item) => item.muscle),
  );
  protected readonly some = computed(() =>
    this.worked()
      .filter((item) => item.sets < PERIODS[this.period()].aLot)
      .map((item) => item.muscle),
  );
  protected readonly notTrained = computed(() =>
    MUSCLES.filter((muscle) => !this.worked().some((item) => item.muscle === muscle))
      .map(capitalize)
      .join(', '),
  );

  protected names(session: Session): string {
    return session.exercises.map((exercise) => exercise.name).join(', ');
  }
}
