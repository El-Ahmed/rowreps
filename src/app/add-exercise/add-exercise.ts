import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TuiButton, TuiCell, TuiInput, TuiTitle } from '@taiga-ui/core';
import { EXERCISES, Exercise } from '../exercises';
import { TodayList } from '../today-list';

@Component({
  selector: 'app-add-exercise',
  imports: [FormsModule, RouterLink, TuiButton, TuiCell, TuiInput, TuiTitle],
  templateUrl: './add-exercise.html',
  styleUrl: './add-exercise.css',
})
export class AddExercise {
  private readonly todayList = inject(TodayList);
  private readonly router = inject(Router);

  protected readonly query = signal('');

  protected readonly groups = computed(() => {
    const query = this.query().trim().toLowerCase();
    const matches = EXERCISES.filter(
      (exercise) => !this.todayList.has(exercise) && exercise.name.toLowerCase().includes(query),
    );
    const names = [...new Set(matches.map((exercise) => exercise.group))];

    return names.map((name) => ({
      name,
      exercises: matches.filter((exercise) => exercise.group === name),
    }));
  });

  protected add(exercise: Exercise): void {
    this.todayList.add(exercise);
    this.router.navigate(['/']);
  }
}
