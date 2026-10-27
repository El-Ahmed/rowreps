import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton } from '@taiga-ui/core';
import { ExerciseForm } from '../exercise-form/exercise-form';
import { Exercises } from '../exercises';
import { Sessions } from '../sessions';

// Creates an exercise the search didn't find and adds it to the session the search was for.
@Component({
  selector: 'app-new-exercise',
  imports: [DatePipe, ExerciseForm, RouterLink, TuiButton],
  templateUrl: './new-exercise.html',
  styleUrl: './new-exercise.css',
})
export class NewExercise {
  private readonly sessions = inject(Sessions);
  private readonly exercises = inject(Exercises);
  private readonly router = inject(Router);

  // The past session to add to, from /history/:id/add/new. Without one, the exercise goes to today.
  readonly id = input<string>();
  // The name that was searched for, from ?name=.
  readonly name = input<string>();

  protected readonly session = computed(() =>
    this.sessions.all()?.find((session) => session.id === Number(this.id())),
  );
  protected readonly back = computed(() => (this.id() ? ['/history', this.id(), 'add'] : ['/add']));

  protected readonly exerciseName = linkedSignal(() => this.name() ?? '');
  protected readonly muscles = signal<string[]>([]);
  protected readonly valid = computed(
    () => !!this.exerciseName().trim() && this.muscles().length > 0,
  );

  protected async save(): Promise<void> {
    const exercise = {
      id: crypto.randomUUID(),
      name: this.exerciseName().trim(),
      primaryMuscles: this.muscles(),
      secondaryMuscles: [],
    };
    const date = this.id() ? this.session()!.date : TuiDay.currentLocal().toJSON();
    await this.exercises.create(exercise);
    await this.sessions.add(date, exercise);
    await this.router.navigate(this.id() ? ['/history', this.id()] : ['/']);
  }
}
