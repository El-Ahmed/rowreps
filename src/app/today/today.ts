import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { Lift } from '../db';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-today',
  imports: [
    DatePipe,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
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
