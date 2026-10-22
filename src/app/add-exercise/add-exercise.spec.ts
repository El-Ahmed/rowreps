import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { EXERCISES } from '../exercises';
import { TodayList } from '../today-list';
import { AddExercise } from './add-exercise';

describe('AddExercise', () => {
  const [bench] = EXERCISES;
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
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    todayList = TestBed.inject(TodayList);
    fixture = TestBed.createComponent(AddExercise);
    await render();
  });

  it('lists every exercise grouped by muscle group', () => {
    expect(groups()).toEqual(['Chest', 'Back', 'Legs', 'Arms']);
    expect(optionNames()).toEqual(EXERCISES.map((exercise) => exercise.name));
  });

  it('shows the muscles each exercise works', () => {
    expect(options()[0].textContent).toContain(bench.muscles);
  });

  it('filters by name, ignoring case', async () => {
    await search('SQU');

    expect(groups()).toEqual(['Legs']);
    expect(optionNames()).toEqual(['Squat', 'Goblet Squat']);
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
