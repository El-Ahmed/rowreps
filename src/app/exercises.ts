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

// Puts the exercise's name and muscles in every workout it was done in.
const updateLifts = ({ id, name, primaryMuscles, secondaryMuscles }: Exercise) =>
  db.sessions
    .filter((session) => session.exercises.some((lift) => lift.id === id))
    .modify((session) => {
      session.exercises = session.exercises.map((lift) =>
        lift.id === id ? { ...lift, name, primaryMuscles, secondaryMuscles } : lift,
      );
    });

@Injectable({ providedIn: 'root' })
export class Exercises {
  readonly library = toSignal(
    inject(HttpClient).get<Exercise[]>('free-exercise-db/exercises.json'),
    { initialValue: [] },
  );
  // The exercises the user created, and the free-exercise-db ones they edited, under the same id.
  private readonly saved = toSignal(from(liveQuery(() => db.exercises.toArray())), {
    initialValue: [],
  });

  // The user's own exercises first, then free-exercise-db's that they haven't edited.
  readonly all = computed(() => {
    const ids = new Set(this.saved().map((exercise) => exercise.id));
    return [...this.saved(), ...this.library().filter((exercise) => !ids.has(exercise.id))];
  });

  create(exercise: Exercise): Promise<string> {
    return db.exercises.add(exercise);
  }

  // Saves the changes, in past workouts too.
  update(exercise: Exercise): Promise<void> {
    return db.transaction('rw', db.exercises, db.sessions, async () => {
      await db.exercises.put(exercise);
      await updateLifts(exercise);
    });
  }

  // Puts an edited free-exercise-db exercise back as it was, in past workouts too.
  reset(original: Exercise): Promise<void> {
    return db.transaction('rw', db.exercises, db.sessions, async () => {
      await db.exercises.delete(original.id);
      await updateLifts(original);
    });
  }
}
