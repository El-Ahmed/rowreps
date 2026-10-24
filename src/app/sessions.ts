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

  // Each exercise done with sets on a day other than `date`, with the last day it was done,
  // most recent first.
  recent(date: string): { id: string; date: string }[] {
    const last = new Map<string, string>();
    this.done(date).forEach((session) =>
      session.exercises.forEach((lift) => {
        if (!last.has(lift.id)) {
          last.set(lift.id, session.date);
        }
      }),
    );
    return [...last].map(([id, date]) => ({ id, date }));
  }

  // The exercises done on the same days as any of `ids`, on days other than `date`:
  // on the most days in common first, then the most recent.
  often(date: string, ids: string[]): { id: string; date: string }[] {
    const days = this.done(date).filter((session) =>
      session.exercises.some((lift) => ids.includes(lift.id)),
    );
    const daysWith = (id: string) =>
      days.filter((session) => session.exercises.some((lift) => lift.id === id)).length;

    return this.recent(date)
      .filter((item) => !ids.includes(item.id) && daysWith(item.id))
      .sort((a, b) => daysWith(b.id) - daysWith(a.id));
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

  // The sessions on days other than `date`, newest first, with only the exercises that have sets.
  private done(date: string): Session[] {
    return (this.all() ?? [])
      .filter((session) => session.date !== date)
      .map((session) => ({
        ...session,
        exercises: session.exercises.filter((lift) => lift.sets.length),
      }));
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
