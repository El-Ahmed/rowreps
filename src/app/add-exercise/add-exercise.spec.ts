import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router, provideRouter } from '@angular/router';
import { Exercise } from '../exercises';
import { TodayList } from '../today-list';
import { AddExercise } from './add-exercise';

describe('AddExercise', () => {
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
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'lower back'],
  };
  const gobletSquat: Exercise = {
    id: 'Goblet_Squat',
    name: 'Goblet Squat',
    primaryMuscles: ['quadriceps'],
    secondaryMuscles: ['calves', 'glutes', 'hamstrings', 'shoulders'],
  };
  const pullups: Exercise = {
    id: 'Pullups',
    name: 'Pullups',
    primaryMuscles: ['lats'],
    secondaryMuscles: ['biceps', 'middle back'],
  };

  let fixture: ComponentFixture<AddExercise>;
  let todayList: TodayList;

  const element = () => fixture.nativeElement as HTMLElement;
  const groups = () => [...element().querySelectorAll('h2')].map((h) => h.textContent?.trim());
  const options = () => [...element().querySelectorAll<HTMLButtonElement>('button[tuiCell]')];
  const optionNames = () =>
    options().map((option) => option.querySelector('[tuiTitle]')?.firstChild?.textContent?.trim());

  async function render(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  async function search(text: string): Promise<void> {
    const input = element().querySelector('input') as HTMLInputElement;
    input.value = text;
    input.dispatchEvent(new Event('input'));
    await render();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    todayList = TestBed.inject(TodayList);
    fixture = TestBed.createComponent(AddExercise);
    TestBed.inject(HttpTestingController)
      .expectOne('free-exercise-db/exercises.json')
      .flush([bench, squat, gobletSquat, pullups]);
    await render();
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('lists every exercise grouped by primary muscle, groups in alphabetical order', () => {
    expect(groups()).toEqual(['Chest', 'Lats', 'Quadriceps']);
    expect(optionNames()).toEqual([bench.name, pullups.name, squat.name, gobletSquat.name]);
  });

  it('shows the primary then secondary muscles each exercise works', () => {
    expect(options()[0].textContent).toContain('Chest · Shoulders · Triceps');
  });

  it('filters by name, ignoring case', async () => {
    await search('SQU');

    expect(groups()).toEqual(['Quadriceps']);
    expect(optionNames()).toEqual([squat.name, gobletSquat.name]);
  });

  it('says so when nothing matches', async () => {
    await search('Belt squat');

    expect(options()).toEqual([]);
    expect(element().textContent).toContain('No exercise called "Belt squat" yet.');
  });

  it("hides exercises that are already in today's list", async () => {
    todayList.add(bench);
    await render();

    expect(optionNames()).not.toContain(bench.name);
  });

  it('adds the picked exercise to today and goes back', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    options()[0].click();

    expect(todayList.exercises()).toEqual([bench]);
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
