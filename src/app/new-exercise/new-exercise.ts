import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiIcon, TuiInput, TuiLabel } from '@taiga-ui/core';
import { TuiBlock } from '@taiga-ui/kit';
import { Exercises } from '../exercises';
import { Sessions } from '../sessions';

interface MuscleGroup {
  name: string;
  // free-exercise-db's names for the muscles in the group.
  muscles: string[];
}

const MUSCLE_GROUPS: MuscleGroup[] = [
  { name: 'Chest', muscles: ['chest'] },
  { name: 'Back', muscles: ['lats', 'middle back', 'lower back', 'traps'] },
  {
    name: 'Legs',
    muscles: ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors'],
  },
  { name: 'Shoulders', muscles: ['shoulders'] },
  { name: 'Arms', muscles: ['biceps', 'triceps', 'forearms'] },
  { name: 'Core', muscles: ['abdominals'] },
  { name: 'Neck', muscles: ['neck'] },
];

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// Creates an exercise the search didn't find and adds it to the session the search was for.
@Component({
  selector: 'app-new-exercise',
  imports: [DatePipe, FormsModule, RouterLink, TuiBlock, TuiButton, TuiIcon, TuiInput, TuiLabel],
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

  protected readonly groups = MUSCLE_GROUPS;
  protected readonly capitalize = capitalize;
  protected readonly exerciseName = linkedSignal(() => this.name() ?? '');
  protected readonly group = signal<MuscleGroup | undefined>(undefined);
  // Picking a group starts with its first muscle worked.
  protected readonly muscles = linkedSignal(() => this.group()?.muscles.slice(0, 1) ?? []);
  protected readonly valid = computed(
    () => !!this.exerciseName().trim() && this.muscles().length > 0,
  );

  protected toggle(muscle: string): void {
    this.muscles.update((muscles) =>
      muscles.includes(muscle) ? muscles.filter((item) => item !== muscle) : [...muscles, muscle],
    );
  }

  protected async save(): Promise<void> {
    const exercise = {
      id: crypto.randomUUID(),
      name: this.exerciseName().trim(),
      primaryMuscles: this.group()!.muscles.filter((muscle) => this.muscles().includes(muscle)),
      secondaryMuscles: [],
    };
    const date = this.id() ? this.session()!.date : TuiDay.currentLocal().toJSON();
    await this.exercises.create(exercise);
    await this.sessions.add(date, exercise);
    await this.router.navigate(this.id() ? ['/history', this.id()] : ['/']);
  }
}
