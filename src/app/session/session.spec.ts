import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router, provideRouter } from '@angular/router';
import { CdkDropList } from '@angular/cdk/drag-drop';
import { TuiDialogService } from '@taiga-ui/core';
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

    expect(await stored()).toEqual([bench, pullups, squat]);
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
      expect(await stored()).toEqual([pullups, squat, bench]);
    });

    it('returns to the log with Done', async () => {
      button('Done')?.click();
      await render();

      expect(button('Edit')).toBeDefined();
      expect(button(`Remove ${bench.name}`)).toBeUndefined();
    });
  });
});
