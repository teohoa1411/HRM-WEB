import { Routes } from '@angular/router';

export const WORK_CALENDAR_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./calendar-list/calendar-list.component').then(m => m.CalendarListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./calendar-form/calendar-form.component').then(m => m.CalendarFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./calendar-form/calendar-form.component').then(m => m.CalendarFormComponent)
  }
];
