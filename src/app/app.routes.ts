import { Routes } from '@angular/router';
import { Today } from './today/today';
import { AddExercise } from './add-exercise/add-exercise';

export const routes: Routes = [
  { path: '', component: Today, title: 'Today' },
  { path: 'add', component: AddExercise, title: 'Add exercise' },
  {
    path: 'history',
    loadComponent: () => import('./history/history').then((m) => m.SessionHistory),
    title: 'History',
  },
  {
    path: 'history/:id',
    loadComponent: () => import('./session/session').then((m) => m.SessionLog),
    title: 'Session',
  },
  { path: 'history/:id/add', component: AddExercise, title: 'Add exercise' },
  { path: '**', redirectTo: '' },
];
