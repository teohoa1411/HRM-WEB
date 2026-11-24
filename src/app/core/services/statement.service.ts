import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

/**
 * Một đoạn thời gian NV phục vụ recipient (customer/vendor) trong tháng.
 * Sau V29, một NV có thể có nhiều period nếu chuyển dự án giữa tháng.
 */
export interface StatementPeriod {
  startDate: string;   // ISO yyyy-MM-dd
  endDate:   string;
  customerId: number | null;
  vendorId:   number | null;
}

export interface StatementLineItem {
  id: number;
  employeeId: number;
  /** User ID của nhân sự — dùng để fetch raw timesheet entries. Có thể null nếu chưa có user account. */
  userId: number | null;
  employeeCode: string;
  fullName: string;
  jobRoleName: string;
  /** Ngày công gốc từ timesheet */
  originalDays: number;
  /** Ngày công sau điều chỉnh */
  adjustedDays: number;
  /** Giờ công gốc từ timesheet */
  originalHours: number;
  /** Giờ công sau điều chỉnh của kế toán */
  adjustedHours: number;
  /** Số giờ / ngày (mặc định 8.0) */
  hoursPerDay: number;
  /** Đơn vị tính: HOURLY | DAILY | MONTHLY */
  priceUnit: string;
  unitSellPrice: number;
  originalAmount: number;
  adjustedAmount: number;
  note: string;
  /** Các đoạn NV phục vụ recipient này. Mảng rỗng nếu BE chưa hỗ trợ (backward-compat). */
  periods: StatementPeriod[];
  /** True nếu NV có log timesheet vào ngày KHÔNG thuộc period nào → kế toán review. */
  hasOrphanTimesheet: boolean;
}

export type StatementStatus = 'DRAFT' | 'EXPORTED' | 'SENT' | 'CONFIRMED' | 'CLOSED' | 'STALE';
export type StatementType   = 'INTERNAL' | 'CUSTOMER' | 'VENDOR';

export interface Statement {
  id: number;
  statementType: StatementType;
  recipientId: number;
  recipientName: string;
  statementMonth: string;
  totalEmployees: number;
  totalDaysWorked: number;
  totalAmount: number;
  currency: string;
  status: StatementStatus;
  sentAt: string | null;
  sentBy: number | null;
  confirmedAt: string | null;
  confirmedBy: number | null;
  exportedAt: string | null;
  /** Lý do STALE — timesheet bị chỉnh sau khi xuất */
  staleReason: string | null;
  note: string;
  lineItems: StatementLineItem[];
}

export interface StatementHistory {
  id: number;
  statementId: number;
  fromStatus: string | null;
  toStatus: string;
  changedBy: number;
  changedAt: string;
  changeReason: string | null;
}

export interface StatementDailyEntry {
  id: number | null;
  workDate: string;
  dayOfWeek: string;
  weekend: boolean;
  internalHours: number;
  customerHours: number;
  leaveDay: boolean;
  halfLeave: boolean;
  paidLeave: boolean;
  leaveTypeName: string | null;
  accountantNote: string | null;
}

