import { Component, inject, OnInit, signal, computed, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimesheetService } from '../../core/services/timesheet.service';
import { LeaveService } from '../../core/services/leave.service';
import { WorkCalendarService } from '../../core/services/work-calendar.service';
import {
  DayEntry, TimesheetEntry, CompanyTimesheetField, TimesheetAttachment, TimesheetMonthlyMeta, TimesheetLock
} from '../../core/models/timesheet.models';

interface DayCol {
  date: string; day: number; dayName: string; isWeekend: boolean; isToday: boolean;
  isHoliday: boolean; isHalfDay: boolean; calendarNote: string;
  isLeaveDay: boolean;      // ngày có đơn nghỉ (APPROVED hoặc PENDING)
  isLeaveHalfDay: boolean;  // true = nửa ngày, false = cả ngày
  isLeavePending: boolean;  // true = chờ duyệt, false = đã duyệt
}
interface ProjectRow {
  key: string;
  projectId: string;
  name: string;
  cells: Map<string, DayEntry>;
  totalHours: number;
  totalOt: number;
}

@Component({
  selector: 'app-timesheet',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule, MatTooltipModule, MatProgressBarModule, MatCheckboxModule,
  ],
  template: `
<div class="ts-wrap">

  <!-- ══ HEADER ══ -->
  <div class="ts-header">
    <div class="ts-title-row">
      <mat-icon class="header-icon">schedule</mat-icon>
      <div>
        <h1 class="ts-title">{{ adminUserId ? 'Timesheet: ' + adminUserName : 'My Timesheet' }}</h1>
        <p class="ts-sub">{{ grandTotal() | number:'1.1-1' }}h · OT: {{ grandOt() | number:'1.1-1' }}h</p>
      </div>
    </div>
    <div class="ts-header-actions">
      <div class="autofill-wrap">
        @if (rows().length > 1) {
          <select class="autofill-select" [(ngModel)]="autoFillKey">
            @for (r of rows(); track r.key) {
              <option [value]="r.key">{{ r.key }}</option>
            }
          </select>
        }
        <button mat-stroked-button class="autofill-btn"
                [disabled]="rows().length === 0 || (monthLocked() && !adminUserId)"
                (click)="autoFill()"
                [matTooltip]="(monthLocked() && !adminUserId) ? 'Tháng đã bị khóa' : rows().length === 0 ? 'Chưa có dự án' : 'Tự động điền: làm cả ngày → 8h, nửa ngày → 4h (chỉ điền ô trống)'">
          <mat-icon>auto_fix_high</mat-icon>
          Auto Fill
        </button>
      </div>
      <div class="month-nav">
        <button mat-icon-button (click)="changeMonth(-1)"><mat-icon>chevron_left</mat-icon></button>
        <span class="month-badge">{{ currentMonth() | date:'MM/yyyy' }}</span>
        <button mat-icon-button (click)="changeMonth(1)"><mat-icon>chevron_right</mat-icon></button>
      </div>
    </div>
  </div>

  @if (monthLocked()) {
    <div class="lock-banner" [class.admin-lock-banner]="!!adminUserId">
      <mat-icon>lock</mat-icon>
      @if (adminUserId) {
        <span>Timesheet tháng này đã bị khóa. Với quyền Admin, bạn vẫn có thể chỉnh sửa.</span>
      } @else if (lockDetails()?.payrollLocked) {
        <span>Tháng {{ currentMonth() | date:'MM/yyyy' }} đã có <strong>bảng lương được xác nhận</strong>. Liên hệ COMPANY_ADMIN để mở khóa.</span>
      } @else if (lockDetails()?.statementLocked) {
        <span>Tháng {{ currentMonth() | date:'MM/yyyy' }} đã có <strong>biên bản gửi khách hàng/vendor</strong>. Liên hệ COMPANY_ADMIN để mở khóa.</span>
      } @else {
        <span>Timesheet tháng {{ currentMonth() | date:'MM/yyyy' }} đã bị khóa. Vui lòng liên hệ quản lý để chỉnh sửa.</span>
      }
    </div>
  }

  @if (loading()) { <mat-progress-bar mode="indeterminate"></mat-progress-bar> }

  <!-- ══ ADD PROJECT ══ -->
  @if (canEdit()) {
    <div class="add-row">
      <mat-icon class="add-icon">add_box</mat-icon>
      <div class="add-field">
        <label class="add-field-label">Project Key <span class="req">*</span></label>
        <input class="add-input" placeholder="VD: TBOMCTS"
               [(ngModel)]="newKey" (keydown.enter)="addProject()" maxlength="50" />
      </div>
      <div class="add-field">
        <label class="add-field-label">Project ID <span class="req">*</span></label>
        <input class="add-input" placeholder="VD: 12345"
               [(ngModel)]="newProjectId" (keydown.enter)="addProject()" maxlength="50" />
      </div>
      <button mat-flat-button color="primary" class="add-btn"
              (click)="addProject()" [disabled]="!newKey.trim() || !newProjectId.trim()">
        <mat-icon>add</mat-icon> Thêm
      </button>
    </div>
  }

  <!-- ══ GRID ══ -->
  <div class="grid-outer">
    <div class="grid-scroll">
      <table class="ts-table">
        <thead>
          <tr>
            <th class="th-key sticky-col">Dự án</th>
            <th class="th-total sticky-total">Tổng</th>
            @for (d of days(); track d.date) {
              <th [class]="dayHeadClass(d)"
                  [matTooltip]="d.isLeaveDay ? ((d.isLeavePending ? '[Chờ duyệt] ' : '') + (d.isLeaveHalfDay ? 'Nghỉ nửa ngày' : 'Nghỉ cả ngày')) : (d.calendarNote || (d.isHoliday ? 'Ngày nghỉ' : d.isHalfDay ? 'Nửa ngày' : ''))"
                  matTooltipPosition="above">
                <div class="dh-name">{{ d.dayName }}</div>
                <div class="dh-num">{{ d.day }}</div>
                @if (d.isLeaveDay) {
                  <mat-icon class="dh-leave-icon"
                    [class.leave-half]="d.isLeaveHalfDay"
                    [class.leave-pending]="d.isLeavePending">
                    {{ d.isLeaveHalfDay ? 'wb_sunny' : 'beach_access' }}
                  </mat-icon>
                } @else if (d.isHoliday || d.isHalfDay) {
                  <div class="dh-holiday-dot">●</div>
                }
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @if (rows().length === 0) {
            <tr><td [attr.colspan]="2 + days().length" class="empty-td">
              <mat-icon>timer_off</mat-icon>
              <span>{{ adminUserId ? 'Không có dữ liệu' : 'Thêm project để bắt đầu log' }}</span>
            </td></tr>
          }
          @for (row of rows(); track row.key) {
            <tr class="data-row">
              <td class="td-key sticky-col">
                <div class="key-cell">
                  <div class="key-labels">
                    <span class="key-text" [matTooltip]="row.name || row.key">{{ row.key }}</span>
                    @if (row.projectId) {
                      <span class="key-pid">ID: {{ row.projectId }}</span>
                    }
                    @if (row.name) {
                      <span class="key-name">{{ row.name }}</span>
                    }
                  </div>
                  @if (canEdit()) {
                    <button class="rm-btn" (click)="removeProject(row.key)">
                      <mat-icon>close</mat-icon>
                    </button>
                  }
                </div>
              </td>
              <td class="td-total sticky-total">
                <div class="total-pill">{{ row.totalHours | number:'1.0-1' }}</div>
                @if (row.totalOt > 0) {
                  <div class="ot-pill">+{{ row.totalOt | number:'1.0-1' }}</div>
                }
              </td>
              @for (d of days(); track d.date) {
                <td [class]="dayCellClass(d, row.cells.get(d.date))"
                    (click)="openPopup(row.key, d, row.cells.get(d.date))">
                  @if (row.cells.get(d.date); as entry) {
                    @if (entry.hours > 0 || entry.otHours > 0) {
                      <div class="cell-filled">
                        <span class="cell-h">{{ entry.hours || '' }}</span>
                        @if (entry.otHours > 0) {
                          <span class="cell-ot">+{{ entry.otHours }}</span>
                        }
                        @if (entry.lockedByLeave) {
                          <span class="cell-leave-lock" matTooltip="Nghỉ phép đã duyệt">
                            <mat-icon>beach_access</mat-icon>
                          </span>
                        }
                      </div>
                    } @else if (entry.lockedByLeave) {
                      <div class="cell-filled">
                        <span class="cell-h cell-h-zero">0</span>
                        <span class="cell-leave-lock" matTooltip="Nghỉ phép đã duyệt (cả ngày)">
                          <mat-icon>beach_access</mat-icon>
                        </span>
                      </div>
                    } @else {
                      <span class="cell-empty">{{ d.isWeekend ? '' : '·' }}</span>
                    }
                  } @else {
                    <span class="cell-empty">{{ d.isWeekend ? '' : '·' }}</span>
                  }
                </td>
              }
            </tr>
          }
          <!-- Total row -->
          @if (rows().length > 0) {
            <tr class="total-row">
              <td class="td-key sticky-col fw6">Tổng</td>
              <td class="td-total sticky-total">
                <div class="total-pill grand">{{ grandTotal() | number:'1.0-1' }}</div>
                @if (grandOt() > 0) { <div class="ot-pill">+{{ grandOt() | number:'1.0-1' }}</div> }
              </td>
              @for (d of days(); track d.date) {
                <td [class]="dayCellClass(d) + ' total-day-cell'">
                  @if (dayTotal(d.date).h > 0 || dayTotal(d.date).ot > 0) {
                    <div class="cell-filled">
                      <span class="cell-h">{{ dayTotal(d.date).h || '' }}</span>
                      @if (dayTotal(d.date).ot > 0) { <span class="cell-ot">+{{ dayTotal(d.date).ot }}</span> }
                    </div>
                  }
                </td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  </div>

  <!-- ══ SAVE BAR ══ -->
  @if (canEdit() && dirty()) {
    <div class="save-bar">
      <span class="unsaved-hint">Có thay đổi chưa lưu</span>
      <button mat-flat-button color="accent" (click)="saveAll()" [disabled]="saving()">
        <mat-icon>{{ saving() ? 'hourglass_empty' : 'save' }}</mat-icon>
        {{ saving() ? 'Đang lưu...' : 'Lưu tất cả' }}
      </button>
    </div>
  }

  @if (saveMsg()) {
    <div class="msg-bar" [class.msg-err]="saveMsg()!.startsWith('Lỗi')">{{ saveMsg() }}</div>
  }

  <!-- ══ CUSTOM FIELDS ══ -->
  @if (customFields().length > 0) {
    <div class="section-card">
      <h3 class="section-title"><mat-icon>tune</mat-icon> Thông tin bổ sung</h3>
      <div class="custom-fields-grid">
        @for (f of customFields(); track f.id) {
          <div class="cf-item">
            <label class="cf-label">{{ f.fieldName }}{{ f.required ? ' *' : '' }}</label>
            @if (f.fieldType === 'checkbox') {
              <label class="cf-checkbox">
                <input type="checkbox" [(ngModel)]="additions[f.fieldKey]" (change)="metaDirty.set(true)" />
                <span>{{ f.fieldName }}</span>
              </label>
            } @else if (f.fieldType === 'number') {
              <input class="cf-input" type="number" [(ngModel)]="additions[f.fieldKey]"
                     (input)="metaDirty.set(true)" placeholder="0" />
            } @else {
              <input class="cf-input" type="text" [(ngModel)]="additions[f.fieldKey]"
                     (input)="metaDirty.set(true)" placeholder="Nhập..." />
            }
          </div>
        }
      </div>
    </div>
  }

  <!-- ══ DESCRIPTION ══ -->
  <div class="section-card">
    <h3 class="section-title"><mat-icon>notes</mat-icon> Mô tả tháng {{ currentMonth() | date:'MM/yyyy' }}</h3>
    <textarea class="desc-area" rows="4"
              placeholder="Ghi chú, tổng kết công việc trong tháng..."
              [(ngModel)]="monthDescription" (input)="metaDirty.set(true)"></textarea>
    @if (metaDirty()) {
      <button mat-stroked-button color="primary" (click)="saveMeta()" style="margin-top:8px;">
        <mat-icon>save</mat-icon> {{ adminUserId ? 'Lưu thay đổi (Admin)' : 'Lưu mô tả' }}
      </button>
    }
  </div>

  <!-- ══ ATTACHMENTS ══ -->
  <div class="section-card">
    <h3 class="section-title">
      <mat-icon>attach_file</mat-icon>
      Tài liệu đính kèm{{ adminUserId ? ' (của nhân sự)' : '' }}
    </h3>
    <div class="attach-list">
      @for (att of attachments(); track att.id) {
        <div class="attach-item">
          <mat-icon class="att-icon">{{ att.mimeType.includes('pdf') ? 'picture_as_pdf' : 'image' }}</mat-icon>
          <div class="att-info">
            <span class="att-name">{{ att.fileName }}</span>
            <span class="att-meta">{{ formatSize(att.fileSize) }} · {{ att.createdAt | date:'dd/MM/yy HH:mm' }}</span>
          </div>
          <div class="att-actions">
            @if (att.mimeType.includes('pdf') || att.mimeType.includes('image')) {
              <button mat-icon-button color="accent" matTooltip="Xem" (click)="viewAttachment(att)">
                <mat-icon>visibility</mat-icon>
              </button>
            }
            <button mat-icon-button color="warn" matTooltip="Xoá" (click)="deleteAttachment(att)">
              <mat-icon>delete_outline</mat-icon>
            </button>
          </div>
        </div>
      }
    </div>
    <div class="upload-zone" (click)="fileInput.click()" (dragover)="$event.preventDefault()"
         (drop)="onDrop($event)">
      <input #fileInput type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
             (change)="onFileSelect($event)" />
      <mat-icon>cloud_upload</mat-icon>
      <p>Nhấn hoặc kéo thả file PDF / ảnh vào đây</p>
      <span class="upload-hint">Tối đa 20MB</span>
      @if (uploading()) { <mat-progress-bar mode="indeterminate" style="margin-top:8px;"></mat-progress-bar> }
    </div>
  </div>

</div>

<!-- ══════════ POPUP: Day Entry ══════════ -->
@if (popup.open) {
  <div class="overlay" (click)="closePopup()">
    <div class="popup-card" (click)="$event.stopPropagation()">
      <div class="popup-header">
        <div class="popup-title">
          <mat-icon>event</mat-icon>
          <div>
            <div class="popup-date">{{ popup.date | date:'EEEE, dd/MM/yyyy' }}</div>
            <div class="popup-key">{{ popup.projectKey }}</div>
          </div>
        </div>
        <button mat-icon-button (click)="closePopup()"><mat-icon>close</mat-icon></button>
      </div>

      @if (popup.isLeaveDay) {
        @if (popup.isLeavePending) {
          <div class="popup-notice notice-leave-pending">
            <mat-icon>schedule</mat-icon>
            <span>Ngày này có đơn nghỉ phép <strong>chờ duyệt</strong>
              ({{ popup.isLeaveHalfDay ? 'nửa ngày' : 'cả ngày' }}).</span>
          </div>
        } @else {
          <div class="popup-notice" [class]="popup.isLeaveHalfDay ? 'notice-leave-half' : 'notice-leave-full'">
            <mat-icon>{{ popup.isLeaveHalfDay ? 'wb_sunny' : 'beach_access' }}</mat-icon>
            <span>Ngày này có đơn nghỉ phép đã duyệt
              ({{ popup.isLeaveHalfDay ? 'nửa ngày' : 'cả ngày' }}).</span>
          </div>
        }
      }
      @if (monthLocked() && !adminUserId) {
        <div class="popup-notice notice-lock">
          <mat-icon>lock</mat-icon>
          <span>Timesheet tháng này đã bị khóa. Chỉ quản lý mới có thể chỉnh sửa.</span>
        </div>
      }

      <div class="popup-body">
        <div class="form-row">
          <label class="form-label">Giờ thường</label>
          <div class="hour-stepper">
            <button mat-icon-button (click)="popup.hours = stepHour(popup.hours, -0.5)">
              <mat-icon>remove</mat-icon>
            </button>
            <input class="hour-input" type="number" min="0" max="24" step="0.5"
                   [(ngModel)]="popup.hours" />
            <button mat-icon-button (click)="popup.hours = stepHour(popup.hours, 0.5)">
              <mat-icon>add</mat-icon>
            </button>
          </div>
          <div class="quick-hours">
            @for (h of [4,6,8]; track h) {
              <button class="qh-btn" [class.qh-active]="popup.hours === h"
                      (click)="popup.hours = h">{{ h }}h</button>
            }
          </div>
        </div>

        <div class="form-row">
          <label class="form-label ot-label">
            <input type="checkbox" [(ngModel)]="popup.hasOt" />
            <mat-icon>alarm_add</mat-icon> Tăng ca (OT)
          </label>
          @if (popup.hasOt) {
            <div class="hour-stepper">
              <button mat-icon-button (click)="popup.otHours = stepHour(popup.otHours, -0.5)">
                <mat-icon>remove</mat-icon>
              </button>
              <input class="hour-input ot-color" type="number" min="0" max="24" step="0.5"
                     [(ngModel)]="popup.otHours" />
              <button mat-icon-button (click)="popup.otHours = stepHour(popup.otHours, 0.5)">
                <mat-icon>add</mat-icon>
              </button>
            </div>
            <div class="quick-hours">
              @for (h of [1,2,3,4]; track h) {
                <button class="qh-btn qh-ot" [class.qh-active]="popup.otHours === h"
                        (click)="popup.otHours = h">{{ h }}h</button>
              }
            </div>
          }
        </div>

        <div class="form-row">
          <label class="form-label">Mô tả (tuỳ chọn)</label>
          <textarea class="popup-note" rows="2" placeholder="Công việc đã làm hôm nay..."
                    [(ngModel)]="popup.note"></textarea>
        </div>
      </div>

      <div class="popup-footer">
        @if (popup.hasData && canEdit()) {
          <button mat-stroked-button color="warn" (click)="clearEntry()">
            <mat-icon>delete_outline</mat-icon> Xoá
          </button>
        }
        <span style="flex:1"></span>
        <button mat-button (click)="closePopup()">Huỷ</button>
        <button mat-flat-button color="primary" (click)="commitPopup()"
                [disabled]="!canEdit()">
          <mat-icon>check</mat-icon> Lưu
        </button>
      </div>
    </div>
  </div>
}

<!-- ══════════ POPUP: Attachment Viewer ══════════ -->
@if (viewer.open) {
  <div class="overlay" (click)="closeViewer()">
    <div class="viewer-card" (click)="$event.stopPropagation()">
      <div class="popup-header">
        <span class="popup-date">{{ viewer.name }}</span>
        <button mat-icon-button (click)="closeViewer()"><mat-icon>close</mat-icon></button>
      </div>
      <div class="viewer-body">
        @if (viewer.mime.includes('pdf')) {
          <iframe [src]="viewer.safeUrl" class="viewer-frame"></iframe>
        } @else {
          <img [src]="viewer.rawUrl" class="viewer-img" [alt]="viewer.name" />
        }
      </div>
    </div>
  </div>
}
  `,
  styles: [`
    :host { display: block; }
    .ts-wrap { padding: 20px; max-width: 100%; background: #F6F8FC; min-height: 100vh; }

    /* ── Header ── */
    .ts-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; margin-bottom: 20px;
    }
    .ts-title-row { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 26px; width: 26px; height: 26px; color: #5B5BD6; }
    .ts-title { margin: 0; font-size: 21px; font-weight: 800; color: #11142D; letter-spacing: -0.5px; font-family: 'Roboto'; }
    .ts-sub { margin: 3px 0 0; font-size: 12.5px; color: #8A94A6; font-weight: 500; }
    .ts-header-actions { display: flex; align-items: center; gap: 8px; }
    .autofill-wrap { display: flex; align-items: center; gap: 6px; }
    .autofill-select {
      height: 34px; padding: 0 10px; border: 1.5px solid #5B5BD6; border-radius: 8px;
      font-size: 12.5px; font-weight: 600; color: #5B5BD6; background: #fff;
      outline: none; cursor: pointer; max-width: 140px;
      &:focus { box-shadow: 0 0 0 3px rgba(91,91,214,0.15); }
    }
    .autofill-btn {
      border-color: #5B5BD6 !important; color: #5B5BD6 !important;
      font-size: 12.5px; font-weight: 600; border-radius: 10px;
      transition: all 0.15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }
      &:hover:not([disabled]) { background: #EEEEFF !important; }
      &[disabled] { opacity: 0.4; border-color: #C8CDE0 !important; color: #C8CDE0 !important; }
    }
    .month-nav {
      display: flex; align-items: center; gap: 0;
      background: #fff; border-radius: 10px; border: 1px solid #E4E6EF;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06); overflow: hidden;
    }
    .month-badge {
      font-size: 13px; font-weight: 700; color: #11142D;
      min-width: 82px; text-align: center; padding: 0 4px;
      letter-spacing: 0.3px;
    }

    /* ── Add row ── */
    .add-row {
      display: flex; gap: 12px; align-items: flex-end; margin-bottom: 16px;
      background: #fff; border-radius: 12px; padding: 14px 16px;
      border: 1px solid #E4E6EF; box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }
    .add-icon { color: #5B5BD6; flex-shrink: 0; font-size: 22px; width: 22px; height: 22px; margin-bottom: 6px; }
    .add-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .add-field-label {
      font-size: 11px; font-weight: 700; color: #6B7280;
      text-transform: uppercase; letter-spacing: 0.5px;
      .req { color: #EF4444; }
    }
    .add-input {
      border: 1.5px solid #E4E6EF; border-radius: 8px; outline: none;
      font-size: 13.5px; background: #FAFBFC; padding: 8px 12px;
      font-weight: 600; color: #11142D; transition: border-color 0.15s;
      &:focus { border-color: #5B5BD6; background: #fff; }
      &::placeholder { color: #B0B7C3; font-weight: 400; }
    }
    .add-btn {
      height: 38px; border-radius: 10px; font-weight: 600; font-size: 13px;
      white-space: nowrap; padding: 0 18px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }
    }

    /* ── Grid ── */
    .grid-outer {
      background: #fff; border-radius: 14px;
      border: 1px solid #E4E6EF;
      box-shadow: 0 2px 8px rgba(17,20,45,0.06);
      overflow: hidden; margin-bottom: 16px;
    }
    .grid-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    .ts-table { border-collapse: collapse; width: max-content; min-width: 100%; font-size: 12px; }

    /* Sticky columns */
    .sticky-col {
      position: sticky; left: 0; z-index: 2; background: inherit;
      min-width: 120px; max-width: 150px;
    }
    .sticky-total {
      position: sticky; left: 120px; z-index: 2; background: inherit;
      min-width: 54px; border-right: 1px solid #EAECF5;
    }

    /* ── Table head ── */
    thead tr { background: #F0F1FA; }
    .th-key {
      padding: 12px 14px; text-align: left; color: #6B7280; font-weight: 700;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      white-space: nowrap; background: #F0F1FA; border-bottom: 2px solid #E4E6EF;
    }
    .th-total {
      padding: 12px 8px; text-align: center; color: #6B7280; font-weight: 700;
      font-size: 10px; text-transform: uppercase; letter-spacing: 1px;
      background: #E8EAF6; border-right: 1px solid #D8DAEE; border-bottom: 2px solid #D8DAEE;
    }
    th.day-col {
      padding: 7px 2px; text-align: center; color: #374151;
      font-weight: 500; min-width: 42px; border-bottom: 2px solid #E4E6EF;
    }
    th.day-weekend { background: #E8E9F0 !important; color: #9CA3AF !important; border-bottom-color: #D1D5DB !important; }
    th.day-today   { background: #DBEAFE !important; color: #1D4ED8 !important; border-bottom-color: #93C5FD !important; }
    th.day-holiday { background: #FFE4E6 !important; color: #BE123C !important; border-bottom-color: #FDA4AF !important; }
    th.day-halfday { background: #FEF9C3 !important; color: #854D0E !important; border-bottom-color: #FDE047 !important; }
    .dh-name { font-size: 8.5px; text-transform: uppercase; opacity: 0.65; letter-spacing: 0.4px; }
    .dh-num  { font-size: 15px; font-weight: 800; line-height: 1.3; }
    .dh-holiday-dot { font-size: 6px; margin-top: 1px; opacity: 0.85; }

    /* ── Data rows ── */
    .data-row { border-bottom: 1px solid #F2F3F9; }
    .data-row:hover td { background: #F7F8FF !important; }
    .data-row:hover .sticky-col { background: #F0F2FF !important; }
    .data-row:hover .sticky-total { background: #ECEFFE !important; }

    .td-key { padding: 9px 14px; background: #fff; }
    .td-total { padding: 4px 8px; background: #F9FAFD; text-align: center; }
    .key-cell { display: flex; align-items: center; gap: 6px; }
    .key-labels { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
    .key-text {
      font-weight: 700; font-size: 11.5px; color: #2D3250;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .key-pid {
      font-size: 10px; color: #7c3aed; font-weight: 600;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .key-name {
      font-size: 10px; color: #6B7280;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .rm-btn {
      background: none; border: none; cursor: pointer; padding: 2px 3px;
      color: #C8CDE0; display: flex; align-items: center; opacity: 0;
      border-radius: 4px; transition: all 0.1s;
      .data-row:hover & { opacity: 1; }
      &:hover { color: #EF4444; background: #FEF2F2; }
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }

    td.day-cell {
      padding: 4px 2px; text-align: center; cursor: pointer;
      min-width: 42px; transition: background 0.1s; border-left: 1px solid #F5F6FB;
      &:hover { background: #EEF0FF !important; }
    }
    td.day-weekend { background: #F4F5F9 !important; }
    td.day-today   { background: #EBF0FF !important; }
    td.day-holiday { background: #FFF0F0 !important; }
    td.day-holiday:hover { background: #FFE0E0 !important; }
    td.day-halfday { background: #FFFBF0 !important; }
    td.day-halfday:hover { background: #FFF3D0 !important; }

    .cell-filled { display: flex; flex-direction: column; align-items: center; gap: 1px; }
    .cell-h   { font-size: 12px; font-weight: 800; color: #5B5BD6; line-height: 1.3; }
    .cell-ot  { font-size: 10px; font-weight: 700; color: #F76D1F; line-height: 1; }
    .cell-empty { color: #DDE0EC; font-size: 10px; }

    .total-pill {
      display: inline-block; background: #EEEEFF; color: #5B5BD6;
      padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 800;
      &.grand { background: #5B5BD6; color: #fff; }
    }
    .ot-pill { font-size: 10px; font-weight: 700; color: #F76D1F; margin-top: 2px; }

    /* ── Total row ── */
    .total-row {
      border-top: 2px solid #EAECF5; background: #F9FAFD;
      td { background: #F9FAFD !important; }
    }
    .total-day-cell { vertical-align: middle; }
    .fw6 { font-weight: 700; font-size: 12px; color: #11142D; padding: 10px 14px; }

    /* ── Empty ── */
    .empty-td {
      text-align: center; padding: 52px; color: #C8CDE0;
      mat-icon { display: block; font-size: 42px; width: 42px; height: 42px; margin: 0 auto 10px; }
      span { font-size: 13px; font-weight: 500; }
    }

    /* ── Save bar ── */
    .save-bar {
      display: flex; align-items: center; justify-content: space-between;
      background: #FFFDF0; border-radius: 12px; padding: 11px 16px;
      margin-bottom: 14px; border: 1px solid #FFE598;
    }
    .unsaved-hint { font-size: 13px; color: #C08A00; font-weight: 600; }
    .msg-bar {
      background: #F0FFF5; color: #15803D; border-radius: 10px;
      padding: 10px 16px; font-size: 13px; margin-bottom: 12px; font-weight: 500;
      border: 1px solid #BBF7D0;
      &.msg-err { background: #FFF0F0; color: #B91C1C; border-color: #FECACA; }
    }

    /* ── Section cards ── */
    .section-card {
      background: #fff; border-radius: 14px; padding: 18px;
      border: 1px solid #E4E6EF; box-shadow: 0 1px 4px rgba(0,0,0,0.04);
      margin-bottom: 14px;
    }
    .section-title {
      display: flex; align-items: center; gap: 8px;
      margin: 0 0 16px; font-size: 13.5px; font-weight: 700; color: #11142D;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #5B5BD6; }
    }

    /* Custom fields */
    .custom-fields-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
    .cf-item { display: flex; flex-direction: column; gap: 5px; }
    .cf-label { font-size: 10.5px; font-weight: 700; color: #8A94A6; text-transform: uppercase; letter-spacing: 0.7px; }
    .cf-input {
      border: 1.5px solid #E4E6EF; border-radius: 8px; padding: 7px 11px;
      font-size: 13px; outline: none; color: #2D3250;
      transition: border-color 0.15s;
      &:focus { border-color: #5B5BD6; box-shadow: 0 0 0 3px rgba(91,91,214,0.1); }
    }
    .cf-checkbox { display: flex; align-items: center; gap: 7px; font-size: 13px; cursor: pointer; font-weight: 500; }
    .cf-readonly {
      font-size: 13px; color: #374151; padding: 7px 11px;
      background: #F9FAFD; border-radius: 8px; border: 1.5px solid #E4E6EF;
      min-height: 34px; display: flex; align-items: center;
    }
    .cf-check-icon { font-size: 20px; width: 20px; height: 20px; color: #5B5BD6; }
    .desc-area[readonly] { background: #F9FAFD; color: #374151; cursor: default; }
    .desc-area {
      width: 100%; box-sizing: border-box; border: 1.5px solid #E4E6EF; border-radius: 10px;
      padding: 10px 13px; font-size: 13.5px; font-family: inherit; resize: vertical;
      outline: none; line-height: 1.6; color: #2D3250;
      &:focus { border-color: #5B5BD6; box-shadow: 0 0 0 3px rgba(91,91,214,0.1); }
    }

    /* Attachments */
    .attach-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; }
    .attach-item {
      display: flex; align-items: center; gap: 12px;
      padding: 11px 14px; border-radius: 10px;
      background: #F9FAFD; border: 1px solid #E4E6EF; transition: border-color 0.15s;
      &:hover { border-color: #A5A6F6; }
    }
    .att-icon { color: #5B5BD6; flex-shrink: 0; }
    .att-info { flex: 1; min-width: 0; }
    .att-name { font-size: 13px; font-weight: 600; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #11142D; }
    .att-meta { font-size: 11px; color: #9CA3AF; margin-top: 2px; display: block; }
    .att-actions { display: flex; gap: 2px; flex-shrink: 0; }
    .upload-zone {
      border: 2px dashed #C7C9F0; border-radius: 12px; padding: 28px;
      text-align: center; cursor: pointer; color: #8B8FD4; transition: all 0.15s;
      mat-icon { font-size: 36px; width: 36px; height: 36px; }
      p { margin: 8px 0 2px; font-size: 13.5px; font-weight: 500; }
      &:hover { border-color: #5B5BD6; color: #5B5BD6; background: #F5F5FF; }
    }
    .upload-hint { font-size: 11px; color: #B0B7C3; }

    /* ── Overlays ── */
    .overlay {
      position: fixed; inset: 0; background: rgba(11,13,28,0.55); z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 16px; animation: fadeIn 0.15s ease; backdrop-filter: blur(3px);
    }

    /* Day entry popup */
    .popup-card {
      background: #fff; border-radius: 20px; width: 100%; max-width: 420px;
      box-shadow: 0 24px 60px rgba(11,13,28,0.22); animation: slideUp 0.2s ease;
      overflow: hidden; border: 1px solid #E4E6EF;
    }
    .popup-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px; background: #F9FAFD; border-bottom: 1px solid #E4E6EF;
    }
    .popup-title { display: flex; align-items: center; gap: 12px;
      mat-icon { color: #5B5BD6; } }
    .popup-date { font-size: 14.5px; font-weight: 800; color: #11142D; letter-spacing: -0.2px; }
    .popup-key  { font-size: 11.5px; color: #8A94A6; margin-top: 2px; font-weight: 500; }

    .popup-body { padding: 18px; display: flex; flex-direction: column; gap: 16px; }
    .form-row { display: flex; flex-direction: column; gap: 8px; }
    .form-label { font-size: 10.5px; font-weight: 700; color: #8A94A6; text-transform: uppercase; letter-spacing: 0.8px; }
    .ot-label {
      display: flex; align-items: center; gap: 7px; cursor: pointer;
      text-transform: none; font-size: 13px; font-weight: 600; color: #F76D1F;
      input { width: 16px; height: 16px; cursor: pointer; accent-color: #F76D1F; }
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
    }
    .hour-stepper { display: flex; align-items: center; gap: 10px; }
    .hour-input {
      width: 68px; height: 44px; text-align: center;
      border: 2px solid #5B5BD6; border-radius: 12px;
      font-size: 22px; font-weight: 900; color: #5B5BD6; outline: none;
      &.ot-color { border-color: #F76D1F; color: #F76D1F; }
      &::-webkit-inner-spin-button { opacity: 0; }
    }
    .quick-hours { display: flex; gap: 6px; flex-wrap: wrap; }
    .qh-btn {
      padding: 5px 13px; border: 1.5px solid #E4E6EF; border-radius: 20px;
      background: #fff; font-size: 12px; font-weight: 700; cursor: pointer;
      color: #5B5BD6; transition: all 0.12s;
      &:hover, &.qh-active { background: #5B5BD6; color: #fff; border-color: #5B5BD6; }
      &.qh-ot { color: #F76D1F; border-color: #FFD4B0; }
      &.qh-ot:hover, &.qh-ot.qh-active { background: #F76D1F; color: #fff; border-color: #F76D1F; }
    }
    .popup-note {
      width: 100%; box-sizing: border-box; border: 1.5px solid #E4E6EF; border-radius: 10px;
      padding: 9px 12px; font-size: 13px; font-family: inherit; resize: none; outline: none; color: #2D3250;
      &:focus { border-color: #5B5BD6; box-shadow: 0 0 0 3px rgba(91,91,214,0.1); }
    }
    .popup-footer {
      display: flex; align-items: center; gap: 10px; padding: 14px 18px;
      border-top: 1px solid #F2F3F9; background: #F9FAFD;
    }

    /* ── Lock banner ── */
    .lock-banner {
      display: flex; align-items: center; gap: 10px;
      background: #FFF5E6; border: 1px solid #FFC27D; border-radius: 10px;
      padding: 10px 16px; margin-bottom: 14px; font-size: 13px;
      color: #92400E; font-weight: 500;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #F59E0B; flex-shrink: 0; }
    }
    .admin-lock-banner {
      background: #EFF6FF; border-color: #BFDBFE; color: #1D4ED8;
      mat-icon { color: #3B82F6; }
    }

    /* ── Lock button (admin) ── */
    .lock-btn {
      border-color: #E4E6EF !important; color: #5B5BD6 !important;
      font-size: 12.5px; font-weight: 600; border-radius: 10px; transition: all 0.15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; margin-right: 4px; }
      &.locked { border-color: #FCA5A5 !important; color: #B91C1C !important; }
      &.locked:hover { background: #FEF2F2 !important; }
      &:not(.locked):hover { background: #EEEEFF !important; }
    }

    /* ── Leave day header icon ── */
    .dh-leave-icon {
      font-size: 11px !important; width: 11px !important; height: 11px !important;
      display: block; margin: 1px auto 0;
      color: #DC2626;          /* approved cả ngày = đỏ */
      &.leave-half { color: #D97706; }     /* approved nửa ngày = cam */
      &.leave-pending { color: #7C3AED; }  /* pending = tím */
    }
    /* cả ngày: nền đỏ nhạt */
    /* APPROVED cả ngày: nền đỏ nhạt */
    th.leave-day-col {
      background: #FFF1F2 !important; color: #BE123C !important;
      border-bottom-color: #FECDD3 !important;
    }
    th.leave-day-col .dh-name { color: #BE123C !important; opacity: 0.75; }
    /* APPROVED nửa ngày: nền vàng nhạt */
    th.leave-half-day-col {
      background: #FFFBEB !important; color: #B45309 !important;
      border-bottom-color: #FDE68A !important;
    }
    th.leave-half-day-col .dh-name { color: #B45309 !important; opacity: 0.75; }
    /* PENDING cả ngày: nền tím nhạt (chờ duyệt) */
    th.leave-pending-col {
      background: #F5F3FF !important; color: #6D28D9 !important;
      border-bottom-color: #DDD6FE !important;
    }
    th.leave-pending-col .dh-name { color: #6D28D9 !important; opacity: 0.75; }
    /* PENDING nửa ngày: nền xanh nhạt */
    th.leave-half-pending-col {
      background: #F0F9FF !important; color: #0369A1 !important;
      border-bottom-color: #BAE6FD !important;
    }
    th.leave-half-pending-col .dh-name { color: #0369A1 !important; opacity: 0.75; }

    /* ── Leave-locked cell ── */
    td.leave-locked-cell { background: #F0FDF4 !important; }
    td.leave-locked-cell:hover { background: #DCFCE7 !important; }
    .cell-leave-lock {
      mat-icon { font-size: 10px; width: 10px; height: 10px; color: #16A34A; display: block; }
    }
    .cell-h-zero { color: #94A3B8 !important; }

    /* ── Admin warn overtime cell ── */
    td.warn-overtime-cell { background: #FEFCE8 !important; }
    td.warn-overtime-cell:hover { background: #FEF08A !important; }
    td.warn-overtime-cell .cell-h { color: #CA8A04 !important; }

    /* ── Popup notices ── */
    .popup-notice {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 10px 18px; font-size: 12.5px; font-weight: 500;
      border-bottom: 1px solid transparent;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; margin-top: 1px; }
    }
    .notice-leave-full {   /* nghỉ cả ngày — đỏ nhạt */
      background: #FFF1F2; border-bottom-color: #FECDD3; color: #BE123C;
      mat-icon { color: #DC2626; }
    }
    .notice-leave-half {   /* nghỉ nửa ngày — vàng */
      background: #FFFBEB; border-bottom-color: #FDE68A; color: #B45309;
      mat-icon { color: #D97706; }
    }
    .notice-leave-pending {  /* chờ duyệt — tím */
      background: #F5F3FF; border-bottom-color: #DDD6FE; color: #6D28D9;
      mat-icon { color: #7C3AED; }
    }
    .notice-lock {
      background: #FFF5E6; border-bottom-color: #FCD34D; color: #92400E;
      mat-icon { color: #F59E0B; }
    }

    /* Viewer */
    .viewer-card {
      background: #fff; border-radius: 16px; width: 92vw; max-width: 900px;
      height: 86vh; display: flex; flex-direction: column;
      box-shadow: 0 28px 72px rgba(11,13,28,0.28); animation: slideUp 0.2s ease; overflow: hidden;
    }
    .viewer-body { flex: 1; overflow: hidden; background: #1C1E2E; }
    .viewer-frame { width: 100%; height: 100%; border: none; display: block; }
    .viewer-img { width: 100%; height: 100%; object-fit: contain; display: block; }

    @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
    @keyframes slideUp { from { transform: translateY(18px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      .ts-wrap { padding: 10px; }

      /* Header stacks vertically */
      .ts-header {
        flex-direction: column; align-items: flex-start; gap: 10px; margin-bottom: 14px;
      }
      .ts-title-row { width: 100%; }
      .ts-title { font-size: 17px; }
      .ts-sub { font-size: 11.5px; }
      .header-icon { font-size: 22px; width: 22px; height: 22px; }

      /* Actions: autofill + month nav side by side on full width */
      .ts-header-actions {
        width: 100%; justify-content: space-between; flex-wrap: nowrap;
      }
      .autofill-wrap { flex: 1; min-width: 0; gap: 4px; }
      .autofill-select { max-width: 90px; font-size: 11.5px; padding: 0 6px; }
      .autofill-btn {
        font-size: 11.5px; padding: 0 10px !important; min-width: 0;
        mat-icon { margin-right: 2px; }
      }
      .month-badge { min-width: 70px; font-size: 12px; }

      /* Add project row stacks vertically */
      .add-row {
        flex-direction: column; gap: 10px; padding: 12px;
      }
      .add-icon { display: none; }
      .add-field { width: 100%; }
      .add-btn { width: 100%; justify-content: center; }

      /* Grid: tighter columns */
      .sticky-col { min-width: 88px; max-width: 88px; }
      .sticky-total { left: 88px; min-width: 44px; }
      th.day-col, td.day-cell { min-width: 34px; }
      .dh-name { font-size: 7.5px; }
      .dh-num  { font-size: 13px; }
      .td-key { padding: 8px 10px; }
      .key-text { font-size: 10.5px; }
      .key-pid, .key-name { font-size: 9px; }
      .cell-h { font-size: 11px; }
      .cell-ot { font-size: 9px; }

      /* Lock banner wraps text better */
      .lock-banner {
        flex-wrap: wrap; font-size: 12px; padding: 9px 12px;
      }

      /* Save bar */
      .save-bar { flex-wrap: wrap; gap: 8px; }
      .unsaved-hint { font-size: 12px; }

      /* Section cards */
      .section-card { padding: 14px; }
      .custom-fields-grid { grid-template-columns: 1fr; }

      /* Popup: bottom sheet */
      .overlay { align-items: flex-end; padding: 0; }
      .popup-card {
        max-width: 100%; width: 100%;
        border-radius: 20px 20px 0 0; border-bottom: none;
        max-height: 92vh; overflow-y: auto;
      }
      .popup-header { padding: 14px 16px; }
      .popup-date { font-size: 13.5px; }
      .popup-body { padding: 14px; gap: 14px; }
      .popup-footer { padding: 12px 14px; }
      .hour-input { width: 60px; height: 40px; font-size: 20px; }

      /* Attachment */
      .attach-item { padding: 9px 10px; gap: 8px; }
      .att-name { font-size: 12px; }
      .upload-zone { padding: 20px 14px; }
    }

    /* Very small phones */
    @media (max-width: 375px) {
      .autofill-select { max-width: 72px; }
      .sticky-col { min-width: 76px; max-width: 76px; }
      .sticky-total { left: 76px; min-width: 40px; }
      th.day-col, td.day-cell { min-width: 30px; }
    }
  `]
})
export class TimesheetComponent implements OnInit {
  @Input() adminUserId?: number;
  @Input() adminUserName = '';
  @Input() initialMonth?: string; // "YYYY-MM" — tháng khởi tạo, nếu không truyền = tháng hiện tại

