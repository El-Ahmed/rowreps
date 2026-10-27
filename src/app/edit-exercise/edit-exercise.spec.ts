import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { TuiDialogService } from '@taiga-ui/core';
import { of } from 'rxjs';
import { db } from '../db';
import { Exercise } from '../exercises';
import { Sessions } from '../sessions';
import { EditExercise } from './edit-exercise';

describe('EditExercise', () => {
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
    secondaryMuscles: ['glutes'],
  };
  const beltSquat: Exercise = {
    id: 'a-uuid',
    name: 'Belt squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: [],
  };
  let fixture: ComponentFixture<EditExercise>;
  let back: ReturnType<typeof vi.spyOn>;
  let confirm: ReturnType<typeof vi.spyOn>;

  const element = () => fixture.nativeElement as HTMLElement;
  const nameInput = () => element().querySelector<HTMLInputElement>('#exercise-name')!;
  const option = (text: string) =>
    [...element().querySelectorAll('label[tuiBlock]')]
      .find((label) => label.textContent?.trim() === text)!
      .querySelector('input')!;
  const button = (text: string) =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
  const lifts = async () => (await db.sessions.toArray()).flatMap((session) => session.exercises);

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function rename(name: string): Promise<void> {
    nameInput().value = name;
    nameInput().dispatchEvent(new Event('input'));
    await render();
  }

  // Opens the exercise once free-exercise-db and the saved exercises have been read.
  async function open(id: string): Promise<void> {
    fixture = TestBed.createComponent(EditExercise);
    fixture.componentRef.setInput('id', id);
    await render();
    TestBed.inject(HttpTestingController)
      .expectOne('free-exercise-db/exercises.json')
      .flush([{ ...bench, instructions: ['Lie back on a flat bench.'] }, squat]);
    await vi.waitFor(async () => {
      await render();
      expect(nameInput()).not.toBeNull();
    });
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    back = vi.spyOn(TestBed.inject(Location), 'back').mockReturnValue();
    // Answers every confirmation with "Discard".
    confirm = vi.spyOn(TestBed.inject(TuiDialogService), 'open').mockReturnValue(of(true));
    await db.exercises.add(beltSquat);
    await TestBed.inject(Sessions).add('2026-10-19', bench);
  });

  it('starts with the exercise as it is, with nothing to save', async () => {
    await open(bench.id);

    expect(nameInput().value).toBe(bench.name);
    expect(option('Chest').checked).toBe(true);
    expect(button('Save')?.disabled).toBe(true);
    expect(button('Reset to original')).toBeUndefined();
  });

  it('saves a free-exercise-db exercise as the user’s own, with only the fields the app uses', async () => {
    await open(bench.id);
    await rename('Flat bench ');
    option('Arms').click();
    await render();

    button('Save')!.click();

    await vi.waitFor(() => expect(back).toHaveBeenCalled());
    const edited = { ...bench, name: 'Flat bench', primaryMuscles: ['biceps'] };
    expect(await db.exercises.get(bench.id)).toEqual(edited);
    expect(await lifts()).toEqual([{ ...edited, sets: [] }]);
  });

  it('saves an exercise the user created', async () => {
    await open(beltSquat.id);
    option('Glutes').click();
    await render();

    button('Save')!.click();

    await vi.waitFor(() => expect(back).toHaveBeenCalled());
    expect(await db.exercises.get(beltSquat.id)).toEqual({
      ...beltSquat,
      primaryMuscles: ['quadriceps', 'glutes'],
    });
  });

  it("can't take the name of another exercise", async () => {
    await open(bench.id);
    await rename('barbell squat');

    expect(element().querySelector('tui-error')?.textContent).toContain(
      'You already have an exercise called barbell squat',
    );
    expect(button('Save')?.disabled).toBe(true);
  });

  it('resets an edited free-exercise-db exercise to the original, in past workouts too', async () => {
    await db.exercises.put({ ...bench, name: 'Flat bench' });
    await db.sessions.toCollection().modify((session) => {
      session.exercises[0].name = 'Flat bench';
    });
    await open(bench.id);
    await vi.waitFor(async () => {
      await render();
      expect(nameInput().value).toBe('Flat bench');
    });

    button('Reset to original')!.click();

    await vi.waitFor(() => expect(back).toHaveBeenCalled());
    expect(await db.exercises.get(bench.id)).toBeUndefined();
    expect(await lifts()).toEqual([{ ...bench, sets: [] }]);
  });

  it("can't reset an exercise the user created", async () => {
    await open(beltSquat.id);

    expect(button('Reset to original')).toBeUndefined();
  });

  it('goes back without asking when nothing changed', async () => {
    await open(bench.id);

    button('Back')!.click();

    expect(confirm).not.toHaveBeenCalled();
    expect(back).toHaveBeenCalled();
  });

  it('asks before discarding changes', async () => {
    await open(bench.id);
    await rename('Flat bench');
    confirm.mockReturnValue(of(false));

    button('Back')!.click();

    expect(confirm).toHaveBeenCalledWith(expect.anything(), {
      label: 'Discard changes?',
      size: 's',
      data: { yes: 'Discard', no: 'Keep editing' },
    });
    expect(back).not.toHaveBeenCalled();
  });
});
