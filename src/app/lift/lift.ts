import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiIcon, TuiNumberFormat, TuiTextfield } from '@taiga-ui/core';
import { TuiBadge, TuiInputNumber, TuiProgressCircle, TuiTextarea } from '@taiga-ui/kit';
import { TuiSheetDialog, TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { interval } from 'rxjs';
import { WorkSet } from '../db';
import { LiftSheet } from '../lift-sheet/lift-sheet';
import { RestTimers } from '../rest-timers';
import { Sessions } from '../sessions';

// How long the rest after a set starts at, and how much a tap on the timer adds.
const REST_SECONDS = 120;
const MORE_REST_SECONDS = 15;

type Notice = { kind: 'logged'; index: number } | { kind: 'deleted'; index: number; set: WorkSet };

@Component({
  selector: 'app-lift',
  imports: [
    DatePipe,
    FormsModule,
    LiftSheet,
    RouterLink,
    TuiBadge,
    TuiButton,
    TuiIcon,
    TuiInputNumber,
    TuiNumberFormat,
    TuiProgressCircle,
    TuiSheetDialog,
    TuiSwipeActions,
    TuiTextarea,
    TuiTextfield,
  ],
  templateUrl: './lift.html',
  styleUrl: './lift.css',
})
export class LiftScreen {
  private readonly sessions = inject(Sessions);
  private readonly restTimers = inject(RestTimers);
  private readonly router = inject(Router);
  private readonly date = TuiDay.currentLocal().toJSON();

  // The exercise id, from /lift/:id. The lift is always one of today's exercises.
  readonly id = input.required<string>();

  protected readonly lift = computed(() =>
    this.sessions.today()?.exercises.find((exercise) => exercise.id === this.id()),
  );
  protected readonly sets = computed(() => this.lift()?.sets ?? []);
  // "Lift 2 of 3", only when there is more than one lift today.
  protected readonly position = computed(() => {
    const exercises = this.sessions.today()?.exercises ?? [];
    const index = exercises.findIndex((exercise) => exercise.id === this.id());
    return exercises.length > 1 ? `Lift ${index + 1} of ${exercises.length}` : '';
  });
  protected readonly lastTime = computed(() => this.sessions.lastTime(this.id(), this.date));
  protected readonly setLabel = computed(() => {
    const number = this.sets().length + 1;
    const total = this.lastTime()?.lift.sets.length ?? 0;
    return number <= total ? `Set ${number} of ${total}` : `Set ${number}`;
  });
  protected readonly lastTimeSet = computed(() => this.lastTimeAt(this.sets().length));

  // The next set starts from the set just done, else from the same set last time.
  private readonly suggested = computed(() => this.sets().at(-1) ?? this.lastTimeSet(), {
    equal: (a, b) => a?.weight === b?.weight && a?.reps === b?.reps,
  });
  protected readonly weight = linkedSignal<number | null>(() => this.suggested()?.weight ?? null);
  protected readonly reps = linkedSignal<number | null>(() => this.suggested()?.reps ?? null);
  protected readonly valid = computed(() => this.weight() !== null && !!this.reps());

  // 'set' enters the next set, 'rest' follows a logged set,
  // 'sets' fixes the logged sets in place and 'note' writes the note.
  // A lift that already has sets opens on the rest, with its sets and note.
  private readonly hasSets = computed(() => this.sets().length > 0);
  protected readonly mode = linkedSignal<boolean, 'set' | 'rest' | 'sets' | 'note'>({
    source: this.hasSets,
    computation: (hasSets) => (hasSets ? 'rest' : 'set'),
  });
  protected readonly notice = signal<Notice | null>(null);
  protected readonly comparison = computed(() => {
    const notice = this.notice();
    return notice?.kind === 'logged' ? this.compare(notice.index) : '';
  });

  // The rest timer shows once a set has been logged, and stays when leaving the lift and coming back.
  private readonly now = signal(Date.now());
  private readonly timer = computed(() => this.restTimers.byLift()[this.id()]);
  protected readonly resting = computed(() => !!this.timer());
  protected readonly rest = computed(() =>
    Math.max(0, Math.ceil(((this.timer()?.end ?? 0) - this.now()) / 1000)),
  );
  protected readonly restTotal = computed(() => this.timer()?.total ?? REST_SECONDS);

  protected readonly drafts = signal<WorkSet[]>([]);
  protected readonly note = signal('');

  // The sheet with how to do the lift and its progress so far.
  protected readonly sheetOpen = signal(false);

  constructor() {
    interval(1000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(Date.now()));

    // Back to today once the lift is gone, or if it was never on today's list.
    effect(() => {
      if (this.sessions.all() && !this.lift()) {
        this.router.navigate(['/']);
      }
    });
  }

  protected async logSet(): Promise<void> {
    const index = this.sets().length;
    await this.sessions.addSet(this.sessions.today()!, this.id(), {
      weight: this.weight()!,
      reps: this.reps()!,
    });
    // Asks the browser not to clear the workouts when the phone is short on space.
    navigator.storage?.persist();
    this.notice.set({ kind: 'logged', index });
    this.restTimers.start(this.id(), REST_SECONDS);
    this.now.set(Date.now());
    this.mode.set('rest');
  }

  // Sizes a number field to its digits, so it reads like the plain number.
  protected width(value: number | null): string {
    return `${Math.max(String(value ?? '').length, 1)}ch`;
  }

  protected async undo(): Promise<void> {
    const notice = this.notice()!;
    this.notice.set(null);
    if (notice.kind === 'logged') {
      await this.sessions.deleteSet(this.sessions.today()!, this.id(), notice.index);
      this.mode.set('set');
    } else {
      await this.sessions.addSet(this.sessions.today()!, this.id(), notice.set, notice.index);
    }
  }

  protected moreRest(): void {
    this.restTimers.add(this.id(), MORE_REST_SECONDS);
  }

  protected async deleteSet(index: number): Promise<void> {
    const set = this.sets()[index];
    await this.sessions.deleteSet(this.sessions.today()!, this.id(), index);
    this.notice.set({ kind: 'deleted', index, set });
  }

  protected fixSets(): void {
    this.drafts.set(this.sets().map((set) => ({ ...set })));
    this.mode.set('sets');
  }

  // Saves the sets that changed. A set left without a weight or reps keeps what it had.
  protected async saveSets(): Promise<void> {
    const session = this.sessions.today()!;
    const changed = this.drafts()
      .map((draft, index) => ({ draft, index, set: this.sets()[index] }))
      .filter(
        ({ draft, set }) =>
          draft.weight !== null &&
          !!draft.reps &&
          (draft.weight !== set.weight || draft.reps !== set.reps),
      );
    await Promise.all(
      changed.map(({ draft, index }) => this.sessions.changeSet(session, this.id(), index, draft)),
    );
    this.mode.set('rest');
  }

  protected writeNote(): void {
    this.note.set(this.lift()?.note ?? '');
    this.mode.set('note');
  }

  protected async saveNote(): Promise<void> {
    await this.sessions.changeNote(this.sessions.today()!, this.id(), this.note());
    this.mode.set('rest');
  }

  protected clock(seconds: number): string {
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  // The same set last time, or its last set when today goes past it.
  private lastTimeAt(index: number): WorkSet | undefined {
    const sets = this.lastTime()?.lift.sets;
    return sets?.[index] ?? sets?.at(-1);
  }

  // How a logged set compares with the same set last time: weight first, then reps.
  private compare(index: number): string {
    const set = this.sets()[index];
    const last = this.lastTimeAt(index);
    if (!set || !last) {
      return '';
    }
    const difference = (amount: number, unit: string) =>
      `${amount > 0 ? '+' : '−'}${Math.abs(amount)} ${unit} vs last time`;
    if (set.weight !== last.weight) {
      return difference(set.weight - last.weight, 'kg');
    }
    if (set.reps !== last.reps) {
      return difference(
        set.reps - last.reps,
        Math.abs(set.reps - last.reps) === 1 ? 'rep' : 'reps',
      );
    }
    return 'Matched last time';
  }
}
