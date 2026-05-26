import { Routes } from '@angular/router';

export const STATEMENT_ROUTES: Routes = [
  {
    path: 'customer',
    loadComponent: () => import('./customer-statement.component').then(m => m.CustomerStatementComponent)
  },
  {
    path: 'vendor',
    loadComponent: () => import('./vendor-statement.component').then(m => m.VendorStatementComponent)
  },
  { path: '', redirectTo: 'customer', pathMatch: 'full' }
];
