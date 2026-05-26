import { Routes } from '@angular/router';

export const ASSET_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./asset-list/asset-list.component').then(m => m.AssetListComponent) },
  { path: 'categories', loadComponent: () => import('./asset-category-list/asset-category-list.component').then(m => m.AssetCategoryListComponent) },
  { path: 'new', loadComponent: () => import('./asset-form/asset-form.component').then(m => m.AssetFormComponent) },
  { path: ':id', loadComponent: () => import('./asset-detail/asset-detail.component').then(m => m.AssetDetailComponent) },
  { path: ':id/edit', loadComponent: () => import('./asset-form/asset-form.component').then(m => m.AssetFormComponent) }
];
