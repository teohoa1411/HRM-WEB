import { Routes } from '@angular/router';

export const CONTRACT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./contract-list/contract-list.component')
      .then(m => m.ContractListComponent)
  },
  {
    path: 'types',
    loadComponent: () => import('./contract-type-list/contract-type-list.component')
      .then(m => m.ContractTypeListComponent)
  },
  {
    path: 'new',
    loadComponent: () => import('./contract-form/contract-form.component')
      .then(m => m.ContractFormComponent)
  },
  {
    path: ':id',
    loadComponent: () => import('./contract-detail/contract-detail.component')
      .then(m => m.ContractDetailComponent)
  },
  {
    path: ':id/edit',
    loadComponent: () => import('./contract-form/contract-form.component')
      .then(m => m.ContractFormComponent)
  }
];
