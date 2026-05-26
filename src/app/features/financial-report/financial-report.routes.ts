import { Routes } from '@angular/router';

export const FINANCIAL_REPORT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./financial-report.component').then(m => m.FinancialReportComponent)
  }
];
