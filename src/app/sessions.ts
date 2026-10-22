import { Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db, Session } from './db';
import { Exercise } from './exercises';

@Injectable({ providedIn: 'root' })
export class Sessions {
  // Every session, newest first. Undefined until the database has been read.
  readonly all = toSignal(from(liveQuery(() => db.sessions.orderBy('date').reverse().toArray())));

  readonly today = computed(() =>
    this.all()?.find((session) => session.date === TuiDay.currentLocal().toJSON()),
  );

  // Adds the exercise to the session on that date, starting the session if there is none yet.
  add(date: string, exercise: Exercise): Promise<void> {
    return db.transaction('rw', db.sessions, async () => {
      const session = await db.sessions.get({ date });
      if (!session) {
        await db.sessions.add({ date, exercises: [exercise] });
      } else if (!session.exercises.some((item) => item.id === exercise.id)) {
        await db.sessions.update(session.id, { exercises: [...session.exercises, exercise] });
      }
    });
  }

  remove(session: Session, exercise: Exercise): Promise<void> {
    return this.changeExercises(session, (exercises) =>
      exercises.filter((item) => item.id !== exercise.id),
    );
  }

  move(session: Session, from: number, to: number): Promise<void> {
    return this.changeExercises(session, (exercises) => {
      const copy = [...exercises];
      moveItemInArray(copy, from, to);
      return copy;
    });
  }

  async changeDate(session: Session, date: string): Promise<void> {
    await db.sessions.update(session.id, { date });
  }

  delete(session: Session): Promise<void> {
    return db.sessions.delete(session.id);
  }

  // Reads the stored exercises rather than the given copy, so quick taps don't undo each other.
  // A session left with no exercises is deleted, so history never shows an empty day.
  private changeExercises(
    session: Session,
    change: (exercises: Exercise[]) => Exercise[],
  ): Promise<void> {
    return db.transaction('rw', db.sessions, async () => {
      const stored = await db.sessions.get(session.id);
      if (!stored) {
        return;
      }
      const exercises = change(stored.exercises);
      await (exercises.length
        ? db.sessions.update(session.id, { exercises })
        : db.sessions.delete(session.id));
    });
  }
}
