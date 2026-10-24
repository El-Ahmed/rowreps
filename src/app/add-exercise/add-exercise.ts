import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiAutoFocus, TuiDay } from '@taiga-ui/cdk';
import { TuiButton, TuiCell, TuiIcon, TuiInput, TuiTitle } from '@taiga-ui/core';
import { TuiAvatar } from '@taiga-ui/kit';
import { Exercise, Exercises } from '../exercises';
import { matchesSearch, matchesSomeWord } from '../search';
import { Sessions } from '../sessions';

// Below this many results, the search also offers to create the exercise.
const FEW_RESULTS = 3;
// How many close matches to show when nothing matches.
const CLOSE_MATCHES = 5;

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const muscleGroup = (exercise: Exercise) => capitalize(exercise.primaryMuscles[0]);

@Component({
  selector: 'app-add-exercise',
  imports: [
    DatePipe,
    FormsModule,
    RouterLink,
    TuiAutoFocus,
    TuiAvatar,
    TuiButton,
    TuiCell,
    TuiIcon,
    TuiInput,
    TuiTitle,
  ],
  templateUrl: './add-exercise.html',
  styleUrl: './add-exercise.css',
})
export class AddExercise {
  private readonly sessions = inject(Sessions);
  private readonly router = inject(Router);
  private readonly exercises = inject(Exercises).all;

  // The past session to add to, from /history/:id/add. Without one, the exercise goes to today.
  readonly id = input<string>();

  protected readonly session = computed(() => {
    const id = this.id();
    return id
      ? this.sessions.all()?.find((session) => session.id === Number(id))
      : this.sessions.today();
  });
  protected readonly back = computed(() => (this.id() ? ['/history', this.id()] : ['/']));
  protected readonly newExercise = computed(() =>
    this.id() ? ['/history', this.id(), 'add', 'new'] : ['/add', 'new'],
  );

  protected readonly query = signal('');
  protected readonly name = computed(() => this.query().trim());

  // The exercises not yet in the session.
  private readonly options = computed(() => {
    const picked = new Set(this.session()?.exercises.map((exercise) => exercise.id));
    return this.exercises().filter((exercise) => !picked.has(exercise.id));
  });
  private readonly matches = computed(() =>
    this.options().filter((exercise) => matchesSearch(exercise.name, this.query())),
  );

  protected readonly groups = computed(() => {
    const matches = this.matches();
    const names = [...new Set(matches.map(muscleGroup))].sort();

    return names.map((name) => ({
      name,
      exercises: matches.filter((exercise) => muscleGroup(exercise) === name),
    }));
  });

  // Offered when the search finds few exercises and none is called exactly that.
  protected readonly canCreate = computed(() => {
    const name = this.name().toLowerCase();
    return (
      !!name &&
      this.matches().length < FEW_RESULTS &&
      !this.exercises().some((exercise) => exercise.name.toLowerCase() === name)
    );
  });

  // When nothing matches every word, the exercises that match some of them.
  protected readonly closeMatches = computed(() =>
    this.matches().length
      ? []
      : this.options()
          .filter((exercise) => matchesSomeWord(exercise.name, this.query()))
          .slice(0, CLOSE_MATCHES),
  );

  protected muscles(exercise: Exercise): string {
    return [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map(capitalize).join(' · ');
  }

  protected async add(exercise: Exercise): Promise<void> {
    const date = this.id() ? this.session()!.date : TuiDay.currentLocal().toJSON();
    await this.sessions.add(date, exercise);
    await this.router.navigate(this.back());
  }
}
