import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface PayrollAdjustment {
  id?: number;
  type: 'BONUS' | 'DEDUCTION' | 'ALLOWANCE';
  description: string;
  amount: number;
  taxable?: boolean;
  sortOrder?: number;
}

export interface PayrollRecord {
  id: number;
  employeeId: number;
  employeeCode: string;
  fullName: string;
  departmentName: string;
  jobRoleName: string;
  payrollMonth: string;
  baseSalary: number;
  daysWorked: number;
  daysOff: number;
  totalWorkdays: number;
  calculatedSalary: number;
  overtimeAmount: number;
  bonus: number;
  deduction: number;
  insuranceSalary: number | null;
  insuranceEmployeeAmount: number;
  insuranceEmployerAmount: number;
  bhxhEmployeeAmount: number;
  bhxhEmployerAmount: number;
  bhytEmployeeAmount: number;
  bhytEmployerAmount: number;
  bhtnEmployeeAmount: number;
  bhtnEmployerAmount: number;
  paidBy: number | null;
  paidAt: string | null;
  adjustmentNote: string;
  adjustments: PayrollAdjustment[] | null;
  netSalary: number;
  currency: string;
  status: 'DRAFT' | 'ADJUSTED' | 'CONFIRMED' | 'EXPORTED' | 'PAID' | 'STALE';
  confirmedBy: number;
  confirmedAt: string;
  exportedAt: string;
}

@Injectable({ providedIn: 'root' })
export class PayrollService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/payroll`;

  generate(yearMonth: string): Observable<PayrollRecord[]> {
    return this.http.post<any>(`${this.api}/generate/${yearMonth}`, {})
      .pipe(map(r => r.data));
  }

  getPayroll(yearMonth: string): Observable<PayrollRecord[]> {
    return this.http.get<any>(`${this.api}/${yearMonth}`)
      .pipe(map(r => r.data));
  }

  update(id: number, payload: {
    bonus?: number; deduction?: number; adjustmentNote?: string;
    adjustments?: PayrollAdjustment[];
  }): Observable<PayrollRecord> {
    return this.http.put<any>(`${this.api}/${id}`, payload)
      .pipe(map(r => r.data));
  }

  confirm(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/confirm`, {})
      .pipe(map(() => undefined));
  }

  reset(yearMonth: string, reason: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/reset`, { reason })
      .pipe(map(() => undefined));
  }

  exportExcel(yearMonth: string): Observable<Blob> {
    return this.http.get(`${this.api}/${yearMonth}/export`, { responseType: 'blob' });
  }

  staleCheck(yearMonth: string): Observable<boolean> {
    return this.http.get<any>(`${this.api}/${yearMonth}/stale-check`)
      .pipe(map(r => r.data?.hasStale ?? false));
  }

  markPaid(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/${yearMonth}/mark-paid`, {})
      .pipe(map(() => undefined));
  }

  // ── Adjustments ──
  getAdjustments(payrollRecordId: number): Observable<PayrollAdjustment[]> {
    return this.http.get<any>(`${this.api}/${payrollRecordId}/adjustments`)
      .pipe(map(r => r.data));
  }

  addAdjustment(payrollRecordId: number, adj: PayrollAdjustment): Observable<PayrollAdjustment> {
    return this.http.post<any>(`${this.api}/${payrollRecordId}/adjustments`, adj)
      .pipe(map(r => r.data));
  }

  removeAdjustment(payrollRecordId: number, adjustmentId: number): Observable<void> {
    return this.http.delete<any>(`${this.api}/${payrollRecordId}/adjustments/${adjustmentId}`)
      .pipe(map(() => undefined));
  }
}
