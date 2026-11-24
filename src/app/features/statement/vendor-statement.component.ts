import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule } from '@angular/material/dialog';
import {
  StatementService, Statement, StatementLineItem,
  StatementDailyEntry, StatementHistory
} from '../../core/services/statement.service';
import { VendorService } from '../../core/services/vendor.service';
import { AuthService } from '../../core/auth/auth.service';
import { TimesheetService } from '../../core/services/timesheet.service';
import { TimesheetLock } from '../../core/models/timesheet.models';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

type View = 'list' | 'statement' | 'daily';

interface VendorRow { id: number; name: string; statement?: Statement; }

@Component({
  selector: 'app-vendor-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDialogModule, MonthPickerComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Biên Bản Vendor</div>
          <div class="page-subtitle">Xác nhận công và chi phí trả cho vendor</div>
        </div>
        @if (view() === 'list') {
          <app-month-picker [value]="selectedMonth" (valueChange)="onMonthChanged($event)" />
        }
      </div>

      @if (view() === 'list' && !timesheetLock()?.accountantConfirmed) {
        <div class="ts-gate-banner">
          <mat-icon>warning</mat-icon>
          <div>
            <div style="font-weight:600;">Chưa thể tạo biên bản vendor</div>
            <div style="font-size:13px;margin-top:2px;">
              Timesheet tháng <strong>{{ selectedMonth }}</strong>
              @if (!timesheetLock()?.locked) { chưa được HR khóa. }
              @else { đã khóa nhưng <strong>chưa được Kế toán xác nhận</strong>. }
              Vui lòng hoàn tất bước xác nhận timesheet trước khi tạo biên bản.
            </div>
          </div>
        </div>
      }
      @if (view() === 'list' && timesheetLock()?.accountantConfirmed) {
        <div class="ts-gate-banner ts-ok">
          <mat-icon>verified_user</mat-icon>
          <span>
            Timesheet tháng <strong>{{ selectedMonth }}</strong> đã được Kế toán xác nhận — có thể tạo biên bản.
          </span>
        </div>
      }

      @if (loading()) {
        <div style="padding:60px;text-align:center;"><mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner></div>
      } @else if (view() === 'list') {
        <!-- ═══ LIST VIEW ═══════════════════════════════════════════════════ -->
        <div style="display:grid;gap:12px;">
          @for (v of vendors(); track v.id) {
            <mat-card>
              <mat-card-content style="padding:16px 20px!important;">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="flex:1;">
                    <div style="font-weight:600;font-size:15px;">{{ v.name }}</div>
                    @if (v.statement) {
                      <div style="margin-top:4px;display:flex;gap:12px;font-size:13px;color:#6b7280;">
                        <span>{{ v.statement.totalEmployees }} nhân sự</span>
                        <span>{{ v.statement.totalDaysWorked | number:'1.1-2' }} ngày</span>
                        <span style="font-weight:600;color:#dc2626;">{{ v.statement.totalAmount | number:'1.0-0' }} {{ v.statement.currency }}</span>
                      </div>
                      @if (v.statement.status === 'STALE') {
                        <div class="stale-badge">
                          <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">warning</mat-icon>
                          Lỗi thời: {{ v.statement.staleReason }}
                        </div>
                      }
                    }
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    @if (v.statement) {
                      <span [class]="'status-chip ' + v.statement.status.toLowerCase()">
                        {{ statementSvc.statusLabel(v.statement.status) }}
                      </span>
                    }
                    <button mat-stroked-button (click)="generateStatement(v)"
                            [disabled]="!timesheetLock()?.accountantConfirmed"
                            [matTooltip]="!timesheetLock()?.accountantConfirmed
                                ? 'Cần Kế toán xác nhận timesheet trước'
                                : ''">
                      <mat-icon>{{ v.statement ? 'refresh' : 'add' }}</mat-icon>
                      {{ v.statement ? 'Tạo lại' : 'Tạo biên bản' }}
                    </button>
                    @if (v.statement) {
                      <button mat-stroked-button color="primary" (click)="openStatement(v)">
                        <mat-icon>visibility</mat-icon> Xem chi tiết
                      </button>
                    }
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
          @if (vendors().length === 0) {
            <div class="empty-state"><mat-icon>store</mat-icon><p>Không có dữ liệu tháng {{ selectedMonth }}</p></div>
          }
        </div>

      } @else if (view() === 'statement') {
        <!-- ═══ STATEMENT DETAIL VIEW ════════════════════════════════════════ -->
        <button mat-stroked-button (click)="goToList()" style="margin-bottom:16px;">
          <mat-icon>arrow_back</mat-icon> Quay lại
        </button>

        <!-- STALE warning banner -->
        @if (activeStatement()?.status === 'STALE') {
          <div class="stale-banner">
            <mat-icon>warning</mat-icon>
            <div style="flex:1;">
              <strong>Biên bản đã lỗi thời</strong> — Timesheet đã được chỉnh sửa sau khi xuất.
              @if (activeStatement()?.staleReason) {
                <div style="font-size:12px;margin-top:2px;opacity:.85;">{{ activeStatement()?.staleReason }}</div>
              }
            </div>
            <button mat-stroked-button (click)="resetToDraft()" style="border-color:#fff;color:#fff;">
              <mat-icon>restart_alt</mat-icon> Reset về Nháp
            </button>
          </div>
        }

        <!-- Header card -->
        <mat-card style="margin-bottom:16px;">
          <mat-card-content style="padding:20px!important;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">
              <div>
                <div style="font-size:18px;font-weight:700;">{{ activeVendor()?.name }}</div>
                <div style="color:#6b7280;font-size:13px;margin-top:4px;">
                  Tháng {{ selectedMonth }} · {{ activeStatement()!.totalEmployees }} nhân sự ·
                  Phải trả: <strong style="color:#dc2626;">{{ activeStatement()!.totalAmount | number:'1.0-0' }} {{ activeStatement()!.currency }}</strong>
                </div>
                @if (activeStatement()?.confirmedAt) {
                  <div style="font-size:12px;color:#16a34a;margin-top:4px;">
                    ✓ Xác nhận lúc {{ activeStatement()!.confirmedAt | date:'dd/MM/yyyy HH:mm' }}
                  </div>
                }
              </div>
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                <span [class]="'status-chip ' + activeStatement()!.status.toLowerCase()">
                  {{ statementSvc.statusLabel(activeStatement()!.status) }}
                </span>
                <!-- Lịch sử -->
                <button mat-icon-button matTooltip="Lịch sử thay đổi" (click)="toggleHistory()">
                  <mat-icon>history</mat-icon>
                </button>
                <!-- Action buttons theo trạng thái -->
                @if (activeStatement()!.status === 'DRAFT' || activeStatement()!.status === 'STALE') {
                  <button mat-raised-button color="accent" (click)="exportBienban()" [disabled]="exporting()">
                    @if (exporting()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner> }
                    <mat-icon>file_download_done</mat-icon> Xuất biên bản
                  </button>
                } @else {
                  <button mat-stroked-button (click)="downloadBienban()" [disabled]="exporting()">
                    @if (exporting()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner> }
                    <mat-icon>download</mat-icon> Tải biên bản
                  </button>
                }
                @if (activeStatement()!.status === 'EXPORTED') {
                  <button mat-raised-button color="warn" (click)="markSent()">
                    <mat-icon>send</mat-icon> Đã gửi Vendor
                  </button>
                }
                @if (activeStatement()!.status === 'SENT') {
                  <button mat-raised-button color="primary" (click)="markConfirmed()"
                    style="background:#16a34a;">
                    <mat-icon>check_circle</mat-icon> Vendor xác nhận
                  </button>
                }
                @if (activeStatement()!.status === 'CONFIRMED') {
                  <button mat-raised-button style="background:#dc2626;color:#fff;" (click)="closeStatement()">
                    <mat-icon>lock</mat-icon> Đóng biên bản
                  </button>
                }
                @if (activeStatement()!.status === 'CLOSED') {
                  <span style="background:#fee2e2;color:#dc2626;padding:4px 12px;border-radius:8px;font-weight:600;font-size:13px;">
                    <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;">lock</mat-icon>
                    ĐÃ ĐÓNG
                  </span>
                  @if (authService.isStrictAdmin()) {
                    <button mat-stroked-button style="color:#059669;border-color:#059669;" (click)="reopenStatement()">
                      <mat-icon>lock_open</mat-icon> Mở lại
                    </button>
                  }
                }
              </div>
            </div>

            <!-- History panel (inline) -->
            @if (showHistory()) {
              <div class="history-panel">
                <div style="font-weight:600;font-size:13px;margin-bottom:8px;color:#374151;">Lịch sử thay đổi</div>
                @if (historyLoading()) {
                  <mat-spinner diameter="24" style="margin:0 auto;"></mat-spinner>
                } @else {
                  @for (h of history(); track h.id) {
                    <div class="history-row">
                      <div class="history-dot" [class]="'dot-' + h.toStatus.toLowerCase()"></div>
                      <div style="flex:1;">
                        <span style="font-weight:600;font-size:12px;">
                          {{ h.fromStatus ? h.fromStatus + ' → ' : '' }}{{ h.toStatus }}
                        </span>
                        <span style="color:#6b7280;font-size:11px;margin-left:8px;">
                          {{ h.changedAt | date:'dd/MM HH:mm' }}
                        </span>
                        @if (h.changeReason) {
                          <div style="font-size:11px;color:#9ca3af;">{{ h.changeReason }}</div>
                        }
                      </div>
                    </div>
                  }
                  @if (history().length === 0) {
                    <div style="color:#9ca3af;font-size:12px;">Chưa có lịch sử</div>
                  }
                }
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Line items table -->
        <mat-card>
          <mat-card-content style="padding:0;">
            <table class="stmt-table">
              <thead>
                <tr>
                  <th>STT</th><th>Mã NV</th><th>Họ tên</th>
                  <th>Giờ gốc</th><th>Giờ ĐC</th><th>Ngày ĐC</th>
                  <th>Đơn giá</th><th>TT gốc</th><th>TT ĐC</th>
                  <th>Ghi chú</th><th></th>
                </tr>
              </thead>
              <tbody>
                @for (item of activeStatement()!.lineItems; track item.id; let i = $index) {
                  <tr class="clickable-row" (click)="openDailyCalendar(item)">
                    <td>{{ i + 1 }}</td>
                    <td><code>{{ item.employeeCode }}</code></td>
                    <td style="font-weight:500;">{{ item.fullName }}</td>
                    <!-- Giờ gốc -->
                    <td style="text-align:right;color:#6b7280;">{{ item.originalHours || (item.originalDays * 8) | number:'1.1-1' }}h</td>
                    <!-- Giờ điều chỉnh — highlight nếu khác gốc -->
                    <td>
                      @if (editingItemId() === item.id) {
                        <input type="number" [(ngModel)]="editHours" min="0" max="999" step="0.5"
                          style="width:70px;padding:3px 6px;border:1.5px solid #6366f1;border-radius:5px;text-align:right;font-family:inherit;font-size:13px;"
                          (click)="$event.stopPropagation()">
                      } @else {
                        <span [class]="isHoursAdjusted(item) ? 'adjusted-value' : ''"
                              style="font-size:13px;">
                          {{ getAdjHours(item) | number:'1.1-1' }}h
                        </span>
                        @if (isHoursAdjusted(item)) {
                          <span style="font-size:10px;color:#d97706;margin-left:4px;">
                            ({{ getHoursDiff(item) > 0 ? '+' : '' }}{{ getHoursDiff(item) | number:'1.1-1' }}h)
                          </span>
                        }
                      }
                    </td>
                    <td style="text-align:right;font-size:12px;color:#9ca3af;">{{ lineItemDisplayValue(item) | number:'1.1-2' }} {{ lineItemUnitLabel(item) }}</td>
                    <td style="text-align:right;">{{ item.unitSellPrice | number:'1.0-0' }}</td>
                    <td style="text-align:right;color:#6b7280;">{{ item.originalAmount | number:'1.0-0' }}</td>
                    <td style="text-align:right;font-weight:600;color:#dc2626;">{{ item.adjustedAmount | number:'1.0-0' }}</td>
                    <td>
                      @if (editingItemId() === item.id) {
                        <input [(ngModel)]="editNote" placeholder="Ghi chú..."
                          style="width:120px;padding:3px 6px;border:1.5px solid #6366f1;border-radius:5px;font-family:inherit;font-size:12px;"
                          (click)="$event.stopPropagation()">
                      } @else {
                        <span style="font-size:12px;color:#6b7280;">{{ item.note || '' }}</span>
                      }
                    </td>
                    <td>
                      @if (activeStatement()!.status === 'DRAFT' || activeStatement()!.status === 'STALE' || activeStatement()!.status === 'CLOSED') {
                        @if (editingItemId() === item.id) {
                          <button mat-icon-button color="primary" (click)="$event.stopPropagation(); saveLineItem(item)" matTooltip="Lưu">
                            <mat-icon>check</mat-icon>
                          </button>
                          <button mat-icon-button (click)="$event.stopPropagation(); editingItemId.set(null)" matTooltip="Hủy">
                            <mat-icon>close</mat-icon>
                          </button>
                        } @else if (activeStatement()!.status !== 'CLOSED') {
                          <button mat-icon-button (click)="$event.stopPropagation(); startEditItem(item)" matTooltip="Chỉnh giờ">
                            <mat-icon>edit</mat-icon>
                          </button>
                        }
                      }
                      <button mat-icon-button color="primary" (click)="$event.stopPropagation(); openDailyCalendar(item)"
                        matTooltip="Chi tiết theo ngày">
                        <mat-icon>calendar_view_day</mat-icon>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="8" style="text-align:right;font-weight:700;padding:12px 16px;">TỔNG CỘNG</td>
                  <td style="font-weight:700;color:#dc2626;font-size:15px;text-align:right;padding:12px 16px;">
                    {{ activeStatement()!.totalAmount | number:'1.0-0' }}
                  </td>
                  <td colspan="2"></td>
                </tr>
              </tfoot>
            </table>
          </mat-card-content>
        </mat-card>

      } @else if (view() === 'daily') {
        <!-- ═══ DAILY CALENDAR VIEW ══════════════════════════════════════════ -->
        <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;">
          <button mat-stroked-button (click)="goToStatement()">
            <mat-icon>arrow_back</mat-icon> Quay lại biên bản
          </button>
          <button mat-stroked-button (click)="regenerateDaily()" [disabled]="calendarLoading()">
            <mat-icon>refresh</mat-icon> Tạo lại từ nội bộ
          </button>
        </div>

        <mat-card style="margin-bottom:16px;">
          <mat-card-content style="padding:16px 20px!important;">
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
              <div>
                <div style="font-size:16px;font-weight:700;">{{ activeLineItem()?.fullName }}</div>
                <div style="color:#6b7280;font-size:13px;">
                  <code>{{ activeLineItem()?.employeeCode }}</code> ·
                  Vendor: <strong>{{ activeVendor()?.name }}</strong> · Tháng {{ selectedMonth }}
                </div>
                @if (activePeriods().length > 0) {
                  <div class="period-info">
                    <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">date_range</mat-icon>
                    Thời gian thuê vendor: <strong>{{ formatPeriods(activePeriods()) }}</strong>
                  </div>
                }
                @if (activeLineItem()?.hasOrphanTimesheet) {
                  <div class="orphan-warning">
                    <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">warning</mat-icon>
                    Có ngày nội bộ ngoài thời gian hợp đồng vendor — các ngày đó sẽ không tính chi phí vendor.
                  </div>
                }
              </div>
              <div style="margin-left:auto;text-align:right;">
                <div style="font-size:12px;color:#6b7280;">Giờ điều chỉnh</div>
                <div style="font-size:20px;font-weight:700;color:#dc2626;">
                  {{ getAdjHours(activeLineItem()!) | number:'1.1-1' }}h
                </div>
                <div style="font-size:11px;color:#9ca3af;">
                  = {{ lineItemDisplayValue(activeLineItem()!) | number:'1.1-2' }} {{ lineItemUnitLabel(activeLineItem()!) }}
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        @if (calendarLoading()) {
          <div style="padding:40px;text-align:center;"><mat-spinner diameter="32" style="margin:0 auto;"></mat-spinner></div>
        } @else {
          <mat-card>
            <mat-card-content style="padding:0;">
              <table class="cal-table">
                <thead>
                  <tr>
                    <th>Ngày</th><th>Thứ</th><th>Giờ nội bộ</th><th>Giờ Vendor</th>
                    <th>Nghỉ phép</th><th>Ghi chú</th><th></th>
                  </tr>
                </thead>
                <tbody>
                  @for (day of dailyCalendar(); track day.workDate) {
                    <tr [class.leave-full]="day.leaveDay && !day.halfLeave"
                        [class.leave-half]="day.halfLeave"
                        [class.weekend]="day.weekend && !day.leaveDay"
                        [class.row-out-of-period]="!isDateInAnyPeriod(day.workDate)"
                        [matTooltip]="!isDateInAnyPeriod(day.workDate) ? 'Ngoài thời gian hợp đồng vendor' : ''">
                      <td style="font-size:12px;color:#6b7280;">{{ day.workDate | date:'dd/MM' }}</td>
                      <td style="font-size:11px;color:#9ca3af;">{{ day.dayOfWeek }}</td>
                      <td style="text-align:right;color:#6b7280;">
                        {{ day.internalHours > 0 ? day.internalHours : '' }}
                      </td>
                      <td style="text-align:right;">
                        @if (editingDate() === day.workDate) {
                          <input type="number" [(ngModel)]="editDayHours" min="0" max="24" step="0.5"
                            style="width:65px;padding:3px 6px;border:1.5px solid #6366f1;border-radius:5px;text-align:right;font-family:inherit;font-size:13px;">
                        } @else {
                          <span [style.color]="day.customerHours !== day.internalHours ? '#d97706' : '#374151'"
                                [style.fontWeight]="day.customerHours !== day.internalHours ? '600' : '400'">
                            {{ day.customerHours > 0 || day.leaveDay ? day.customerHours : '' }}
                          </span>
                        }
                      </td>
                      <td style="font-size:12px;">
                        @if (day.leaveDay) {
                          <span [class]="'leave-chip ' + (day.paidLeave ? 'paid' : 'unpaid')">
                            {{ day.halfLeave ? '½' : '' }} {{ day.leaveTypeName || 'Nghỉ phép' }}
                          </span>
                        }
                      </td>
                      <td>
                        @if (editingDate() === day.workDate) {
                          <input [(ngModel)]="editDayNote"
                            style="width:140px;padding:3px 6px;border:1.5px solid #6366f1;border-radius:5px;font-family:inherit;font-size:13px;"
                            placeholder="Ghi chú...">
                        } @else {
                          <span style="font-size:12px;color:#6b7280;">{{ day.accountantNote || '' }}</span>
                        }
                      </td>
                      <td>
                        @if ((activeStatement()!.status === 'DRAFT' || activeStatement()!.status === 'STALE') && !day.weekend && isDateInAnyPeriod(day.workDate)) {
                          @if (editingDate() === day.workDate) {
                            <button mat-icon-button color="primary" (click)="saveDay(day)" matTooltip="Lưu"><mat-icon>check</mat-icon></button>
                            <button mat-icon-button (click)="editingDate.set(null)" matTooltip="Hủy"><mat-icon>close</mat-icon></button>
                          } @else {
                            <button mat-icon-button (click)="startEditDay(day)" matTooltip="Chỉnh sửa"><mat-icon>edit</mat-icon></button>
                          }
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </mat-card-content>
          </mat-card>
        }
      }
    </div>
  `,
  styles: [`
    .status-chip {
      display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;
      &.draft    { background:#F3F4F6;color:#6B7280; }
      &.exported { background:#FEF3C7;color:#92400E; }
      &.sent     { background:#FEE2E2;color:#DC2626; }
      &.confirmed{ background:#DCFCE7;color:#16A34A; }
      &.closed   { background:#FEE2E2;color:#DC2626; }
      &.stale    { background:#FEE2E2;color:#DC2626; }
    }
    .stale-badge {
      display:inline-flex;align-items:center;gap:4px;
      padding:2px 8px;border-radius:8px;background:#FEE2E2;color:#991B1B;
      font-size:11px;font-weight:600;margin-top:4px;
    }
    .stale-banner {
      display:flex;align-items:center;gap:12px;
      background:#DC2626;color:#fff;padding:12px 16px;border-radius:10px;margin-bottom:12px;
      mat-icon { color:#fff; }
    }
    .adjusted-value { color:#D97706;font-weight:700; }
    .stmt-table { width:100%;border-collapse:collapse; }
    .stmt-table th,.cal-table th { background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;padding:10px 14px;border-bottom:1px solid #e5e7eb; }
    .stmt-table td,.cal-table td { padding:9px 14px;border-bottom:1px solid #f3f4f6;font-size:13.5px;color:#374151; }
    .stmt-table tfoot td { border-top:2px solid #e5e7eb;border-bottom:none; }
    .stmt-table tr:hover td,.cal-table tr:hover td { background:#f8faff; }
    .cal-table { width:100%;border-collapse:collapse; }
    .clickable-row { cursor:pointer; }
    .leave-full td { background:#FFF1F2 !important; }
    .leave-half td { background:#FFFBEB !important; }
    .weekend td { background:#F9FAFB !important;color:#9CA3AF; }
    .leave-chip {
      display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;
      &.paid { background:#DCFCE7;color:#166534; }
      &.unpaid { background:#FEE2E2;color:#991B1B; }
    }
    .empty-state { text-align:center;padding:60px;color:#9CA3AF; mat-icon { font-size:48px;width:48px;height:48px; } }
    /* TS gate banner */
    .ts-gate-banner {
      display:flex; gap:12px; align-items:center;
      padding:12px 16px; border-radius:10px; margin-bottom:14px;
      background:#FFFBEB; border:1px solid #FCD34D; color:#92400E;
      mat-icon { color:#F59E0B; flex-shrink:0; }
      &.ts-ok {
        background:#ECFDF5; border-color:#6EE7B7; color:#065F46;
        mat-icon { color:#10B981; }
      }
    }
    /* History panel */
    .history-panel {
      margin-top:16px;padding:12px;background:#F9FAFB;border-radius:8px;border:1px solid #E5E7EB;
    }
    .history-row {
      display:flex;align-items:flex-start;gap:8px;padding:6px 0;
      border-bottom:1px solid #F3F4F6;
      &:last-child { border-bottom:none; }
    }
    .history-dot {
      width:10px;height:10px;border-radius:50%;margin-top:3px;flex-shrink:0;
      &.dot-draft    { background:#9CA3AF; }
      &.dot-exported { background:#F59E0B; }
      &.dot-sent     { background:#EF4444; }
      &.dot-confirmed{ background:#22C55E; }
      &.dot-closed   { background:#DC2626; }
      &.dot-stale    { background:#EF4444; }
    }
    /* Period & orphan info trong summary card */
    .period-info {
      margin-top:6px;font-size:12px;color:#1565c0;
      display:flex;align-items:center;gap:4px;
    }
    .orphan-warning {
      margin-top:6px;padding:6px 10px;border-radius:6px;
      background:#FFFBEB;border:1px solid #FCD34D;color:#92400E;
      font-size:12px;font-weight:500;
      display:flex;align-items:center;gap:6px;
    }
    /* Out-of-period: ngày không thuộc thời gian thuê vendor */
    .row-out-of-period td {
      background:repeating-linear-gradient(
        45deg, #F3F4F6, #F3F4F6 4px, #E5E7EB 4px, #E5E7EB 6px
      ) !important;
      color:#9CA3AF !important;
    }
  `]
})
export class VendorStatementComponent implements OnInit {
  statementSvc = inject(StatementService);
  private vendorService = inject(VendorService);
  private timesheetSvc = inject(TimesheetService);
  private snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  selectedMonth = new Date().toISOString().slice(0, 7);

  readonly view = signal<View>('list');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly calendarLoading = signal(false);
  readonly vendors = signal<VendorRow[]>([]);
  readonly timesheetLock = signal<TimesheetLock | null>(null);
  readonly activeStatement = signal<Statement | null>(null);
  readonly activeVendor = signal<VendorRow | null>(null);
  readonly activeLineItem = signal<StatementLineItem | null>(null);
  readonly dailyCalendar = signal<StatementDailyEntry[]>([]);
  readonly editingDate = signal<string | null>(null);
  readonly editingItemId = signal<number | null>(null);
  readonly showHistory = signal(false);
  readonly history = signal<StatementHistory[]>([]);
  readonly historyLoading = signal(false);

  /** Các khoảng phân công của line item đang mở (cho vendor này). */
  readonly activePeriods = computed(() => this.activeLineItem()?.periods ?? []);

  // Day-level editing
  editDayHours = 0;
  editDayNote = '';
  // Line item editing
  editHours = 0;
  editNote = '';

  ngOnInit() { this.load(); }

  onMonthChanged(val: string) { this.selectedMonth = val; this.load(); }

  load() {
    this.loading.set(true);
    this.view.set('list');
    // Lock status cho gating FE
    this.timesheetSvc.getLockStatus(this.selectedMonth).subscribe({
      next: lock => this.timesheetLock.set(lock),
      error: () => this.timesheetLock.set(null)
    });
    this.vendorService.list({ size: 100 }).subscribe({
      next: page => {
        const allVendors = page.content || [];
        this.statementSvc.listVendorStatements(this.selectedMonth).subscribe({
          next: statements => {
            const stmtMap = new Map(statements.map(s => [s.recipientId, s]));
            this.vendors.set(allVendors.map((v: any) => ({ id: v.id, name: v.name, statement: stmtMap.get(v.id) })));
            this.loading.set(false);
          },
          error: () => {
            this.vendors.set(allVendors.map((v: any) => ({ id: v.id, name: v.name })));
            this.loading.set(false);
          }
        });
      },
      error: () => this.loading.set(false)
    });
  }

  generateStatement(v: VendorRow) {
    const lock = this.timesheetLock();
    if (!lock?.accountantConfirmed) {
      this.snackBar.open(
        'Timesheet tháng ' + this.selectedMonth + ' chưa được Kế toán xác nhận. Vui lòng xác nhận timesheet trước.',
        'X', { duration: 5000 }
      );
      return;
    }
    this.loading.set(true);
    const inflightSnack = this.snackBar.open(
      'Đang đồng bộ phân công và tính lại chi phí…', '', { duration: 0 }
    );
    this.statementSvc.generateVendorStatement(v.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.vendors.update(list => list.map(x => x.id === v.id ? { ...x, statement: stmt } : x));
        this.loading.set(false);
        inflightSnack.dismiss();
        this.snackBar.open(`Đã tạo biên bản vendor · ${stmt.totalEmployees} nhân sự`, 'OK', { duration: 2500 });
      },
      error: (err: any) => {
        this.loading.set(false);
        inflightSnack.dismiss();
        this.snackBar.open('Lỗi: ' + (err?.error?.message || err?.error?.error || 'Không thể tạo biên bản'), 'X', { duration: 5000 });
      }
    });
  }

  openStatement(v: VendorRow) {
    this.loading.set(true);
    this.showHistory.set(false);
    this.statementSvc.getVendorStatement(v.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.activeVendor.set(v);
        this.view.set('statement');
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Line item hours editing ────────────────────────────────────────────────

  startEditItem(item: StatementLineItem) {
    this.editingItemId.set(item.id);
    this.editHours = this.getAdjHours(item);
    this.editNote = item.note || '';
  }

  saveLineItem(item: StatementLineItem) {
    const v = this.activeVendor()!;
    this.statementSvc.updateVendorLineItem(v.id, this.selectedMonth, item.id, {
      adjustedHours: this.editHours,
      note: this.editNote
    }).subscribe({
      next: updated => {
        this.activeStatement.update(s => s ? {
          ...s,
          lineItems: s.lineItems.map(li => li.id === updated.id ? updated : li),
          totalAmount: s.lineItems.reduce((sum, li) =>
            sum + (li.id === updated.id ? updated.adjustedAmount : li.adjustedAmount), 0)
        } : s);
        this.editingItemId.set(null);
        this.snackBar.open('Đã lưu điều chỉnh giờ', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Lỗi lưu', 'X', { duration: 3000 })
    });
  }

  // ── Status transitions ────────────────────────────────────────────────────

  /** Xuất biên bản: tạo Excel (đúng format) + chuyển status → EXPORTED */
  exportBienban() {
    const v = this.activeVendor()!;
    this.exporting.set(true);
    this.statementSvc.exportVendorExcel(v.id, this.selectedMonth).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bienban_vendor_${v.name}_${this.selectedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.exporting.set(false);
        this.snackBar.open('Xuất biên bản thành công! Trạng thái → Đã xuất', 'OK', { duration: 3500 });
        this.refreshActiveStatement();
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open('Lỗi xuất biên bản', 'X', { duration: 3000 });
      }
    });
  }

  /** Tải lại biên bản (EXPORTED/SENT/CONFIRMED) — không đổi trạng thái */
  downloadBienban() {
    const v = this.activeVendor()!;
    this.exporting.set(true);
    this.statementSvc.exportVendorExcel(v.id, this.selectedMonth).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bienban_vendor_${v.name}_${this.selectedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.exporting.set(false);
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open('Lỗi tải biên bản', 'X', { duration: 3000 });
      }
    });
  }

  private refreshActiveStatement() {
    const v = this.activeVendor();
    if (!v) return;
    this.statementSvc.getVendorStatement(v.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.vendors.update(list => list.map(row =>
          row.id === v.id ? { ...row, statement: stmt } : row
        ));
      }
    });
  }

  markSent() {
    const v = this.activeVendor()!;
    if (!confirm(`Đánh dấu biên bản vendor ${v.name} tháng ${this.selectedMonth} là Đã gửi?`)) return;
    this.statementSvc.markVendorSent(v.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã đánh dấu gửi', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  markConfirmed() {
    const v = this.activeVendor()!;
    if (!confirm(`Xác nhận Vendor ${v.name} đã xác nhận biên bản tháng ${this.selectedMonth}?`)) return;
    this.statementSvc.markVendorConfirmed(v.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã xác nhận', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  resetToDraft() {
    const v = this.activeVendor()!;
    if (!confirm('Reset biên bản về Nháp để tái tạo sau khi timesheet bị chỉnh?')) return;
    this.statementSvc.resetVendorDraft(v.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã reset về Nháp', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  closeStatement() {
    const v = this.activeVendor()!;
    const reason = prompt('Nhập lý do đóng biên bản (tùy chọn):');
    if (reason === null) return; // user cancelled
    if (!confirm(`Đóng biên bản Vendor ${v.name} tháng ${this.selectedMonth}?\n\nSau khi đóng, timesheet sẽ bị khóa hoàn toàn.`)) return;
    this.statementSvc.closeVendor(v.id, this.selectedMonth, reason || undefined).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.snackBar.open('Đã đóng biên bản — timesheet đã bị khóa', 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }

  reopenStatement() {
    const v = this.activeVendor()!;
    const reason = prompt('Nhập lý do mở lại biên bản (bắt buộc):');
    if (!reason) {
      this.snackBar.open('Phải nhập lý do mở lại', 'X', { duration: 3000 });
      return;
    }
    if (!confirm(`Mở lại biên bản Vendor ${v.name} tháng ${this.selectedMonth}?\n\nTimesheet sẽ được mở khóa.`)) return;
    this.statementSvc.reopenVendor(v.id, this.selectedMonth, reason).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.snackBar.open('Đã mở lại biên bản', 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }

  // ── History ───────────────────────────────────────────────────────────────

  toggleHistory() {
    if (this.showHistory()) {
      this.showHistory.set(false);
      return;
    }
    this.showHistory.set(true);
    this.historyLoading.set(true);
    const v = this.activeVendor()!;
    this.statementSvc.getVendorHistory(v.id, this.selectedMonth).subscribe({
      next: h => { this.history.set(h); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false)
    });
  }

  // ── Daily calendar ────────────────────────────────────────────────────────

  openDailyCalendar(item: StatementLineItem) {
    this.activeLineItem.set(item);
    this.view.set('daily');
    this.calendarLoading.set(true);
    this.editingDate.set(null);
    this.statementSvc.getLineItemDailyCalendar(item.id, this.selectedMonth).subscribe({
      next: days => { this.dailyCalendar.set(days); this.calendarLoading.set(false); },
      error: () => { this.calendarLoading.set(false); this.snackBar.open('Lỗi tải lịch', 'X', { duration: 3000 }); }
    });
  }

  regenerateDaily() {
    const item = this.activeLineItem()!;
    this.calendarLoading.set(true);
    this.statementSvc.generateLineItemDaily(item.id, this.selectedMonth).subscribe({
      next: days => {
        this.dailyCalendar.set(days);
        this.calendarLoading.set(false);
        this.snackBar.open('Đã tạo lại dữ liệu theo ngày', 'OK', { duration: 2000 });
        this.refreshStatement();
      },
      error: () => { this.calendarLoading.set(false); this.snackBar.open('Lỗi', 'X', { duration: 3000 }); }
    });
  }

  startEditDay(day: StatementDailyEntry) {
    this.editingDate.set(day.workDate);
    this.editDayHours = day.customerHours;
    this.editDayNote = day.accountantNote || '';
  }

  saveDay(day: StatementDailyEntry) {
    const item = this.activeLineItem()!;
    this.statementSvc.updateDailyEntry(item.id, day.workDate, { hours: this.editDayHours, note: this.editDayNote }).subscribe({
      next: updated => {
        this.dailyCalendar.update(days => days.map(d => d.workDate === updated.workDate ? updated : d));
        this.editingDate.set(null);
        this.snackBar.open('Đã lưu', 'OK', { duration: 2000 });
        this.refreshStatement();
      },
      error: () => this.snackBar.open('Lỗi cập nhật', 'X', { duration: 3000 })
    });
  }

  private refreshStatement() {
    const v = this.activeVendor()!;
    this.statementSvc.getVendorStatement(v.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        const updatedItem = stmt.lineItems.find(li => li.id === this.activeLineItem()?.id);
        if (updatedItem) this.activeLineItem.set(updatedItem);
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Giá trị hiển thị: giờ (HOURLY) hoặc ngày (DAILY/MONTHLY) */
  lineItemDisplayValue(item: StatementLineItem): number {
    return item.priceUnit === 'HOURLY'
      ? (item.adjustedHours ?? item.adjustedDays * (item.hoursPerDay || 8))
      : item.adjustedDays;
  }
  lineItemUnitLabel(item: StatementLineItem): string {
    return item.priceUnit === 'HOURLY' ? 'giờ' : 'ngày';
  }

  getAdjHours(item: StatementLineItem): number {
    return item.adjustedHours ?? (item.adjustedDays * (item.hoursPerDay || 8));
  }

  isHoursAdjusted(item: StatementLineItem): boolean {
    const orig = item.originalHours ?? (item.originalDays * (item.hoursPerDay || 8));
    return Math.abs(this.getAdjHours(item) - orig) > 0.01;
  }

  getHoursDiff(item: StatementLineItem): number {
    const orig = item.originalHours ?? (item.originalDays * (item.hoursPerDay || 8));
    return this.getAdjHours(item) - orig;
  }

  goToList() { this.view.set('list'); this.activeStatement.set(null); this.activeVendor.set(null); }
  goToStatement() { this.view.set('statement'); this.activeLineItem.set(null); this.editingDate.set(null); }

  /** Ngày `date` (yyyy-MM-dd) có nằm trong ít nhất 1 period thuê vendor này không? */
  isDateInAnyPeriod(date: string): boolean {
    const periods = this.activePeriods();
    if (periods.length === 0) return true; // không có thông tin period → fallback: cho phép tất cả
    for (const p of periods) {
      if (date >= p.startDate && date <= p.endDate) return true;
    }
    return false;
  }

  /** Format danh sách period thành chuỗi VD: "01/04 → 14/04, 20/04 → 30/04". */
  formatPeriods(periods: { startDate: string; endDate: string }[]): string {
    if (!periods || periods.length === 0) return '—';
    return periods.map(p => `${this.fmtDmShort(p.startDate)} → ${this.fmtDmShort(p.endDate)}`).join(', ');
  }

  private fmtDmShort(d: string): string {
    if (!d || d.length < 10) return d;
    return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  }
}
