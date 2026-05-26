import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/auth/auth.service';
import {
  InternalStatementService,
  InternalOverviewItem,
  InternalEmployeeCalendar,
  InternalCalendarDay
} from '../../core/services/internal-statement.service';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-internal-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MonthPickerComponent],
  template: `
<div class="is-root">

  <!-- ── HEADER ─────────────────────────────────────────────── -->
  <div class="is-header">
    <div class="is-header-left">
      <div class="is-icon-wrap"><mat-icon>assignment_ind</mat-icon></div>
      <div>
        <h1 class="is-title">Biên Bản Nội Bộ</h1>
        <p class="is-subtitle">HR điều chỉnh giờ công &amp; nghỉ phép có lương</p>
      </div>
    </div>
    <div class="is-header-right">
      <app-month-picker [value]="selectedMonth" (valueChange)="onMonthPickerChanged($event)" />
      <button class="btn-action btn-blue" [disabled]="generating()" (click)="generate()"
        matTooltip="Tổng hợp lại từ timesheet + nghỉ phép">
        @if (generating()) { <mat-spinner diameter="16"></mat-spinner> }
        @else { <mat-icon>sync</mat-icon> }
        Tổng hợp
      </button>
      <button class="btn-action btn-green" [disabled]="loading()" (click)="exportExcel()"
        matTooltip="Xuất Excel biên bản nội bộ">
        <mat-icon>download</mat-icon> Xuất Excel
      </button>
      @if (hasUncConfirmed()) {
        <button class="btn-action btn-purple" [disabled]="loading()" (click)="confirmAll()">
          <mat-icon>check_circle</mat-icon> Xác nhận tất cả
        </button>
      }
      @if (!hasUncConfirmed() && overview().length > 0) {
        @if (!monthClosed()) {
          <button class="btn-action" style="background:#dc2626;color:#fff;" (click)="closeMonth()">
            <mat-icon>lock</mat-icon> Đóng biên bản tháng
          </button>
        } @else {
          <span style="background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:8px;font-weight:600;">
            <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;">lock</mat-icon>
            ĐÃ ĐÓNG
          </span>
          @if (authService.isCompanyAdmin()) {
            <button class="btn-action" style="background:#059669;color:#fff;" (click)="reopenMonth()">
              <mat-icon>lock_open</mat-icon> Mở lại
            </button>
          }
        }
      }
    </div>
  </div>

  <!-- ── CONTENT ────────────────────────────────────────────── -->
  @if (detailView()) {
    <!-- ─── Detail: calendar của 1 nhân sự ──────────────────── -->
    <div class="detail-header">
      <button class="btn-back" (click)="closeDetail()">
        <mat-icon>arrow_back</mat-icon> Quay lại
      </button>
      <div class="detail-emp-info">
        <div class="emp-avatar-lg" [style.background]="avatarColor(calendarData()?.fullName ?? '')">
          {{ initials(calendarData()?.fullName ?? '') }}
        </div>
        <div>
          <div class="detail-emp-name">{{ calendarData()?.fullName }}</div>
          <code class="detail-emp-code">{{ calendarData()?.employeeCode }}</code>
        </div>
        <div class="detail-summary-pills">
          <span class="pill-stat pill-blue">
            <mat-icon>timer</mat-icon> Raw: {{ calendarData()?.totalRawHours | number:'1.0-1' }}H
          </span>
          <span class="pill-stat pill-green">
            <mat-icon>schedule</mat-icon> Adjusted: {{ calendarData()?.totalAdjustedHours | number:'1.0-1' }}H
            ({{ calendarData()?.totalAdjustedDays | number:'1.1-1' }} ngày)
          </span>
          <span class="pill-stat pill-orange">
            <mat-icon>beach_access</mat-icon>
            Phép: {{ calendarData()?.totalLeaveDays }} ngày + {{ calendarData()?.totalHalfLeaveDays }} nửa ngày
          </span>
          <span class="pill-stat" [class]="calendarData()?.status === 'CONFIRMED' ? 'pill-confirmed' : 'pill-draft'">
            {{ calendarData()?.status === 'CONFIRMED' ? 'Đã xác nhận' : 'Nháp' }}
          </span>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-action btn-blue" (click)="refreshEmployee()">
          <mat-icon>refresh</mat-icon> Làm mới
        </button>
        @if (calendarData()?.status !== 'CONFIRMED') {
          <button class="btn-action btn-purple" (click)="confirmCurrentEmployee()">
            <mat-icon>check_circle</mat-icon> Xác nhận
          </button>
        } @else {
          <button class="btn-action btn-gray" (click)="unconfirmCurrentEmployee()">
            <mat-icon>cancel</mat-icon> Hủy xác nhận
          </button>
        }
      </div>
    </div>

    @if (calendarLoading()) {
      <div class="loading-wrap"><mat-spinner diameter="36"></mat-spinner><span>Đang tải...</span></div>
    } @else {
      <!-- Calendar grid -->
      <div class="calendar-card">
        <div class="calendar-legend">
          <span class="legend-item"><span class="dot dot-leave-full"></span>Nghỉ phép cả ngày</span>
          <span class="legend-item"><span class="dot dot-leave-half"></span>Nghỉ phép nửa ngày</span>
          <span class="legend-item"><span class="dot dot-weekend"></span>Cuối tuần</span>
          <span class="legend-item"><span class="dot dot-adjusted"></span>Đã điều chỉnh</span>
        </div>
        <div class="calendar-scroll">
          <table class="cal-table">
            <thead>
              <tr>
                <th class="th-date">Ngày</th>
                <th class="th-dow">Thứ</th>
                <th class="th-raw">Giờ Log</th>
                <th class="th-leave">Nghỉ phép</th>
                <th class="th-adj">Giờ Điều Chỉnh</th>
                <th class="th-note">Ghi Chú TS</th>
                <th class="th-note">Ghi Chú HR</th>
                <th class="th-action">Sửa</th>
              </tr>
            </thead>
            <tbody>
              @for (day of calendarData()?.days ?? []; track day.workDate) {
                <tr [class]="rowClass(day)" [class.editing]="editingDate === day.workDate">
                  <td class="td-date">{{ formatDate(day.workDate) }}</td>
                  <td class="td-dow">{{ dowLabel(day.dayOfWeek) }}</td>
                  <td class="td-raw">
                    <span class="hours-badge" [class.zero]="day.rawHours === 0">
                      {{ day.rawHours | number:'1.0-1' }}H
                    </span>
                  </td>
                  <td class="td-leave">
                    @if (day.leaveDay || day.halfLeave) {
                      <span class="leave-badge" [class.half]="day.halfLeave" [class.paid]="day.paidLeave">
                        <mat-icon>{{ day.halfLeave ? 'wb_sunny' : 'beach_access' }}</mat-icon>
                        {{ day.halfLeave ? 'Nửa ngày' : 'Cả ngày' }}
                        {{ day.paidLeave ? '(CL)' : '(KL)' }}
                        @if (day.leaveTypeName) { <span class="leave-type">{{ day.leaveTypeName }}</span> }
                      </span>
                    } @else { <span class="no-leave">—</span> }
                  </td>

                  <!-- Editable adjusted hours -->
                  <td class="td-adj">
                    @if (editingDate === day.workDate) {
                      <div class="edit-cell">
                        <input type="number" class="hours-input" [(ngModel)]="editHours"
                          min="0" max="24" step="0.5">
                        <span class="h-label">H</span>
                      </div>
                    } @else {
                      <span class="adj-hours" [class.modified]="day.adjustedHours !== day.rawHours">
                        {{ day.adjustedHours | number:'1.0-1' }}H
                      </span>
                    }
                  </td>

                  <td class="td-note ts-note">{{ day.timesheetNote || '—' }}</td>

                  <!-- Editable HR note -->
                  <td class="td-note">
                    @if (editingDate === day.workDate) {
                      <input type="text" class="note-input" [(ngModel)]="editNote"
                        placeholder="Ghi chú HR...">
                    } @else {
                      <span class="hr-note">{{ day.hrNote || '—' }}</span>
                    }
                  </td>

                  <td class="td-action">
                    @if (editingDate === day.workDate) {
                      <div class="action-btns">
                        <button class="btn-icon btn-save" (click)="saveDay(day)" matTooltip="Lưu">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button class="btn-icon btn-cancel" (click)="cancelEdit()" matTooltip="Hủy">
                          <mat-icon>close</mat-icon>
                        </button>
                      </div>
                    } @else {
                      <button class="btn-icon btn-edit" (click)="startEdit(day)"
                        [disabled]="calendarData()?.status === 'CONFIRMED'"
                        matTooltip="Chỉnh sửa">
                        <mat-icon>edit</mat-icon>
                      </button>
                    }
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="total-row">
                <td colspan="2" class="total-label">TỔNG</td>
                <td class="td-raw">
                  <span class="hours-badge">{{ calendarData()?.totalRawHours | number:'1.0-1' }}H</span>
                </td>
                <td>
                  <span class="leave-summary">
                    {{ calendarData()?.totalLeaveDays }}N + {{ calendarData()?.totalHalfLeaveDays }}½
                  </span>
                </td>
                <td class="td-adj">
                  <span class="adj-hours modified">{{ calendarData()?.totalAdjustedHours | number:'1.0-1' }}H
                    = {{ calendarData()?.totalAdjustedDays | number:'1.1-1' }} ngày công</span>
                </td>
                <td colspan="3"></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    }

  } @else {
    <!-- ─── Overview: danh sách nhân sự ──────────────────────── -->
    @if (loading()) {
      <div class="loading-wrap"><mat-spinner diameter="36"></mat-spinner><span>Đang tải...</span></div>
    } @else if (overview().length === 0) {
      <div class="empty-state">
        <mat-icon>assignment_late</mat-icon>
        <h3>Chưa có dữ liệu tháng {{ selectedMonth }}</h3>
        <p>Nhấn <strong>Tổng hợp</strong> để tạo biên bản nội bộ từ timesheet và đơn nghỉ phép.</p>
      </div>
    } @else {
      <!-- Summary chips -->
      <div class="overview-stats">
        <div class="stat-chip">
          <mat-icon>people</mat-icon>
          <span>{{ overview().length }} nhân sự</span>
        </div>
        <div class="stat-chip stat-green">
          <mat-icon>check_circle</mat-icon>
          <span>{{ confirmedCount() }} đã xác nhận</span>
        </div>
        <div class="stat-chip stat-orange">
          <mat-icon>pending</mat-icon>
          <span>{{ draftCount() }} nháp</span>
        </div>
      </div>

      <div class="overview-table-card">
        <table class="ov-table">
          <thead>
            <tr>
              <th>Nhân Viên</th>
              <th class="th-num">Giờ Log</th>
              <th class="th-num">Giờ Điều Chỉnh</th>
              <th class="th-num">Ngày Công</th>
              <th class="th-num">Phép CL</th>
              <th class="th-num">Phép ½</th>
              <th class="th-status">Trạng Thái</th>
              <th class="th-action">Chi Tiết</th>
            </tr>
          </thead>
          <tbody>
            @for (emp of overview(); track emp.employeeId) {
              <tr class="ov-row" [class.confirmed]="emp.status === 'CONFIRMED'">
                <td class="td-emp">
                  <div class="emp-cell">
                    <div class="emp-avatar" [style.background]="avatarColor(emp.fullName)">
                      {{ initials(emp.fullName) }}
                    </div>
                    <div>
                      <div class="emp-name">{{ emp.fullName }}</div>
                      <code class="emp-code">{{ emp.employeeCode }}</code>
                    </div>
                  </div>
                </td>
                <td class="td-num">
                  <span class="hours-badge" [class.zero]="emp.totalRawHours === 0">
                    {{ emp.totalRawHours | number:'1.0-1' }}H
                  </span>
                </td>
                <td class="td-num">
                  <span class="hours-badge adj" [class.modified]="emp.totalAdjustedHours !== emp.totalRawHours">
                    {{ emp.totalAdjustedHours | number:'1.0-1' }}H
                  </span>
                </td>
                <td class="td-num">
                  <strong>{{ emp.totalAdjustedDays | number:'1.1-1' }}</strong> ngày
                </td>
                <td class="td-num">
                  @if (emp.totalLeaveDays > 0) {
                    <span class="leave-count">{{ emp.totalLeaveDays }}</span>
                  } @else { — }
                </td>
                <td class="td-num">
                  @if (emp.totalHalfLeaveDays > 0) {
                    <span class="leave-count half">{{ emp.totalHalfLeaveDays }}</span>
                  } @else { — }
                </td>
                <td class="td-status">
                  <span class="status-badge" [class]="'status-' + emp.status.toLowerCase()">
                    @switch (emp.status) {
                      @case ('CONFIRMED') { <mat-icon>check_circle</mat-icon> Đã xác nhận }
                      @case ('DRAFT') { <mat-icon>edit_note</mat-icon> Nháp }
                      @default { <mat-icon>help_outline</mat-icon> Chưa có data }
                    }
                  </span>
                </td>
                <td class="td-action">
                  <button class="btn-detail" (click)="openDetail(emp)">
                    <mat-icon>open_in_new</mat-icon>
                  </button>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  }
</div>
  `,
  styles: [`
.is-root { padding: 28px 32px; min-height: 100vh; background: #f0f2f5; font-family: 'Be Vietnam Pro','Segoe UI',sans-serif; }

/* Header */
.is-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:24px; flex-wrap:wrap; gap:12px; }
.is-header-left { display:flex; align-items:center; gap:14px; }
.is-icon-wrap { width:46px; height:46px; border-radius:12px; background:linear-gradient(135deg,#1565c0,#3b82f6);
  display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(21,101,192,.3); }
.is-icon-wrap mat-icon { color:#fff; font-size:24px; width:24px; height:24px; }
.is-title { font-size:22px; font-weight:700; color:#0f172a; margin:0; }
.is-subtitle { font-size:12.5px; color:#6b7280; margin:2px 0 0; }
.is-header-right { display:flex; align-items:center; gap:8px; flex-wrap:wrap; }

.month-picker-wrap { display:flex; align-items:center; gap:8px; background:#fff; border:1.5px solid #e2e8f0;
  border-radius:10px; padding:0 12px; height:38px; }
.picker-icon { font-size:18px; width:18px; height:18px; color:#6b7280; }
.month-picker { border:none; outline:none; font-family:inherit; font-size:13.5px; color:#374151; background:transparent; }

.btn-action { display:inline-flex; align-items:center; gap:6px; padding:7px 14px; border-radius:8px;
  border:none; font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s; }
.btn-action:disabled { opacity:.5; cursor:not-allowed; }
.btn-action mat-icon { font-size:16px; width:16px; height:16px; }
.btn-blue   { background:linear-gradient(135deg,#1565c0,#3b82f6); color:#fff; }
.btn-green  { background:linear-gradient(135deg,#15803d,#22c55e); color:#fff; }
.btn-purple { background:linear-gradient(135deg,#7c3aed,#a78bfa); color:#fff; }
.btn-gray   { background:#e5e7eb; color:#374151; }

/* Loading */
.loading-wrap { display:flex; flex-direction:column; align-items:center; gap:16px; padding:80px 24px; color:#6b7280; }

/* Empty */
.empty-state { display:flex; flex-direction:column; align-items:center; padding:80px 24px; text-align:center; }
.empty-state mat-icon { font-size:56px; width:56px; height:56px; color:#94a3b8; margin-bottom:16px; }
.empty-state h3 { font-size:18px; font-weight:600; color:#374151; margin:0 0 8px; }
.empty-state p { font-size:13.5px; color:#6b7280; }

/* Stats chips */
.overview-stats { display:flex; gap:10px; margin-bottom:16px; flex-wrap:wrap; }
.stat-chip { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border-radius:20px;
  background:#fff; border:1.5px solid #e2e8f0; font-size:13px; font-weight:600; color:#374151; }
.stat-chip mat-icon { font-size:16px; width:16px; height:16px; }
.stat-green { border-color:#22c55e; color:#15803d; }
.stat-orange { border-color:#f59e0b; color:#d97706; }

/* Overview table */
.overview-table-card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.ov-table { width:100%; border-collapse:collapse; }
.ov-table thead tr { background:#f9fafb; border-bottom:2px solid #e5e7eb; }
.ov-table th { padding:11px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#6b7280; }
.th-num,.td-num { text-align:right; }
.th-status,.td-status { text-align:center; }
.th-action,.td-action { text-align:center; width:60px; }
.ov-row { border-bottom:1px solid #f3f4f6; transition:background .12s; }
.ov-row:hover { background:#f8faff; }
.ov-row.confirmed { background:#f0fdf4; }
.ov-table td { padding:11px 14px; font-size:13.5px; color:#374151; }

.emp-cell { display:flex; align-items:center; gap:10px; }
.emp-avatar { width:34px; height:34px; border-radius:9px; color:#fff; font-size:12px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.emp-name { font-size:13.5px; font-weight:600; color:#1e293b; }
.emp-code { font-size:11px; color:#64748b; font-family:'JetBrains Mono',monospace; }

.hours-badge { display:inline-block; padding:2px 8px; border-radius:20px; background:#dbeafe; color:#1d4ed8;
  font-size:12px; font-weight:600; }
.hours-badge.zero { background:#f1f5f9; color:#9ca3af; }
.hours-badge.adj.modified { background:#dcfce7; color:#15803d; }

.leave-count { display:inline-block; min-width:24px; height:24px; border-radius:50%; background:#fef3c7;
  color:#d97706; font-size:12px; font-weight:700; text-align:center; line-height:24px; }
.leave-count.half { background:#ede9fe; color:#7c3aed; }

.status-badge { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px;
  font-size:12px; font-weight:600; }
.status-badge mat-icon { font-size:14px; width:14px; height:14px; }
.status-confirmed { background:#dcfce7; color:#15803d; }
.status-draft { background:#fef3c7; color:#d97706; }
.status-no_data { background:#f1f5f9; color:#9ca3af; }

.btn-detail { background:none; border:1.5px solid #e2e8f0; border-radius:8px; width:34px; height:34px;
  cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6366f1; transition:all .15s; }
.btn-detail:hover { background:#eef2ff; border-color:#6366f1; }
.btn-detail mat-icon { font-size:18px; width:18px; height:18px; }

/* ── Detail view ── */
.detail-header { background:#fff; border-radius:14px; padding:20px; margin-bottom:20px;
  display:flex; align-items:center; gap:16px; flex-wrap:wrap;
  box-shadow:0 1px 3px rgba(0,0,0,.06); }
.btn-back { display:inline-flex; align-items:center; gap:4px; padding:7px 14px; border-radius:8px;
  border:1.5px solid #e2e8f0; background:#fff; cursor:pointer; font-family:inherit; font-size:13px;
  font-weight:600; color:#374151; transition:all .15s; flex-shrink:0; }
.btn-back:hover { border-color:#6366f1; color:#6366f1; }
.btn-back mat-icon { font-size:16px; width:16px; height:16px; }

.detail-emp-info { display:flex; align-items:center; gap:14px; flex:1; flex-wrap:wrap; }
.emp-avatar-lg { width:46px; height:46px; border-radius:12px; color:#fff; font-size:16px; font-weight:700;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.detail-emp-name { font-size:16px; font-weight:700; color:#1e293b; }
.detail-emp-code { font-size:12px; color:#64748b; font-family:'JetBrains Mono',monospace; }
.detail-summary-pills { display:flex; gap:8px; flex-wrap:wrap; margin-top:4px; }
.pill-stat { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:20px;
  font-size:12px; font-weight:600; }
.pill-stat mat-icon { font-size:13px; width:13px; height:13px; }
.pill-blue { background:#dbeafe; color:#1d4ed8; }
.pill-green { background:#dcfce7; color:#15803d; }
.pill-orange { background:#fef3c7; color:#d97706; }
.pill-confirmed { background:#dcfce7; color:#15803d; }
.pill-draft { background:#fef3c7; color:#d97706; }
.detail-actions { display:flex; gap:8px; flex-shrink:0; }

/* Legend */
.calendar-legend { display:flex; gap:16px; padding:12px 16px; background:#f9fafb; flex-wrap:wrap; }
.legend-item { display:flex; align-items:center; gap:6px; font-size:12px; color:#6b7280; }
.dot { width:12px; height:12px; border-radius:3px; }
.dot-leave-full { background:#fca5a5; }
.dot-leave-half { background:#fde68a; }
.dot-weekend { background:#e2e8f0; }
.dot-adjusted { background:#bbf7d0; }

/* Calendar table */
.calendar-card { background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,.06); }
.calendar-scroll { overflow-x:auto; }
.cal-table { width:100%; border-collapse:collapse; min-width:800px; }
.cal-table thead tr { background:#f9fafb; border-bottom:2px solid #e5e7eb; }
.cal-table th { padding:10px 12px; font-size:11px; font-weight:700; text-transform:uppercase;
  letter-spacing:.5px; color:#6b7280; white-space:nowrap; }
.cal-table td { padding:9px 12px; font-size:13px; border-bottom:1px solid #f3f4f6; }
.th-adj,.td-adj { text-align:right; }
.th-num,.td-num { text-align:right; }
.th-raw,.td-raw { text-align:center; }
.th-date { min-width:90px; }
.th-note,.td-note { max-width:160px; color:#6b7280; font-size:12px; }
.th-action { width:80px; text-align:center; }
.td-action { text-align:center; }

/* Row colors */
.cal-table tr.leave-full { background:#fff5f5; }
.cal-table tr.leave-half { background:#fffbeb; }
.cal-table tr.weekend   { background:#f8fafc; color:#94a3b8; }
.cal-table tr.editing   { background:#eef2ff; }

.adj-hours { font-weight:700; color:#374151; }
.adj-hours.modified { color:#15803d; }
.ts-note { color:#9ca3af !important; font-style:italic; }
.hr-note { color:#6b7280; }
.no-leave { color:#d1d5db; }

.leave-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:20px;
  font-size:11.5px; font-weight:600; }
.leave-badge mat-icon { font-size:13px; width:13px; height:13px; }
.leave-badge.paid:not(.half) { background:#fecdd3; color:#be123c; }
.leave-badge.half.paid       { background:#fde68a; color:#92400e; }
.leave-badge:not(.paid)      { background:#e0e7ff; color:#3730a3; }
.leave-type { font-size:10.5px; opacity:.8; margin-left:2px; }

/* Edit cell */
.edit-cell { display:flex; align-items:center; gap:4px; justify-content:flex-end; }
.hours-input { width:60px; border:1.5px solid #6366f1; border-radius:6px; padding:3px 6px;
  font-family:inherit; font-size:13px; text-align:center; outline:none; }
.note-input { width:130px; border:1.5px solid #6366f1; border-radius:6px; padding:3px 6px;
  font-family:inherit; font-size:12px; outline:none; }
.h-label { font-size:12px; color:#6b7280; font-weight:600; }

.btn-icon { width:28px; height:28px; border-radius:6px; border:none; cursor:pointer;
  display:flex; align-items:center; justify-content:center; }
.btn-icon mat-icon { font-size:16px; width:16px; height:16px; }
.btn-save   { background:#dcfce7; color:#15803d; }
.btn-cancel { background:#fee2e2; color:#dc2626; }
.btn-edit   { background:#eef2ff; color:#6366f1; }
.btn-edit:disabled { opacity:.4; cursor:not-allowed; }
.action-btns { display:flex; gap:4px; justify-content:center; }

.total-row { background:#f9fafb; border-top:2px solid #e5e7eb; }
.total-label { font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.4px; color:#374151; }
.leave-summary { font-size:12px; font-weight:600; color:#d97706; }
  `]
})
export class InternalStatementComponent implements OnInit {
  private svc = inject(InternalStatementService);
  private snack = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  selectedMonth = new Date().toISOString().slice(0, 7);

