import { Routes } from '@angular/router';
import { authGuard, roleGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },
  {
    path: '',
    loadComponent: () => import('./layouts/main-layout/main-layout.component').then(m => m.MainLayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent)
      },
      {
        path: 'companies',
        canActivate: [roleGuard('SUPER_ADMIN')],
        loadChildren: () => import('./features/company/company.routes').then(m => m.COMPANY_ROUTES)
      },
      {
        path: 'vendors',
        canActivate: [roleGuard('COMPANY_ADMIN')],
        loadChildren: () => import('./features/vendor/vendor.routes').then(m => m.VENDOR_ROUTES)
      },
      {
        path: 'employees',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE')],
        loadChildren: () => import('./features/employee/employee.routes').then(m => m.EMPLOYEE_ROUTES)
      },
      {
        path: 'job-roles',
        canActivate: [roleGuard('SUPER_ADMIN', 'COMPANY_ADMIN')],
        loadChildren: () => import('./features/job-role/job-role.routes').then(m => m.JOB_ROLE_ROUTES)
      },
      {
        path: 'users',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
        loadChildren: () => import('./features/user/user.routes').then(m => m.USER_ROUTES)
      },
      {
        path: 'departments',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
        loadChildren: () => import('./features/department/department.routes').then(m => m.DEPARTMENT_ROUTES)
      },
      {
        path: 'timesheets',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE')],
        loadChildren: () => import('./features/timesheet/timesheet.routes').then(m => m.TIMESHEET_ROUTES)
      },
      {
        path: 'customers',
        canActivate: [roleGuard('COMPANY_ADMIN')],
        loadChildren: () => import('./features/customer/customer.routes').then(m => m.CUSTOMER_ROUTES)
      },
      {
        path: 'work-calendars',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
        loadChildren: () => import('./features/work-calendar/work-calendar.routes').then(m => m.WORK_CALENDAR_ROUTES)
      },
      {
        path: 'leave',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'EMPLOYEE')],
        loadChildren: () => import('./features/leave/leave.routes').then(m => m.LEAVE_ROUTES)
      },
      {
        path: 'payroll',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT')],
        loadChildren: () => import('./features/payroll/payroll.routes').then(m => m.PAYROLL_ROUTES)
      },
      {
        path: 'statements',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT')],
        loadChildren: () => import('./features/statement/statement.routes').then(m => m.STATEMENT_ROUTES)
      },
      {
        path: 'financial-report',
        canActivate: [roleGuard('COMPANY_ADMIN')],
        loadChildren: () => import('./features/financial-report/financial-report.routes').then(m => m.FINANCIAL_REPORT_ROUTES)
      },
      {
        path: 'internal-statements',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT')],
        loadChildren: () => import('./features/internal-statement/internal-statement.routes').then(m => m.INTERNAL_STATEMENT_ROUTES)
      },
      {
        path: 'assets',
        canActivate: [roleGuard('COMPANY_ADMIN')],
        loadChildren: () => import('./features/asset/asset.routes').then(m => m.ASSET_ROUTES)
      },
      {
        path: 'contracts',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
        loadChildren: () => import('./features/contract/contract.routes').then(m => m.CONTRACT_ROUTES)
      },
      {
        path: 'insurance',
        canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER', 'ACCOUNTANT')],
        loadChildren: () => import('./features/insurance/insurance.routes').then(m => m.INSURANCE_ROUTES)
      },
      {
        path: 'document-sync',
        canActivate: [roleGuard('COMPANY_ADMIN')],
        loadChildren: () => import('./features/document-sync/document-sync.routes').then(m => m.DOCUMENT_SYNC_ROUTES)
      }
    ]
  },
  { path: '**', redirectTo: 'dashboard' }
];
