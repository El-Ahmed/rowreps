import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { SessionHistory } from './history';

describe('SessionHistory', () => {
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
  let fixture: ComponentFixture<SessionHistory>;
  let sessions: Sessions;

  const element = () => fixture.nativeElement as HTMLElement;
  const text = (selector: string) =>
    [...element().querySelectorAll(selector)].map((item) => item.textContent?.trim());
  // The words of each element found, with a space between the words of separate elements.
  const words = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent?.trim() ?? '')
      : [...node.childNodes].map(words).filter(Boolean).join(' ');
  const pills = () => [...element().querySelectorAll('.worked li')].map(words);

  async function log(date: string, exercise: Exercise, sets: number): Promise<void> {
    await sessions.add(date, exercise);
    for (let i = 0; i < sets; i++) {
      const session = await db.sessions.get({ date });
      await sessions.addSet(session!, exercise.id, { weight: 60, reps: 8 });
    }
  }

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 9, 22) }); // Thursday 22 October
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    sessions = TestBed.inject(Sessions);
    fixture = TestBed.createComponent(SessionHistory);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('says so when there are no workouts yet', async () => {
    await vi.waitFor(async () => {
      await render();
      expect(element().textContent).toContain('No workouts yet.');
    });
  });

  it('lists sessions newest first under this week, last week, then their month', async () => {
    await sessions.add('2026-09-30', bench);
    await sessions.add('2026-10-06', bench);
    await sessions.add('2026-10-12', bench);
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-21', pullups);
    await sessions.add('2026-10-21', bench);

    await vi.waitFor(async () => {
      await render();
      expect(text('[tuiTitle]')).toEqual([
        `Wed 21 Oct ${pullups.name}, ${bench.name}`,
        `Mon 19 Oct ${bench.name}`,
        `Mon 12 Oct ${bench.name}`,
        `Tue 6 Oct ${bench.name}`,
        `Wed 30 Sep ${bench.name}`,
      ]);
    });
    expect(text('h2')).toEqual([
      'Muscles worked',
      'This week',
      'Last week',
      'October 2026',
      'September 2026',
    ]);
    expect(text('.count')).toEqual(['2 lifts', '1 lift', '1 lift', '1 lift', '1 lift']);
  });

  it('links each session to its log', async () => {
    await sessions.add(TuiDay.currentLocal().toJSON(), bench);

    await vi.waitFor(async () => {
      await render();
      expect(element().querySelector('li a')?.getAttribute('href')).toBe('/history/1');
    });
  });

  it('shows the sets each muscle got in the last 7 days, and the muscles not trained', async () => {
    await log('2026-10-21', bench, 5);
    await log('2026-10-19', pullups, 3);
    await log('2026-10-12', pullups, 4);

    await vi.waitFor(async () => {
      await render();
      expect(pills()).toEqual([
        'Chest 5 sets',
        'Lats 3 sets',
        'Shoulders 2.5 sets',
        'Triceps 2.5 sets',
        'Biceps 1.5 sets',
        'Middle back 1.5 sets',
      ]);
    });
    expect(text('.not-trained')[0]).toBe(
      'Not trained: Abdominals, Abductors, Adductors, Calves, Forearms, Glutes, Hamstrings, ' +
        'Lower back, Neck, Quadriceps, Traps',
    );
    expect(element().querySelectorAll('app-muscle-figure .primary')).toHaveLength(2); // Chest
    expect(element().querySelectorAll('app-muscle-figure .secondary').length).toBeGreaterThan(0);
  });

  it('switches to the last 30 days', async () => {
    await log('2026-10-21', bench, 1);
    await log('2026-10-12', pullups, 4);

    await vi.waitFor(async () => {
      await render();
      expect(pills()[0]).toBe('Chest 1 set');
    });
    const button = [...element().querySelectorAll('button')].find(
      (item) => item.textContent?.trim() === 'Last 30 days',
    )!;
    button.click();

    await vi.waitFor(async () => {
      await render();
      expect(pills()).toEqual([
        'Lats 4 sets',
        'Biceps 2 sets',
        'Middle back 2 sets',
        'Chest 1 set',
        'Shoulders 0.5 sets',
        'Triceps 0.5 sets',
      ]);
    });
  });

  it('says so when no sets were logged in the period', async () => {
    await sessions.add('2026-10-21', bench);

    await vi.waitFor(async () => {
      await render();
      expect(element().textContent).toContain('No sets logged in the last 7 days.');
    });
  });
});
