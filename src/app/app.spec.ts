import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { Today } from './today/today';
import { AddExercise } from './add-exercise/add-exercise';

describe('routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
  });

  it('shows Today at the root', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/', Today)).toBeInstanceOf(Today);
  });

  it('shows the exercise picker at /add', async () => {
    const harness = await RouterTestingHarness.create();

    expect(await harness.navigateByUrl('/add', AddExercise)).toBeInstanceOf(AddExercise);
  });
});
