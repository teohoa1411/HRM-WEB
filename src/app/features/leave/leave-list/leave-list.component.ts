import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveRequest, LeaveType, CreateLeaveTypeRequest } from '../../../core/models/leave.models';

@Component({
  selector: 'app-leave-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatTableModule, MatButtonModule, MatIconModule,
    MatSelectModule, MatFormFieldModule, MatInputModule,
    MatSnackBarModule, MatRippleModule, MatTooltipModule
  ],
  template: `
    <div class="ll-page">

      <!-- ═══════════════════════════════════
           PAGE HEADER
      ═══════════════════════════════════ -->
      <div class="ll-header">
        <div class="ll-header-left">
          <div class="ll-title-row">
            <div class="ll-icon-wrap"><mat-icon>event_note</mat-icon></div>
            <div>
              <h1 class="ll-title">Quản lý Nghỉ Phép</h1>
              <p class="ll-sub">Duyệt đơn xin nghỉ và cấu hình loại nghỉ phép</p>
            </div>
          </div>
        </div>
        <div class="ll-header-actions">
          <button class="btn-refresh" (click)="loadRequests()" matRipple matTooltip="Làm mới">
            <mat-icon>refresh</mat-icon>
          </button>
          <button class="btn-primary" (click)="toggleCreateForm()" matRipple>
            <mat-icon>add</mat-icon>
            Tạo đơn nghỉ
          </button>
        </div>
      </div>

      <!-- ═══════════════════════════════════
           STATS ROW
      ═══════════════════════════════════ -->
      <div class="stats-row">
        <div class="stat-card stat-total" (click)="setFilter('')" [class.active]="filterStatus() === ''">
          <div class="stat-icon"><mat-icon>list_alt</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ requests().length }}</div>
            <div class="stat-label">Tổng đơn</div>
          </div>
        </div>
        <div class="stat-card stat-pending" (click)="setFilter('PENDING')" [class.active]="filterStatus() === 'PENDING'">
          <div class="stat-icon"><mat-icon>hourglass_top</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countByStatus('PENDING') }}</div>
            <div class="stat-label">Chờ duyệt</div>
          </div>
        </div>
        <div class="stat-card stat-approved" (click)="setFilter('APPROVED')" [class.active]="filterStatus() === 'APPROVED'">
          <div class="stat-icon"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countByStatus('APPROVED') }}</div>
            <div class="stat-label">Đã duyệt</div>
          </div>
        </div>
        <div class="stat-card stat-rejected" (click)="setFilter('REJECTED')" [class.active]="filterStatus() === 'REJECTED'">
          <div class="stat-icon"><mat-icon>cancel</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countByStatus('REJECTED') }}</div>
            <div class="stat-label">Từ chối</div>
          </div>
        </div>
      </div>

      <!-- ═══════════════════════════════════
           CREATE FORM (slide-down)
      ═══════════════════════════════════ -->
      @if (showCreateForm()) {
        <div class="create-panel">
          <div class="create-panel-header">
            <div class="create-panel-title">
              <mat-icon>edit_note</mat-icon>
              Tạo đơn xin nghỉ phép
            </div>
            <button class="panel-close" (click)="showCreateForm.set(false)">
              <mat-icon>close</mat-icon>
            </button>
          </div>
          <div class="create-panel-body">
            <div class="form-grid">
              <div class="form-field">
                <label class="field-label">Mã nhân viên <span class="req-star">*</span></label>
                <input class="field-input" type="number" [(ngModel)]="newReq.employeeId" placeholder="VD: 1">
              </div>
              <div class="form-field">
                <label class="field-label">Loại nghỉ phép <span class="req-star">*</span></label>
                <select class="field-select" [(ngModel)]="newReq.leaveTypeId">
                  <option [ngValue]="null" disabled>-- Chọn loại --</option>
                  @for (t of leaveTypes(); track t.id) {
                    <option [ngValue]="t.id">{{ t.name }}</option>
                  }
                </select>
              </div>
              <div class="form-field">
                <label class="field-label">Từ ngày <span class="req-star">*</span></label>
                <input class="field-input" type="date" [(ngModel)]="newReq.startDate">
              </div>
              <div class="form-field">
                <label class="field-label">Đến ngày <span class="req-star">*</span></label>
                <input class="field-input" type="date" [(ngModel)]="newReq.endDate">
              </div>
              <div class="form-field">
                <label class="field-label">Thời lượng</label>
                <select class="field-select" [(ngModel)]="newReq.halfDay">
                  <option [ngValue]="false">Cả ngày</option>
                  <option [ngValue]="true">Nửa ngày</option>
                </select>
              </div>
              @if (newReq.halfDay) {
                <div class="form-field">
                  <label class="field-label">Buổi</label>
                  <select class="field-select" [(ngModel)]="newReq.halfDayPeriod">
                    <option value="MORNING">Buổi sáng</option>
                    <option value="AFTERNOON">Buổi chiều</option>
                  </select>
                </div>
              }
              <div class="form-field form-field-full">
                <label class="field-label">Lý do</label>
                <input class="field-input" [(ngModel)]="newReq.reason" placeholder="Nhập lý do nghỉ phép...">
              </div>
            </div>
            <div class="create-panel-footer">
              <button class="btn-cancel" (click)="showCreateForm.set(false)" matRipple>Hủy</button>
              <button class="btn-submit" (click)="submitRequest()"
                [disabled]="!newReq.employeeId || !newReq.leaveTypeId || !newReq.startDate || !newReq.endDate || submitting()"
                matRipple>
                <mat-icon>send</mat-icon>
                {{ submitting() ? 'Đang gửi...' : 'Gửi đơn' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════
           TAB GROUP (custom pill)
      ═══════════════════════════════════ -->
      <div class="ll-tabs">
        <button class="ll-tab" [class.ll-tab-active]="activeTab() === 'requests'"
          (click)="activeTab.set('requests')" matRipple>
          <mat-icon>inbox</mat-icon>
          Đơn Xin Nghỉ
          @if (countByStatus('PENDING') > 0) {
            <span class="tab-badge">{{ countByStatus('PENDING') }}</span>
          }
        </button>
        <button class="ll-tab" [class.ll-tab-active]="activeTab() === 'types'"
          (click)="activeTab.set('types')" matRipple>
          <mat-icon>category</mat-icon>
          Loại Nghỉ Phép
          <span class="tab-count">{{ leaveTypes().length }}</span>
        </button>
      </div>

      <!-- ═══════════════════════════════════
           TAB: ĐƠN XIN NGHỈ
      ═══════════════════════════════════ -->
      @if (activeTab() === 'requests') {
        <div class="tab-content">
          <!-- Filter pill bar -->
          <div class="filter-bar">
            <div class="filter-pills">
              @for (f of statusFilters; track f.value) {
                <button class="filter-pill"
                  [class.fp-active]="filterStatus() === f.value"
                  [class]="filterStatus() === f.value ? 'filter-pill fp-active fp-' + f.value.toLowerCase() : 'filter-pill'"
                  (click)="setFilter(f.value)" matRipple>
                  <mat-icon>{{ f.icon }}</mat-icon>
                  {{ f.label }}
                </button>
              }
            </div>
          </div>

          <!-- Table card -->
          <div class="table-card">
            @if (filteredRequests().length === 0) {
              <div class="empty-state">
                <div class="empty-icon"><mat-icon>event_busy</mat-icon></div>
                <div class="empty-title">Không có đơn xin nghỉ</div>
                <div class="empty-sub">
                  @if (filterStatus()) { Không có đơn nào với trạng thái đã chọn. }
                  @else { Chưa có đơn xin nghỉ nào trong hệ thống. }
                </div>
              </div>
            } @else {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nhân viên</th>
                      <th>Loại nghỉ</th>
                      <th>Thời gian</th>
                      <th>Lý do</th>
                      <th>Trạng thái</th>
                      <th class="col-actions">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (r of filteredRequests(); track r.id) {
                      <tr class="data-row">
                        <td>
                          <div class="emp-cell">
                            <div class="emp-avatar">{{ getInitial(r.employeeName) }}</div>
                            <div>
                              <div class="emp-name">{{ r.employeeName || 'Nhân viên #' + r.employeeId }}</div>
                              <div class="emp-id">ID: {{ r.employeeId }}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span class="type-tag">
                            <mat-icon>{{ typeIcon(r.leaveTypeName || '') }}</mat-icon>
                            {{ r.leaveTypeName || '—' }}
                          </span>
                        </td>
                        <td>
                          <div class="date-cell">
                            <div class="date-range">
                              {{ formatDate(r.startDate) }}
                              @if (r.startDate !== r.endDate) { <span class="date-sep">→</span> {{ formatDate(r.endDate) }}  }
                            </div>
                            <div class="date-meta">
                              <span class="days-chip">{{ r.totalDays }} ngày</span>
                              @if (r.halfDay && r.halfDayPeriod) {
                                <span class="half-chip">{{ r.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều' }}</span>
                              }
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="reason-cell">{{ r.reason || '—' }}</div>
                          @if (r.rejectReason) {
                            <div class="reject-reason-cell">
                              <mat-icon>info_outline</mat-icon>
                              {{ r.rejectReason }}
                            </div>
                          }
                        </td>
                        <td>
                          <span class="status-chip sc-{{ r.status.toLowerCase() }}">
                            <mat-icon>{{ statusIcon(r.status) }}</mat-icon>
                            {{ statusLabel(r.status) }}
                          </span>
                        </td>
                        <td class="col-actions">
                          <div class="action-btns">
                            @if (r.status === 'PENDING') {
                              <button class="act-btn act-approve" (click)="approve(r)" matRipple matTooltip="Duyệt đơn">
                                <mat-icon>check</mat-icon>
                              </button>
                              <button class="act-btn act-reject" (click)="reject(r)" matRipple matTooltip="Từ chối">
                                <mat-icon>close</mat-icon>
                              </button>
                            }
                            @if (r.status === 'APPROVED' || r.status === 'PENDING') {
                              <button class="act-btn act-cancel" (click)="cancel(r)" matRipple matTooltip="Hủy đơn">
                                <mat-icon>block</mat-icon>
                              </button>
                            }
                          </div>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="table-footer">
                <span>Hiển thị {{ filteredRequests().length }} / {{ requests().length }} đơn</span>
              </div>
            }
          </div>
        </div>
      }

      <!-- ═══════════════════════════════════
           TAB: LOẠI NGHỈ PHÉP
      ═══════════════════════════════════ -->
      @if (activeTab() === 'types') {
        <div class="tab-content">

          <!-- Add type form -->
          <div class="type-form-card">
            <div class="type-form-title">
              <mat-icon>add_circle_outline</mat-icon>
              Thêm loại nghỉ phép mới
            </div>
            <div class="type-form-grid">
              <div class="form-field">
                <label class="field-label">Mã loại <span class="req-star">*</span></label>
                <input class="field-input" [(ngModel)]="newType.code"
                  placeholder="VD: ANNUAL" style="text-transform:uppercase;">
              </div>
              <div class="form-field">
                <label class="field-label">Tên loại <span class="req-star">*</span></label>
                <input class="field-input" [(ngModel)]="newType.name" placeholder="VD: Nghỉ phép năm">
              </div>
              <div class="form-field">
                <label class="field-label">Số ngày / năm</label>
                <input class="field-input" type="number" [(ngModel)]="newType.maxDays" min="1">
              </div>
              <div class="form-field">
                <label class="field-label">Chế độ lương</label>
                <select class="field-select" [(ngModel)]="newType.paid">
                  <option [ngValue]="true">Có lương</option>
                  <option [ngValue]="false">Không lương</option>
                </select>
              </div>
              <div class="form-field">
                <label class="field-label">Tự động cấp khi tạo NV</label>
                <select class="field-select" [(ngModel)]="newType.autoGrantOnCreate">
                  <option [ngValue]="true">Có — cấp theo tỷ lệ tháng</option>
                  <option [ngValue]="false">Không</option>
                </select>
              </div>
              @if (newType.autoGrantOnCreate && newType.maxDays) {
                <div class="form-field">
                  <label class="field-label">Cách làm tròn</label>
                  <select class="field-select" [(ngModel)]="newType.grantRounding">
                    <option value="HALF_UP">Làm tròn 0.5 (mặc định)</option>
                    <option value="FLOOR">Làm tròn xuống</option>
                    <option value="CEIL">Làm tròn lên</option>
                  </select>
                </div>
              }
              <div class="form-field type-form-submit">
                <button class="btn-submit" (click)="createType()"
                  [disabled]="!newType.code || !newType.name" matRipple>
                  <mat-icon>add</mat-icon>
                  Thêm loại
                </button>
              </div>
            </div>
          </div>

          <!-- Leave type cards grid -->
          @if (leaveTypes().length === 0) {
            <div class="empty-state" style="margin-top:12px;">
              <div class="empty-icon"><mat-icon>category</mat-icon></div>
              <div class="empty-title">Chưa có loại nghỉ phép</div>
              <div class="empty-sub">Thêm loại nghỉ phép đầu tiên ở trên</div>
            </div>
          } @else {
            <div class="type-cards-grid">
              @for (t of leaveTypes(); track t.id) {
                <div class="type-card">
                  <div class="type-card-top">
                    <div class="type-card-icon tc-{{ t.code.toLowerCase() }}">
                      <mat-icon>{{ typeIcon(t.code) }}</mat-icon>
                    </div>
                    <div class="type-card-badge" [class.badge-paid]="t.paid" [class.badge-unpaid]="!t.paid">
                      {{ t.paid ? 'Có lương' : 'Không lương' }}
                    </div>
                  </div>
                  <div class="type-card-code">{{ t.code }}</div>
                  <div class="type-card-name">{{ t.name }}</div>
                  <div class="type-card-days">
                    <mat-icon>calendar_today</mat-icon>
                    {{ t.maxDays }} ngày / năm
                  </div>
                  <div class="type-card-status" [class.ts-active]="t.active" [class.ts-inactive]="!t.active">
                    <mat-icon>{{ t.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                    {{ t.active ? 'Đang áp dụng' : 'Không hoạt động' }}
                  </div>
                </div>
              }
            </div>
          }
        </div>
      }

    </div>
  `,
  styles: [`
    /* ══ PAGE ══════════════════════════════════════════════ */
    .ll-page {
      padding: 28px 32px;
      min-height: 100vh;
      background: #F6F8FC;
    }

    /* ══ HEADER ════════════════════════════════════════════ */
    .ll-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
      flex-wrap: wrap;
      gap: 16px;
    }
    .ll-header-left { display: flex; align-items: center; }
    .ll-title-row { display: flex; align-items: center; gap: 14px; }
    .ll-icon-wrap {
      width: 46px; height: 46px;
      background: linear-gradient(135deg, #6366F1, #8B5CF6);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4px 12px rgba(99,102,241,0.3);
      flex-shrink: 0;
      mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    }
    .ll-title { font-size: 20px; font-weight: 700; color: #111827; margin: 0; line-height: 1.3; }
    .ll-sub   { font-size: 13px; color: #6B7280; margin: 2px 0 0; }

    .ll-header-actions { display: flex; align-items: center; gap: 10px; }
    .btn-refresh {
      width: 38px; height: 38px;
      background: #fff;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: #6B7280;
      transition: all 0.15s;
      &:hover { border-color: #6366F1; color: #6366F1; background: #EEF2FF; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .btn-primary {
      display: flex; align-items: center; gap: 6px;
      background: linear-gradient(135deg, #6366F1, #7C3AED);
      color: #fff;
      border: none;
      padding: 0 18px;
      height: 38px;
      border-radius: 9px;
      font-size: 13.5px; font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(99,102,241,0.35);
      transition: all 0.15s;
      &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(99,102,241,0.4); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ══ STATS ROW ═════════════════════════════════════════ */
    .stats-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: #fff;
      border-radius: 14px;
      padding: 18px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 2px solid transparent;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      &:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
      &.active { border-color: currentColor; }
    }
    .stat-icon {
      width: 44px; height: 44px;
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 22px; width: 22px; height: 22px; }
    }
    .stat-num   { font-size: 26px; font-weight: 800; line-height: 1; }
    .stat-label { font-size: 12px; color: #6B7280; margin-top: 3px; font-weight: 500; }

    .stat-total   .stat-icon { background: #EEF2FF; color: #6366F1; }
    .stat-total   .stat-num  { color: #6366F1; }
    .stat-total.active       { border-color: #6366F1; background: #EEF2FF; }

    .stat-pending  .stat-icon { background: #FFFBEB; color: #D97706; }
    .stat-pending  .stat-num  { color: #D97706; }
    .stat-pending.active      { border-color: #D97706; background: #FFFBEB; }

    .stat-approved .stat-icon { background: #F0FDF4; color: #16A34A; }
    .stat-approved .stat-num  { color: #16A34A; }
    .stat-approved.active     { border-color: #16A34A; background: #F0FDF4; }

    .stat-rejected .stat-icon { background: #FFF1F2; color: #E11D48; }
    .stat-rejected .stat-num  { color: #E11D48; }
    .stat-rejected.active     { border-color: #E11D48; background: #FFF1F2; }

    /* ══ CREATE PANEL ══════════════════════════════════════ */
    .create-panel {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(99,102,241,0.1);
      overflow: hidden;
      animation: slideDown 0.2s ease;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .create-panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #F3F4F6;
      background: linear-gradient(135deg, #F5F3FF, #EEF2FF);
    }
    .create-panel-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #4F46E5;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .panel-close {
      width: 28px; height: 28px; border: none; background: transparent;
      border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #9CA3AF;
      &:hover { background: #E5E7EB; color: #374151; }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .create-panel-body { padding: 20px; }
    .form-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
    .form-field-full { grid-column: 1 / -1; }
    .create-panel-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding-top: 16px; margin-top: 4px;
      border-top: 1px solid #F3F4F6;
    }

    /* ── Field Inputs (native, no mat-form-field) ── */
    .field-label {
      display: block;
      font-size: 12px; font-weight: 600; color: #374151;
      margin-bottom: 6px;
    }
    .req-star { color: #EF4444; margin-left: 2px; }
    .field-input, .field-select {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border: 1.5px solid #E5E7EB;
      border-radius: 8px;
      font-size: 13.5px;
      color: #111827;
      background: #F9FAFB;
      box-sizing: border-box;
      transition: border-color 0.15s, background 0.15s;
      font-family: inherit;
      &:focus {
        outline: none;
        border-color: #6366F1;
        background: #fff;
        box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      }
    }
    .field-select { cursor: pointer; }
    .btn-cancel {
      height: 36px; padding: 0 16px;
      border: 1.5px solid #E5E7EB; border-radius: 8px;
      background: #fff; color: #6B7280; font-size: 13px; font-weight: 600;
      cursor: pointer;
      &:hover { border-color: #9CA3AF; color: #374151; }
    }
    .btn-submit {
      display: flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 18px;
      background: linear-gradient(135deg, #6366F1, #7C3AED);
      color: #fff; border: none; border-radius: 8px;
      font-size: 13px; font-weight: 600; cursor: pointer;
      transition: all 0.15s;
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:not(:disabled):hover { transform: translateY(-1px); box-shadow: 0 3px 10px rgba(99,102,241,0.35); }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }

    /* ══ CUSTOM TABS ════════════════════════════════════════ */
    .ll-tabs {
      display: flex;
      gap: 4px;
      background: #fff;
      border-radius: 12px;
      padding: 5px;
      border: 1px solid #E5E7EB;
      margin-bottom: 20px;
      width: fit-content;
      box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .ll-tab {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 18px;
      border: none; background: transparent;
      border-radius: 8px; cursor: pointer;
      font-size: 13.5px; font-weight: 500; color: #6B7280;
      transition: all 0.15s;
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover { background: #F3F4F6; color: #374151; }
    }
    .ll-tab-active {
      background: linear-gradient(135deg, #6366F1, #7C3AED) !important;
      color: #fff !important;
      font-weight: 600 !important;
      box-shadow: 0 2px 8px rgba(99,102,241,0.3);
    }
    .tab-badge {
      background: #EF4444; color: #fff;
      font-size: 10px; font-weight: 700;
      min-width: 18px; height: 18px;
      border-radius: 9px; padding: 0 5px;
      display: flex; align-items: center; justify-content: center;
    }
    .tab-count {
      background: rgba(255,255,255,0.25);
      font-size: 11px; font-weight: 600;
      padding: 1px 7px; border-radius: 10px;
      color: inherit;
    }
    .ll-tab:not(.ll-tab-active) .tab-count {
      background: #F3F4F6; color: #9CA3AF;
    }

    /* ══ FILTER BAR ════════════════════════════════════════ */
    .filter-bar {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px;
      margin-bottom: 16px;
    }
    .filter-pills { display: flex; gap: 8px; flex-wrap: wrap; }
    .filter-pill {
      display: flex; align-items: center; gap: 5px;
      padding: 6px 14px;
      border: 1.5px solid #E5E7EB;
      border-radius: 20px;
      background: #fff; color: #6B7280;
      font-size: 12.5px; font-weight: 500;
      cursor: pointer; transition: all 0.15s;
      mat-icon { font-size: 15px; width: 15px; height: 15px; }
      &:hover { border-color: #6366F1; color: #6366F1; }
    }
    .fp-active {
      font-weight: 700;
    }
    .fp-active.fp- { border-color: #6366F1; color: #6366F1; background: #EEF2FF; }
    .fp-active.fp-pending   { border-color: #D97706; color: #D97706; background: #FFFBEB; }
    .fp-active.fp-approved  { border-color: #16A34A; color: #16A34A; background: #F0FDF4; }
    .fp-active.fp-rejected  { border-color: #E11D48; color: #E11D48; background: #FFF1F2; }
    .fp-active.fp-cancelled { border-color: #6B7280; color: #6B7280; background: #F3F4F6; }

    /* ══ TABLE CARD ════════════════════════════════════════ */
    .table-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      overflow: hidden;
    }
    .table-wrap { overflow-x: auto; }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead tr {
      background: #F9FAFB;
      border-bottom: 1px solid #E5E7EB;
    }
    th {
      padding: 12px 16px;
      font-size: 11px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.7px;
      color: #6B7280; white-space: nowrap;
      text-align: left;
    }
    .data-row {
      border-bottom: 1px solid #F3F4F6;
      transition: background 0.1s;
      &:last-child { border-bottom: none; }
      &:hover { background: #F8F8FF; }
    }
    td {
      padding: 14px 16px;
      font-size: 13.5px; color: #374151;
      vertical-align: middle;
    }

    /* Employee cell */
    .emp-cell { display: flex; align-items: center; gap: 10px; }
    .emp-avatar {
      width: 36px; height: 36px; border-radius: 50%;
      background: linear-gradient(135deg, #6366F1, #7C3AED);
      color: #fff; font-size: 13px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .emp-name { font-weight: 600; color: #111827; font-size: 13.5px; }
    .emp-id   { font-size: 11px; color: #9CA3AF; margin-top: 1px; }

    /* Leave type tag */
    .type-tag {
      display: inline-flex; align-items: center; gap: 5px;
      background: #EEF2FF; color: #4F46E5;
      padding: 4px 10px; border-radius: 6px;
      font-size: 12px; font-weight: 600;
      white-space: nowrap;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    /* Date cell */
    .date-range { font-size: 13px; color: #374151; font-weight: 500; }
    .date-sep   { color: #9CA3AF; margin: 0 4px; }
    .date-meta  { display: flex; gap: 6px; margin-top: 4px; }
    .days-chip {
      background: #F3F4F6; color: #374151;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .half-chip {
      background: #FEF9C3; color: #854D0E;
      padding: 2px 8px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }

    /* Reason cell */
    .reason-cell {
      max-width: 180px;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      font-size: 13px; color: #6B7280;
    }
    .reject-reason-cell {
      display: flex; align-items: center; gap: 4px;
      font-size: 11.5px; color: #EF4444; margin-top: 4px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }

    /* Status chip */
    .status-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px; border-radius: 20px;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .sc-pending   { background: #FFFBEB; color: #D97706; }
    .sc-approved  { background: #F0FDF4; color: #16A34A; }
    .sc-rejected  { background: #FFF1F2; color: #E11D48; }
    .sc-cancelled { background: #F3F4F6; color: #6B7280; }

    /* Action buttons */
    .col-actions { width: 120px; }
    .action-btns { display: flex; gap: 6px; }
    .act-btn {
      width: 32px; height: 32px;
      border: none; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .act-approve { background: #F0FDF4; color: #16A34A;
      &:hover { background: #16A34A; color: #fff; } }
    .act-reject  { background: #FFF1F2; color: #E11D48;
      &:hover { background: #E11D48; color: #fff; } }
    .act-cancel  { background: #F3F4F6; color: #6B7280;
      &:hover { background: #6B7280; color: #fff; } }

    /* Table footer */
    .table-footer {
      padding: 12px 20px;
      border-top: 1px solid #F3F4F6;
      font-size: 12px; color: #9CA3AF;
      background: #FAFAFA;
    }

    /* ══ EMPTY STATE ═══════════════════════════════════════ */
    .empty-state {
      padding: 60px 24px;
      text-align: center;
    }
    .empty-icon {
      width: 60px; height: 60px;
      background: #F3F4F6; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      mat-icon { font-size: 28px; width: 28px; height: 28px; color: #9CA3AF; }
    }
    .empty-title { font-size: 15px; font-weight: 600; color: #374151; }
    .empty-sub   { font-size: 13px; color: #9CA3AF; margin-top: 6px; }

    /* ══ LEAVE TYPE FORM ═══════════════════════════════════ */
    .type-form-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      padding: 20px;
      margin-bottom: 24px;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
    }
    .type-form-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 14px; font-weight: 700; color: #111827;
      margin-bottom: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6366F1; }
    }
    .type-form-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr) auto;
      gap: 14px;
      align-items: end;
    }
    .type-form-submit { display: flex; align-items: flex-end; }

    /* ══ TYPE CARDS GRID ═══════════════════════════════════ */
    .type-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .type-card {
      background: #fff;
      border-radius: 14px;
      border: 1px solid #E5E7EB;
      padding: 20px;
      transition: all 0.15s;
      box-shadow: 0 1px 4px rgba(0,0,0,0.06);
      &:hover {
        transform: translateY(-3px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.1);
        border-color: #C7D2FE;
      }
    }
    .type-card-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .type-card-icon {
      width: 42px; height: 42px; border-radius: 11px;
      background: #EEF2FF;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #6366F1; }
    }
    .type-card-badge {
      font-size: 10px; font-weight: 700;
      padding: 3px 8px; border-radius: 10px;
    }
    .badge-paid   { background: #F0FDF4; color: #16A34A; }
    .badge-unpaid { background: #FFF1F2; color: #E11D48; }
    .type-card-code {
      font-size: 10px; font-weight: 700; letter-spacing: 1px;
      color: #9CA3AF; text-transform: uppercase; margin-bottom: 3px;
    }
    .type-card-name {
      font-size: 15px; font-weight: 700; color: #111827; margin-bottom: 10px;
    }
    .type-card-days {
      display: flex; align-items: center; gap: 5px;
      font-size: 12.5px; color: #6B7280; margin-bottom: 10px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .type-card-status {
      display: inline-flex; align-items: center; gap: 4px;
      font-size: 11.5px; font-weight: 600;
      padding: 3px 8px; border-radius: 6px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .ts-active   { background: #F0FDF4; color: #16A34A; }
    .ts-inactive { background: #F3F4F6; color: #9CA3AF; }

    /* ══ RESPONSIVE ════════════════════════════════════════ */
    @media (max-width: 1024px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .form-grid { grid-template-columns: repeat(2, 1fr); }
      .type-form-grid { grid-template-columns: repeat(2, 1fr); }
      .type-form-submit { grid-column: 1 / -1; justify-content: flex-end; }
    }
    @media (max-width: 768px) {
      .ll-page { padding: 16px; }
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .form-grid { grid-template-columns: 1fr; }
      .type-form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class LeaveListComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private snackBar = inject(MatSnackBar);

  readonly requests    = signal<LeaveRequest[]>([]);
  readonly leaveTypes  = signal<LeaveType[]>([]);
  readonly submitting  = signal(false);
  readonly activeTab   = signal<'requests' | 'types'>('requests');
  readonly showCreateForm = signal(false);

  readonly filterStatus = signal('');

  readonly statusFilters = [
    { value: '',          label: 'Tất cả',   icon: 'list' },
    { value: 'PENDING',   label: 'Chờ duyệt', icon: 'hourglass_top' },
    { value: 'APPROVED',  label: 'Đã duyệt',  icon: 'check_circle' },
    { value: 'REJECTED',  label: 'Từ chối',   icon: 'cancel' },
    { value: 'CANCELLED', label: 'Đã hủy',    icon: 'block' },
  ];

  readonly filteredRequests = computed(() =>
    this.filterStatus()
      ? this.requests().filter(r => r.status === this.filterStatus())
      : this.requests()
  );

  newType: CreateLeaveTypeRequest = { code: '', name: '', maxDays: 12, paid: true, autoGrantOnCreate: false, grantRounding: 'HALF_UP' };
  newReq = {
    employeeId: null as number | null,
    leaveTypeId: null as number | null,
    startDate: '',
    endDate: '',
    halfDay: false,
    halfDayPeriod: 'MORNING' as string,
    reason: ''
  };

  ngOnInit() {
    this.loadRequests();
    this.loadTypes();
  }

  loadRequests() {
    this.leaveService.getAllRequests(undefined, undefined).subscribe(page => {
      this.requests.set(page.content ?? []);
    });
  }

  loadTypes() {
    this.leaveService.getAllLeaveTypes().subscribe(list => this.leaveTypes.set(list));
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
  }

  toggleCreateForm() {
    this.showCreateForm.update(v => !v);
  }

  countByStatus(status: string): number {
    return this.requests().filter(r => r.status === status).length;
  }

  approve(r: LeaveRequest) {
    this.leaveService.approve(r.id).subscribe({
      next: () => {
        this.snackBar.open('Đã duyệt đơn nghỉ phép', 'OK', { duration: 2500 });
        this.loadRequests();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi khi duyệt', 'Đóng', { duration: 3000 })
    });
  }

  reject(r: LeaveRequest) {
    const reason = prompt('Lý do từ chối:') ?? '';
    this.leaveService.reject(r.id, reason).subscribe({
      next: () => {
        this.snackBar.open('Đã từ chối đơn', 'OK', { duration: 2500 });
        this.loadRequests();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 3000 })
    });
  }

  cancel(r: LeaveRequest) {
    if (!confirm('Xác nhận hủy đơn nghỉ phép này?')) return;
    this.leaveService.cancel(r.id).subscribe({
      next: () => {
        this.snackBar.open('Đã hủy đơn', 'OK', { duration: 2500 });
        this.loadRequests();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 3000 })
    });
  }

  submitRequest() {
    if (!this.newReq.employeeId || !this.newReq.leaveTypeId) return;
    this.submitting.set(true);
    this.leaveService.createRequest(this.newReq.employeeId, {
      leaveTypeId: this.newReq.leaveTypeId!,
      startDate: this.newReq.startDate,
      endDate: this.newReq.endDate,
      halfDay: this.newReq.halfDay,
      halfDayPeriod: this.newReq.halfDay ? (this.newReq.halfDayPeriod as any) : undefined,
      reason: this.newReq.reason || undefined
    }).subscribe({
      next: () => {
        this.snackBar.open('Đã gửi đơn nghỉ phép', 'OK', { duration: 2500 });
        this.submitting.set(false);
        this.showCreateForm.set(false);
        this.newReq = { employeeId: null, leaveTypeId: null, startDate: '', endDate: '', halfDay: false, halfDayPeriod: 'MORNING', reason: '' };
        this.loadRequests();
      },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Lỗi khi gửi đơn', 'Đóng', { duration: 3000 });
        this.submitting.set(false);
      }
    });
  }

  createType() {
    this.leaveService.createLeaveType(this.newType).subscribe({
      next: () => {
        this.snackBar.open('Đã thêm loại nghỉ phép', 'OK', { duration: 2500 });
        this.newType = { code: '', name: '', maxDays: 12, paid: true, autoGrantOnCreate: false, grantRounding: 'HALF_UP' };
        this.loadTypes();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 3000 })
    });
  }

  getInitial(name?: string): string {
    if (!name) return '?';
    return name.trim().split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
  }

  formatDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  statusLabel(s: string): string {
    return { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' }[s] ?? s;
  }

  statusIcon(s: string): string {
    return { PENDING: 'hourglass_top', APPROVED: 'check_circle', REJECTED: 'cancel', CANCELLED: 'block' }[s] ?? 'help';
  }

  typeIcon(codeOrName: string): string {
    const k = (codeOrName ?? '').toLowerCase();
    if (k.includes('annual') || k.includes('năm'))   return 'beach_access';
    if (k.includes('sick')   || k.includes('ốm'))    return 'local_hospital';
    if (k.includes('maternity') || k.includes('thai')) return 'child_friendly';
    if (k.includes('unpaid') || k.includes('không')) return 'money_off';
    if (k.includes('wedding')|| k.includes('cưới'))  return 'favorite';
    if (k.includes('funeral')|| k.includes('tang'))  return 'sentiment_very_dissatisfied';
    return 'event_note';
  }
}
