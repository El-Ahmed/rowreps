import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { Exercise } from '../exercises';
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

  protected remove(exercise: Exercise): void {
    this.sessions.remove(this.sessions.today()!, exercise);
  }

  protected drop(event: CdkDragDrop<Exercise[]>): void {
    this.sessions.move(this.sessions.today()!, event.previousIndex, event.currentIndex);
  }
}
