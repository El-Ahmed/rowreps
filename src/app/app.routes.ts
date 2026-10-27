import { Routes } from '@angular/router';
import { Today } from './today/today';
import { AddExercise } from './add-exercise/add-exercise';

export const routes: Routes = [
  { path: '', component: Today, title: 'Today' },
  { path: 'add', component: AddExercise, title: 'Add exercise' },
  {
    path: 'add/new',
    loadComponent: () => import('./new-exercise/new-exercise').then((m) => m.NewExercise),
    title: 'New exercise',
  },
  {
    path: 'lift/:id',
    loadComponent: () => import('./lift/lift').then((m) => m.LiftScreen),
    title: 'Lift',
  },
  {
    path: 'exercise/:id',
    loadComponent: () => import('./edit-exercise/edit-exercise').then((m) => m.EditExercise),
    title: 'Edit exercise',
  },
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
  {
    path: 'history/:id/add/new',
    loadComponent: () => import('./new-exercise/new-exercise').then((m) => m.NewExercise),
    title: 'New exercise',
  },
  {
    path: 'settings',
    loadComponent: () => import('./settings/settings').then((m) => m.Settings),
    title: 'Settings',
  },
  { path: '**', redirectTo: '' },
];
