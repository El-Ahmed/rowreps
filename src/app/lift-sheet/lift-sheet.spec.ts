import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TUI_PLATFORM } from '@taiga-ui/cdk';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkSet, db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { LiftSheet } from './lift-sheet';

describe('LiftSheet', () => {
  const bench: Exercise = {
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
  };
  let fixture: ComponentFixture<LiftSheet>;
  let sessions: Sessions;
  let platform: 'ios' | 'android' | 'web';

  const element = () => fixture.nativeElement as HTMLElement;
  // The words of each element found, with a space between the words of separate elements.
  const words = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent?.trim() ?? '')
      : [...node.childNodes].map(words).filter(Boolean).join(' ');
  const text = () => words(element());
  const texts = (selector: string) => [...element().querySelectorAll(selector)].map(words);
  const tab = (label: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function log(date: string, ...sets: WorkSet[]): Promise<void> {
    await sessions.add(date, bench);
    for (const set of sets) {
      await sessions.addSet((await db.sessions.get({ date }))!, bench.id, set);
    }
  }

  // Opens the sheet once every saved session has been read.
  async function open(count: number): Promise<void> {
    await vi.waitFor(() => expect(sessions.all()?.length).toBe(count));
    fixture = TestBed.createComponent(LiftSheet);
    fixture.componentRef.setInput('lift', { ...bench, sets: [] });
    await render();
    TestBed.inject(HttpTestingController)
      .expectOne('free-exercise-db/exercises.json')
      .flush([{ id: bench.id, instructions: ['Lie back on a flat bench.', 'Press the bar up.'] }]);
    await render();
  }

  beforeEach(() => {
    platform = 'web';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: TUI_PLATFORM, useFactory: () => platform },
      ],
    });
    sessions = TestBed.inject(Sessions);
  });

  describe('a lift never logged', () => {
    beforeEach(() => open(0));

    it('opens on how to, with its muscles and steps', () => {
      expect(texts('.legend li')).toEqual(['Chest Main muscle', 'Shoulders, Triceps Also work']);
      expect(texts('ol li')).toEqual(['1 Lie back on a flat bench.', '2 Press the bar up.']);
      expect(element().querySelectorAll('.primary').length).toBe(2);
    });

    it('links to video searches for the exercise', () => {
      const links = [...element().querySelectorAll('a')].map((a) => a.href);
      expect(links).toEqual([
        'https://www.youtube.com/results?search_query=Barbell%20Bench%20Press%20-%20Medium%20Grip%20proper%20form',
        'https://www.tiktok.com/search?q=Barbell%20Bench%20Press%20-%20Medium%20Grip%20form',
      ]);
    });

    it('has no progress yet', async () => {
      tab('Progress').click();
      await render();
      expect(text()).toContain('No sets logged yet.');
      expect(element().querySelector('tui-line-chart')).toBeNull();
    });
  });

  describe('on a phone', () => {
    const tikTok = () =>
      element().querySelector<HTMLAnchorElement>('[aria-label^="Search TikTok"]')!;

    for (const phone of ['ios', 'android'] as const) {
      it(`searches in the TikTok app on ${phone}, since TikTok's website drops the search`, async () => {
        platform = phone;
        await open(0);
        expect(tikTok().getAttribute('href')).toBe(
          'snssdk1233://search?keyword=Barbell%20Bench%20Press%20-%20Medium%20Grip%20form',
        );
        expect(tikTok().target).toBe('');
      });
    }
  });

  describe('a lift logged before', () => {
    beforeEach(async () => {
      await log('2026-10-05', { weight: 80, reps: 8 }, { weight: 80, reps: 8 });
      await log('2026-10-12', { weight: 82.5, reps: 8 }, { weight: 85, reps: 5 });
      await sessions.changeNote(
        (await db.sessions.get({ date: '2026-10-12' }))!,
        bench.id,
        'Chest up',
      );
      await log('2026-10-19');
      await open(3);
    });

    it('opens on progress: the heaviest set gained, charted, and each session', () => {
      expect(text()).toContain('+5 kg in 2 sessions');
      expect(element().querySelector('tui-line-chart')?.getAttribute('aria-label')).toBe(
        'Heaviest set per session: 80, 85 kg',
      );
      expect(texts('.sessions li')).toEqual([
        'Mon 12 Oct Chest up 82.5 × 8 · 85 × 5',
        'Mon 5 Oct 80 × 8 · 80 × 8',
      ]);
    });

    it('switches to how to', async () => {
      tab('How to').click();
      await render();
      expect(text()).toContain('How to do it');
      expect(text()).not.toContain('in 2 sessions');
    });
  });
});
