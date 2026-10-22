import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Today } from './today/today';
import { AddExercise } from './add-exercise/add-exercise';
import { SessionHistory } from './history/history';
import { SessionLog } from './session/session';
import { Sessions } from './sessions';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
  });

  it('shows Today at the root', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/', Today)).toBeInstanceOf(Today);
  });

  it('shows the exercise picker at /add', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/add', AddExercise)).toBeInstanceOf(AddExercise);
  });

  it('shows the history at /history', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/history', SessionHistory)).toBeInstanceOf(SessionHistory);
  });

  it('shows a session at /history/:id', async () => {
    await TestBed.inject(Sessions).add('2026-10-19', {
      id: 'Pullups',
      name: 'Pullups',
      primaryMuscles: ['lats'],
      secondaryMuscles: ['biceps', 'middle back'],
    });
    const harness = await RouterTestingHarness.create();
    const session = await harness.navigateByUrl('/history/1', SessionLog);

    expect(session.id()).toBe('1');
  });

  it('adds to a past session at /history/:id/add', async () => {
    const harness = await RouterTestingHarness.create();
    const addExercise = await harness.navigateByUrl('/history/1/add', AddExercise);

    expect(addExercise.id()).toBe('1');
  });
});
