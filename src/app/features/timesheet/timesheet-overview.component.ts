import {
  Component, OnInit, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TimesheetService } from '../../core/services/timesheet.service';
import { EmployeeTimesheetSummary, TimesheetLock, CompanyTimesheetField } from '../../core/models/timesheet.models';
import { TimesheetComponent } from './timesheet.component';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-timesheet-overview',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule,
    TimesheetComponent, MonthPickerComponent
  ],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">people_alt</mat-icon>
          <div>
            <h1 class="page-title">Tổng quan Timesheet</h1>
            <p class="page-sub">Xem log time của toàn bộ nhân sự trong tháng</p>
          </div>
        </div>

        <!-- Month picker + Lock button -->
        <div class="header-right">
          <app-month-picker [value]="currentMonth()" (valueChange)="onMonthChanged($event)" />

          <!-- Nút khóa / mở khóa tháng (HR) -->
          <button class="lock-month-btn" [class.is-locked]="lockStatus()?.locked"
                  (click)="toggleLock()"
                  [disabled]="lockStatus()?.accountantConfirmed"
                  [matTooltip]="lockStatus()?.accountantConfirmed
                                  ? 'Kế toán đã xác nhận — phải hủy xác nhận trước'
                                  : (lockStatus()?.locked ? 'Mở khóa để nhân sự chỉnh sửa lại' : 'Khóa để chốt công tháng này')"
                  matTooltipPosition="below">
            <mat-icon>{{ lockStatus()?.locked ? 'lock_open' : 'lock' }}</mat-icon>
            {{ lockStatus()?.locked ? 'Mở khóa tháng' : 'Khóa tháng' }}
          </button>

          <!-- Nút Kế toán xác nhận / hủy xác nhận (bước 2) -->
          @if (lockStatus()?.locked && !lockStatus()?.accountantConfirmed) {
            <button class="accountant-btn confirm"
                    (click)="accountantConfirm()"
                    matTooltip="Kế toán xác nhận timesheet — sau bước này không ai sửa được"
                    matTooltipPosition="below">
              <mat-icon>verified</mat-icon> Kế toán xác nhận
            </button>
          }
          @if (lockStatus()?.accountantConfirmed) {
            <button class="accountant-btn revert"
                    (click)="accountantRevert()"
                    matTooltip="Hủy xác nhận để chỉnh sửa (cần nhập lý do)"
                    matTooltipPosition="below">
              <mat-icon>undo</mat-icon> Hủy xác nhận
            </button>
          }
        </div>
      </div>

      <!-- Lock status banner -->
      @if (lockStatus()?.accountantConfirmed) {
        <div class="lock-info-banner accountant-banner">
          <mat-icon>verified_user</mat-icon>
          <span>
            Timesheet tháng <strong>{{ currentMonth() }}</strong>
            đã được <strong>Kế toán xác nhận</strong> — số liệu đã chốt.
            Không thể chỉnh sửa. Kế toán có thể chuyển biên bản CONFIRMED → DRAFT rồi hủy xác nhận timesheet để sửa lại.
          </span>
        </div>
      } @else if (lockStatus()?.locked) {
        <div class="lock-info-banner">
          <mat-icon>lock</mat-icon>
          <span>
            Timesheet tháng <strong>{{ currentMonth() }}</strong> đã bị HR khóa.
            Nhân sự không thể chỉnh sửa. Chờ Kế toán xác nhận để tiếp tục quy trình biên bản.
          </span>
        </div>
      }

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <!-- Summary table -->
      <div class="table-card">
        @if (!loading() && rows().length === 0) {
          <div class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>Không có dữ liệu timesheet cho tháng này</p>
          </div>
        } @else {
          <div class="table-scroll">
            <table class="overview-table">
              <thead>
                <tr>
                  <th class="col-user">Nhân sự</th>
                  <th class="col-num">Tổng giờ</th>
                  <th class="col-num">Giờ OT</th>
                  @for (field of customFields(); track field.id) {
                    <th class="col-custom">{{ field.fieldName }}</th>
                  }
                  <th class="col-desc">Mô tả</th>
                  <th class="col-action"></th>
                </tr>
              </thead>
              <tbody>
                @for (row of rows(); track row.userId) {
                  <tr class="data-row" [class.has-ot]="row.totalOtHours > 0">
                    <td class="col-user">
                      <div class="user-cell">
                        <div class="user-avatar">{{ initials(row.displayName) }}</div>
                        <div>
                          <div class="user-name">{{ row.displayName }}</div>
                          <div class="user-login">{{ row.username }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="col-num">
                      <span class="hours-badge">{{ row.totalHours | number:'1.0-1' }}h</span>
                    </td>
                    <td class="col-num">
                      @if (row.totalOtHours > 0) {
                        <span class="ot-badge">+{{ row.totalOtHours | number:'1.0-1' }}h</span>
                      } @else {
                        <span class="zero">—</span>
                      }
                    </td>
                    @for (field of customFields(); track field.id) {
                      <td class="col-custom">
                        @if (getFieldValue(row, field); as val) {
                          @if (field.fieldType === 'number') {
                            <span class="custom-badge">{{ val }}h</span>
                          } @else if (field.fieldType === 'checkbox') {
                            <mat-icon [style.color]="val === true || val === 'true' ? '#10B981' : '#d1d5db'"
                                      style="font-size:18px;width:18px;height:18px;">
                              {{ val === true || val === 'true' ? 'check_circle' : 'cancel' }}
                            </mat-icon>
                          } @else {
                            <span class="desc-text">{{ val }}</span>
                          }
                        } @else {
                          <span class="zero">—</span>
                        }
                      </td>
                    }
                    <td class="col-desc">
                      <span class="desc-text" [title]="row.description || ''">
                        {{ row.description || '—' }}
                      </span>
                    </td>
                    <td class="col-action">
                      <button mat-icon-button class="view-btn"
                              (click)="openDetail(row)"
                              matTooltip="Xem chi tiết" matTooltipPosition="left">
                        <mat-icon>open_in_new</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr class="summary-row">
                  <td>Tổng cộng ({{ rows().length }} nhân sự)</td>
                  <td class="col-num">
                    <strong>{{ totalHours() | number:'1.0-1' }}h</strong>
                  </td>
                  <td class="col-num">
                    <strong class="ot-badge">+{{ totalOt() | number:'1.0-1' }}h</strong>
                  </td>
                  @for (field of customFields(); track field.id) {
                    <td class="col-custom">
                      @if (field.fieldType === 'number') {
                        <strong class="custom-badge">{{ getFieldTotal(field) }}h</strong>
                      }
                    </td>
                  }
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      </div>

    </div>

    <!-- Detail popup overlay -->
    @if (detailUser()) {
      <div class="detail-overlay" (click)="closeDetail()">
        <div class="detail-panel" (click)="$event.stopPropagation()">
          <button mat-icon-button class="detail-close-btn" (click)="closeDetail()">
            <mat-icon>close</mat-icon>
          </button>
          <div class="detail-body">
            <app-timesheet
              [adminUserId]="detailUser()!.userId"
              [adminUserName]="detailUser()!.displayName"
              [initialMonth]="currentMonth()">
            </app-timesheet>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-wrapper {
      padding: 24px;
      font-family: 'Roboto';
    }

    /* Header */
    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .header-right {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .header-icon {
      font-size: 24px; width: 24px; height: 24px;
      color: #1565C0;
    }
    .page-title {
      margin: 0;
      font-size: 16px; font-weight: 700; color: #111827;
    }
    .page-sub {
      margin: 1px 0 0;
      font-size: 12px; color: #6b7280;
    }


    /* Lock button */
    .lock-month-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px; cursor: pointer;
      font-size: 13px; font-weight: 600; border: 1.5px solid #1565C0;
      background: #fff; color: #1565C0; transition: all 0.15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { background: #EFF6FF; }
      &.is-locked {
        background: #FEF2F2; border-color: #EF4444; color: #DC2626;
        &:hover { background: #FEE2E2; }
      }
    }

    /* Lock banner */
    .lock-info-banner {
      display: flex; align-items: center; gap: 10px;
      background: #FFF5E6; border: 1px solid #FCD34D; border-radius: 10px;
      padding: 10px 16px; margin-bottom: 16px;
      font-size: 13px; color: #92400E;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #F59E0B; flex-shrink: 0; }
    }
    .lock-info-banner.accountant-banner {
      background: #ECFDF5; border-color: #6EE7B7; color: #065F46;
      mat-icon { color: #10B981; }
    }

    /* Accountant confirm/revert buttons */
    .accountant-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 10px; cursor: pointer;
      font-size: 13px; font-weight: 600; transition: all .15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &.confirm {
        border: 1.5px solid #10B981; background: #fff; color: #059669;
        &:hover { background: #ECFDF5; }
      }
      &.revert {
        border: 1.5px solid #F59E0B; background: #FFFBEB; color: #B45309;
        &:hover { background: #FEF3C7; }
      }
    }
    .lock-month-btn[disabled] {
      opacity: .5; cursor: not-allowed;
      &:hover { background: #fff; }
    }

    /* Table card */
    .table-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      overflow: hidden;
    }
    .table-scroll { overflow-x: auto; }

    .overview-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;

      th {
        background: #f9fafb;
        color: #6b7280;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: .5px;
        padding: 12px 16px;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }
      td {
        padding: 14px 16px;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: middle;
      }
    }

    .col-num  { text-align: center; width: 110px; }
    .col-custom { text-align: center; width: 120px; }
    .col-desc { max-width: 260px; }

    .custom-badge {
      display: inline-block;
      background: #f0fdf4;
      color: #15803d;
      border-radius: 6px;
      padding: 2px 10px;
      font-weight: 700;
      font-size: 13px;
    }
    .col-action { width: 48px; text-align: center; }

    .data-row {
      transition: background .12s;
      &:hover { background: #f0f7ff; }
      &:last-child td { border-bottom: none; }
    }

    /* User cell */
    .user-cell {
      display: flex; align-items: center; gap: 10px;
    }
    .user-avatar {
      width: 36px; height: 36px;
      background: #1565C0;
      color: #fff;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700;
      flex-shrink: 0;
    }
    .user-name { font-weight: 600; color: #111827; }
    .user-login { font-size: 12px; color: #6b7280; }

    /* Badges */
    .hours-badge {
      display: inline-block;
      background: #eff6ff;
      color: #1565C0;
      border-radius: 6px;
      padding: 2px 10px;
      font-weight: 700;
      font-size: 13px;
    }
    .ot-badge {
      display: inline-block;
      background: #fff7ed;
      color: #c2410c;
      border-radius: 6px;
      padding: 2px 10px;
      font-weight: 700;
      font-size: 13px;
    }
    .zero { color: #d1d5db; }

    .desc-text {
      color: #374151;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      display: block;
      max-width: 260px;
    }

    .view-btn {
      font-size: 12px;
      color: #1565C0;
      border-color: #1565C0;
    }

    /* Summary footer row */
    .summary-row {
      background: #f9fafb;
      td {
        padding: 12px 16px;
        font-size: 14px;
        color: #374151;
        font-weight: 600;
        border-top: 2px solid #e5e7eb;
        border-bottom: none;
      }
    }

    /* Empty state */
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: #9ca3af;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; }
      p { margin: 0; font-size: 15px; }
    }

    /* ── Detail overlay ── */
    .detail-overlay {
      position: fixed;
      top: 0; right: 0; bottom: 0;
      left: 252px; /* offset sidebar width on desktop */
      background: rgba(0,0,0,.55);
      z-index: 1000;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 20px 16px;
      overflow-y: auto;
      box-sizing: border-box;
    }
    .detail-panel {
      position: relative;
      background: #f0f2f5;
      border-radius: 14px;
      width: 100%;
      max-width: min(1500px, calc(100vw - 252px - 32px));
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
      overflow: hidden;
      animation: slideUp .2s ease;
      flex-shrink: 0;
    }
    .detail-close-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 10;
      background: rgba(255,255,255,0.9);
      backdrop-filter: blur(4px);
      border-radius: 50%;
      box-shadow: 0 1px 6px rgba(0,0,0,.25);
    }
    .detail-body {
      max-height: calc(100vh - 40px);
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Tablet (sidebar collapsed/overlay mode) ── */
    @media (max-width: 768px) {
      .detail-overlay {
        left: 0; /* sidebar là overlay mode, không chiếm không gian */
        padding: 12px;
      }
      .detail-panel {
        max-width: calc(100vw - 24px);
        border-radius: 12px;
      }
      .detail-body { max-height: calc(100vh - 24px); }
    }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      .page-wrapper { padding: 12px; }
      .page-header { flex-direction: column; align-items: flex-start; }
      .header-right { width: 100%; flex-wrap: wrap; }

      .detail-overlay {
        left: 0;
        padding: 0;
        align-items: stretch;
        overflow-y: hidden;
      }
      .detail-panel {
        border-radius: 0;
        max-width: 100%;
        width: 100%;
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
      .detail-body {
        max-height: 100vh;
        flex: 1;
        overflow-y: auto;
      }
      .detail-close-btn {
        top: 6px;
        right: 6px;
      }
    }
  `]
})
export class TimesheetOverviewComponent implements OnInit {
  private svc = inject(TimesheetService);

  currentMonth = signal(this.todayMonth());
  loading = signal(false);
  rows = signal<EmployeeTimesheetSummary[]>([]);
  detailUser = signal<EmployeeTimesheetSummary | null>(null);
  lockStatus = signal<TimesheetLock | null>(null);
  customFields = signal<CompanyTimesheetField[]>([]);

  totalHours = computed(() => this.rows().reduce((s, r) => s + r.totalHours, 0));
  totalOt    = computed(() => this.rows().reduce((s, r) => s + r.totalOtHours, 0));

  ngOnInit() {
    this.loadFields();
    this.load();
  }

  /** Load danh sách custom fields đã cấu hình (chỉ lấy active) */
  loadFields() {
    this.svc.getFields().subscribe({
      next: fields => this.customFields.set(fields),
      error: () => this.customFields.set([])
    });
  }

  onMonthChanged(val: string) { this.currentMonth.set(val); this.load(); }

  load() {
    this.loading.set(true);
    const month = this.currentMonth();
    this.svc.adminOverview(month).subscribe({
      next: data => { this.rows.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
    this.svc.getLockStatus(month).subscribe({
      next: lock => this.lockStatus.set(lock),
      error: ()   => this.lockStatus.set(null)
    });
  }

  toggleLock() {
    const month = this.currentMonth();
    if (this.lockStatus()?.accountantConfirmed) {
      alert('Kế toán đã xác nhận tháng này. Phải hủy xác nhận trước khi mở khóa.');
      return;
    }
    if (this.lockStatus()?.locked) {
      if (!confirm(`Mở khóa timesheet tháng ${month}?\nNhân sự sẽ có thể chỉnh sửa lại.`)) return;
      this.svc.unlockMonth(month).subscribe({
        next: lock => this.lockStatus.set(lock),
        error: err => alert(err?.error?.message || 'Không thể mở khóa')
      });
    } else {
      if (!confirm(`Khóa timesheet tháng ${month}?\nNhân sự sẽ không thể chỉnh sửa sau khi khóa.`)) return;
      this.svc.lockMonth(month).subscribe({
        next: lock => this.lockStatus.set(lock),
        error: err => alert(err?.error?.message || 'Không thể khóa')
      });
    }
  }

  accountantConfirm() {
    const month = this.currentMonth();
    if (!confirm(
      `Kế toán xác nhận timesheet tháng ${month}?\n\n` +
      `Sau khi xác nhận, KHÔNG AI (kể cả Admin) có thể sửa timesheet cho đến khi hủy xác nhận.\n` +
      `Bước này chỉ nên thực hiện khi số liệu đã được đối chiếu hoàn tất.`
    )) return;
    this.svc.accountantConfirm(month).subscribe({
      next: lock => this.lockStatus.set(lock),
      error: err => alert(err?.error?.message || 'Không thể xác nhận')
    });
  }

  accountantRevert() {
    const month = this.currentMonth();
    const reason = prompt(
      `Hủy xác nhận timesheet tháng ${month}?\n\n` +
      `Vui lòng nhập lý do (tối thiểu 20 ký tự).\n` +
      `Lưu ý: Nếu có biên bản khách hàng đang ở trạng thái SENT/CONFIRMED, bạn phải chuyển về DRAFT trước.`
    );
    if (reason == null) return;
    const trimmed = reason.trim();
    if (trimmed.length < 20) {
      alert('Lý do phải có tối thiểu 20 ký tự.');
      return;
    }
    this.svc.accountantRevertConfirm(month, trimmed).subscribe({
      next: lock => this.lockStatus.set(lock),
      error: err => alert(err?.error?.message || 'Không thể hủy xác nhận')
    });
  }

  prevMonth() {
    const [y, m] = this.currentMonth().split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    this.currentMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    this.load();
  }

  nextMonth() {
    const [y, m] = this.currentMonth().split('-').map(Number);
    const d = new Date(y, m, 1);
    this.currentMonth.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    this.load();
  }

  openDetail(row: EmployeeTimesheetSummary) { this.detailUser.set(row); }
  closeDetail() { this.detailUser.set(null); this.load(); }

  /** Parse additions JSON và trả về giá trị của field cho row */
  getFieldValue(row: EmployeeTimesheetSummary, field: CompanyTimesheetField): any {
    if (!row.additions) return null;
    try {
      const parsed = JSON.parse(row.additions);
      const val = parsed[field.fieldKey];
      return val !== undefined && val !== null && val !== '' ? val : null;
    } catch {
      return null;
    }
  }

  /** Tính tổng cho cột number custom field */
  getFieldTotal(field: CompanyTimesheetField): number {
    return this.rows().reduce((sum, row) => {
      const val = this.getFieldValue(row, field);
      return sum + (typeof val === 'number' ? val : (parseFloat(val) || 0));
    }, 0);
  }

  initials(name: string): string {
    return name.split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase();
  }

  private todayMonth(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
}
