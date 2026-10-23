import Dexie, { type EntityTable } from 'dexie';
import { Exercise } from './exercises';

// One logged set: the weight in kg, and how many reps were done with it.
export interface WorkSet {
  weight: number;
  reps: number;
}

// An exercise as done in one session: its sets in the order they were done, and an optional note.
export interface Lift extends Exercise {
  sets: WorkSet[];
  note?: string;
}

// One workout. `date` is the local day as YYYY-MM-DD; there is at most one session per day.
export interface Session {
  id: number;
  date: string;
  exercises: Lift[];
}

export const db = new Dexie('rowreps') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({ sessions: '++id, &date' });
// Version 2 logs sets: exercises saved before then start with none.
db.version(2)
  .stores({ sessions: '++id, &date' })
  .upgrade((transaction) =>
    transaction
      .table<Session>('sessions')
      .toCollection()
      .modify((session) => {
        session.exercises = session.exercises.map((exercise) => ({ ...exercise, sets: [] }));
      }),
  );
