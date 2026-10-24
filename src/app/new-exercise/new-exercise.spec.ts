import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { TuiDay } from '@taiga-ui/cdk';
import { db } from '../db';
import { Sessions } from '../sessions';
import { NewExercise } from './new-exercise';

describe('NewExercise', () => {
  let fixture: ComponentFixture<NewExercise>;
  const today = () => TuiDay.currentLocal().toJSON();

  const element = () => fixture.nativeElement as HTMLElement;
  const nameInput = () => element().querySelector<HTMLInputElement>('#exercise-name')!;
  const option = (text: string) =>
    [...element().querySelectorAll('label[tuiBlock]')]
      .find((label) => label.textContent?.trim() === text)!
      .querySelector('input')!;
  const muscleOptions = () =>
    [...element().querySelectorAll('[role="group"] label')].map((label) =>
      label.textContent?.trim(),
    );
  const addButton = () => element().querySelector<HTMLButtonElement>('.actions button')!;

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(NewExercise);
    fixture.componentRef.setInput('name', 'Belt squat');
    await render();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).match('free-exercise-db/exercises.json');
  });

  it('starts with the name that was searched for', () => {
    expect(nameInput().value).toBe('Belt squat');
  });

  it('can only be added once it has a muscle group', async () => {
    expect(addButton().disabled).toBe(true);

    option('Legs').click();
    await render();

    expect(addButton().disabled).toBe(false);
  });

  it("lists the group's muscles, starting with its first one picked", async () => {
    option('Legs').click();
    await render();

    expect(muscleOptions()).toEqual([
      'Quadriceps',
      'Hamstrings',
      'Glutes',
      'Calves',
      'Adductors',
      'Abductors',
    ]);
    expect(option('Quadriceps').checked).toBe(true);
    expect(option('Glutes').checked).toBe(false);
  });

  it('has no muscles to pick for a group of one muscle', async () => {
    option('Chest').click();
    await render();

    expect(muscleOptions()).toEqual([]);
  });

  it('needs at least one muscle worked', async () => {
    option('Legs').click();
    await render();
    option('Quadriceps').click();
    await render();

    expect(addButton().disabled).toBe(true);
  });

  it('needs a name', async () => {
    option('Legs').click();
    nameInput().value = '  ';
    nameInput().dispatchEvent(new Event('input'));
    await render();

    expect(addButton().disabled).toBe(true);
  });

  it('saves the exercise, adds it to today and goes back', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    option('Legs').click();
    await render();
    option('Glutes').click();
    await render();

    addButton().click();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/']));
    const exercise = {
      id: expect.any(String),
      name: 'Belt squat',
      primaryMuscles: ['quadriceps', 'glutes'],
      secondaryMuscles: [],
    };
    expect(await db.exercises.toArray()).toEqual([exercise]);
    expect(await db.sessions.toArray()).toEqual([
      { id: 1, date: today(), exercises: [{ ...exercise, sets: [] }] },
    ]);
  });

  it('adds it to a past session and goes back to that session', async () => {
    await TestBed.inject(Sessions).add('2026-10-19', {
      id: 'Barbell_Squat',
      name: 'Barbell Squat',
      primaryMuscles: ['quadriceps'],
      secondaryMuscles: [],
    });
    fixture.componentRef.setInput('id', '1');
    await vi.waitFor(async () => {
      await render();
      expect(addButton().textContent).toContain('Add to Mon 19 Oct');
    });
    expect(element().querySelector('a')?.getAttribute('href')).toBe('/history/1/add');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    option('Chest').click();
    await render();

    addButton().click();

    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(['/history', '1']));
    const [session] = await db.sessions.toArray();
    expect(session.exercises.map((exercise) => exercise.name)).toEqual([
      'Barbell Squat',
      'Belt squat',
    ]);
  });
});
