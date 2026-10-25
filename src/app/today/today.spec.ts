import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { Today } from './today';

describe('Today', () => {
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
  let fixture: ComponentFixture<Today>;
  let sessions: Sessions;

  const element = () => fixture.nativeElement as HTMLElement;
  // The exercise names, without the line under them.
  const names = () =>
    [...element().querySelectorAll('li [tuiTitle]')].map((title) =>
      title.firstChild?.textContent?.trim(),
    );
  const button = (text: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  // Saves the exercises to today's session and waits for the list to show them.
  async function plan(...exercises: Exercise[]): Promise<void> {
    for (const exercise of exercises) {
      await sessions.add(TuiDay.currentLocal().toJSON(), exercise);
    }
    await shows(exercises);
  }

  async function shows(exercises: Exercise[]): Promise<void> {
    await vi.waitFor(async () => {
      await render();
      expect(names()).toEqual(exercises.map((exercise) => exercise.name));
    });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    sessions = TestBed.inject(Sessions);
    fixture = TestBed.createComponent(Today);
    await vi.waitFor(async () => {
      await render();
      expect(element().textContent).toContain('What are you lifting today?');
    });
  });

  it('shows a prompt and the add button when nothing is planned', () => {
    expect(element().querySelector('a[href="/add"]')?.textContent).toContain('Add exercise');
    expect(button('Edit')).toBeUndefined();
  });

  it('links to the history and the settings', () => {
    expect(element().querySelector('a[href="/history"]')?.textContent).toContain('History');
    expect(element().querySelector('a[href="/settings"]')?.textContent).toContain('Settings');
  });

  it("lists today's saved exercises in order", async () => {
    await plan(bench, pullups);

    expect(element().textContent).not.toContain('What are you lifting today?');
  });

  it('deletes an exercise with its swipe action', async () => {
    await plan(bench, pullups);

    button(`Delete ${bench.name}`)?.click();

    await shows([pullups]);
  });

  it('links each exercise to lifting it', async () => {
    await plan(bench, pullups);

    expect(element().querySelector(`a[href="/lift/${pullups.id}"]`)?.textContent).toContain(
      pullups.name,
    );
  });

  it('shows the sets done today, what was lifted last time, and how many lifts are done', async () => {
    await sessions.add('2026-01-05', pullups);
    await sessions.addSet((await db.sessions.get({ date: '2026-01-05' }))!, pullups.id, {
      weight: 0,
      reps: 10,
    });
    await plan(bench, pullups);
    const today = (await db.sessions.get({ date: TuiDay.currentLocal().toJSON() }))!;
    await sessions.addSet(today, bench.id, { weight: 80, reps: 8 });
    await sessions.addSet(today, bench.id, { weight: 85, reps: 6 });

    await vi.waitFor(async () => {
      await render();
      expect(element().querySelector('.progress')?.textContent).toBe('1 of 2 lifts done');
      expect([...element().querySelectorAll('.summary')].map((item) => item.textContent)).toEqual([
        '2 sets · 85 × 6',
        'Last time 0 × 10',
      ]);
    });
  });

  describe('edit mode', () => {
    beforeEach(async () => {
      await plan(bench, pullups, squat);
      button('Edit')?.click();
      await render();
    });

    it('swaps Edit for Done and hides the add button', () => {
      expect(button('Done')).toBeDefined();
      expect(element().querySelector('a[href="/add"]')).toBeNull();
    });

    it('removes an exercise', async () => {
      button(`Remove ${pullups.name}`)?.click();

      await shows([bench, squat]);
    });

    it('reorders exercises when one is dropped in a new place', async () => {
      fixture.debugElement
        .query(By.directive(CdkDropList))
        .triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 2 });

      await shows([pullups, squat, bench]);
    });

    it('leaves edit mode after the last exercise is removed', async () => {
      button(`Remove ${bench.name}`)?.click();
      button(`Remove ${pullups.name}`)?.click();
      button(`Remove ${squat.name}`)?.click();

      await shows([]);
      expect(button('Done')).toBeUndefined();
      expect(element().textContent).toContain('What are you lifting today?');
    });

    it('returns to the normal list with Done', async () => {
      button('Done')?.click();
      await render();

      expect(button('Edit')).toBeDefined();
      expect(button(`Remove ${bench.name}`)).toBeUndefined();
    });
  });
});
