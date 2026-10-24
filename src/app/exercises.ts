import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { HttpClient } from '@angular/common/http';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db } from './db';

// An exercise from free-exercise-db (https://github.com/yuhonas/free-exercise-db),
// served from public/free-exercise-db/exercises.json, or one the user created.
// Only the fields the app uses are listed.
export interface Exercise {
  id: string;
  name: string;
  primaryMuscles: string[];
  secondaryMuscles: string[];
}

@Injectable({ providedIn: 'root' })
export class Exercises {
  private readonly library = toSignal(
    inject(HttpClient).get<Exercise[]>('free-exercise-db/exercises.json'),
    { initialValue: [] },
  );
  private readonly created = toSignal(from(liveQuery(() => db.exercises.toArray())), {
    initialValue: [],
  });

  // The user's own exercises first, then free-exercise-db's.
  readonly all = computed(() => [...this.created(), ...this.library()]);

  create(exercise: Exercise): Promise<string> {
    return db.exercises.add(exercise);
  }
}
