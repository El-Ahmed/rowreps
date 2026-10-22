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
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };

  let fixture: ComponentFixture<AddExercise>;
  let sessions: Sessions;
  const today = () => TuiDay.currentLocal().toJSON();

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
      .flush([bench, squat, gobletSquat, pullups]);
    await render();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists every exercise grouped by primary muscle, groups in alphabetical order', () => {
    expect(groups()).toEqual(['Chest', 'Lats', 'Quadriceps']);
    expect(optionNames()).toEqual([bench.name, pullups.name, squat.name, gobletSquat.name]);
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
    expect(optionNames()).toEqual([squat.name, gobletSquat.name]);
  });

  it('matches the start of each typed word, in any order', async () => {
    await search('pr ben');

    expect(optionNames()).toEqual([bench.name]);
  });

  it('says so when nothing matches', async () => {
    await search('Belt squat');

    expect(options()).toEqual([]);
    expect(element().textContent).toContain('No exercise called "Belt squat" yet.');
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
    expect(await db.sessions.toArray()).toEqual([{ id: 1, date: today(), exercises: [bench] }]);
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
      expect(optionNames()).toEqual([bench.name, pullups.name, gobletSquat.name]);
    });

    it('goes back to that session', () => {
      expect(element().querySelector('a')?.getAttribute('href')).toBe('/history/1');
    });

    it('adds the picked exercise to that session and goes back to it', async () => {
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      options()[0].click();

      await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/history', '1']));
      expect(await db.sessions.toArray()).toEqual([
        { id: 1, date: '2026-10-19', exercises: [squat, bench] },
      ]);
    });
  });
});
