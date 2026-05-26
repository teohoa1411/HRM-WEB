import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface InternalOverviewItem {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  totalRawHours: number;
  totalAdjustedHours: number;
  totalAdjustedDays: number;
  totalLeaveDays: number;
  totalHalfLeaveDays: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CLOSED' | 'NO_DATA';
}

export interface InternalCalendarDay {
  workDate: string;       // YYYY-MM-DD
  dayOfWeek: string;      // MON, TUE, ...
  weekend: boolean;
  rawHours: number;
  adjustedHours: number;
  leaveDay: boolean;
  halfLeave: boolean;
  paidLeave: boolean;
  leaveTypeName: string | null;
  timesheetNote: string | null;
  hrNote: string | null;
  entryId: number | null;
}

export interface InternalEmployeeCalendar {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  yearMonth: string;
  days: InternalCalendarDay[];
  totalRawHours: number;
  totalAdjustedHours: number;
  totalAdjustedDays: number;
  totalLeaveDays: number;
  totalHalfLeaveDays: number;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class InternalStatementService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/internal-statements`;

  generate(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/generate/${yearMonth}`, {}).pipe(map(() => undefined));
  }

  generateForEmployee(employeeId: number, yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${employeeId}/generate/${yearMonth}`, {}).pipe(map(() => undefined));
  }

  getOverview(yearMonth: string): Observable<InternalOverviewItem[]> {
    return this.http.get<any>(`${this.api}/${yearMonth}/overview`).pipe(map(r => r.data));
  }

  getEmployeeCalendar(yearMonth: string, employeeId: number): Observable<InternalEmployeeCalendar> {
    return this.http.get<any>(`${this.api}/${yearMonth}/employee/${employeeId}`).pipe(map(r => r.data));
  }

  updateDay(yearMonth: string, employeeId: number, date: string, adjustedHours: number, note: string): Observable<InternalCalendarDay> {
    return this.http.put<any>(`${this.api}/${yearMonth}/employee/${employeeId}/day/${date}`,
      { adjustedHours, note }).pipe(map(r => r.data));
  }

  confirmEmployee(yearMonth: string, employeeId: number): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/employee/${employeeId}/confirm`, {}).pipe(map(() => undefined));
  }

  confirmAll(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/confirm-all`, {}).pipe(map(() => undefined));
  }

  unconfirmEmployee(yearMonth: string, employeeId: number): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/employee/${employeeId}/unconfirm`, {}).pipe(map(() => undefined));
  }

  exportExcel(yearMonth: string): Observable<Blob> {
    return this.http.get(`${this.api}/${yearMonth}/export`, { responseType: 'blob' });
  }

  closeMonth(yearMonth: string, reason?: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/close`, { reason }).pipe(map(() => undefined));
  }

  reopenMonth(yearMonth: string, reason: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/reopen`, { reason }).pipe(map(() => undefined));
  }
}
