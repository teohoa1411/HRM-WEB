import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { LeaveType, LeaveRequest, CreateLeaveRequest, CreateLeaveTypeRequest, LeaveBlock, LeaveBalance, GrantLeaveBalanceRequest } from '../models/leave.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class LeaveService {
  private readonly base = `${environment.apiUrl}/leave`;

  constructor(private http: HttpClient) {}

  // Leave Types
  getLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<ApiResponse<LeaveType[]>>(`${this.base}/types`).pipe(map(r => r.data));
  }

  getAllLeaveTypes(): Observable<LeaveType[]> {
    return this.http.get<ApiResponse<LeaveType[]>>(`${this.base}/types/all`).pipe(map(r => r.data));
  }

  createLeaveType(dto: CreateLeaveTypeRequest): Observable<LeaveType> {
    return this.http.post<ApiResponse<LeaveType>>(`${this.base}/types`, dto).pipe(map(r => r.data));
  }

  updateLeaveType(id: number, dto: CreateLeaveTypeRequest): Observable<LeaveType> {
    return this.http.put<ApiResponse<LeaveType>>(`${this.base}/types/${id}`, dto).pipe(map(r => r.data));
  }

  // Leave Requests (Admin view — paginated, returns Page<T>)
  getAllRequests(employeeId?: number, status?: string, page = 0, size = 20): Observable<any> {
    let p = new HttpParams().set('page', page).set('size', size);
    if (employeeId) p = p.set('employeeId', employeeId);
    if (status) p = p.set('status', status);
    return this.http.get<ApiResponse<any>>(`${this.base}/requests`, { params: p }).pipe(map(r => r.data));
  }

  // Create a leave request for an employee (admin)
  createRequest(employeeId: number, dto: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.post<ApiResponse<LeaveRequest>>(`${this.base}/requests/employee/${employeeId}`, dto).pipe(map(r => r.data));
  }

  // Employee self-service
  getMyRequests(status?: string, page = 0, size = 20): Observable<any> {
    let p = new HttpParams().set('page', page).set('size', size);
    if (status) p = p.set('status', status);
    return this.http.get<ApiResponse<any>>(`${this.base}/requests/my`, { params: p }).pipe(map(r => r.data));
  }

  submitMyRequest(dto: CreateLeaveRequest): Observable<LeaveRequest> {
    return this.http.post<ApiResponse<LeaveRequest>>(`${this.base}/requests/my`, dto).pipe(map(r => r.data));
  }

  /** Employee: blocked dates for timesheet display (APPROVED leaves only) */
  getMyLeaveBlocks(month: string): Observable<LeaveBlock[]> {
    const p = new HttpParams().set('month', month);
    return this.http.get<ApiResponse<LeaveBlock[]>>(`${this.base}/requests/my/blocks`, { params: p }).pipe(map(r => r.data));
  }

  /** Admin: blocked dates of a specific user */
  getLeaveBlocksForUser(userId: number, month: string): Observable<LeaveBlock[]> {
    const p = new HttpParams().set('userId', userId).set('month', month);
    return this.http.get<ApiResponse<LeaveBlock[]>>(`${this.base}/requests/blocks`, { params: p }).pipe(map(r => r.data));
  }

  approve(id: number): Observable<LeaveRequest> {
    return this.http.patch<ApiResponse<LeaveRequest>>(`${this.base}/requests/${id}/approve`, {}).pipe(map(r => r.data));
  }

  reject(id: number, reason?: string): Observable<LeaveRequest> {
    return this.http.patch<ApiResponse<LeaveRequest>>(`${this.base}/requests/${id}/reject`, { reason }).pipe(map(r => r.data));
  }

  cancel(id: number): Observable<LeaveRequest> {
    return this.http.patch<ApiResponse<LeaveRequest>>(`${this.base}/requests/${id}/cancel`, {}).pipe(map(r => r.data));
  }

  // ── Leave Balances ──────────────────────────────────────────────────────

  /** Lấy tất cả quota phép của nhân sự trong năm (admin) */
  getLeaveBalances(year?: number): Observable<LeaveBalance[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    return this.http.get<ApiResponse<LeaveBalance[]>>(`${this.base}/balances`, { params: p }).pipe(map(r => r.data));
  }

  /** Lấy quota phép của một nhân sự */
  getEmployeeLeaveBalances(employeeId: number, year?: number): Observable<LeaveBalance[]> {
    let p = new HttpParams();
    if (year) p = p.set('year', year);
    return this.http.get<ApiResponse<LeaveBalance[]>>(`${this.base}/balances/employee/${employeeId}`, { params: p }).pipe(map(r => r.data));
  }

  /** Cấp quota phép cho nhân sự */
  grantLeaveBalance(req: GrantLeaveBalanceRequest): Observable<LeaveBalance> {
    return this.http.post<ApiResponse<LeaveBalance>>(`${this.base}/balances/grant`, req).pipe(map(r => r.data));
  }
}
