import { db } from './app/db';

// Each test starts with an empty database.
afterEach(() => db.delete({ disableAutoOpen: false }));

// Taiga's line chart can't load in the tests: it refers to itself before it is defined
// when Angular compiles it just in time. The app's build compiles it ahead of time.
vi.mock('@taiga-ui/addon-charts/components/line-chart', async () => {
  const { Component, input } = await import('@angular/core');
  @Component({ selector: 'tui-line-chart', template: '' })
  class TuiLineChart {
    readonly value = input<unknown>();
    readonly x = input<number>();
    readonly y = input<number>();
    readonly width = input<number>();
    readonly height = input<number>();
    readonly dots = input<boolean>();
  }
  return { TuiLineChart };
});

// jsdom has no matchMedia, which the app uses to tell if it was opened from the Home Screen.
window.matchMedia ??= (media: string) =>
  ({
    matches: false,
    media,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }) as unknown as MediaQueryList;

// Each test starts with nothing remembered, like a dismissed install ask.
afterEach(() => localStorage.clear());
