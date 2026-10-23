import { Component, LOCALE_ID, computed, effect, inject, input, signal } from '@angular/core';
import { formatDate } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import {
  TuiButton,
  TuiCalendar,
  TuiCell,
  TuiDialogService,
  TuiIcon,
  TuiNumberFormat,
  TuiTextfield,
  TuiTitle,
} from '@taiga-ui/core';
import { TUI_CONFIRM, TuiInputNumber, TuiTextarea } from '@taiga-ui/kit';
import { TuiSheetDialog } from '@taiga-ui/addon-mobile';
import { filter } from 'rxjs';
import { Lift } from '../db';
import { Sessions } from '../sessions';

@Component({
  selector: 'app-session',
  imports: [
    FormsModule,
    RouterLink,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    TuiButton,
    TuiCalendar,
    TuiCell,
    TuiIcon,
    TuiInputNumber,
    TuiNumberFormat,
    TuiSheetDialog,
    TuiTextarea,
    TuiTextfield,
    TuiTitle,
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

  // The set being changed in the sheet; a null index adds a new set.
  protected readonly editingSet = signal(false);
  protected readonly setTarget = signal<{ lift: Lift; index: number | null } | null>(null);
  protected readonly setLabel = computed(() => {
    const target = this.setTarget();
    return target?.index === null ? 'Add a set' : `Set ${(target?.index ?? 0) + 1}`;
  });
  protected readonly weight = signal<number | null>(null);
  protected readonly reps = signal<number | null>(null);
  protected readonly validSet = computed(() => this.weight() !== null && !!this.reps());

  protected readonly editingNote = signal(false);
  protected readonly noteLift = signal<Lift | null>(null);
  protected readonly noteLabel = computed(() => this.noteLift()?.name ?? '');
  protected readonly note = signal('');

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

  protected drop(event: CdkDragDrop<Lift[]>): void {
    this.sessions.move(this.session()!, event.previousIndex, event.currentIndex);
  }

  protected remove(exercise: Lift): void {
    const session = this.session()!;
    this.confirm(`Delete ${exercise.name} from ${this.day(session.date)}?`, () =>
      this.sessions.remove(session, exercise),
    );
  }

  // A new set starts from the last one.
  protected openSet(lift: Lift, index: number | null): void {
    const set = lift.sets[index ?? lift.sets.length - 1];
    this.setTarget.set({ lift, index });
    this.weight.set(set?.weight ?? null);
    this.reps.set(set?.reps ?? null);
    this.editingSet.set(true);
  }

  protected async saveSet(): Promise<void> {
    const { lift, index } = this.setTarget()!;
    const set = { weight: this.weight()!, reps: this.reps()! };
    await (index === null
      ? this.sessions.addSet(this.session()!, lift.id, set)
      : this.sessions.changeSet(this.session()!, lift.id, index, set));
    this.editingSet.set(false);
  }

  protected async deleteSet(): Promise<void> {
    const { lift, index } = this.setTarget()!;
    await this.sessions.deleteSet(this.session()!, lift.id, index!);
    this.editingSet.set(false);
  }

  protected openNote(lift: Lift): void {
    this.noteLift.set(lift);
    this.note.set(lift.note ?? '');
    this.editingNote.set(true);
  }

  protected async saveNote(): Promise<void> {
    await this.sessions.changeNote(this.session()!, this.noteLift()!.id, this.note());
    this.editingNote.set(false);
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