@Injectable({ providedIn: 'root' })
export class StatementService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/statements`;

  // ── Customer ──────────────────────────────────────────────────────────────

  listCustomerStatements(yearMonth: string): Observable<Statement[]> {
    return this.http.get<any>(`${this.api}/customer/${yearMonth}`).pipe(map(r => r.data));
  }

  getCustomerStatement(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.get<any>(`${this.api}/customer/${customerId}/${yearMonth}`).pipe(map(r => r.data));
  }

  generateCustomerStatement(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/generate`, {}).pipe(map(r => r.data));
  }

  exportCustomerExcel(customerId: number, yearMonth: string): Observable<Blob> {
    return this.http.get(`${this.api}/customer/${customerId}/${yearMonth}/export`, { responseType: 'blob' });
  }

  markCustomerSent(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/mark-sent`, {}).pipe(map(r => r.data));
  }

  markCustomerExported(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/mark-exported`, {}).pipe(map(r => r.data));
  }

  markCustomerConfirmed(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/mark-confirmed`, {}).pipe(map(r => r.data));
  }

  resetCustomerDraft(customerId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/reset-draft`, {}).pipe(map(r => r.data));
  }

  closeCustomer(customerId: number, yearMonth: string, reason?: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/close`, { reason }).pipe(map(r => r.data));
  }

  reopenCustomer(customerId: number, yearMonth: string, reason: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/customer/${customerId}/${yearMonth}/reopen`, { reason }).pipe(map(r => r.data));
  }

  getCustomerHistory(customerId: number, yearMonth: string): Observable<StatementHistory[]> {
    return this.http.get<any>(`${this.api}/customer/${customerId}/${yearMonth}/history`).pipe(map(r => r.data));
  }

  // ── Vendor ────────────────────────────────────────────────────────────────

  listVendorStatements(yearMonth: string): Observable<Statement[]> {
    return this.http.get<any>(`${this.api}/vendor/${yearMonth}`).pipe(map(r => r.data));
  }

  getVendorStatement(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.get<any>(`${this.api}/vendor/${vendorId}/${yearMonth}`).pipe(map(r => r.data));
  }

  generateVendorStatement(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/generate`, {}).pipe(map(r => r.data));
  }

  updateVendorLineItem(vendorId: number, yearMonth: string, id: number,
                       payload: { adjustedHours?: number; note?: string }): Observable<StatementLineItem> {
    return this.http.put<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/line-items/${id}`, payload).pipe(map(r => r.data));
  }

  exportVendorExcel(vendorId: number, yearMonth: string): Observable<Blob> {
    return this.http.get(`${this.api}/vendor/${vendorId}/${yearMonth}/export`, { responseType: 'blob' });
  }

  markVendorSent(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/mark-sent`, {}).pipe(map(r => r.data));
  }

  markVendorExported(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/mark-exported`, {}).pipe(map(r => r.data));
  }

  markVendorConfirmed(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/mark-confirmed`, {}).pipe(map(r => r.data));
  }

  resetVendorDraft(vendorId: number, yearMonth: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/reset-draft`, {}).pipe(map(r => r.data));
  }

  closeVendor(vendorId: number, yearMonth: string, reason?: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/close`, { reason }).pipe(map(r => r.data));
  }

  reopenVendor(vendorId: number, yearMonth: string, reason: string): Observable<Statement> {
    return this.http.post<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/reopen`, { reason }).pipe(map(r => r.data));
  }

  getVendorHistory(vendorId: number, yearMonth: string): Observable<StatementHistory[]> {
    return this.http.get<any>(`${this.api}/vendor/${vendorId}/${yearMonth}/history`).pipe(map(r => r.data));
  }

  // ── Daily calendar ────────────────────────────────────────────────────────

  getLineItemDailyCalendar(lineItemId: number, yearMonth: string): Observable<StatementDailyEntry[]> {
    return this.http.get<any>(`${this.api}/line-items/${lineItemId}/daily/${yearMonth}`).pipe(map(r => r.data));
  }

  generateLineItemDaily(lineItemId: number, yearMonth: string): Observable<StatementDailyEntry[]> {
    return this.http.post<any>(`${this.api}/line-items/${lineItemId}/daily/${yearMonth}/generate`, {}).pipe(map(r => r.data));
  }

  updateDailyEntry(lineItemId: number, date: string, payload: { hours?: number; note?: string }): Observable<StatementDailyEntry> {
    return this.http.put<any>(`${this.api}/line-items/${lineItemId}/daily/${date}`, payload).pipe(map(r => r.data));
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Nhãn hiển thị cho trạng thái */
  statusLabel(status: StatementStatus | string): string {
    const labels: Record<string, string> = {
      DRAFT:     'Nháp',
      EXPORTED:  'Đã xuất',
      SENT:      'Đã gửi',
      CONFIRMED: 'Đã xác nhận',
      CLOSED:    'Đã đóng',
      STALE:     'Lỗi thời',
    };
    return labels[status] ?? status;
  }
}
