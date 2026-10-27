import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { Location } from '@angular/common';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { filter } from 'rxjs';
import { ExerciseForm } from '../exercise-form/exercise-form';
import { Exercises } from '../exercises';

const sameMuscles = (a: string[], b: string[]) =>
  a.length === b.length && a.every((muscle) => b.includes(muscle));

// Changes an exercise's name and muscles, whether the user created it or it's from free-exercise-db.
@Component({
  selector: 'app-edit-exercise',
  imports: [ExerciseForm, TuiButton],
  templateUrl: './edit-exercise.html',
  styleUrls: ['../new-exercise/new-exercise.css', './edit-exercise.css'],
})
export class EditExercise {
  private readonly exercises = inject(Exercises);
  private readonly dialogs = inject(TuiDialogService);
  private readonly location = inject(Location);

  // The exercise id, from /exercise/:id.
  readonly id = input.required<string>();

  protected readonly exercise = computed(() =>
    this.exercises.all().find((exercise) => exercise.id === this.id()),
  );
  // The exercise as free-exercise-db has it, unless the user created it.
  private readonly original = computed(() =>
    this.exercises.library().find((exercise) => exercise.id === this.id()),
  );
  // An edited free-exercise-db exercise is the user's own copy, no longer the library's.
  protected readonly edited = computed(
    () => !!this.original() && this.exercise() !== this.original(),
  );

  protected readonly name = linkedSignal(() => this.exercise()?.name ?? '');
  protected readonly muscles = linkedSignal(() => this.exercise()?.primaryMuscles ?? []);

  private readonly changed = computed(() => {
    const exercise = this.exercise();
    return (
      !!exercise &&
      (this.name().trim() !== exercise.name ||
        !sameMuscles(this.muscles(), exercise.primaryMuscles))
    );
  });
  protected readonly nameError = computed(() => {
    const name = this.name().trim();
    const taken = this.exercises
      .all()
      .some(
        (exercise) =>
          exercise.id !== this.id() && exercise.name.toLowerCase() === name.toLowerCase(),
      );
    return taken ? `You already have an exercise called ${name}` : null;
  });
  protected readonly valid = computed(
    () => this.changed() && !!this.name().trim() && this.muscles().length > 0 && !this.nameError(),
  );

  // Leaving with changes asks first.
  protected back(): void {
    if (!this.changed()) {
      this.location.back();
      return;
    }
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Discard changes?',
        size: 's',
        data: { yes: 'Discard', no: 'Keep editing' },
      })
      .pipe(filter(Boolean))
      .subscribe(() => this.location.back());
  }

  protected async save(): Promise<void> {
    await this.exercises.update({
      ...this.exercise()!,
      name: this.name().trim(),
      primaryMuscles: this.muscles(),
    });
    this.location.back();
  }

  protected async reset(): Promise<void> {
    await this.exercises.reset(this.original()!);
    this.location.back();
  }
}
