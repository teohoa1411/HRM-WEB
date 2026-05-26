import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

export interface MonthlySummary {
  month: string;
  totalRevenue: number;
  totalPayrollCost: number;
  totalVendorCost: number;
  totalProfit: number;
  profitMargin: number;
  totalEmployees: number;
  lastCalculatedAt: string | null;
}

export interface EmployeeFinancial {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  sourceType: string;
  customerName: string;
  billedDays: number;
  revenueAmount: number;
  netCostAmount: number;
  profitAmount: number;
  profitMargin: number;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/reports`;

  generate(yearMonth: string): Observable<void> {
    return this.http.post<any>(`${this.api}/generate/${yearMonth}`, {}).pipe(map(() => undefined));
  }

  getMonthlySummary(month: number, year: number): Observable<MonthlySummary> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<any>(`${this.api}/monthly-summary`, { params }).pipe(map(r => r.data));
  }

  getPerEmployee(month: number, year: number): Observable<EmployeeFinancial[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<any>(`${this.api}/per-employee`, { params }).pipe(map(r => r.data));
  }

  getPerCustomer(month: number, year: number): Observable<any[]> {
    const params = new HttpParams().set('month', month).set('year', year);
    return this.http.get<any>(`${this.api}/per-customer`, { params }).pipe(map(r => r.data));
  }

  getPerVendor(month: number, year: number, vendorId: number): Observable<any[]> {
    const params = new HttpParams().set('month', month).set('year', year).set('vendorId', vendorId);
    return this.http.get<any>(`${this.api}/per-vendor`, { params }).pipe(map(r => r.data));
  }
}
