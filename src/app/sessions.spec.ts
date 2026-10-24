import { TestBed } from '@angular/core/testing';
import { TuiDay } from '@taiga-ui/cdk';
import Dexie from 'dexie';
import { db, Session } from './db';
import { Exercise } from './exercises';
import { Sessions } from './sessions';

describe('Sessions', () => {
  const bench: Exercise = {
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
  };
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };
  const squat: Exercise = {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
  };
  let sessions: Sessions;

  // How exercises are stored once added: with no sets yet.
  const planned = (...exercises: Exercise[]) =>
    exercises.map((exercise) => ({ ...exercise, sets: [] }));

  const stored = () => db.sessions.toArray();
  const session = (date: string) => db.sessions.get({ date }) as Promise<Session>;

  beforeEach(() => {
    sessions = TestBed.inject(Sessions);
  });

  it('starts a session for the day with the first exercise', async () => {
    await sessions.add('2026-10-19', bench);

    expect(await stored()).toEqual([{ id: 1, date: '2026-10-19', exercises: planned(bench) }]);
  });

  it('adds exercises in the order they were picked, once each', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', bench);

    expect((await session('2026-10-19')).exercises).toEqual(planned(bench, pullups));
  });

  it('keeps each day in its own session', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-21', pullups);

    expect((await stored()).map((item) => item.date)).toEqual(['2026-10-19', '2026-10-21']);
  });

  it('lists sessions newest first and finds today', async () => {
    const today = TuiDay.currentLocal().toJSON();
    await sessions.add('2026-10-19', bench);
    await sessions.add(today, squat);

    await vi.waitFor(() =>
      expect(sessions.all()?.map((item) => item.date)).toEqual([today, '2026-10-19']),
    );
    expect(sessions.today()?.exercises).toEqual(planned(squat));
  });

  it('removes an exercise', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.remove(await session('2026-10-19'), bench);

    expect((await session('2026-10-19')).exercises).toEqual(planned(pullups));
  });

  it('deletes the session along with its last exercise', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.remove(await session('2026-10-19'), bench);

    expect(await stored()).toEqual([]);
  });

  it('removes from what is stored, not from an older copy', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', squat);
    const copy = await session('2026-10-19');

    await sessions.remove(copy, bench);
    await sessions.remove(copy, pullups);

    expect((await session('2026-10-19')).exercises).toEqual(planned(squat));
  });

  it('moves an exercise to a new position', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', squat);
    await sessions.move(await session('2026-10-19'), 0, 2);

    expect((await session('2026-10-19')).exercises).toEqual(planned(pullups, squat, bench));
  });

  it('changes the date of a session', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.changeDate(await session('2026-10-19'), '2026-10-17');

    expect(await stored()).toEqual([{ id: 1, date: '2026-10-17', exercises: planned(bench) }]);
  });

  it('deletes a session', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-21', pullups);
    await sessions.delete(await session('2026-10-19'));

    expect((await stored()).map((item) => item.date)).toEqual(['2026-10-21']);
  });

  describe('sets and notes', () => {
    beforeEach(async () => {
      await sessions.add('2026-10-19', bench);
      await sessions.add('2026-10-19', pullups);
    });

    const lift = async (exercise: Exercise) =>
      (await session('2026-10-19')).exercises.find((item) => item.id === exercise.id)!;

    it('logs sets in order on their exercise only', async () => {
      await sessions.addSet(await session('2026-10-19'), bench.id, { weight: 80, reps: 8 });
      await sessions.addSet(await session('2026-10-19'), bench.id, { weight: 82.5, reps: 6 });

      expect((await lift(bench)).sets).toEqual([
        { weight: 80, reps: 8 },
        { weight: 82.5, reps: 6 },
      ]);
      expect((await lift(pullups)).sets).toEqual([]);
    });

    it('puts a set back where it was', async () => {
      const copy = await session('2026-10-19');
      await sessions.addSet(copy, bench.id, { weight: 80, reps: 8 });
      await sessions.addSet(copy, bench.id, { weight: 80, reps: 6 });
      await sessions.addSet(copy, bench.id, { weight: 75, reps: 10 }, 1);

      expect((await lift(bench)).sets.map((set) => set.reps)).toEqual([8, 10, 6]);
    });

    it('changes and deletes a set', async () => {
      const copy = await session('2026-10-19');
      await sessions.addSet(copy, bench.id, { weight: 80, reps: 8 });
      await sessions.addSet(copy, bench.id, { weight: 80, reps: 6 });

      await sessions.changeSet(copy, bench.id, 1, { weight: 77.5, reps: 7 });
      expect((await lift(bench)).sets).toEqual([
        { weight: 80, reps: 8 },
        { weight: 77.5, reps: 7 },
      ]);

      await sessions.deleteSet(copy, bench.id, 0);
      expect((await lift(bench)).sets).toEqual([{ weight: 77.5, reps: 7 }]);
    });

    it('writes a note, trimmed, and removes it when emptied', async () => {
      await sessions.changeNote(await session('2026-10-19'), bench.id, '  Reduce weight  ');
      expect((await lift(bench)).note).toBe('Reduce weight');

      await sessions.changeNote(await session('2026-10-19'), bench.id, ' ');
      expect((await lift(bench)).note).toBeUndefined();
    });

    it('finds the last time an exercise was done with sets', async () => {
      await sessions.addSet(await session('2026-10-19'), bench.id, { weight: 80, reps: 8 });
      await sessions.add('2026-10-21', bench);
      await sessions.add('2026-10-23', bench);

      await vi.waitFor(() => expect(sessions.all()?.length).toBe(3));
      expect(sessions.lastTime(bench.id, '2026-10-23')).toEqual({
        date: '2026-10-19',
        lift: { ...bench, sets: [{ weight: 80, reps: 8 }] },
      });
      expect(sessions.lastTime(bench.id, '2026-10-19')).toBeUndefined();
      expect(sessions.lastTime(pullups.id, '2026-10-23')).toBeUndefined();
    });

    it('lists the sessions an exercise was done with sets, newest first', async () => {
      await sessions.addSet(await session('2026-10-19'), bench.id, { weight: 80, reps: 8 });
      await sessions.add('2026-10-21', bench);
      await sessions.add('2026-10-23', bench);
      await sessions.addSet(await session('2026-10-23'), bench.id, { weight: 85, reps: 6 });

      await vi.waitFor(() => expect(sessions.history(bench.id).length).toBe(2));
      expect(sessions.history(bench.id).map((item) => item.date)).toEqual([
        '2026-10-23',
        '2026-10-19',
      ]);
      expect(sessions.history(pullups.id)).toEqual([]);
    });
  });

  describe('recent and often', () => {
    const curl: Exercise = {
      id: 'Barbell_Curl',
      name: 'Barbell Curl',
      primaryMuscles: ['biceps'],
      secondaryMuscles: ['forearms'],
    };

    // Starts a session on the date with the exercises, each with one set.
    async function log(date: string, ...exercises: Exercise[]): Promise<void> {
      for (const exercise of exercises) {
        await sessions.add(date, exercise);
        await sessions.addSet(await session(date), exercise.id, { weight: 50, reps: 10 });
      }
    }

    it('lists each exercise once with the last day it was done, most recent first', async () => {
      await log('2026-10-16', squat, bench);
      await log('2026-10-19', bench, pullups);

      await vi.waitFor(() =>
        expect(sessions.recent('2026-10-24')).toEqual([
          { id: bench.id, date: '2026-10-19' },
          { id: pullups.id, date: '2026-10-19' },
          { id: squat.id, date: '2026-10-16' },
        ]),
      );
    });

    it('leaves out the given day, and counts exercises with no sets', async () => {
      await log('2026-10-19', bench);
      await sessions.add('2026-10-19', pullups);
      await log('2026-10-24', squat);

      await vi.waitFor(() =>
        expect(sessions.recent('2026-10-24')).toEqual([
          { id: bench.id, date: '2026-10-19' },
          { id: pullups.id, date: '2026-10-19' },
        ]),
      );
    });

    it('finds what was done the last time an exercise was done, not before', async () => {
      await log('2026-10-12', bench, curl);
      await log('2026-10-19', bench, pullups);

      await vi.waitFor(() =>
        expect(sessions.often('2026-10-24', [bench.id])).toEqual([
          { id: pullups.id, date: '2026-10-19' },
        ]),
      );
      expect(sessions.often('2026-10-24', [])).toEqual([]);
    });

    it('finds what was done the last time each exercise was done, sets or not', async () => {
      await log('2026-10-16', squat);
      await sessions.add('2026-10-16', pullups);
      await sessions.add('2026-10-19', bench);
      await sessions.add('2026-10-19', curl);

      await vi.waitFor(() =>
        expect(sessions.often('2026-10-24', [bench.id, squat.id])).toEqual([
          { id: curl.id, date: '2026-10-19' },
          { id: pullups.id, date: '2026-10-16' },
        ]),
      );
    });
  });

  it('gives exercises saved before sets existed no sets', async () => {
    await db.delete();
    const old = new Dexie('rowreps');
    old.version(1).stores({ sessions: '++id, &date' });
    await old.table('sessions').add({ date: '2026-10-19', exercises: [bench] });
    old.close();
    await db.open();

    expect(await stored()).toEqual([{ id: 1, date: '2026-10-19', exercises: planned(bench) }]);
  });
});