  private ts = inject(TimesheetService);
  private leaveService = inject(LeaveService);
  private calendarService = inject(WorkCalendarService);
  private sanitizer = inject(DomSanitizer);

  // date → { halfDay, pending }
  private _leaveBlocks = signal<Map<string, { halfDay: boolean; pending: boolean }>>(new Map());

  readonly loading  = signal(false);
  readonly saving   = signal(false);
  readonly dirty    = signal(false);
  readonly metaDirty = signal(false);
  readonly saveMsg  = signal<string | null>(null);
  readonly uploading = signal(false);
  readonly monthLocked = signal(false);
  /** Admin có thể sửa kể cả khi tháng đã khóa */
  canEdit(): boolean { return !this.monthLocked() || !!this.adminUserId; }
  readonly lockInfo = signal<TimesheetLock | null>(null);
  readonly lockDetails = signal<{ periodLocked: boolean; payrollLocked: boolean; statementLocked: boolean } | null>(null);

  private _month = signal(new Date());
  readonly currentMonth = computed(() => this._month());

  private _rowMap        = signal(new Map<string, Map<string, DayEntry>>());
  private _projectNames  = signal(new Map<string, string>());
  private _projectIds    = signal(new Map<string, string>());
  private calendarMap = signal<Map<string, { dayType: string; note: string }>>(new Map());
  readonly customFields = signal<CompanyTimesheetField[]>([]);
  readonly attachments  = signal<TimesheetAttachment[]>([]);

