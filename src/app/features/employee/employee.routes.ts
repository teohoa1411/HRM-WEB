import { Routes } from '@angular/router';

export const EMPLOYEE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./employee-list/employee-list.component').then(m => m.EmployeeListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  },
  {
    path: 'me',
    loadComponent: () => import('./employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./employee-profile/employee-profile.component').then(m => m.EmployeeProfileComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./employee-form/employee-form.component').then(m => m.EmployeeFormComponent)
  }
];
