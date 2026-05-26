import { Routes } from '@angular/router';

export const JOB_ROLE_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./job-role-list/job-role-list.component').then(m => m.JobRoleListComponent) },
  { path: ':id/prices', loadComponent: () => import('./job-role-price/job-role-price.component').then(m => m.JobRolePriceComponent) }
];
