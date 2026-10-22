import { Injectable, signal } from '@angular/core';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Exercise } from './exercises';

@Injectable({ providedIn: 'root' })
export class TodayList {
  private readonly list = signal<Exercise[]>([]);

  readonly exercises = this.list.asReadonly();

  add(exercise: Exercise): void {
    if (!this.has(exercise)) {
      this.list.update((list) => [...list, exercise]);
    }
  }

  remove(exercise: Exercise): void {
    this.list.update((list) => list.filter((item) => item.id !== exercise.id));
  }

  move(from: number, to: number): void {
    this.list.update((list) => {
      const copy = [...list];
      moveItemInArray(copy, from, to);
      return copy;
    });
  }

  has(exercise: Exercise): boolean {
    return this.list().some((item) => item.id === exercise.id);
  }
}
