import { Routes } from '@angular/router';

export const INSURANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./insurance.component').then(m => m.InsuranceComponent)
  }
];