  readonly loading = signal(false);
  readonly generating = signal(false);
  readonly calendarLoading = signal(false);
  readonly overview = signal<InternalOverviewItem[]>([]);
  readonly detailView = signal(false);
  readonly calendarData = signal<InternalEmployeeCalendar | null>(null);
  readonly monthClosed = signal(false);

  // edit state
  editingDate: string | null = null;
  editHours = 0;
  editNote = '';
  private currentEmployeeId: number | null = null;

  readonly confirmedCount = computed(() => this.overview().filter(e => e.status === 'CONFIRMED' || e.status === 'CLOSED').length);
  readonly draftCount = computed(() => this.overview().filter(e => e.status !== 'CONFIRMED' && e.status !== 'CLOSED').length);
  readonly hasUncConfirmed = computed(() => this.overview().some(e => e.status !== 'CONFIRMED' && e.status !== 'CLOSED'));

  ngOnInit() { this.loadOverview(); }

  onMonthPickerChanged(val: string) { this.selectedMonth = val; this.onMonthChange(); }

  onMonthChange() {
    this.detailView.set(false);
    this.calendarData.set(null);
    this.loadOverview();
  }

  loadOverview() {
    this.loading.set(true);
    this.svc.getOverview(this.selectedMonth).subscribe({
      next: data => {
        this.overview.set(data);
        // Check if any employee status is CLOSED to determine monthClosed
        const isClosed = data.some(e => e.status === 'CLOSED');
        this.monthClosed.set(isClosed);
        this.loading.set(false);
      },
      error: () => { this.overview.set([]); this.monthClosed.set(false); this.loading.set(false); }
    });
  }

