import { Routes } from '@angular/router';
import { roleGuard } from '../../core/guards/auth.guard';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
    loadComponent: () => import('./leave-list/leave-list.component').then(m => m.LeaveListComponent)
  },
  {
    path: 'my',
    canActivate: [roleGuard('EMPLOYEE')],
    loadComponent: () => import('./leave-employee/leave-employee.component').then(m => m.LeaveEmployeeComponent)
  },
  {
    path: 'balances',
    canActivate: [roleGuard('COMPANY_ADMIN', 'MANAGER')],
    loadComponent: () => import('./leave-balance/leave-balance.component').then(m => m.LeaveBalanceComponent)
  }
];
