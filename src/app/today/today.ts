import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CdkDrag, CdkDragDrop, CdkDragHandle, CdkDropList } from '@angular/cdk/drag-drop';
import { TuiButton, TuiCell, TuiIcon, TuiTitle } from '@taiga-ui/core';
import { TuiSwipeActions } from '@taiga-ui/addon-mobile';
import { Exercise } from '../exercises';
import { TodayList } from '../today-list';

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
  private readonly todayList = inject(TodayList);

  protected readonly date = new Date();
  protected readonly exercises = this.todayList.exercises;
  protected readonly editing = signal(false);

  protected remove(exercise: Exercise): void {
    this.todayList.remove(exercise);
    if (!this.exercises().length) {
      this.editing.set(false);
    }
  }

  protected drop(event: CdkDragDrop<Exercise[]>): void {
    this.todayList.move(event.previousIndex, event.currentIndex);
  }
}
