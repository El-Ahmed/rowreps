import { Component, booleanAttribute, computed, inject, input, signal } from '@angular/core';
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
// How many recent exercises to suggest, counting the ones done on the same days.
const SUGGESTIONS = 7;

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
  // From ?browse=true: every exercise by muscle group instead of the suggestions.
  readonly browse = input(false, { transform: booleanAttribute });

  protected readonly session = computed(() => {
    const id = this.id();
    return id
      ? this.sessions.all()?.find((session) => session.id === Number(id))
      : this.sessions.today();
  });
  private readonly date = computed(() =>
    this.id() ? this.session()?.date : TuiDay.currentLocal().toJSON(),
  );
  private readonly sessionLink = computed(() => (this.id() ? ['/history', this.id()] : ['/']));
  protected readonly addLink = computed(() => [...this.sessionLink(), 'add']);
  protected readonly back = computed(() => (this.browse() ? this.addLink() : this.sessionLink()));
  protected readonly newExercise = computed(() => [...this.addLink(), 'new']);

  protected readonly query = signal('');
  protected readonly name = computed(() => this.query().trim());

  // The exercises not yet in the session.
  private readonly options = computed(() => {
    const picked = new Set(this.session()?.exercises.map((exercise) => exercise.id));
    return this.exercises().filter((exercise) => !picked.has(exercise.id));
  });
  private readonly optionsById = computed(
    () => new Map(this.options().map((exercise) => [exercise.id, exercise])),
  );
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

  // Before any search: what was done the last time each of the session's exercises was done,
  // then what was done last, each with the last day it was done.
  protected readonly suggestions = computed(() => {
    const date = this.date();
    if (!date || this.name() || this.browse()) {
      return [];
    }
    const ids = this.session()?.exercises.map((exercise) => exercise.id) ?? [];
    const often = this.suggested(this.sessions.often(date, ids));
    const recent = this.suggested(this.sessions.recent(date))
      .filter((item) => !often.some((suggestion) => suggestion.exercise === item.exercise))
      .slice(0, Math.max(SUGGESTIONS - often.length, 0));

    return [
      { name: 'Often on the same days', items: often },
      { name: 'Recent', items: recent },
    ].filter((section) => section.items.length);
  });

  // The items' exercises that can still be added, with their dates.
  private suggested(items: { id: string; date: string }[]) {
    return items.flatMap((item) => {
      const exercise = this.optionsById().get(item.id);
      return exercise ? [{ exercise, date: item.date }] : [];
    });
  }

  protected muscles(exercise: Exercise): string {
    return [...exercise.primaryMuscles, ...exercise.secondaryMuscles].map(capitalize).join(' · ');
  }

  protected async add(exercise: Exercise): Promise<void> {
    await this.sessions.add(this.date()!, exercise);
    await this.router.navigate(this.sessionLink());
  }
}
