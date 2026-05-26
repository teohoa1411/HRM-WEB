import { Routes } from '@angular/router';

export const TIMESHEET_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./timesheet.component').then(m => m.TimesheetComponent)
  },
  {
    path: 'overview',
    loadComponent: () => import('./timesheet-overview.component').then(m => m.TimesheetOverviewComponent)
  },
  {
    path: 'fields',
    loadComponent: () => import('./timesheet-fields.component').then(m => m.TimesheetFieldsComponent)
  }
];
