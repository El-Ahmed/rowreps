import { Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { DatePipe, I18nPluralPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiDialogService, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TUI_CONFIRM, TuiAvatar } from '@taiga-ui/kit';
import { TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { filter } from 'rxjs';
import { Lift } from '../db';
import { Install } from '../install';
import { InstallSheet } from '../install-sheet/install-sheet';
import { Restore } from '../restore/restore';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-today',
  imports: [
    DatePipe,
    I18nPluralPipe,
    InstallSheet,
    Restore,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiIcon,
    TuiTitle,
    TuiSwipeActions,
  ],
  templateUrl: './today.html',
  styleUrl: './today.css',
})
export class Today {
  private readonly sessions = inject(Sessions);
  private readonly dialogs = inject(TuiDialogService);
  protected readonly install = inject(Install);
  private readonly restore = viewChild.required(Restore);

  protected readonly date = new Date();
  protected readonly loaded = computed(() => this.sessions.all() !== undefined);
  protected readonly exercises = computed(() => this.sessions.today()?.exercises ?? []);
  protected readonly editRequested = signal(false);
  // Edit mode ends by itself once the last exercise is gone.
  protected readonly editing = computed(() => this.editRequested() && this.exercises().length > 0);

  // "1 lift done" once all are done, "1 of 3 lifts done" before that.
  protected readonly progress = computed(() => {
    const total = this.exercises().length;
    const done = this.exercises().filter((exercise) => exercise.sets.length).length;
    if (!done) {
      return '';
    }
    if (done < total) {
      return `${done} of ${total} lifts done`;
    }
    return done === 1 ? '1 lift done' : `${done} lifts done`;
  });

  // Days before today with a logged set. Undefined until the database has been read.
  private readonly workoutDays = computed(() => {
    const today = TuiDay.currentLocal().toJSON();
    return this.sessions
      .all()
      ?.filter(
        (session) => session.date < today && session.exercises.some((lift) => lift.sets.length),
      ).length;
  });

  // The Add to Home Screen line on iPhone Safari, until something is logged or it is closed.
  protected readonly installLine = computed(
    () =>
      this.install.safari &&
      !this.install.lineHidden() &&
      this.sessions.all()?.every((session) => session.exercises.every((lift) => !lift.sets.length)),
  );
  protected readonly installSheet = signal(false);
  // Android's install card.
  protected readonly installCard = signal(false);
  // How many days the installed app's first restore brought back.
  protected readonly restored = signal(0);
  protected readonly restoredText = {
    '=1': 'Your workout is here',
    other: 'Your # workouts are here',
  };

  constructor() {
    // Asks to install on a new day after the first workout, never during sets or rest.
    effect(() => {
      const days = this.workoutDays();
      if (days === undefined || !this.install.askDue(days)) {
        return;
      }
      if (this.install.safari) {
        this.install.asking(days);
        this.installSheet.set(true);
      } else if (this.install.promptable()) {
        this.install.asking(days);
        this.installCard.set(true);
      }
    });

    // On an iPhone, the installed app starts empty: offers to restore the file saved in Safari.
    effect(() => {
      if (
        !this.install.installedOnApple ||
        this.install.restoreAsked() ||
        this.sessions.all()?.length !== 0
      ) {
        return;
      }
      this.install.askingRestore();
      untracked(() => this.askRestore());
    });
  }

  private askRestore(): void {
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Logged workouts in Safari?',
        size: 's',
        data: {
          content:
            'This Home Screen app keeps its own copy, so it starts empty. Pick the file you saved to bring your workouts here.',
          yes: 'Restore',
          no: 'Start fresh',
        },
      })
      .pipe(filter(Boolean))
      .subscribe(() => this.restore().open());
  }

  protected installApp(): void {
    this.installCard.set(false);
    this.install.prompt();
  }

  // The sets done today with the heaviest one, else what was lifted last time.
  protected summary(lift: Lift): string {
    if (lift.sets.length) {
      const top = lift.sets.reduce((best, set) => (set.weight > best.weight ? set : best));
      const sets = lift.sets.length === 1 ? '1 set' : `${lift.sets.length} sets`;
      return `${sets} · ${top.weight} × ${top.reps}`;
    }
    const last = this.sessions.lastTime(lift.id, TuiDay.currentLocal().toJSON())?.lift.sets[0];
    return last ? `Last time ${last.weight} × ${last.reps}` : '';
  }

  protected remove(exercise: Lift): void {
    this.sessions.remove(this.sessions.today()!, exercise);
  }

  protected drop(event: CdkDragDrop<Lift[]>): void {
    this.sessions.move(this.sessions.today()!, event.previousIndex, event.currentIndex);
  }
}
