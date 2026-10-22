import { Component, computed, inject, input, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiAutoFocus, TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiInput, TuiTitle } from '@taiga-ui/core';
import { Exercise } from '../exercises';
import { matchesSearch } from '../search';
import { Sessions } from '../sessions';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const muscleGroup = (exercise: Exercise) => capitalize(exercise.primaryMuscles[0]);

@Component({
  selector: 'app-add-exercise',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TuiAutoFocus,
    TuiButton,
    TuiCell,
    TuiInput,
    TuiTitle,
  ],
  templateUrl: './add-exercise.html',
  styleUrl: './add-exercise.css',
})
export class AddExercise {
  private readonly sessions = inject(Sessions);
  private readonly router = inject(Router);
  private readonly exercises = toSignal(
    inject(HttpClient).get<Exercise[]>('free-exercise-db/exercises.json'),
    { initialValue: [] },
  );

  // The past session to add to, from /history/:id/add. Without one, the exercise goes to today.
  readonly id = input<string>();

  protected readonly session = computed(() => {
    const id = this.id();
    return id
      ? this.sessions.all()?.find((session) => session.id === Number(id))
      : this.sessions.today();
  });
  protected readonly back = computed(() => (this.id() ? ['/history', this.id()] : ['/']));

  protected readonly query = signal('');

  protected readonly groups = computed(() => {
    const query = this.query();
    const picked = new Set(this.session()?.exercises.map((exercise) => exercise.id));
    const matches = this.exercises().filter(
      (exercise) => !picked.has(exercise.id) && matchesSearch(exercise.name, query),
    );
    const names = [...new Set(matches.map(muscleGroup))].sort();

    return names.map((name) => ({
      name,
      exercises: matches.filter((exercise) => muscleGroup(exercise) === name),
    }));
  });

  protected muscles(exercise: Exercise): string {
    return [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map(capitalize).join(' · ');
  }

  protected async add(exercise: Exercise): Promise<void> {
    const date = this.id() ? this.session()!.date : TuiDay.currentLocal().toJSON();
    await this.sessions.add(date, exercise);
    await this.router.navigate(this.back());
  }
}
