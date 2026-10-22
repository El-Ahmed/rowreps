import { Routes } from '@angular/router';
import { Today } from './today/today';
import { AddExercise } from './add-exercise/add-exercise';

export const routes: Routes = [
  { path: '', component: Today, title: 'Today' },
  { path: 'add', component: AddExercise, title: 'Add exercise' },
  { path: '**', redirectTo: '' },
];
