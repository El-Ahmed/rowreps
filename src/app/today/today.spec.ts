import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiDialogService, TuiRoot, provideTaiga } from '@taiga-ui/core';
import { of } from 'rxjs';
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

// The install sheet opens inside tui-root, so these tests render Today in one.
@Component({
  imports: [TuiRoot, Today],
  template: '<tui-root><app-today /></tui-root>',
})
class Host {}

describe('Today, asking to install', () => {
  const iphone =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };
  let fixture: ComponentFixture<Host>;

  const page = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (text: string) =>
    [...document.body.querySelectorAll('button')].find((b) =>
      b.textContent?.trim().startsWith(text),
    );

  function configure(): void {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideTaiga()] });
  }

  async function open(): Promise<void> {
    fixture = TestBed.createComponent(Host);
    await shows('What are you lifting today?');
  }

  // Closes the app and starts it again.
  function restart(): void {
    fixture.destroy();
    TestBed.resetTestingModule();
    configure();
  }

  async function shows(content: string): Promise<void> {
    await vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(page()).toContain(content);
    });
  }

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  // A set of pull-ups logged on a day before today.
  function workedOut(): Promise<number> {
    return db.sessions.add({
      date: '2026-01-05',
      exercises: [{ ...pullups, sets: [{ weight: 0, reps: 10 }] }],
    });
  }

  beforeEach(configure);

  afterEach(() => {
    vi.restoreAllMocks();
    delete (navigator as { standalone?: boolean }).standalone;
  });

  describe('in iPhone Safari', () => {
    beforeEach(() => {
      vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(iphone);
    });

    it('shows the Add to Home Screen line, which opens the steps', async () => {
      await open();
      await shows('Opens like an app and keeps your workouts safe');

      button('Add to Home Screen')?.click();

      await shows("Tap Share In Safari's toolbar");
    });

    it('hides the line for good once closed', async () => {
      await open();
      await shows('Add to Home Screen');

      button('Not now')?.click();
      await settle();
      expect(page()).not.toContain('Add to Home Screen');

      restart();
      await open();
      expect(page()).not.toContain('Add to Home Screen');
    });

    it('asks to save the workouts and add it, on a day after the first workout', async () => {
      await workedOut();
      await open();

      await shows('Keep your workouts safe');
      expect(page()).toContain('Save workouts file');
      expect(page()).not.toContain('Opens like an app');
    });

    it('asks only once', async () => {
      await workedOut();
      await open();
      await shows('Keep your workouts safe');

      restart();
      await open();
      await settle();
      expect(page()).not.toContain('Keep your workouts safe');
    });
  });

  it('offers to restore in the installed iPhone app, once', async () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(iphone);
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });
    const dialog = vi.spyOn(TestBed.inject(TuiDialogService), 'open').mockReturnValue(of(false));
    await open();

    await vi.waitFor(() =>
      expect(dialog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ label: 'Logged workouts in Safari?' }),
      ),
    );
    expect(page()).not.toContain('Add to Home Screen');

    restart();
    const again = vi.spyOn(TestBed.inject(TuiDialogService), 'open');
    await open();
    await settle();
    expect(again).not.toHaveBeenCalled();
  });

  it('shows the install card on Android on a day after the first workout', async () => {
    const prompt = vi.fn().mockResolvedValue(undefined);
    await workedOut();
    await open();
    expect(page()).not.toContain('Quicker to open at the gym');

    dispatchEvent(Object.assign(new Event('beforeinstallprompt'), { prompt }));
    await shows('Add RowReps to your home screen Quicker to open at the gym');
    button('Install')?.click();
    await settle();

    expect(prompt).toHaveBeenCalled();
    expect(page()).not.toContain('Quicker to open at the gym');
  });
});
