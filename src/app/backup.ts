import { TuiDay } from '@taiga-ui/cdk';
import { db, Session } from './db';
import { Exercise } from './exercises';

// What a backup file holds: every workout, and the exercises the user created.
export interface Backup {
  sessions: Omit<Session, 'id'>[];
  exercises: Exercise[];
}

export async function backup(): Promise<Backup> {
  const sessions = await db.sessions.orderBy('date').toArray();
  return {
    sessions: sessions.map(({ date, exercises }) => ({ date, exercises })),
    exercises: await db.exercises.toArray(),
  };
}

// A file named after the app, what it holds and today's date.
export function file(name: string, extension: string, type: string, text: string): File {
  return new File([text], `rowreps-${name}-${TuiDay.currentLocal().toJSON()}.${extension}`, {
    type,
  });
}

export async function backupFile(): Promise<File> {
  return file('backup', 'json', 'application/json', JSON.stringify(await backup()));
}

// Saves the file to the phone's downloads.
export function download(file: File): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  URL.revokeObjectURL(link.href);
}

// The backup in the file, or undefined when the file isn't a RowReps backup.
export function parseBackup(text: string): Backup | undefined {
  try {
    const data = JSON.parse(text);
    const valid =
      Array.isArray(data?.sessions) &&
      Array.isArray(data?.exercises) &&
      data.sessions.every(
        (session: Session) =>
          /^\d{4}-\d{2}-\d{2}$/.test(session?.date) && Array.isArray(session.exercises),
      );
    return valid ? data : undefined;
  } catch {
    return undefined;
  }
}

// Adds the days and created exercises this phone doesn't have yet. The ones it has stay as they are.
export function restore(backup: Backup): Promise<void> {
  return db.transaction('rw', db.sessions, db.exercises, async () => {
    const dates = new Set(await db.sessions.orderBy('date').keys());
    const ids = new Set(await db.exercises.toCollection().primaryKeys());
    await db.sessions.bulkAdd(backup.sessions.filter((session) => !dates.has(session.date)));
    await db.exercises.bulkAdd(backup.exercises.filter((exercise) => !ids.has(exercise.id)));
  });
}

const HEADER = [
  'Date',
  'Exercise',
  'Primary muscles',
  'Secondary muscles',
  'Set',
  'Weight',
  'Reps',
  'Note',
];

// Quotes a value that holds a comma, a quote or a line break, as CSV needs.
const cell = (value: string | number) => {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

// One row per set, oldest first, each with its lift's note. A lift with no sets still gets a row.
export function spreadsheet(sessions: Session[]): string {
  const rows = [...sessions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .flatMap((session) =>
      session.exercises.flatMap((lift) => {
        const sets = lift.sets.length ? lift.sets : [undefined];
        return sets.map((set, index) => [
          session.date,
          lift.name,
          lift.primaryMuscles.join(', '),
          lift.secondaryMuscles.join(', '),
          set ? index + 1 : '',
          set?.weight ?? '',
          set?.reps ?? '',
          lift.note ?? '',
        ]);
      }),
    );
  return [HEADER, ...rows].map((row) => row.map(cell).join(',')).join('\r\n');
}