  monthDescription = '';
  additions: Record<string, any> = {};

  readonly rows = computed<ProjectRow[]>(() => {
    const names = this._projectNames();
    const ids   = this._projectIds();
    return [...this._rowMap().entries()].map(([key, cells]) => ({
      key, projectId: ids.get(key) ?? '', name: names.get(key) ?? '',
      cells,
      totalHours: [...cells.values()].reduce((s, e) => s + e.hours, 0),
      totalOt:    [...cells.values()].reduce((s, e) => s + e.otHours, 0),
    }));
  });

  /** Tập ngày cần bôi vàng (admin view): log giờ vượt quá mức nghỉ */
  readonly _adminWarnDates = computed<Set<string>>(() => {
    if (!this.adminUserId) return new Set();
    const blocks = this._leaveBlocks();
    const rows = this.rows();
    const warnDates = new Set<string>();
    blocks.forEach((block, date) => {
      const total = rows.reduce((s, r) => s + (r.cells.get(date)?.hours ?? 0), 0);
      if (!block.halfDay && total > 1) warnDates.add(date);  // nghỉ cả ngày nhưng log > 1h
      if (block.halfDay  && total > 4) warnDates.add(date);  // nghỉ nửa ngày nhưng log > 4h
    });
    return warnDates;
  });

