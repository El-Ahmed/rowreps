import { TestBed } from '@angular/core/testing';
import { TuiDay } from '@taiga-ui/cdk';
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

  const stored = () => db.sessions.toArray();
  const session = (date: string) => db.sessions.get({ date }) as Promise<Session>;

  beforeEach(() => {
    sessions = TestBed.inject(Sessions);
  });

  it('starts a session for the day with the first exercise', async () => {
    await sessions.add('2026-10-19', bench);

    expect(await stored()).toEqual([{ id: 1, date: '2026-10-19', exercises: [bench] }]);
  });

  it('adds exercises in the order they were picked, once each', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', bench);

    expect((await session('2026-10-19')).exercises).toEqual([bench, pullups]);
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
    expect(sessions.today()?.exercises).toEqual([squat]);
  });

  it('removes an exercise', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.remove(await session('2026-10-19'), bench);

    expect((await session('2026-10-19')).exercises).toEqual([pullups]);
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

    expect((await session('2026-10-19')).exercises).toEqual([squat]);
  });

  it('moves an exercise to a new position', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', squat);
    await sessions.move(await session('2026-10-19'), 0, 2);

    expect((await session('2026-10-19')).exercises).toEqual([pullups, squat, bench]);
  });

  it('changes the date of a session', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.changeDate(await session('2026-10-19'), '2026-10-17');

    expect(await stored()).toEqual([{ id: 1, date: '2026-10-17', exercises: [bench] }]);
  });

  it('deletes a session', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-21', pullups);
    await sessions.delete(await session('2026-10-19'));

    expect((await stored()).map((item) => item.date)).toEqual(['2026-10-21']);
  });
});
