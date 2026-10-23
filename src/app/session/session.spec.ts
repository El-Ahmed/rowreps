import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDialogService, TuiRoot, provideTaiga } from '@taiga-ui/core';
import { of } from 'rxjs';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { SessionLog } from './session';

describe('SessionLog', () => {
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
  let fixture: ComponentFixture<SessionLog>;

  // How exercises are stored once added: with no sets yet.
  const planned = (...exercises: Exercise[]) =>
    exercises.map((exercise) => ({ ...exercise, sets: [] }));
  let navigate: ReturnType<typeof vi.spyOn>;
  let confirm: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const names = () =>
    [...element().querySelectorAll('li [tuiTitle]')].map((title) => title.textContent?.trim());
  const button = (text: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  const stored = async () => (await db.sessions.get(1))?.exercises;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function shows(exercises: Exercise[]): Promise<void> {
    await vi.waitFor(async () => {
      await render();
      expect(names()).toEqual(exercises.map((exercise) => exercise.name));
    });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    // Answers every confirmation with "Delete".
    confirm = vi.spyOn(TestBed.inject(TuiDialogService), 'open').mockReturnValue(of(true));
    const sessions = TestBed.inject(Sessions);
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-19', pullups);
    await sessions.add('2026-10-19', squat);
    await sessions.add('2026-10-21', squat);
    fixture = TestBed.createComponent(SessionLog);
    fixture.componentRef.setInput('id', '1');
    await shows([bench, pullups, squat]);
  });

  it("shows the session's day and exercises", () => {
    expect(element().querySelector('h1')?.textContent).toBe('Mon 19 Oct');
    expect(element().querySelector('.names')?.textContent).toBe(
      [bench, pullups, squat].map((exercise) => exercise.name).join(', '),
    );
  });

  it('links to adding an exercise to this session', () => {
    expect(element().querySelector('a[href="/history/1/add"]')?.textContent).toContain(
      'Add exercise',
    );
  });

  it('deletes the session after confirming, then goes back to the history', async () => {
    button('Delete session')?.click();

    expect(confirm).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ label: 'Delete the workout of Mon 19 Oct?' }),
    );
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/history']));
    expect((await db.sessions.toArray()).map((session) => session.date)).toEqual(['2026-10-21']);
  });

  it('keeps the session when the deletion is cancelled', async () => {
    confirm.mockReturnValue(of(false));

    button('Delete session')?.click();

    expect(await stored()).toEqual(planned(bench, pullups, squat));
  });

  it('goes back to the history for a session that does not exist', async () => {
    fixture.componentRef.setInput('id', '99');

    await vi.waitFor(async () => {
      await render();
      expect(navigate).toHaveBeenCalledWith(['/history']);
    });
  });

  describe('edit mode', () => {
    beforeEach(async () => {
      button('Edit')?.click();
      await render();
    });

    it('swaps the toolbar for Done', () => {
      expect(button('Done')).toBeDefined();
      expect(button('Change date')).toBeUndefined();
      expect(button('Delete session')).toBeUndefined();
    });

    it('removes an exercise after confirming', async () => {
      button(`Remove ${pullups.name}`)?.click();

      expect(confirm).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ label: `Delete ${pullups.name} from Mon 19 Oct?` }),
      );
      await shows([bench, squat]);
    });

    it('reorders exercises when one is dropped in a new place', async () => {
      fixture.debugElement
        .query(By.directive(CdkDropList))
        .triggerEventHandler('cdkDropListDropped', { previousIndex: 0, currentIndex: 2 });

      await shows([pullups, squat, bench]);
      expect(await stored()).toEqual(planned(pullups, squat, bench));
    });

    it('returns to the log with Done', async () => {
      button('Done')?.click();
      await render();

      expect(button('Edit')).toBeDefined();
      expect(button(`Remove ${bench.name}`)).toBeUndefined();
    });
  });
});

// The sheets for sets and notes open inside tui-root, so these tests render the log in one.
@Component({
  imports: [TuiRoot, SessionLog],
  template: '<tui-root><app-session id="1" /></tui-root>',
})
class Host {}

describe('SessionLog sets and notes', () => {
  const bench: Exercise = {
    id: 'Barbell_Bench_Press_-_Medium_Grip',
    name: 'Barbell Bench Press - Medium Grip',
    primaryMuscles: ['chest'],
    secondaryMuscles: ['shoulders', 'triceps'],
  };
  let fixture: ComponentFixture<Host>;

  const page = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (label: string) =>
    [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.trim() === label || b.getAttribute('aria-label') === label,
    );
  const sets = async () => (await db.sessions.get(1))!.exercises[0].sets;
  const setRows = () => [
    ...document.body.querySelectorAll<HTMLButtonElement>('.lift .set:not(.add-set)'),
  ];
  const setValues = () => setRows().map((row) => row.querySelector('.set-value')?.textContent);

  async function shows(content: string): Promise<void> {
    await vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(page()).toContain(content);
    });
  }

  function type(selector: string, value: string): void {
    const field = document.body.querySelector(selector) as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    // jsdom has no matchMedia, which tui-root uses for the dark theme.
    vi.stubGlobal('matchMedia', (media: string) => ({
      matches: false,
      media,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideTaiga()] });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const sessions = TestBed.inject(Sessions);
    await sessions.add('2026-10-19', bench);
    const session = (await db.sessions.get(1))!;
    await sessions.addSet(session, bench.id, { weight: 85, reps: 8 });
    await sessions.addSet(session, bench.id, { weight: 85, reps: 7 });
    await sessions.changeNote(session, bench.id, 'Reduce weight next time');
    fixture = TestBed.createComponent(Host);
    await shows('Reduce weight next time');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists each exercise's sets and note", () => {
    expect(setValues()).toEqual(['85 kg × 8', '85 kg × 7']);
    expect(page()).toContain('Reduce weight next time');
  });

  it('changes a set', async () => {
    setRows()[1].click();
    await shows('Delete set');

    type('#set-reps', '9');
    button('Save')?.click();

    await shows('85 kg × 9');
    expect(await sets()).toEqual([
      { weight: 85, reps: 8 },
      { weight: 85, reps: 9 },
    ]);
  });

  it('adds a set, starting from the last one', async () => {
    button(`Add a set of ${bench.name}`)?.click();
    await shows('Weight (kg)');
    expect((document.body.querySelector('#set-weight') as HTMLInputElement).value).toBe('85');

    type('#set-weight', '80');
    button('Save')?.click();

    await shows('80 kg × 7');
    expect(setValues()).toEqual(['85 kg × 8', '85 kg × 7', '80 kg × 7']);
    expect((await sets()).at(-1)).toEqual({ weight: 80, reps: 7 });
  });

  it('deletes a set', async () => {
    setRows()[0].click();
    await shows('Delete set');

    button('Delete set')?.click();

    await vi.waitFor(async () => expect(await sets()).toEqual([{ weight: 85, reps: 7 }]));
  });

  it('changes the note', async () => {
    button(`Note on ${bench.name}`)?.click();
    await shows('Save');

    type('textarea', 'Felt strong');
    button('Save')?.click();

    await shows('Felt strong');
    expect((await db.sessions.get(1))!.exercises[0].note).toBe('Felt strong');
  });
});
