import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { TuiDialogService, TuiRoot, provideTaiga } from '@taiga-ui/core';
import { of } from 'rxjs';
import { Backup } from '../backup';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { Settings } from './settings';

// The export sheet opens inside tui-root, so these tests render the settings in one.
@Component({
  imports: [TuiRoot, Settings],
  template: '<tui-root><app-settings /></tui-root>',
})
class Host {}

describe('Settings', () => {
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
  let fixture: ComponentFixture<Host>;
  let sessions: Sessions;
  let dialog: ReturnType<typeof vi.spyOn>;

  const page = () => document.body.textContent?.replace(/\s+/g, ' ') ?? '';
  const button = (title: string) =>
    [...document.body.querySelectorAll('button')].find((b) =>
      b.textContent?.trim().startsWith(title),
    );

  async function shows(content: string): Promise<void> {
    await vi.waitFor(async () => {
      fixture.detectChanges();
      await fixture.whenStable();
      expect(page()).toContain(content);
    });
  }

  // Picks the file as if from the phone's file picker.
  function pick(name: string, text: string): void {
    const input = document.body.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [new File([text], name)] });
    input.dispatchEvent(new Event('change'));
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
    sessions = TestBed.inject(Sessions);
    fixture = TestBed.createComponent(Host);
    await shows('Your data');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("can't export before there is a workout", () => {
    expect(button('Export workouts')?.disabled).toBe(true);
  });

  it('exports a spreadsheet of every workout', async () => {
    await sessions.add('2026-10-19', bench);
    await sessions.add('2026-10-21', pullups);
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(button('Export workouts')?.disabled).toBe(false);
    });
    let file: Blob | undefined;
    URL.createObjectURL = (blob: Blob) => {
      file = blob;
      return 'blob:rowreps';
    };
    URL.revokeObjectURL = () => undefined;
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockReturnValue();

    button('Export workouts')?.click();
    await shows('2 workouts since Mon 19 Oct');
    button('Spreadsheet')?.click();

    expect((click.mock.contexts[0] as HTMLAnchorElement).download).toBe(
      `rowreps-workouts-${TuiDay.currentLocal().toJSON()}.csv`,
    );
    expect((await file?.text())?.split('\r\n')).toEqual([
      'Date,Exercise,Primary muscles,Secondary muscles,Set,Weight,Reps,Note',
      `2026-10-19,${bench.name},chest,"shoulders, triceps",,,,`,
      '2026-10-21,Pullups,lats,"biceps, middle back",,,,',
    ]);
  });

  it('restores the days the phone lacks after asking', async () => {
    await sessions.add('2026-10-19', pullups);
    dialog = vi.spyOn(TestBed.inject(TuiDialogService), 'open').mockReturnValue(of(true));
    const backup: Backup = {
      sessions: [
        { date: '2026-10-19', exercises: [{ ...bench, sets: [] }] },
        { date: '2026-10-21', exercises: [{ ...bench, sets: [{ weight: 60, reps: 8 }] }] },
      ],
      exercises: [],
    };
    await vi.waitFor(() => expect(sessions.all()?.length).toBe(1));

    pick('rowreps-backup.json', JSON.stringify(backup));

    await vi.waitFor(async () => {
      expect(dialog).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ label: 'Restore 2 workouts?' }),
      );
      const stored = await db.sessions.orderBy('date').toArray();
      expect(stored.map((session) => session.exercises[0].id)).toEqual([pullups.id, bench.id]);
    });
  });

  it("says so when the file isn't a backup", async () => {
    dialog = vi.spyOn(TestBed.inject(TuiDialogService), 'open').mockReturnValue(of());

    pick('notes.json', '{"notes": []}');

    await vi.waitFor(() =>
      expect(dialog).toHaveBeenCalledWith("notes.json isn't a RowReps backup file.", {
        label: "Can't restore",
        size: 's',
      }),
    );
  });
});
