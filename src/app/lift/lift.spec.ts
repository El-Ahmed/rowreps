import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { WorkSet, db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { LiftScreen } from './lift';

describe('LiftScreen', () => {
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
  const today = () => TuiDay.currentLocal().toJSON();
  let fixture: ComponentFixture<LiftScreen>;
  let sessions: Sessions;
  let navigate: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const text = () => element().textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...element().querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    );
  const stored = async () => (await db.sessions.get({ date: today() }))!.exercises[0];

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function shows(content: string): Promise<void> {
    await vi.waitFor(async () => {
      await render();
      expect(text()).toContain(content);
    });
  }

  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  const input = (selector: string) => element().querySelector(selector) as HTMLInputElement;
  const weight = () => input('[aria-label="Weight (kg)"]');
  const reps = () => input('[aria-label="Reps"]');

  // Saves the exercise to the day with these sets.
  async function log(date: string, exercise: Exercise, ...sets: WorkSet[]): Promise<void> {
    await sessions.add(date, exercise);
    for (const set of sets) {
      await sessions.addSet((await db.sessions.get({ date }))!, exercise.id, set);
    }
  }

  async function open(exercise: Exercise): Promise<void> {
    fixture = TestBed.createComponent(LiftScreen);
    fixture.componentRef.setInput('id', exercise.id);
    await shows(exercise.name);
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    sessions = TestBed.inject(Sessions);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('the first time', () => {
    beforeEach(async () => {
      await log(today(), bench);
      await open(bench);
    });

    it('asks for the weight and reps of set 1', () => {
      expect(text()).toContain('Set 1');
      expect(text()).not.toContain('Last time');
      expect(weight().value).toBe('');
      expect(reps().value).toBe('');
      expect(button('Log set')?.disabled).toBe(true);
    });

    it('logs the typed set and starts the rest', async () => {
      type(weight(), '80');
      type(reps(), '8');
      await render();
      button('Log set')?.click();

      await shows('Set 1 logged');
      expect((await stored()).sets).toEqual([{ weight: 80, reps: 8 }]);
      expect(text()).toContain('80 kg × 8');
      expect(text()).toContain('2:00');
      expect(text()).not.toContain('vs last time');
    });
  });

  describe('with a last time', () => {
    beforeEach(async () => {
      await log(
        '2026-01-05',
        bench,
        { weight: 80, reps: 8 },
        { weight: 80, reps: 8 },
        { weight: 77.5, reps: 6 },
      );
      await sessions.changeNote(
        (await db.sessions.get({ date: '2026-01-05' }))!,
        bench.id,
        'Reduce weight next time',
      );
      await log(today(), bench);
      await open(bench);
      await shows('Last time');
    });

    it('starts from the same set last time, with its note', () => {
      expect(text()).toContain('Set 1 of 3');
      expect(text()).toContain('Last time · 80 kg × 8');
      expect(text()).toContain('Mon 5 Jan · Reduce weight next time');
      expect(weight().value).toBe('80');
      expect(reps().value).toBe('8');
    });

    it('compares each logged set with the same set last time', async () => {
      button('Log set')?.click();
      await shows('Matched last time');

      button('New set')?.click();
      await shows('Set 2 of 3');
      type(weight(), '82.5');
      await render();
      button('Log set')?.click();

      await shows('+2.5 kg vs last time');
      expect((await stored()).sets).toEqual([
        { weight: 80, reps: 8 },
        { weight: 82.5, reps: 8 },
      ]);
    });

    it('has no Edit button: the numbers are always typable', () => {
      expect(button('Edit')).toBeUndefined();
      expect(weight().readOnly).toBe(false);
      expect(reps().readOnly).toBe(false);
    });

    it('moves from weight to reps on Enter, then closes the keyboard', () => {
      weight().focus();
      weight().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(document.activeElement).toBe(reps());

      reps().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(document.activeElement).not.toBe(reps());
      expect(document.activeElement).not.toBe(weight());
    });

    it('takes a logged set back with Undo', async () => {
      button('Log set')?.click();
      await shows('Set 1 logged');

      button('Undo')?.click();

      await shows('Set 1 of 3');
      expect((await stored()).sets).toEqual([]);
    });
  });

  it('opens a lift that already has sets on its rest, without a timer', async () => {
    await log(today(), bench, { weight: 80, reps: 8 });
    await open(bench);

    await shows('New set');
    expect(text()).toContain('80 kg × 8');
    expect(text()).toContain('Finish lift');
    expect(element().querySelector('.timer')).toBeNull();
    expect(text()).not.toContain('logged');
  });

  describe('resting', () => {
    beforeEach(async () => {
      await log(today(), bench, { weight: 80, reps: 8 });
      await open(bench);
      await shows('New set');
      button('New set')?.click();
      await shows('Set 2');
      button('Log set')?.click();
      await shows('Set 2 logged');
    });

    it('counts the rest down and adds 15 seconds on a tap', async () => {
      const timer = () => element().querySelector<HTMLButtonElement>('.timer')!;
      // The rest starts at 2:00; waiting for the screen may already have ticked it a little.
      vi.advanceTimersByTime(30_000);
      await render();
      const left = timer().textContent!.match(/\d:\d\d/)![0];

      timer().click();
      await render();

      expect(left).toMatch(/^1:[23]\d$/);
      const seconds = (clock: string) => Number(clock[0]) * 60 + Number(clock.slice(2));
      expect(seconds(timer().textContent!.match(/\d:\d\d/)![0])).toBe(seconds(left) + 15);
    });

    it('fixes a logged set in place', async () => {
      element().querySelector<HTMLButtonElement>('.set')?.click();
      await render();
      type(input('[aria-label="Set 1 reps"]'), '9');
      await render();
      button('Done')?.click();

      await shows('80 kg × 9');
      expect((await stored()).sets).toEqual([
        { weight: 80, reps: 9 },
        { weight: 80, reps: 8 },
      ]);
    });

    it('deletes a set with its swipe action, and puts it back with Undo', async () => {
      button('Delete set 1')?.click();

      await shows('Set deleted');
      expect(text()).toContain('Set 1 · 80 kg × 8');
      expect((await stored()).sets).toEqual([{ weight: 80, reps: 8 }]);

      button('Undo')?.click();

      await vi.waitFor(async () =>
        expect((await stored()).sets).toEqual([
          { weight: 80, reps: 8 },
          { weight: 80, reps: 8 },
        ]),
      );
    });

    it("writes a note on today's lift", async () => {
      expect(text()).toContain('Add note');

      element().querySelector<HTMLButtonElement>('.note')?.click();
      await render();
      type(element().querySelector('textarea')!, 'Felt easy');
      await render();
      button('Done')?.click();

      await shows('Felt easy');
      expect((await stored()).note).toBe('Felt easy');
    });

    it('goes back to today with Finish lift', () => {
      expect(element().querySelector('a[href="/"]')?.textContent).toContain('Back');
      expect(
        [...element().querySelectorAll('a[href="/"]')].map((link) => link.textContent?.trim()),
      ).toContain('Finish lift');
    });
  });

  it('says which lift of today it is', async () => {
    await log(today(), bench);
    await log(today(), pullups);
    await open(pullups);

    expect(text()).toContain('Lift 2 of 2');
  });

  it("goes back to today for an exercise that is not on today's list", async () => {
    await log(today(), bench);
    fixture = TestBed.createComponent(LiftScreen);
    fixture.componentRef.setInput('id', pullups.id);

    await vi.waitFor(async () => {
      await render();
      expect(navigate).toHaveBeenCalledWith(['/']);
    });
  });
});
