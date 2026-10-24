import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { AddExercise } from './add-exercise';

describe('AddExercise', () => {
  const bench: Exercise = {
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
  };
  const squat: Exercise = {
    id: 'Barbell_Squat',
    name: 'Barbell Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
  };
  const gobletSquat: Exercise = {
    id: 'Goblet_Squat',
    name: 'Goblet Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'shoulders'],
  };
  const frontSquat: Exercise = {
    id: 'Front_Barbell_Squat',
    name: 'Front Barbell Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['glutes', 'hamstrings'],
  };
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };

  let fixture: ComponentFixture<AddExercise>;
  let sessions: Sessions;
  const today = () => TuiDay.currentLocal().toJSON();
  // How exercises are stored once added: with no sets yet.
  const planned = (...exercises: Exercise[]) =>
    exercises.map((exercise) => ({ ...exercise, sets: [] }));

  const element = () => fixture.nativeElement as HTMLElement;
  const groups = () => [...element().querySelectorAll('h2')].map((h) => h.textContent?.trim());
  const options = () => [...element().querySelectorAll<HTMLButtonElement>('button[tuiCell]')];
  const optionNames = () =>
    options().map((option) => option.querySelector('[tuiTitle]')?.firstChild?.textContent?.trim());

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function search(text: string): Promise<void> {
    const input = element().querySelector('input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    sessions = TestBed.inject(Sessions);
    fixture = TestBed.createComponent(AddExercise);
    TestBed.inject(HttpTestingController)
      .expectOne('free-exercise-db/exercises.json')
      .flush([bench, squat, gobletSquat, frontSquat, pullups]);
    await render();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists every exercise grouped by primary muscle, groups in alphabetical order', () => {
    expect(groups()).toEqual(['Chest', 'Lats', 'Quadriceps']);
    expect(optionNames()).toEqual([
      bench.name,
      pullups.name,
      squat.name,
      gobletSquat.name,
      frontSquat.name,
    ]);
  });

  it('shows the primary then secondary muscles each exercise works', () => {
    expect(options()[0].textContent).toContain('Chest · Shoulders · Triceps');
  });

  it('focuses the search input when the screen opens', async () => {
    await vi.waitFor(() => expect(document.activeElement).toBe(element().querySelector('input')));
  });

  it('filters by name, ignoring case', async () => {
    await search('SQU');

    expect(groups()).toEqual(['Quadriceps']);
    expect(optionNames()).toEqual([squat.name, gobletSquat.name, frontSquat.name]);
  });

  it('matches the start of each typed word, in any order', async () => {
    await search('pr ben');

    expect(optionNames()).toEqual([bench.name]);
  });

  const createLink = () => element().querySelector<HTMLAnchorElement>('a[tuiCell]');

  it('says so when nothing matches, and offers to create it', async () => {
    await search('Belt squat ');

    expect(element().textContent).toContain('No exercise called "Belt squat" yet.');
    expect(createLink()?.textContent).toContain('Create "Belt squat"');
    expect(createLink()?.getAttribute('href')).toBe('/add/new?name=Belt%20squat');
  });

  it('shows the exercises that match some of the words as close matches', async () => {
    await search('Belt squat');

    expect(groups()).toEqual(['Close matches']);
    expect(optionNames()).toEqual([squat.name, gobletSquat.name, frontSquat.name]);
  });

  it('offers to create the exercise below a few results', async () => {
    await search('front');

    expect(optionNames()).toEqual([frontSquat.name]);
    expect(createLink()?.textContent).toContain('Create "front"');
  });

  it('does not offer to create it when there are enough results', async () => {
    await search('squat');

    expect(createLink()).toBeNull();
  });

  it('does not offer to create an exercise that already has that name', async () => {
    await search('goblet SQUAT');

    expect(optionNames()).toEqual([gobletSquat.name]);
    expect(createLink()).toBeNull();
  });

  it('finds the exercises the user created', async () => {
    const beltSquat = { ...squat, id: 'created', name: 'Belt Squat' };
    await db.exercises.add(beltSquat);

    await vi.waitFor(async () => {
      await search('belt');
      expect(optionNames()).toEqual([beltSquat.name]);
    });
  });

  it("hides exercises that are already in today's list", async () => {
    await sessions.add(today(), bench);

    await vi.waitFor(async () => {
      await render();
      expect(optionNames()).not.toContain(bench.name);
    });
  });

  it('adds the picked exercise to today and goes back', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    options()[0].click();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/']));
    expect(await db.sessions.toArray()).toEqual([
      { id: 1, date: today(), exercises: planned(bench) },
    ]);
  });

  describe('after some workouts', () => {
    // Starts a session on the date with the exercises, each with one set.
    async function log(date: string, ...exercises: Exercise[]): Promise<void> {
      for (const exercise of exercises) {
        await sessions.add(date, exercise);
        const session = await db.sessions.get({ date });
        await sessions.addSet(session!, exercise.id, { weight: 50, reps: 10 });
      }
    }

    const dates = () =>
      [...element().querySelectorAll('.date')].map((date) => date.textContent?.trim());
    const browseLink = () =>
      [...element().querySelectorAll('a')].find((a) => a.textContent?.includes('Browse'));

    beforeEach(async () => {
      await log('2026-10-16', squat);
      await log('2026-10-19', bench, pullups);
      await vi.waitFor(async () => {
        await render();
        expect(optionNames()).toEqual([bench.name, pullups.name, squat.name]);
      });
    });

    it('suggests the recent exercises with the last day each was done', () => {
      expect(groups()).toEqual(['Recent']);
      expect(dates()).toEqual(['Mon 19 Oct', 'Mon 19 Oct', 'Fri 16 Oct']);
    });

    it('links to every exercise by muscle group', () => {
      expect(browseLink()?.getAttribute('href')).toBe('/add?browse=true');
    });

    it('lists every exercise by muscle group when browsing, and goes back to the suggestions', async () => {
      fixture.componentRef.setInput('browse', true);
      await render();

      expect(groups()).toEqual(['Chest', 'Lats', 'Quadriceps']);
      expect(element().querySelector('a')?.getAttribute('href')).toBe('/add');
    });

    it('searches all exercises once something is typed', async () => {
      await search('squat');

      expect(groups()).toEqual(['Quadriceps']);
      expect(browseLink()).toBeUndefined();
    });

    it('suggests what was done on the same days as the exercises already picked', async () => {
      await sessions.add(today(), bench);

      await vi.waitFor(async () => {
        await render();
        expect(groups()).toEqual(['Often on the same days', 'Recent']);
      });
      expect(optionNames()).toEqual([pullups.name, squat.name]);
    });

    it('suggests seven exercises in all', async () => {
      const created = Array.from({ length: 8 }, (_, i) => ({
        ...squat,
        id: `created-${i}`,
        name: `Exercise ${i}`,
      }));
      await db.exercises.bulkAdd(created);
      await log('2026-10-21', ...created);

      await vi.waitFor(async () => {
        await render();
        expect(optionNames()).toEqual(created.slice(0, 7).map((exercise) => exercise.name));
      });
    });

    it('adds the suggested exercise to today and goes back', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      options()[2].click();

      await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/']));
      expect((await db.sessions.get({ date: today() }))?.exercises).toEqual(planned(squat));
    });

    it("for a past session, leaves out that day's exercises", async () => {
      fixture.componentRef.setInput('id', '2');
      await vi.waitFor(async () => {
        await render();
        expect(groups()).toEqual(['Recent']);
        expect(optionNames()).toEqual([squat.name]);
      });
      expect(browseLink()?.getAttribute('href')).toBe('/history/2/add?browse=true');
    });
  });

  describe('for a past session', () => {
    beforeEach(async () => {
      await sessions.add('2026-10-19', squat);
      fixture.componentRef.setInput('id', '1');
      await vi.waitFor(async () => {
        await render();
        expect(element().querySelector('h1')?.textContent).toContain('Add to Mon 19 Oct');
      });
    });

    it('hides the exercises already in that session', () => {
      expect(optionNames()).toEqual([bench.name, pullups.name, gobletSquat.name, frontSquat.name]);
    });

    it('goes back to that session', () => {
      expect(element().querySelector('a')?.getAttribute('href')).toBe('/history/1');
    });

    it('creates exercises for that session', async () => {
      await search('Belt squat');

      expect(createLink()?.getAttribute('href')).toBe('/history/1/add/new?name=Belt%20squat');
    });

    it('adds the picked exercise to that session and goes back to it', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      options()[0].click();

      await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/history', '1']));
      expect(await db.sessions.toArray()).toEqual([
        { id: 1, date: '2026-10-19', exercises: planned(squat, bench) },
      ]);
    });
  });
});
