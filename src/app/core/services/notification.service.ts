import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface NotificationLog {
  id: number;
  recipientEmail: string;
  subject: string;
  templateType: string;
  referenceType: string;
  referenceId: number;
  status: string;
  errorMessage: string;
  sentAt: string;
}

export interface NotificationSetting {
  id: number;
  templateType: string;
  enabled: boolean;
  recipientEmails: string;
  daysBeforeDeadline: number;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/notifications`;

  getLogs(): Observable<NotificationLog[]> {
    return this.http.get<any>(`${this.api}/logs`).pipe(map(r => r.data));
  }

  getSettings(): Observable<NotificationSetting[]> {
    return this.http.get<any>(`${this.api}/settings`).pipe(map(r => r.data));
  }

  updateSetting(dto: Partial<NotificationSetting>): Observable<NotificationSetting> {
    return this.http.put<any>(`${this.api}/settings`, dto).pipe(map(r => r.data));
  }

  seedDefaults(): Observable<string> {
    return this.http.post<any>(`${this.api}/settings/seed`, {}).pipe(map(r => r.data));
  }

  triggerInsuranceCheck(): Observable<string> {
    return this.http.post<any>(`${this.api}/trigger-insurance-check`, {}).pipe(map(r => r.data));
  }
}