  readonly days = computed<DayCol[]>(() => {
    const m = this._month(), year = m.getFullYear(), month = m.getMonth();
    const today = new Date().toISOString().slice(0, 10);
    const calMap = this.calendarMap();
    const blocks = this._leaveBlocks();
    const DAY = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    return Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const date = `${year}-${String(month+1).padStart(2,'0')}-${String(i+1).padStart(2,'0')}`;
      const calEntry = calMap.get(date);
      const nativeWeekend = d.getDay()===0||d.getDay()===6;
      const dayType = calEntry?.dayType ?? (nativeWeekend ? 'WEEKEND' : 'FULL_DAY');
      const leaveBlock = blocks.get(date);
      return {
        date, day: i+1, dayName: DAY[d.getDay()],
        isWeekend: dayType === 'WEEKEND',
        isHoliday: dayType === 'HOLIDAY',
        isHalfDay: dayType === 'MORNING' || dayType === 'AFTERNOON',
        isToday: date === today,
        calendarNote: calEntry?.note ?? '',
        isLeaveDay: !!leaveBlock,
        isLeaveHalfDay: !!leaveBlock?.halfDay,
        isLeavePending: !!leaveBlock?.pending,
      };
    });
  });

  readonly grandTotal = computed(() => this.rows().reduce((s,r) => s + r.totalHours, 0));
  readonly grandOt    = computed(() => this.rows().reduce((s,r) => s + r.totalOt, 0));
  dayTotal(date: string) {
    return { h: this.rows().reduce((s,r) => s + (r.cells.get(date)?.hours ?? 0), 0),
             ot: this.rows().reduce((s,r) => s + (r.cells.get(date)?.otHours ?? 0), 0) };
  }

  newKey  = '';
  newProjectId = '';
  newName = '';
  autoFillKey = '';   // project được chọn để auto fill

  // Popup state
  popup = { open: false, projectKey: '', date: '', hours: 8, hasOt: false, otHours: 2, note: '', hasData: false, lockedByLeave: false, isLeaveDay: false, isLeaveHalfDay: false, isLeavePending: false };
  // Viewer state
  viewer = { open: false, name: '', mime: '', rawUrl: '', safeUrl: '' as unknown as SafeResourceUrl };

  ngOnInit() {
    if (this.initialMonth) {
      const [y, m] = this.initialMonth.split('-').map(Number);
      if (y && m) this._month.set(new Date(y, m - 1, 1));
    }
    this.load();
  }

  private monthStr() {
    const m = this._month();
    return `${m.getFullYear()}-${String(m.getMonth()+1).padStart(2,'0')}`;
  }

  load() {
    this.loading.set(true);
    const ms = this.monthStr();

    this.ts.getMonth(ms, this.adminUserId).subscribe({ next: entries => {
      const map   = new Map<string, Map<string, DayEntry>>();
      const names = new Map<string, string>();
      const ids   = new Map<string, string>();
      entries.forEach(e => {
        if (!map.has(e.projectKey)) map.set(e.projectKey, new Map());
        map.get(e.projectKey)!.set(e.workDate, { id: e.id, hours: e.hours, otHours: e.otHours ?? 0, note: e.note ?? '', lockedByLeave: e.lockedByLeave ?? false });
        if (e.projectName && !names.has(e.projectKey)) names.set(e.projectKey, e.projectName);
        if (e.projectId && !ids.has(e.projectKey)) ids.set(e.projectKey, e.projectId);
      });
      this._rowMap.set(map);
      this._projectNames.set(names);
      this._projectIds.set(ids);
      this.dirty.set(false);
      this.loading.set(false);
      // Đảm bảo autoFillKey luôn trỏ tới project hợp lệ
      if (!this.autoFillKey || !map.has(this.autoFillKey)) {
        this.autoFillKey = map.size > 0 ? [...map.keys()][0] : '';
      }
      // Auto-fill project keys từ tháng trước nếu tháng hiện tại chưa có dữ liệu
      if (map.size === 0 && !this.adminUserId) {
        this._prefillFromPrevMonth(ms);
      }
    }, error: () => this.loading.set(false) });

    this.ts.getMeta(ms, this.adminUserId).subscribe({ next: meta => {
      this.monthDescription = meta?.description ?? '';
      try { this.additions = meta?.additions ? JSON.parse(meta.additions) : {}; } catch { this.additions = {}; }
      this.monthLocked.set(meta?.locked ?? false);
    }});

    // Load lock status (admin)
    if (this.adminUserId) {
      this.ts.getLockStatus(ms).subscribe({
        next: lock => { this.lockInfo.set(lock); this.monthLocked.set(lock.locked); },
        error: () => {}
      });
    } else {
      // Employee: dùng endpoint isAuthenticated() — không cần COMPANY_ADMIN
      this.ts.getLockStatusAllLevels(ms).subscribe({
        next: lock => {
          const details = { periodLocked: lock.periodLocked, payrollLocked: lock.payrollLocked, statementLocked: lock.statementLocked };
          this.lockDetails.set(details);
          if (lock.locked) this.monthLocked.set(true);
        },
        error: () => {}
      });
    }

    // Load leave blocks
    if (this.adminUserId) {
      // Admin view: load leave blocks của nhân sự đang xem
      this.leaveService.getLeaveBlocksForUser(this.adminUserId, ms).subscribe({
        next: blocks => {
          const map = new Map<string, { halfDay: boolean; pending: boolean }>();
          blocks.forEach(b => map.set(b.date, { halfDay: b.halfDay, pending: b.status === 'PENDING' }));
          this._leaveBlocks.set(map);
        },
        error: () => this._leaveBlocks.set(new Map())
      });
    } else {
      // Employee: load leave blocks của chính mình
      this.leaveService.getMyLeaveBlocks(ms).subscribe({
        next: blocks => {
          const map = new Map<string, { halfDay: boolean; pending: boolean }>();
          blocks.forEach(b => map.set(b.date, { halfDay: b.halfDay, pending: b.status === 'PENDING' }));
          this._leaveBlocks.set(map);
        },
        error: () => this._leaveBlocks.set(new Map())
      });
    }

    // Load work calendar to display holidays
    this.calendarService.getByMonth(ms).subscribe({
      next: cal => {
        const map = new Map<string, { dayType: string; note: string }>();
        (cal?.details ?? []).forEach(d => map.set(d.workDate, { dayType: d.dayType, note: d.note ?? '' }));
        this.calendarMap.set(map);
      },
      error: () => this.calendarMap.set(new Map())
    });

    // Always load custom fields so admin can see employee's filled values
    this.ts.getFields().subscribe({ next: f => this.customFields.set(f) });

    if (this.adminUserId) {
      this.ts.listAttachmentsAdmin(ms, this.adminUserId).subscribe({ next: a => this.attachments.set(a), error: () => {} });
    } else {
      this.ts.listAttachments(ms).subscribe({ next: a => this.attachments.set(a) });
    }
  }

  /**
   * Khi tháng hiện tại chưa có timesheet, tự động lấy danh sách project key
   * từ tháng trước và điền sẵn các hàng rỗng để nhân sự log nhanh hơn.
   * Không đặt dirty = true (chưa có thay đổi thực sự).
   */
  private _prefillFromPrevMonth(currentMonth: string): void {
    this.ts.getPrevMonthKeys(currentMonth).subscribe({
      next: projects => {
        if (projects.length === 0) return;
        const map   = new Map<string, Map<string, DayEntry>>(this._rowMap());
        const names = new Map<string, string>(this._projectNames());
        const ids   = new Map<string, string>(this._projectIds());
        for (const p of projects) {
          if (!map.has(p.projectKey)) {
            map.set(p.projectKey, new Map());
            names.set(p.projectKey, p.projectName);
            if (p.projectId) ids.set(p.projectKey, p.projectId);
          }
        }
        this._rowMap.set(map);
        this._projectNames.set(names);
        this._projectIds.set(ids);
        // autoFillKey → first pre-filled project
        if (!this.autoFillKey && map.size > 0) {
          this.autoFillKey = [...map.keys()][0];
        }
        // dirty vẫn false — chỉ là gợi ý, chưa có giờ nào được nhập
      },
      error: () => {} // nếu tháng trước không có dữ liệu thì bỏ qua
    });
  }

  changeMonth(delta: number) {
    const m = this._month();
    this._month.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.load();
  }

  // ── CSS class helpers ──
  dayHeadClass(d: DayCol): string {
    return [
      'th-day',
      d.isWeekend  ? 'day-weekend'  : '',
      d.isHoliday  ? 'day-holiday'  : '',
      d.isHalfDay  ? 'day-halfday'  : '',
      d.isToday    ? 'day-today'    : '',
      d.isLeaveDay ? (d.isLeavePending ? 'day-leave-pending' : 'day-leave') : '',
    ].filter(Boolean).join(' ');
  }

  dayCellClass(d: DayCol, entry?: DayEntry): string {
    const hasFill = entry && (entry.hours > 0 || entry.otHours > 0);
    return [
      'td-day',
      d.isWeekend  ? 'day-weekend'  : '',
      d.isHoliday  ? 'day-holiday'  : '',
      d.isHalfDay  ? 'day-halfday'  : '',
      d.isToday    ? 'day-today'    : '',
      d.isLeaveDay ? (d.isLeavePending ? 'day-leave-pending' : 'day-leave') : '',
      hasFill      ? 'has-data'     : '',
    ].filter(Boolean).join(' ');
  }

  formatSize(bytes: number): string {
    if (!bytes) return '0 B';
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1048576)    return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  addProject() {
    const key  = this.newKey.trim().toUpperCase();
    const name = this.newName.trim();
    if (!key) return;
    const map = new Map(this._rowMap());
    if (!map.has(key)) {
      map.set(key, new Map());
      this._rowMap.set(map);
      this.dirty.set(true);
      if (!this.autoFillKey) this.autoFillKey = key;
    }
    if (name) {
      const names = new Map(this._projectNames());
      names.set(key, name);
      this._projectNames.set(names);
    }
    const pid = this.newProjectId.trim();
    if (pid) {
      const ids = new Map(this._projectIds());
      ids.set(key, pid);
      this._projectIds.set(ids);
    }
    this.newKey  = '';
    this.newProjectId = '';
    this.newName = '';
  }

  removeProject(key: string) {
    // Kiểm tra project có dữ liệu trên server không (có ít nhất 1 entry có id)
    const cells = this._rowMap().get(key);
    const hasServerData = cells ? [...cells.values()].some(e => !!e.id) : false;

    const confirmed = confirm(
      hasServerData
        ? `Xóa dự án "${key}" và toàn bộ dữ liệu đã lưu trong tháng này?\nHành động không thể hoàn tác.`
        : `Xóa dự án "${key}"?`
    );
    if (!confirmed) return;

    if (hasServerData) {
      // Xóa server-side trước
      this.ts.deleteProject(key, this.monthStr()).subscribe({
        next: () => {
          this._removeFromMap(key);
          this.showMsg(`Đã xóa dự án "${key}"`);
        },
        error: () => this.showMsg(`Lỗi khi xóa dự án "${key}"`)
      });
    } else {
      this._removeFromMap(key);
    }
  }

  private _removeFromMap(key: string) {
    const map = new Map(this._rowMap());
    map.delete(key);
    this._rowMap.set(map);
    this.dirty.set(map.size > 0); // chỉ dirty nếu còn project khác chưa lưu
    if (this.autoFillKey === key) {
      this.autoFillKey = map.size > 0 ? [...map.keys()][0] : '';
    }
  }

  autoFill() {
    const rows = this.rows();
    if (rows.length === 0) return;

    // Xác định project cần fill: nếu chỉ có 1 → dùng luôn, nếu nhiều → dùng autoFillKey
    const targetKey = rows.length === 1 ? rows[0].key : this.autoFillKey;
    if (!targetKey) { this.showMsg('Vui lòng chọn dự án cần điền'); return; }

    const map = new Map(this._rowMap());
    const cells = map.get(targetKey);
    if (!cells) return;

    const newCells = new Map(cells);
    let filled = 0;

    this.days().forEach(d => {
      if (d.isWeekend || d.isHoliday) return;
      if (newCells.has(d.date) && (newCells.get(d.date)!.hours > 0 || newCells.get(d.date)!.otHours > 0)) return;
      // Nghỉ cả ngày → 0h, nghỉ nửa ngày → 4h, ngày công nửa (lịch) → 4h, bình thường → 8h
      let hours = 8;
      if (d.isLeaveDay && !d.isLeaveHalfDay) hours = 0;
      else if (d.isLeaveDay && d.isLeaveHalfDay) hours = 4;
      else if (d.isHalfDay) hours = 4;
      newCells.set(d.date, { hours, otHours: 0, note: '' });
      filled++;
    });

    map.set(targetKey, newCells);
    this._rowMap.set(map);

    if (filled > 0) {
      this.dirty.set(true);
      this.showMsg(`[${targetKey}] Đã điền ${filled} ô trống (nghỉ cả ngày: 0h, nghỉ nửa ngày: 4h, cả ngày: 8h)`);
    } else {
      this.showMsg(`[${targetKey}] Không có ô trống cần điền`);
    }
  }

  // ── Popup ──
  openPopup(key: string, d: DayCol, entry?: DayEntry) {
    this.popup = {
      open: true, projectKey: key, date: d.date,
      hours: entry?.hours ?? 8,
      hasOt: (entry?.otHours ?? 0) > 0,
      otHours: entry?.otHours ?? 2,
      note: entry?.note ?? '',
      hasData: !!(entry && (entry.hours > 0 || entry.otHours > 0)),
      lockedByLeave: false,
      isLeaveDay: d.isLeaveDay,
      isLeaveHalfDay: d.isLeaveHalfDay,
      isLeavePending: d.isLeavePending,
    };
  }

  closePopup() { this.popup.open = false; }

  commitPopup() {
    const hours = Math.max(0, Math.min(24, this.popup.hours || 0));
    const ot    = this.popup.hasOt ? Math.max(0, Math.min(24, this.popup.otHours || 0)) : 0;
    const map = new Map(this._rowMap());
    const row = new Map(map.get(this.popup.projectKey) ?? new Map<string, DayEntry>());
    const existing = row.get(this.popup.date);
    if (hours === 0 && ot === 0) {
      if (existing?.id) {
        row.set(this.popup.date, { id: existing.id, hours: 0, otHours: 0, note: '' });
      } else {
        row.delete(this.popup.date);
      }
    } else {
      row.set(this.popup.date, { id: existing?.id, hours, otHours: ot, note: this.popup.note });
    }
    map.set(this.popup.projectKey, row);
    this._rowMap.set(map);
    this.dirty.set(true);
    this.closePopup();
  }

  clearEntry() {
    const map = new Map(this._rowMap());
    const row = new Map(map.get(this.popup.projectKey) ?? new Map<string, DayEntry>());
    const existing = row.get(this.popup.date);
    if (existing?.id) {
      // Entry exists on server → keep id with 0 hours so saveAll sends delete signal
      row.set(this.popup.date, { id: existing.id, hours: 0, otHours: 0, note: '' });
    } else {
      row.delete(this.popup.date);
    }
    map.set(this.popup.projectKey, row);
    this._rowMap.set(map);
    this.dirty.set(true);
    this.closePopup();
  }

  stepHour(val: number, delta: number): number {
    return Math.max(0, Math.min(24, Math.round((val + delta) * 2) / 2));
  }

  // ── Save ──
  saveAll() {
    if (!this.adminUserId && this.monthLocked()) {
      this.showMsg('Lỗi: Timesheet tháng này đã bị khóa.');
      return;
    }
    const entries: any[] = [];
    const names = this._projectNames();
    const pids  = this._projectIds();
    this._rowMap().forEach((cells, key) => {
      const projectName = names.get(key) || undefined;
      const projectId   = pids.get(key)  || undefined;
      this.days().forEach(d => {
        const e = cells.get(d.date);
        // Chỉ gửi: (1) có giờ thực sự, hoặc (2) đã tồn tại trên server (có id) → để server xóa
        const hours = e?.hours ?? 0;
        const otHours = e?.otHours ?? 0;
        if (hours > 0 || otHours > 0 || e?.id) {
          entries.push({ projectKey: key, projectId, projectName, workDate: d.date, hours, otHours, note: e?.note });
        }
      });
    });
    if (!entries.length) { this.dirty.set(false); return; }
    this.saving.set(true);
    this.ts.bulkSave({ entries }, this.adminUserId).subscribe({
      next: () => {
        this.saving.set(false); this.dirty.set(false);
        this.showMsg('Đã lưu thành công!');
        this.load();
      },
      error: (err) => { this.saving.set(false); this.showMsg('Lỗi: ' + (err?.error?.message || 'Không thể lưu.')); }
    });
  }

  saveMeta() {
    const additions = Object.keys(this.additions).length ? JSON.stringify(this.additions) : undefined;
    this.ts.saveMeta(this.monthStr(), { description: this.monthDescription, additions }, this.adminUserId).subscribe({
      next: () => { this.metaDirty.set(false); this.showMsg('Đã lưu!'); },
      error: () => this.showMsg('Lỗi lưu mô tả.')
    });
  }

  private showMsg(msg: string) {
    this.saveMsg.set(msg);
    setTimeout(() => this.saveMsg.set(null), 3000);
  }

  // ── Attachments ──
  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.doUpload(file);
    (event.target as HTMLInputElement).value = '';
  }
  onDrop(event: DragEvent) {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (file) this.doUpload(file);
  }
  private doUpload(file: File) {
    this.uploading.set(true);
    const upload$ = this.adminUserId
      ? this.ts.uploadAttachmentAdmin(this.monthStr(), this.adminUserId, file)
      : this.ts.uploadAttachment(this.monthStr(), file);
    upload$.subscribe({
      next: att => { this.attachments.update(list => [att, ...list]); this.uploading.set(false); },
      error: (err) => { this.uploading.set(false); this.showMsg('Lỗi: ' + (err?.error?.message || 'Upload thất bại')); }
    });
  }

  deleteAttachment(att: TimesheetAttachment) {
    if (!confirm('Xoá tệp này?')) return;
    const del$ = this.adminUserId
      ? this.ts.deleteAttachmentAdmin(att.id)
      : this.ts.deleteAttachment(att.id);
    del$.subscribe({
      next: () => this.attachments.update(list => list.filter(a => a.id !== att.id))
    });
  }

  viewAttachment(att: TimesheetAttachment) {
    const url$ = this.adminUserId
      ? this.ts.getAttachmentUrlAdmin(att.id)
      : this.ts.getAttachmentUrl(att.id);
    url$.subscribe({ next: url => {
      this.viewer = {
        open: true, name: att.fileName, mime: att.mimeType, rawUrl: url,
        safeUrl: att.mimeType.includes('pdf') ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : url as any
      };
    }});
  }

  closeViewer() { this.viewer.open = false; }

  toggleLock() {
    const ms = this.monthStr();
    if (this.monthLocked()) {
      if (!confirm(`Mở khóa timesheet tháng ${ms}? Nhân sự sẽ có thể chỉnh sửa lại.`)) return;
      this.ts.unlockMonth(ms).subscribe({
        next: lock => { this.lockInfo.set(lock); this.monthLocked.set(false); this.showMsg('Đã mở khóa timesheet tháng ' + ms); },
        error: err => this.showMsg('Lỗi: ' + (err?.error?.message || 'Không thể mở khóa'))
      });
    } else {
      if (!confirm(`Khóa timesheet tháng ${ms}? Nhân sự sẽ không thể chỉnh sửa sau khi khóa.`)) return;
      this.ts.lockMonth(ms).subscribe({
        next: lock => { this.lockInfo.set(lock); this.monthLocked.set(true); this.showMsg('Đã khóa timesheet tháng ' + ms); },
        error: err => this.showMsg('Lỗi: ' + (err?.error?.message || 'Không thể khóa'))
      });
    }
  }
}