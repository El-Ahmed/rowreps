import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton, TuiCell, TuiInput, TuiTitle } from '@taiga-ui/core';
import { Exercise } from '../exercises';
import { TodayList } from '../today-list';

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const muscleGroup = (exercise: Exercise) => capitalize(exercise.primaryMuscles[0]);

@Component({
  selector: 'app-add-exercise',
  imports: [FormsModule, RouterLink, TuiButton, TuiCell, TuiInput, TuiTitle],
  templateUrl: './add-exercise.html',
  styleUrl: './add-exercise.css',
})
export class AddExercise {
  private readonly todayList = inject(TodayList);
  private readonly router = inject(Router);
  private readonly exercises = toSignal(
    inject(HttpClient).get<Exercise[]>('free-exercise-db/exercises.json'),
    { initialValue: [] },
  );

  protected readonly query = signal('');

  protected readonly groups = computed(() => {
    const query = this.query().trim().toLowerCase();
    const matches = this.exercises().filter(
      (exercise) => !this.todayList.has(exercise) && exercise.name.toLowerCase().includes(query),
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

  protected add(exercise: Exercise): void {
    this.todayList.add(exercise);
    this.router.navigate(['/']);
  }
}
