import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface InternalOverviewItem {
  employeeId: number;
  employeePublicId: string;
  employeeCode: string;
  fullName: string;
  totalRawHours: number;
  totalAdjustedHours: number;
  totalAdjustedDays: number;
  totalLeaveDays: number;
  totalHalfLeaveDays: number;
  status: 'DRAFT' | 'CONFIRMED' | 'NO_DATA';
}

export interface InternalCalendarDay {
  workDate: string;       // YYYY-MM-DD
  dayOfWeek: string;      // MON, TUE, ...
  weekend: boolean;
  rawHours: number;
  adjustedHours: number;
  rawOtHours: number;
  adjustedOtHours: number;
  otMultiplier: number;
  otAdjustmentReason: string | null;
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
  employeePublicId: string;
  employeeCode: string;
  fullName: string;
  yearMonth: string;
  days: InternalCalendarDay[];
  totalRawHours: number;
  totalAdjustedHours: number;
  totalRawOtHours: number;
  totalAdjustedOtHours: number;
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

  generateForEmployee(employeePublicId: string, yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${employeePublicId}/generate/${yearMonth}`, {}).pipe(map(() => undefined));
  }

  getOverview(yearMonth: string): Observable<InternalOverviewItem[]> {
    return this.http.get<any>(`${this.api}/${yearMonth}/overview`).pipe(map(r => r.data));
  }

  getEmployeeCalendar(yearMonth: string, employeePublicId: string): Observable<InternalEmployeeCalendar> {
    return this.http.get<any>(`${this.api}/${yearMonth}/employee/${employeePublicId}`).pipe(map(r => r.data));
  }

  updateDay(yearMonth: string, employeePublicId: string, date: string, adjustedHours: number,
            adjustedOtHours: number, otMultiplier: number, otAdjustmentReason: string, note: string): Observable<InternalCalendarDay> {
    return this.http.put<any>(`${this.api}/${yearMonth}/employee/${employeePublicId}/day/${date}`,
      { adjustedHours, adjustedOtHours, otMultiplier, otAdjustmentReason, note }).pipe(map(r => r.data));
  }

  confirmEmployee(yearMonth: string, employeePublicId: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/employee/${employeePublicId}/confirm`, {}).pipe(map(() => undefined));
  }

  confirmAll(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/confirm-all`, {}).pipe(map(() => undefined));
  }

  unconfirmEmployee(yearMonth: string, employeePublicId: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/employee/${employeePublicId}/unconfirm`, {}).pipe(map(() => undefined));
  }

  exportExcel(yearMonth: string): Observable<Blob> {
    return this.http.get(`${this.api}/${yearMonth}/export`, { responseType: 'blob' });
  }

}
