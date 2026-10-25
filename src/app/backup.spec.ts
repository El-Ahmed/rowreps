import { TestBed } from '@angular/core/testing';
import { Backup, backup, parseBackup, restore, spreadsheet } from './backup';
import { db, Session } from './db';
import { Exercise } from './exercises';
import { Sessions } from './sessions';

describe('backup', () => {
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
  const mine: Exercise = {
    id: 'mine',
    name: 'Cable Fly',
    primaryMuscles: ['chest'],
    secondaryMuscles: [],
  };

  it('saves every workout, oldest first, and the created exercises', async () => {
    const sessions = TestBed.inject(Sessions);
    await sessions.add('2026-10-21', pullups);
    await sessions.add('2026-10-19', bench);
    await db.exercises.add(mine);

    expect(await backup()).toEqual({
      sessions: [
        { date: '2026-10-19', exercises: [{ ...bench, sets: [] }] },
        { date: '2026-10-21', exercises: [{ ...pullups, sets: [] }] },
      ],
      exercises: [mine],
    });
  });

  it('reads back a backup and refuses other files', () => {
    const file: Backup = { sessions: [{ date: '2026-10-19', exercises: [] }], exercises: [] };

    expect(parseBackup(JSON.stringify(file))).toEqual(file);
    expect(parseBackup('not json')).toBeUndefined();
    expect(parseBackup('{"sessions": []}')).toBeUndefined();
    expect(
      parseBackup('{"sessions": [{"date": "today", "exercises": []}], "exercises": []}'),
    ).toBeUndefined();
  });

  it('adds the days and exercises the phone lacks, keeping the ones it has', async () => {
    await db.sessions.add({ date: '2026-10-19', exercises: [{ ...pullups, sets: [] }] });
    await db.exercises.add({ ...mine, name: 'Cable Fly (renamed)' });

    await restore({
      sessions: [
        { date: '2026-10-19', exercises: [{ ...bench, sets: [{ weight: 60, reps: 8 }] }] },
        { date: '2026-10-21', exercises: [{ ...bench, sets: [{ weight: 62.5, reps: 8 }] }] },
      ],
      exercises: [mine, pullups],
    });

    const stored = await db.sessions.orderBy('date').toArray();
    expect(stored.map((session) => [session.date, session.exercises[0].id])).toEqual([
      ['2026-10-19', pullups.id],
      ['2026-10-21', bench.id],
    ]);
    expect((await db.exercises.get(mine.id))?.name).toBe('Cable Fly (renamed)');
    expect(await db.exercises.get(pullups.id)).toEqual(pullups);
  });

  it('makes a spreadsheet with a row per set, oldest first', () => {
    const sessions: Session[] = [
      {
        id: 2,
        date: '2026-10-21',
        exercises: [{ ...pullups, sets: [], note: 'Too tired' }],
      },
      {
        id: 1,
        date: '2026-10-19',
        exercises: [
          {
            ...bench,
            sets: [
              { weight: 60, reps: 8 },
              { weight: 62.5, reps: 6 },
            ],
            note: 'Felt "heavy", go slower',
          },
        ],
      },
    ];

    expect(spreadsheet(sessions).split('\r\n')).toEqual([
      'Date,Exercise,Primary muscles,Secondary muscles,Set,Weight,Reps,Note',
      `2026-10-19,${bench.name},chest,"shoulders, triceps",1,60,8,"Felt ""heavy"", go slower"`,
      `2026-10-19,${bench.name},chest,"shoulders, triceps",2,62.5,6,`,
      '2026-10-21,Pullups,lats,"biceps, middle back",,,,Too tired',
    ]);
  });
});
