import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { BillingRecord, CostReportSummary, RevenueReportItem } from '../models/billing.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly billingBase = `${environment.apiUrl}/billing`;
  private readonly reportBase = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  triggerCalculation(yearMonth: string): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.billingBase}/calculate/${yearMonth}`, {}).pipe(map(r => r.data));
  }

  getByMonth(yearMonth: string): Observable<BillingRecord[]> {
    return this.http.get<ApiResponse<BillingRecord[]>>(`${this.billingBase}/${yearMonth}`).pipe(map(r => r.data));
  }

  getFiltered(fromMonth: string, toMonth: string, jobRoleId?: number, sourceType?: string): Observable<BillingRecord[]> {
    let p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    if (jobRoleId) p = p.set('jobRoleId', jobRoleId);
    if (sourceType) p = p.set('sourceType', sourceType);
    return this.http.get<ApiResponse<BillingRecord[]>>(this.billingBase, { params: p }).pipe(map(r => r.data));
  }

  getCostSummary(fromMonth: string, toMonth: string): Observable<CostReportSummary> {
    const p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    return this.http.get<ApiResponse<CostReportSummary>>(`${this.reportBase}/costs`, { params: p }).pipe(map(r => r.data));
  }

  getRevenueByJobRole(fromMonth: string, toMonth: string): Observable<RevenueReportItem[]> {
    const p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    return this.http.get<ApiResponse<RevenueReportItem[]>>(`${this.reportBase}/revenue/by-job-role`, { params: p }).pipe(map(r => r.data));
  }

  getRevenueBySourceType(fromMonth: string, toMonth: string): Observable<RevenueReportItem[]> {
    const p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    return this.http.get<ApiResponse<RevenueReportItem[]>>(`${this.reportBase}/revenue/by-source-type`, { params: p }).pipe(map(r => r.data));
  }

  getRevenueByDepartment(fromMonth: string, toMonth: string): Observable<RevenueReportItem[]> {
    const p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    return this.http.get<ApiResponse<RevenueReportItem[]>>(`${this.reportBase}/revenue/by-department`, { params: p }).pipe(map(r => r.data));
  }

  getRevenueByCustomer(fromMonth: string, toMonth: string): Observable<RevenueReportItem[]> {
    const p = new HttpParams().set('fromMonth', fromMonth).set('toMonth', toMonth);
    return this.http.get<ApiResponse<RevenueReportItem[]>>(`${this.reportBase}/revenue/by-customer`, { params: p }).pipe(map(r => r.data));
  }
}
