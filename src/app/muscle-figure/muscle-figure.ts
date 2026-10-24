import { Component, input } from '@angular/core';

// Every muscle free-exercise-db names. The figure draws them all.
export const MUSCLES = [
  'abdominals',
  'abductors',
  'adductors',
  'biceps',
  'calves',
  'chest',
  'forearms',
  'glutes',
  'hamstrings',
  'lats',
  'lower back',
  'middle back',
  'neck',
  'quadriceps',
  'shoulders',
  'traps',
  'triceps',
];

// The front and back of a body, with the main muscles of an exercise filled in the accent
// and the muscles that also work in a lighter accent. Muscles use free-exercise-db's names.
@Component({
  selector: 'app-muscle-figure',
  templateUrl: './muscle-figure.html',
  styleUrl: './muscle-figure.css',
})
export class MuscleFigure {
  readonly primary = input.required<string[]>();
  readonly secondary = input.required<string[]>();

  // The fill class of a region drawn for these muscles.
  protected fill(...muscles: string[]): string {
    if (muscles.some((muscle) => this.primary().includes(muscle))) {
      return 'primary';
    }
    return muscles.some((muscle) => this.secondary().includes(muscle)) ? 'secondary' : '';
  }
}
