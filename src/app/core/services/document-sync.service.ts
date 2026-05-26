import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { SyncTriggerResponse, SyncSession, SyncLog } from '../models/document-sync.models';

@Injectable({ providedIn: 'root' })
export class DocumentSyncService {
  private readonly base = `${environment.apiUrl}/documents/sync`;

  constructor(private http: HttpClient) {}

  triggerSync(): Observable<SyncTriggerResponse> {
    return this.http.post<ApiResponse<SyncTriggerResponse>>(this.base, null)
      .pipe(map(r => r.data));
  }

  getRunningStatus(): Observable<SyncSession | null> {
    return this.http.get<ApiResponse<SyncSession | null>>(`${this.base}/status`)
      .pipe(map(r => r.data));
  }

  getHistory(page = 0, size = 20): Observable<PageResponse<SyncSession>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<SyncSession>>>(`${this.base}/history`, { params })
      .pipe(map(r => r.data));
  }

  getSessionLogs(sessionId: number, page = 0, size = 50): Observable<PageResponse<SyncLog>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ApiResponse<PageResponse<SyncLog>>>(`${this.base}/${sessionId}`, { params })
      .pipe(map(r => r.data));
  }
}
