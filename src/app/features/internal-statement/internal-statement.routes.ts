import { Routes } from '@angular/router';

export const INTERNAL_STATEMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./internal-statement.component').then(m => m.InternalStatementComponent)
  }
];
