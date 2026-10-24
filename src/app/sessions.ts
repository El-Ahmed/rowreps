import { Injectable, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { liveQuery } from 'dexie';
import { from } from 'rxjs';
import { db, Lift, Session, WorkSet } from './db';
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
        await db.sessions.add({ date, exercises: [{ ...exercise, sets: [] }] });
      } else if (!session.exercises.some((item) => item.id === exercise.id)) {
        await db.sessions.update(session.id, {
          exercises: [...session.exercises, { ...exercise, sets: [] }],
        });
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

  // The exercise as done in each session that has sets of it, newest first.
  history(exerciseId: string): { date: string; lift: Lift }[] {
    return (this.all() ?? []).flatMap((session) => {
      const lift = session.exercises.find((item) => item.id === exerciseId && item.sets.length);
      return lift ? [{ date: session.date, lift }] : [];
    });
  }

  // The exercise as done in the latest session before `date` that has sets of it.
  lastTime(exerciseId: string, date: string): { date: string; lift: Lift } | undefined {
    return this.history(exerciseId).find((item) => item.date < date);
  }

  // Each exercise done on a day other than `date`, with the last day it was done, most recent first.
  recent(date: string): { id: string; date: string }[] {
    const last = new Map<string, string>();
    this.others(date).forEach((session) =>
      session.exercises.forEach((lift) => {
        if (!last.has(lift.id)) {
          last.set(lift.id, session.date);
        }
      }),
    );
    return [...last].map(([id, date]) => ({ id, date }));
  }

  // The exercises done on the last day each of `ids` was done, other than `date`, most recent first.
  often(date: string, ids: string[]): { id: string; date: string }[] {
    const recent = this.recent(date);
    const lastDays = recent.filter((item) => ids.includes(item.id)).map((item) => item.date);
    const together = new Set(
      this.others(date)
        .filter((session) => lastDays.includes(session.date))
        .flatMap((session) => session.exercises.map((lift) => lift.id)),
    );
    return recent.filter((item) => together.has(item.id) && !ids.includes(item.id));
  }

  // Adds the set at the end, or at `index` to put a deleted set back.
  addSet(session: Session, exerciseId: string, set: WorkSet, index?: number): Promise<void> {
    return this.changeSets(session, exerciseId, (sets) => {
      const copy = [...sets];
      copy.splice(index ?? sets.length, 0, set);
      return copy;
    });
  }

  changeSet(session: Session, exerciseId: string, index: number, set: WorkSet): Promise<void> {
    return this.changeSets(session, exerciseId, (sets) =>
      sets.map((item, i) => (i === index ? set : item)),
    );
  }

  deleteSet(session: Session, exerciseId: string, index: number): Promise<void> {
    return this.changeSets(session, exerciseId, (sets) => sets.filter((_, i) => i !== index));
  }

  // An empty note removes it.
  changeNote(session: Session, exerciseId: string, note: string): Promise<void> {
    return this.changeLift(session, exerciseId, (lift) => ({
      ...lift,
      note: note.trim() || undefined,
    }));
  }

  async changeDate(session: Session, date: string): Promise<void> {
    await db.sessions.update(session.id, { date });
  }

  delete(session: Session): Promise<void> {
    return db.sessions.delete(session.id);
  }

  // The sessions on days other than `date`, newest first.
  private others(date: string): Session[] {
    return (this.all() ?? []).filter((session) => session.date !== date);
  }

  // Reads the stored exercises rather than the given copy, so quick taps don't undo each other.
  // A session left with no exercises is deleted, so history never shows an empty day.
  private changeExercises(session: Session, change: (exercises: Lift[]) => Lift[]): Promise<void> {
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

  private changeSets(
    session: Session,
    exerciseId: string,
    change: (sets: WorkSet[]) => WorkSet[],
  ): Promise<void> {
    return this.changeLift(session, exerciseId, (lift) => ({ ...lift, sets: change(lift.sets) }));
  }

  private changeLift(
    session: Session,
    exerciseId: string,
    change: (lift: Lift) => Lift,
  ): Promise<void> {
    return this.changeExercises(session, (exercises) =>
      exercises.map((lift) => (lift.id === exerciseId ? change(lift) : lift)),
    );
  }
}
