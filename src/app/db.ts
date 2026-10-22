import Dexie, { type EntityTable } from 'dexie';
import { Exercise } from './exercises';

// One workout. `date` is the local day as YYYY-MM-DD; there is at most one session per day.
export interface Session {
  id: number;
  date: string;
  exercises: Exercise[];
}

export const db = new Dexie('rowreps') as Dexie & {
  sessions: EntityTable<Session, 'id'>;
};

db.version(1).stores({ sessions: '++id, &date' });