  generate() {
    this.generating.set(true);
    this.svc.generate(this.selectedMonth).subscribe({
      next: () => {
        this.generating.set(false);
        this.snack.open('Đã tổng hợp biên bản nội bộ', 'OK', { duration: 2000 });
        this.loadOverview();
      },
      error: () => { this.generating.set(false); this.snack.open('Lỗi khi tổng hợp', 'X', { duration: 3000 }); }
    });
  }

  exportExcel() {
    this.svc.exportExcel(this.selectedMonth).subscribe(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `BienBanNoiBo_${this.selectedMonth}.xlsx`; a.click();
      URL.revokeObjectURL(url);
    });
  }

  confirmAll() {
    this.svc.confirmAll(this.selectedMonth).subscribe({
      next: () => { this.snack.open('Đã xác nhận tất cả', 'OK', { duration: 2000 }); this.loadOverview(); },
      error: () => this.snack.open('Lỗi khi xác nhận', 'X', { duration: 3000 })
    });
  }

  openDetail(emp: InternalOverviewItem) {
    this.currentEmployeeId = emp.employeeId;
    this.editingDate = null;
    this.detailView.set(true);
    this.loadEmployeeCalendar(emp.employeeId);
  }

  closeDetail() {
    this.detailView.set(false);
    this.calendarData.set(null);
    this.currentEmployeeId = null;
    this.editingDate = null;
    this.loadOverview();
  }

  loadEmployeeCalendar(employeeId: number) {
    this.calendarLoading.set(true);
    this.svc.getEmployeeCalendar(this.selectedMonth, employeeId).subscribe({
      next: data => { this.calendarData.set(data); this.calendarLoading.set(false); },
      error: () => { this.calendarLoading.set(false); this.snack.open('Lỗi tải dữ liệu', 'X', { duration: 3000 }); }
    });
  }

  refreshEmployee() {
    if (!this.currentEmployeeId) return;
    this.svc.generateForEmployee(this.currentEmployeeId, this.selectedMonth).subscribe({
      next: () => { this.loadEmployeeCalendar(this.currentEmployeeId!); },
      error: () => this.snack.open('Lỗi khi làm mới', 'X', { duration: 3000 })
    });
  }

  confirmCurrentEmployee() {
    if (!this.currentEmployeeId) return;
    this.svc.confirmEmployee(this.selectedMonth, this.currentEmployeeId).subscribe({
      next: () => {
        this.snack.open('Đã xác nhận biên bản', 'OK', { duration: 2000 });
        this.loadEmployeeCalendar(this.currentEmployeeId!);
      },
      error: () => this.snack.open('Lỗi khi xác nhận', 'X', { duration: 3000 })
    });
  }

  unconfirmCurrentEmployee() {
    if (!this.currentEmployeeId) return;
    this.svc.unconfirmEmployee(this.selectedMonth, this.currentEmployeeId).subscribe({
      next: () => {
        this.snack.open('Đã hủy xác nhận', 'OK', { duration: 2000 });
        this.loadEmployeeCalendar(this.currentEmployeeId!);
      },
      error: () => this.snack.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  startEdit(day: InternalCalendarDay) {
    this.editingDate = day.workDate;
    this.editHours = day.adjustedHours;
    this.editNote = day.hrNote ?? '';
  }

  cancelEdit() { this.editingDate = null; }

  saveDay(day: InternalCalendarDay) {
    if (!this.currentEmployeeId || this.editingDate === null) return;
    this.svc.updateDay(this.selectedMonth, this.currentEmployeeId, this.editingDate,
      this.editHours, this.editNote).subscribe({
      next: updated => {
        // Cập nhật local calendar
        const cal = this.calendarData();
        if (cal) {
          const days = cal.days.map(d => d.workDate === updated.workDate ? updated : d);
          const totalRaw = days.reduce((s, d) => s + d.rawHours, 0);
          const totalAdj = days.reduce((s, d) => s + d.adjustedHours, 0);
          // Bug 6: Cập nhật cả leave count
          const totalLeaveDays = days.filter(d => d.leaveDay).length;
          const totalHalfLeaveDays = days.filter(d => d.halfLeave).length;
          this.calendarData.set({ ...cal, days, totalRawHours: totalRaw, totalAdjustedHours: totalAdj,
            totalAdjustedDays: totalAdj / 8, totalLeaveDays, totalHalfLeaveDays });
        }
        this.editingDate = null;
        this.snack.open('Đã lưu', 'OK', { duration: 1500 });
      },
      error: () => this.snack.open('Lỗi khi lưu', 'X', { duration: 3000 })
    });
  }

  rowClass(day: InternalCalendarDay): string {
    if (day.leaveDay) return 'leave-full';
    if (day.halfLeave) return 'leave-half';
    if (day.weekend) return 'weekend';
    return '';
  }

  formatDate(dateStr: string): string {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { day:'2-digit', month:'2-digit' });
  }

  dowLabel(dow: string): string {
    const map: Record<string, string> = {
      MON:'T2', TUE:'T3', WED:'T4', THU:'T5', FRI:'T6', SAT:'T7', SUN:'CN'
    };
    return map[dow] ?? dow;
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return parts.length === 1 ? parts[0][0].toUpperCase()
      : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = ['linear-gradient(135deg,#1565c0,#3b82f6)', 'linear-gradient(135deg,#7c3aed,#a78bfa)',
      'linear-gradient(135deg,#15803d,#22c55e)', 'linear-gradient(135deg,#c2410c,#fb923c)',
      'linear-gradient(135deg,#0f766e,#2dd4bf)', 'linear-gradient(135deg,#be185d,#f472b6)'];
    let h = 0;
    for (const c of (name || '')) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[h % colors.length];
  }

  closeMonth() {
    const reason = prompt('Nhập lý do đóng biên bản tháng (tùy chọn):');
    if (reason === null) return;
    if (!confirm(`Đóng biên bản nội bộ tháng ${this.selectedMonth}?\n\nTimesheet sẽ bị khóa hoàn toàn.`)) return;
    this.svc.closeMonth(this.selectedMonth, reason || undefined).subscribe({
      next: () => {
        this.monthClosed.set(true);
        this.snack.open('Đã đóng — timesheet đã khóa', 'OK', { duration: 3000 });
        this.loadOverview();
      },
      error: (err) => this.snack.open(err?.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }

  reopenMonth() {
    const reason = prompt('Nhập lý do mở lại (bắt buộc):');
    if (!reason) { this.snack.open('Phải nhập lý do', 'X', { duration: 3000 }); return; }
    if (!confirm(`Mở lại biên bản nội bộ tháng ${this.selectedMonth}?`)) return;
    this.svc.reopenMonth(this.selectedMonth, reason).subscribe({
      next: () => {
        this.monthClosed.set(false);
        this.snack.open('Đã mở lại', 'OK', { duration: 3000 });
        this.loadOverview();
      },
      error: (err) => this.snack.open(err?.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }
}
