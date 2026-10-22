import { Component, LOCALE_ID, computed, effect, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCalendar,
  TuiCell,
  TuiDialogService,
  TuiIcon,
  TuiTitle,
} from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { TuiSheetDialog } from '@taiga-ui/addon-mobile';
import { filter } from 'rxjs';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-session',
  imports: [
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TuiButton,
    TuiCalendar,
    TuiCell,
    TuiIcon,
    TuiTitle,
    TuiSheetDialog,
  ],
  templateUrl: './session.html',
  styleUrl: './session.css',
})
export class SessionLog {
  private readonly sessions = inject(Sessions);
  private readonly dialogs = inject(TuiDialogService);
  private readonly router = inject(Router);
  private readonly locale = inject(LOCALE_ID);

  readonly id = input.required<string>();

  protected readonly session = computed(() =>
    this.sessions.all()?.find((session) => session.id === Number(this.id())),
  );
  protected readonly names = computed(() =>
    this.session()
      ?.exercises.map((exercise) => exercise.name)
      .join(', '),
  );
  protected readonly editing = signal(false);

  protected readonly today = TuiDay.currentLocal();
  protected readonly pickingDate = signal(false);
  protected readonly pickedDay = signal<TuiDay | null>(null);
  // Days that already have a session can't take this one too.
  protected readonly takenDay = computed(() => {
    const dates = new Set(this.sessions.all()?.map((session) => session.date));
    return (day: TuiDay) => dates.has(day.toJSON());
  });
  // A dot on the days of the other sessions.
  protected readonly marker = computed(() => {
    const taken = this.takenDay();
    return (day: TuiDay): [] | [string] =>
      taken(day) && day.toJSON() !== this.session()?.date ? ['var(--tui-text-secondary)'] : [];
  });

  constructor() {
    // Back to the list once the session is gone: deleted here, or never existed.
    effect(() => {
      if (this.sessions.all() && !this.session()) {
        this.router.navigate(['/history']);
      }
    });
  }

  protected openDatePicker(): void {
    this.pickedDay.set(null);
    this.pickingDate.set(true);
  }

  protected async moveToPickedDay(): Promise<void> {
    await this.sessions.changeDate(this.session()!, this.pickedDay()!.toJSON());
    this.pickingDate.set(false);
  }

  protected drop(event: CdkDragDrop<Exercise[]>): void {
    this.sessions.move(this.session()!, event.previousIndex, event.currentIndex);
  }

  protected remove(exercise: Exercise): void {
    const session = this.session()!;
    this.confirm(`Delete ${exercise.name} from ${this.day(session.date)}?`, () =>
      this.sessions.remove(session, exercise),
    );
  }

  protected deleteSession(): void {
    const session = this.session()!;
    this.confirm(`Delete the workout of ${this.day(session.date)}?`, () =>
      this.sessions.delete(session),
    );
  }

  protected day(date: string): string {
    return formatDate(date, 'EEE d MMM', this.locale);
  }

  private confirm(label: string, onYes: () => void): void {
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label,
        size: 's',
        data: { yes: 'Delete', no: 'Cancel', appearance: 'primary-destructive' },
      })
      .pipe(filter(Boolean))
      .subscribe(onYes);
  }
}
