import { Routes } from '@angular/router';

export const DOCUMENT_SYNC_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./document-sync.component').then(m => m.DocumentSyncComponent)
  }
];
