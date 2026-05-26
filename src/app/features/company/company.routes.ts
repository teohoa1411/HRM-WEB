import { Routes } from '@angular/router';

export const COMPANY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./company-list/company-list.component').then(m => m.CompanyListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./company-form/company-form.component').then(m => m.CompanyFormComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./company-form/company-form.component').then(m => m.CompanyFormComponent)
  }
];
