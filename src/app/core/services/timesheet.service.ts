import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import {
  TimesheetEntry, TimesheetBulkRequest, TimesheetMonthlyMeta,
  TimesheetAttachment, CompanyTimesheetField, EmployeeTimesheetSummary, TimesheetLock
} from '../models/timesheet.models';

@Injectable({ providedIn: 'root' })
export class TimesheetService {
  private readonly base = `${environment.apiUrl}/timesheets`;
  private readonly fieldsBase = `${environment.apiUrl}/timesheet-fields`;

  constructor(private http: HttpClient) {}

  // ── Entries ──
  getMonth(month: string, userId?: number): Observable<TimesheetEntry[]> {
    const params = new HttpParams().set('month', month);
    const url = userId ? `${this.base}/admin/${userId}` : this.base;
    return this.http.get<ApiResponse<TimesheetEntry[]>>(url, { params }).pipe(map(r => r.data));
  }

  bulkSave(req: TimesheetBulkRequest, userId?: number): Observable<TimesheetEntry[]> {
    const url = userId ? `${this.base}/admin/${userId}/bulk` : `${this.base}/bulk`;
    return this.http.post<ApiResponse<TimesheetEntry[]>>(url, req).pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  deleteProject(projectKey: string, month: string): Observable<string> {
    const params = new HttpParams().set('projectKey', projectKey).set('month', month);
    return this.http.delete<ApiResponse<string>>(`${this.base}/project`, { params }).pipe(map(r => r.data));
  }

  // ── Monthly meta ──
  getMeta(month: string, userId?: number): Observable<TimesheetMonthlyMeta> {
    const params = new HttpParams().set('month', month);
    const url = userId ? `${this.base}/admin/${userId}/meta` : `${this.base}/meta`;
    return this.http.get<ApiResponse<TimesheetMonthlyMeta>>(url, { params }).pipe(map(r => r.data));
  }

  saveMeta(month: string, meta: { description?: string; additions?: string }, userId?: number): Observable<TimesheetMonthlyMeta> {
    const params = new HttpParams().set('month', month);
    const url = userId ? `${this.base}/admin/${userId}/meta` : `${this.base}/meta`;
    return this.http.put<ApiResponse<TimesheetMonthlyMeta>>(url, meta, { params }).pipe(map(r => r.data));
  }

  // ── Attachments ──
  listAttachments(month: string): Observable<TimesheetAttachment[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<ApiResponse<TimesheetAttachment[]>>(`${this.base}/attachments`, { params }).pipe(map(r => r.data));
  }

  uploadAttachment(month: string, file: File): Observable<TimesheetAttachment> {
    const params = new HttpParams().set('month', month);
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<TimesheetAttachment>>(`${this.base}/attachments`, form, { params }).pipe(map(r => r.data));
  }

  getAttachmentUrl(id: number): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.base}/attachments/${id}/url`).pipe(map(r => r.data));
  }

  deleteAttachment(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/attachments/${id}`).pipe(map(() => undefined));
  }

  // ── Admin attachment (xem/upload/xoá file của nhân sự) ──
  listAttachmentsAdmin(month: string, userId: number): Observable<TimesheetAttachment[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<ApiResponse<TimesheetAttachment[]>>(`${this.base}/admin/${userId}/attachments`, { params }).pipe(map(r => r.data));
  }

  uploadAttachmentAdmin(month: string, userId: number, file: File): Observable<TimesheetAttachment> {
    const params = new HttpParams().set('month', month);
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ApiResponse<TimesheetAttachment>>(`${this.base}/admin/${userId}/attachments`, form, { params }).pipe(map(r => r.data));
  }

  getAttachmentUrlAdmin(id: number): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.base}/admin/attachments/${id}/url`).pipe(map(r => r.data));
  }

  deleteAttachmentAdmin(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/admin/attachments/${id}`).pipe(map(() => undefined));
  }

  // ── Custom Fields ──
  getFields(): Observable<CompanyTimesheetField[]> {
    return this.http.get<ApiResponse<CompanyTimesheetField[]>>(this.fieldsBase).pipe(map(r => r.data));
  }

  getAllFields(): Observable<CompanyTimesheetField[]> {
    return this.http.get<ApiResponse<CompanyTimesheetField[]>>(`${this.fieldsBase}/all`).pipe(map(r => r.data));
  }

  createField(req: Partial<CompanyTimesheetField>): Observable<CompanyTimesheetField> {
    return this.http.post<ApiResponse<CompanyTimesheetField>>(this.fieldsBase, req).pipe(map(r => r.data));
  }

  updateField(id: number, req: Partial<CompanyTimesheetField>): Observable<CompanyTimesheetField> {
    return this.http.put<ApiResponse<CompanyTimesheetField>>(`${this.fieldsBase}/${id}`, req).pipe(map(r => r.data));
  }

  toggleField(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.fieldsBase}/${id}/toggle`, {}).pipe(map(() => undefined));
  }

  deleteField(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.fieldsBase}/${id}`).pipe(map(() => undefined));
  }

  // ── Admin overview ──
  adminOverview(month: string): Observable<EmployeeTimesheetSummary[]> {
    const params = new HttpParams().set('month', month);
    return this.http.get<ApiResponse<EmployeeTimesheetSummary[]>>(`${this.base}/admin/overview`, { params }).pipe(map(r => r.data));
  }

  // ── Lock / Unlock ──
  getLockStatus(month: string): Observable<TimesheetLock> {
    const params = new HttpParams().set('month', month);
    return this.http.get<ApiResponse<TimesheetLock>>(`${this.base}/admin/lock`, { params }).pipe(map(r => r.data));
  }

  /** Dành cho EMPLOYEE: kiểm tra tất cả tầng khóa (period/payroll/statement). Endpoint isAuthenticated(). */
  getLockStatusAllLevels(month: string): Observable<{ locked: boolean; periodLocked: boolean; payrollLocked: boolean; statementLocked: boolean; accountantConfirmed: boolean }> {
    return this.http.get<ApiResponse<any>>(`${this.base}/${month}/lock-status`).pipe(map(r => r.data));
  }

  lockMonth(month: string): Observable<TimesheetLock> {
    const params = new HttpParams().set('month', month);
    return this.http.post<ApiResponse<TimesheetLock>>(`${this.base}/admin/lock`, null, { params }).pipe(map(r => r.data));
  }

  unlockMonth(month: string): Observable<TimesheetLock> {
    const params = new HttpParams().set('month', month);
    return this.http.delete<ApiResponse<TimesheetLock>>(`${this.base}/admin/lock`, { params }).pipe(map(r => r.data));
  }

  /** Kế toán xác nhận timesheet (bước 2). Yêu cầu HR đã khóa trước. */
  accountantConfirm(month: string): Observable<TimesheetLock> {
    const params = new HttpParams().set('month', month);
    return this.http.post<ApiResponse<TimesheetLock>>(`${this.base}/admin/accountant-confirm`, null, { params })
      .pipe(map(r => r.data));
  }

  /** Kế toán hủy xác nhận (revert) — yêu cầu nhập lý do, chặn nếu có biên bản SENT/CONFIRMED. */
  accountantRevertConfirm(month: string, reason: string): Observable<TimesheetLock> {
    const params = new HttpParams().set('month', month);
    return this.http.post<ApiResponse<TimesheetLock>>(
      `${this.base}/admin/accountant-revert-confirm`, { reason }, { params }
    ).pipe(map(r => r.data));
  }

  /**
   * Lấy danh sách project key + name từ tháng trước (để pre-fill khi tháng hiện tại chưa có dữ liệu).
   * Lọc bỏ key hệ thống 'LEAVE'. Trả về mảng unique theo projectKey.
   */
  getPrevMonthKeys(month: string): Observable<{ projectKey: string; projectId: string; projectName: string }[]> {
    const [year, m] = month.split('-').map(Number);
    const prevDate = new Date(year, m - 2, 1);
    const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    return this.getMonth(prevMonth).pipe(
      map(entries => {
        const seen = new Map<string, { projectKey: string; projectId: string; projectName: string }>();
        for (const e of entries) {
          if (e.projectKey === 'LEAVE') continue;
          if (!seen.has(e.projectKey)) {
            seen.set(e.projectKey, {
              projectKey: e.projectKey,
              projectId: e.projectId ?? '',
              projectName: e.projectName ?? ''
            });
          }
        }
        return [...seen.values()];
      })
    );
  }
}
