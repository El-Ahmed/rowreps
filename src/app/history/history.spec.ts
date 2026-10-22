import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
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
    expect(text('h2')).toEqual(['This week', 'Last week', 'October 2026', 'September 2026']);
    expect(text('.count')).toEqual(['2 lifts', '1 lift', '1 lift', '1 lift', '1 lift']);
  });

  it('links each session to its log', async () => {
    await sessions.add(TuiDay.currentLocal().toJSON(), bench);

    await vi.waitFor(async () => {
      await render();
      expect(element().querySelector('li a')?.getAttribute('href')).toBe('/history/1');
    });
  });
});
