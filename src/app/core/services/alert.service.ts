import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface AlertItem {
  id: number;
  alertKey: string;
  category: 'INSURANCE' | 'CONTRACT' | 'LEAVE' | 'PAYROLL' | 'PROBATION';
  severity: 'URGENT' | 'WARNING' | 'INFO';
  title: string;
  description: string;
  referenceType: string;
  referenceId: number;
  actionUrl: string;
  dueDate: string;
  status: 'ACTIVE' | 'DISMISSED' | 'RESOLVED';
  createdAt: string;
}

export interface AlertCount {
  urgent: number;
  warning: number;
  info: number;
  total: number;
  insurance: number;
  contract: number;
}

@Injectable({ providedIn: 'root' })
export class AlertService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/alerts`;

  getActive(): Observable<AlertItem[]> {
    return this.http.get<any>(`${this.api}/active`).pipe(map(r => r.data));
  }

  getCounts(): Observable<AlertCount> {
    return this.http.get<any>(`${this.api}/active/count`).pipe(map(r => r.data));
  }

  getByCategory(category: string): Observable<AlertItem[]> {
    return this.http.get<any>(`${this.api}/category/${category}`).pipe(map(r => r.data));
  }

  dismiss(id: number): Observable<void> {
    return this.http.patch<any>(`${this.api}/${id}/dismiss`, {}).pipe(map(() => undefined));
  }

  resolve(id: number): Observable<void> {
    return this.http.patch<any>(`${this.api}/${id}/resolve`, {}).pipe(map(() => undefined));
  }

  collectNow(): Observable<string> {
    return this.http.post<any>(`${this.api}/collect-now`, {}).pipe(map(r => r.data));
  }
}
