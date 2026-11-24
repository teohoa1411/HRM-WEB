import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
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
import { CustomerService } from '../../core/services/customer.service';
import { AuthService } from '../../core/auth/auth.service';
import { TimesheetService } from '../../core/services/timesheet.service';
import { TimesheetLock, TimesheetEntry } from '../../core/models/timesheet.models';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

type View = 'list' | 'statement' | 'daily';

interface CustomerRow { id: number; name: string; statement?: Statement; }

@Component({
  selector: 'app-customer-statement',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatDialogModule, MonthPickerComponent],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Biên Bản Khách Hàng</div>
          <div class="page-subtitle">Xác nhận công và doanh thu gửi khách hàng</div>
        </div>
        @if (view() === 'list') {
          <app-month-picker [value]="selectedMonth" (valueChange)="onMonthChanged($event)" />
        }
      </div>

      @if (view() === 'list' && !timesheetLock()?.locked) {
        <div class="ts-gate-banner">
          <mat-icon>warning</mat-icon>
          <div>
            <div style="font-weight:600;">Chưa thể tạo biên bản</div>
            <div style="font-size:13px;margin-top:2px;">
              Timesheet tháng <strong>{{ selectedMonth }}</strong>
              @if (!timesheetLock()?.locked) { chưa được HR khóa. }
              Vui lòng yêu cầu HR khóa timesheet trước khi tạo biên bản.
            </div>
          </div>
        </div>
      }
      @if (view() === 'list' && timesheetLock()?.locked) {
        <div class="ts-gate-banner ts-ok">
          <mat-icon>verified_user</mat-icon>
          <span>
              Timesheet tháng <strong>{{ selectedMonth }}</strong> đã được khóa — có thể tạo biên bản. Không cần chờ Kế toán xác nhận.
          </span>
        </div>
      }

      @if (loading()) {
        <div style="padding:60px;text-align:center;"><mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner></div>
      } @else if (view() === 'list') {
        <!-- ═══ LIST VIEW ═══════════════════════════════════════════════════ -->
        <div style="display:grid;gap:12px;">
          @for (c of customers(); track c.id) {
            <mat-card>
              <mat-card-content style="padding:16px 20px!important;">
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
                  <div style="flex:1;">
                    <div style="font-weight:600;font-size:15px;">{{ c.name }}</div>
                    @if (c.statement) {
                      <div style="margin-top:4px;display:flex;gap:12px;font-size:13px;color:#6b7280;">
                        <span>{{ c.statement.totalEmployees }} nhân sự</span>
                        <span>{{ c.statement.totalDaysWorked | number:'1.1-2' }} ngày</span>
                        <span style="font-weight:600;color:#1565c0;">{{ c.statement.totalAmount | number:'1.0-0' }} {{ c.statement.currency }}</span>
                      </div>
                      @if (c.statement.status === 'STALE') {
                        <div class="stale-badge">
                          <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">warning</mat-icon>
                          Lỗi thời: {{ c.statement.staleReason }}
                        </div>
                      }
                    }
                  </div>
                  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
                    @if (c.statement) {
                      <span [class]="'status-chip ' + c.statement.status.toLowerCase()">
                        {{ statementSvc.statusLabel(c.statement.status) }}
                      </span>
                    }
                    <button mat-stroked-button (click)="generateStatement(c)"
                            [disabled]="!timesheetLock()?.locked"
                            [matTooltip]="!timesheetLock()?.locked
                                ? 'Cần HR khóa timesheet trước'
                                : ''">
                      <mat-icon>{{ c.statement ? 'refresh' : 'add' }}</mat-icon>
                      {{ c.statement ? 'Tạo lại' : 'Tạo biên bản' }}
                    </button>
                    @if (c.statement) {
                      <button mat-stroked-button color="primary" (click)="openStatement(c)">
                        <mat-icon>visibility</mat-icon> Xem chi tiết
                      </button>
                    }
                  </div>
                </div>
              </mat-card-content>
            </mat-card>
          }
          @if (customers().length === 0) {
            <div class="empty-state"><mat-icon>business</mat-icon><p>Không có dữ liệu tháng {{ selectedMonth }}</p></div>
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
                <div style="font-size:18px;font-weight:700;">{{ activeCustomer()?.name }}</div>
                <div style="color:#6b7280;font-size:13px;margin-top:4px;">
                  Tháng {{ selectedMonth }} · {{ activeStatement()!.totalEmployees }} nhân sự ·
                  Tổng: <strong style="color:#1565c0;">{{ activeStatement()!.totalAmount | number:'1.0-0' }} {{ activeStatement()!.currency }}</strong>
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
                  <!-- DRAFT/STALE: Xuất biên bản = tạo file + chuyển trạng thái EXPORTED -->
                  <button mat-raised-button color="accent" (click)="exportBienban()" [disabled]="exporting()">
                    @if (exporting()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner> }
                    <mat-icon>file_download_done</mat-icon> Xuất biên bản
                  </button>
                } @else {
                  <!-- Đã xuất rồi: chỉ tải lại file, không đổi trạng thái -->
                  <button mat-stroked-button (click)="downloadBienban()" [disabled]="exporting()">
                    @if (exporting()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner> }
                    <mat-icon>download</mat-icon> Tải biên bản
                  </button>
                }
                @if (activeStatement()!.status === 'EXPORTED') {
                  <button mat-raised-button color="primary" (click)="markSent()">
                    <mat-icon>send</mat-icon> Đã gửi KH
                  </button>
                }
                @if (activeStatement()!.status === 'SENT') {
                  <button mat-raised-button color="primary" (click)="markConfirmed()"
                    style="background:#16a34a;">
                    <mat-icon>check_circle</mat-icon> KH xác nhận
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
                  <th>Giờ gốc</th><th>Giờ ĐC</th>
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
                    <!-- Giờ điều chỉnh được tổng hợp từ lịch giờ theo ngày -->
                    <td>
                      <span [class]="isHoursAdjusted(item) ? 'adjusted-value' : ''"
                            style="font-size:13px;">
                        {{ getAdjHours(item) | number:'1.1-1' }}h
                      </span>
                      @if (isHoursAdjusted(item)) {
                        <span style="font-size:10px;color:#d97706;margin-left:4px;">
                          ({{ getHoursDiff(item) > 0 ? '+' : '' }}{{ getHoursDiff(item) | number:'1.1-1' }}h)
                        </span>
                      }
                    </td>
                    <td style="text-align:right;">{{ item.unitSellPrice | number:'1.0-0' }}</td>
                    <td style="text-align:right;color:#6b7280;">{{ item.originalAmount | number:'1.0-0' }}</td>
                    <td style="text-align:right;font-weight:600;color:#1565c0;">{{ item.adjustedAmount | number:'1.0-0' }}</td>
                    <td>
                      <span style="font-size:12px;color:#6b7280;">{{ item.note || '' }}</span>
                    </td>
                    <td>
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
                  <td colspan="7" style="text-align:right;font-weight:700;padding:12px 16px;">TỔNG CỘNG</td>
                  <td style="font-weight:700;color:#1565c0;font-size:15px;text-align:right;padding:12px 16px;">
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
            <mat-icon>refresh</mat-icon> Tạo lại từ timesheet
          </button>
        </div>

        <mat-card style="margin-bottom:16px;">
          <mat-card-content style="padding:16px 20px!important;">
            <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap;">
              <div>
                <div style="font-size:16px;font-weight:700;">{{ activeLineItem()?.fullName }}</div>
                <div style="color:#6b7280;font-size:13px;">
                  <code>{{ activeLineItem()?.employeeCode }}</code> ·
                  KH: <strong>{{ activeCustomer()?.name }}</strong> · Tháng {{ selectedMonth }}
                </div>
                @if (activePeriods().length > 0) {
                  <div class="period-info">
                    <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">date_range</mat-icon>
                    Phân công cho KH này: <strong>{{ formatPeriods(activePeriods()) }}</strong>
                  </div>
                }
                @if (activeLineItem()?.hasOrphanTimesheet) {
                  <div class="orphan-warning">
                    <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">warning</mat-icon>
                    Có timesheet log ngoài thời gian phân công cho KH này — các ngày đó sẽ không tính tiền.
                  </div>
                }
              </div>
              <div style="margin-left:auto;text-align:right;">
                <div style="font-size:12px;color:#6b7280;">Giờ điều chỉnh</div>
                <div style="font-size:20px;font-weight:700;color:#1565c0;">
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
          <!-- ── SECTION A: Read-only timesheet matrix (project × day) ── -->
          <mat-card style="margin-bottom:12px;">
            <mat-card-content style="padding:0;">
              <div class="section-header section-a">
                <div class="section-title">A · Timesheet nhân viên <span class="section-tag">chỉ đọc</span></div>
                <div class="section-sub">Giờ thực do nhân viên log theo từng dự án (raw timesheet). Tổng giờ mỗi ngày là mặc định cho "Giờ KH" bên dưới.</div>
              </div>
              <div class="matrix-wrap">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th class="th-project sticky-left">Dự án</th>
                      <th class="th-total sticky-left2">Tổng</th>
                      @for (d of dailyCalendar(); track d.workDate) {
                        @if (!d.leaveDay) {
                          <th [class.weekend-col]="d.weekend">
                            <div class="dow">{{ d.dayOfWeek }}</div>
                            <div class="dom">{{ d.workDate.slice(8, 10) }}</div>
                          </th>
                        }
                      }
                    </tr>
                  </thead>
                  <tbody>
                    @for (pk of projectKeys(); track pk) {
                      <tr>
                        <td class="td-project sticky-left"><code>{{ pk }}</code></td>
                        <td class="td-total sticky-left2">
                          <div class="total-pill">{{ projectRegularTotal(pk) | number:'1.0-1' }}</div>
                          @if (projectOtTotal(pk) > 0) {
                            <div class="ot-pill">+{{ projectOtTotal(pk) | number:'1.0-1' }}</div>
                          }
                        </td>
                        @for (d of dailyCalendar(); track d.workDate) {
                          @if (!d.leaveDay) {
                            <td [class.weekend-col]="d.weekend"
                                [class.cell-out-of-period]="!isDateInAnyPeriod(d.workDate)"
                                [matTooltip]="!isDateInAnyPeriod(d.workDate) ? 'Ngoài thời gian phân công cho KH này' : ''">
                              @if (cellRegularHours(pk, d.workDate) > 0 || cellOtHours(pk, d.workDate) > 0) {
                                <div class="cell-filled">
                                  <span class="cell-h">{{ cellRegularHours(pk, d.workDate) || '' }}</span>
                                  @if (cellOtHours(pk, d.workDate) > 0) {
                                    <span class="cell-ot">+{{ cellOtHours(pk, d.workDate) }}</span>
                                  }
                                </div>
                              }
                            </td>
                          }
                        }
                      </tr>
                    }
                    @if (projectKeys().length === 0) {
                      <tr>
                        <td [attr.colspan]="nonLeaveDays().length + 2" style="text-align:center;color:#9ca3af;padding:20px;">
                          Nhân viên chưa log timesheet trong tháng này
                        </td>
                      </tr>
                    }
                    <tr class="total-row">
                      <td class="td-project sticky-left"><strong>TỔNG TIMESHEET</strong></td>
                      <td class="td-total sticky-left2">
                        <div class="total-pill grand">{{ totalRegularInternal() | number:'1.0-1' }}</div>
                        @if (totalOtInternal() > 0) {
                          <div class="ot-pill">+{{ totalOtInternal() | number:'1.0-1' }}</div>
                        }
                      </td>
                      @for (d of dailyCalendar(); track d.workDate) {
                        @if (!d.leaveDay) {
                          <td [class.weekend-col]="d.weekend">
                            @if (dayRegularTotal(d.workDate) > 0 || dayOtTotal(d.workDate) > 0) {
                              <div class="cell-filled">
                                <strong class="cell-h">{{ dayRegularTotal(d.workDate) || '' }}</strong>
                                @if (dayOtTotal(d.workDate) > 0) {
                                  <span class="cell-ot">+{{ dayOtTotal(d.workDate) }}</span>
                                }
                              </div>
                            }
                          </td>
                        }
                      }
                    </tr>
                  </tbody>
                </table>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- ── SECTION B: Single editable row "Giờ KH" ── -->
          <mat-card style="margin-bottom:12px;">
            <mat-card-content style="padding:0;">
              <div class="section-header section-b">
                <div class="section-title" style="color:#9a3412;">
                  B · Giờ tính tiền khách hàng
                  @if (canEditAny()) {
                    <span class="section-tag" style="background:#FED7AA;color:#9a3412;">click ô để sửa</span>
                  } @else {
                    <span class="section-tag" style="background:#E5E7EB;color:#6B7280;">đã khóa ({{ statementSvc.statusLabel(activeStatement()!.status) }})</span>
                  }
                </div>
                <div class="section-sub" style="color:#c2410c;">
                  Mặc định = tổng giờ timesheet. Kế toán có thể chỉnh khi có thỏa thuận miễn phí với KH ngày đó (VD: 14/01 timesheet 8h → KH 0h).
                  Khác giờ timesheet → bắt buộc nhập ghi chú lý do.
                </div>
              </div>
              <div class="matrix-wrap">
                <table class="matrix-table">
                  <thead>
                    <tr>
                      <th class="th-project sticky-left">Loại</th>
                      <th class="th-total sticky-left2">Tổng</th>
                      @for (d of dailyCalendar(); track d.workDate) {
                        <th [class.weekend-col]="d.weekend" [class.leave-col]="d.leaveDay">
                          <div class="dow">{{ d.dayOfWeek }}</div>
                          <div class="dom">{{ d.workDate.slice(8, 10) }}</div>
                        </th>
                      }
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="kh-row">
                      <td class="td-project sticky-left"><strong style="color:#c2410c;">GIỜ KH</strong></td>
                      <td class="td-total sticky-left2"><strong style="color:#c2410c;">{{ totalCustomer() | number:'1.1-1' }}</strong></td>
                      @for (d of dailyCalendar(); track d.workDate) {
                        <td [class.weekend-col]="d.weekend"
                            [class.leave-col]="d.leaveDay"
                            [class.cell-out-of-period]="!isDateInAnyPeriod(d.workDate)"
                            [class.cell-diff]="hasCellDiff(d)"
                            [class.cell-editing]="editingDate() === d.workDate"
                            [class.cell-editable]="canEditCell(d) && isDateInAnyPeriod(d.workDate)"
                            (click)="onKhCellClick(d)"
                            [matTooltip]="cellTooltip(d)">
                          @if (editingDate() === d.workDate) {
                            <input #cellInput type="number" [(ngModel)]="editDayHours"
                                   min="0" max="24" step="0.5"
                                   (click)="$event.stopPropagation()"
                                   (keydown.enter)="saveDay(d)"
                                   (keydown.escape)="editingDate.set(null)"
                                   class="cell-input">
                          } @else {
                            <span>{{ d.customerHours > 0 || d.leaveDay ? (d.customerHours | number:'1.0-1') : '·' }}</span>
                            @if (hasCellDiff(d)) {
                              <span class="cell-diff-badge">Δ</span>
                            }
                          }
                        </td>
                      }
                    </tr>
                    <tr class="diff-row">
                      <td class="td-project sticky-left">Δ vs timesheet</td>
                      <td class="td-total sticky-left2">
                        {{ (totalCustomer() - totalInternal()) > 0 ? '+' : '' }}{{ (totalCustomer() - totalInternal()) | number:'1.1-1' }}
                      </td>
                      @for (d of dailyCalendar(); track d.workDate) {
                        <td [class.weekend-col]="d.weekend" [class.leave-col]="d.leaveDay">
                          @if (hasCellDiff(d)) {
                            {{ (d.customerHours - d.internalHours) > 0 ? '+' : '' }}{{ (d.customerHours - d.internalHours) | number:'1.0-1' }}
                          }
                        </td>
                      }
                    </tr>
                  </tbody>
                </table>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- ── SECTION C: Notes & adjustments (only days with delta or note) ── -->
          @if (notesDays().length > 0) {
            <mat-card>
              <mat-card-content style="padding:0;">
                <div class="section-header section-c">
                  <div class="section-title">C · Ghi chú điều chỉnh
                    <span class="section-tag" style="background:#DBEAFE;color:#1D4ED8;">{{ notesDays().length }} ngày</span>
                  </div>
                  <div class="section-sub">Chỉ hiển thị các ngày Giờ KH khác Giờ nội bộ hoặc có ghi chú của kế toán.</div>
                </div>
                <table class="cal-table">
                  <thead>
                    <tr>
                      <th>Ngày</th><th>Thứ</th><th>Nội bộ</th><th>KH</th><th>Δ</th>
                      <th>Nghỉ phép</th><th>Ghi chú</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (d of notesDays(); track d.workDate) {
                      <tr [class.leave-full]="d.leaveDay && !d.halfLeave"
                          [class.leave-half]="d.halfLeave">
                        <td style="font-size:12px;color:#6b7280;">{{ d.workDate | date:'dd/MM' }}</td>
                        <td style="font-size:11px;color:#9ca3af;">{{ d.dayOfWeek }}</td>
                        <td style="text-align:right;color:#6b7280;">{{ d.internalHours > 0 ? d.internalHours : '' }}</td>
                        <td style="text-align:right;font-weight:600;color:#c2410c;">{{ d.customerHours }}</td>
                        <td style="text-align:right;color:#9ca3af;font-size:12px;">
                          @if (hasCellDiff(d)) {
                            {{ ((d.customerHours ?? 0) - (d.internalHours ?? 0)) > 0 ? '+' : '' }}{{ ((d.customerHours ?? 0) - (d.internalHours ?? 0)) | number:'1.1-1' }}h
                          }
                        </td>
                        <td style="font-size:12px;">
                          @if (d.leaveDay) {
                            <span [class]="'leave-chip ' + (d.paidLeave ? 'paid' : 'unpaid')">
                              {{ d.halfLeave ? '½' : '' }} {{ d.leaveTypeName || 'Nghỉ phép' }}
                            </span>
                          }
                        </td>
                        <td>
                          @if (editingNoteDate() === d.workDate) {
                            <input [(ngModel)]="editDayNote" placeholder="Lý do điều chỉnh..."
                              style="width:240px;padding:3px 6px;border:1.5px solid #6366f1;border-radius:5px;font-family:inherit;font-size:13px;"
                              (keydown.enter)="saveDayNote(d)"
                              (keydown.escape)="editingNoteDate.set(null)">
                          } @else {
                            <span style="font-size:12px;color:#374151;">{{ d.accountantNote || '—' }}</span>
                          }
                        </td>
                        <td>
                          @if (canEditCell(d)) {
                            @if (editingNoteDate() === d.workDate) {
                              <button mat-icon-button color="primary" (click)="saveDayNote(d)" matTooltip="Lưu ghi chú"><mat-icon>check</mat-icon></button>
                              <button mat-icon-button (click)="editingNoteDate.set(null)" matTooltip="Hủy"><mat-icon>close</mat-icon></button>
                            } @else {
                              <button mat-icon-button (click)="startEditNote(d)" matTooltip="Sửa ghi chú"><mat-icon>edit_note</mat-icon></button>
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
      }
    </div>
  `,
  styles: [`
    .status-chip {
      display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;
      &.draft    { background:#F3F4F6;color:#6B7280; }
      &.exported { background:#FEF3C7;color:#92400E; }
      &.sent     { background:#DBEAFE;color:#1D4ED8; }
      &.confirmed{ background:#DCFCE7;color:#16A34A; }
      &.closed   { background:#FEE2E2;color:#DC2626; }
      &.stale    { background:#FEE2E2;color:#991B1B; }
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
      &.dot-sent     { background:#3B82F6; }
      &.dot-confirmed{ background:#22C55E; }
      &.dot-closed   { background:#DC2626; }
      &.dot-stale    { background:#EF4444; }
    }
    /* ── Daily redesign: section headers ── */
    .section-header {
      padding:12px 16px;border-bottom:1px solid #E5E7EB;background:#F9FAFB;
    }
    .section-header.section-a { background:#F9FAFB; }
    .section-header.section-b { background:#FFF7ED; border-bottom-color:#FED7AA; }
    .section-header.section-c { background:#F0F9FF; border-bottom-color:#BAE6FD; }
    .section-title {
      font-size:12px;font-weight:700;color:#374151;
      text-transform:uppercase;letter-spacing:.5px;display:flex;align-items:center;gap:8px;
    }
    .section-tag {
      display:inline-block;padding:1px 8px;border-radius:8px;
      font-size:10px;font-weight:600;letter-spacing:.3px;
      background:#E5E7EB;color:#4B5563;text-transform:none;
    }
    .section-sub {
      font-size:12px;color:#6B7280;margin-top:4px;line-height:1.4;
    }
    /* ── Matrix table (project × day) ── */
    .matrix-wrap { overflow-x:auto; }
    .matrix-table {
      border-collapse:separate;border-spacing:0;font-size:12.5px;
      width:max-content;min-width:100%;
    }
    .matrix-table th, .matrix-table td {
      padding:6px 4px;text-align:center;
      border-right:1px solid #F3F4F6;border-bottom:1px solid #F3F4F6;
      min-width:38px;max-width:38px;
      color:#374151;
    }
    .matrix-table th {
      background:#F9FAFB;font-weight:600;color:#6B7280;
      padding:8px 4px;
    }
    .matrix-table th .dow {
      font-size:9px;color:#9CA3AF;text-transform:uppercase;line-height:1;letter-spacing:.3px;
    }
    .matrix-table th .dom {
      font-size:13px;color:#374151;font-weight:700;line-height:1.4;
    }
    .matrix-table .th-project, .matrix-table .td-project {
      min-width:160px;max-width:180px;text-align:left;padding-left:14px;
    }
    .matrix-table .th-project code, .matrix-table .td-project code {
      font-size:12px;background:#F3F4F6;padding:1px 6px;border-radius:4px;color:#1F2937;
    }
    .matrix-table .th-total, .matrix-table .td-total {
      min-width:64px;max-width:64px;text-align:right;padding-right:10px;
      background:#FAFAFA;font-weight:600;color:#374151;
    }
    .matrix-table .sticky-left {
      position:sticky;left:0;z-index:2;background:#fff;
      box-shadow:1px 0 0 #E5E7EB;
    }
    .matrix-table .sticky-left2 {
      position:sticky;left:160px;z-index:2;background:#FAFAFA;
      box-shadow:1px 0 0 #E5E7EB;
    }
    .matrix-table thead .sticky-left,
    .matrix-table thead .sticky-left2 { z-index:3;background:#F9FAFB; }
    .matrix-table .weekend-col { background:#FAFAFA;color:#9CA3AF; }
    .matrix-table .leave-col   { background:#FFF1F2;color:#9CA3AF; }
    /* Out-of-period: ngày không thuộc phân công cho KH này */
    .matrix-table .cell-out-of-period {
      background:repeating-linear-gradient(
        45deg, #F3F4F6, #F3F4F6 4px, #E5E7EB 4px, #E5E7EB 6px
      ) !important;
      color:#9CA3AF !important;
      cursor:not-allowed !important;
    }
    .matrix-table .kh-row .cell-out-of-period {
      background:repeating-linear-gradient(
        45deg, #FEF3C7, #FEF3C7 4px, #FDE68A 4px, #FDE68A 6px
      ) !important;
      color:#92400E !important;
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
    .matrix-table .total-row td {
      border-top:2px solid #E5E7EB;background:#F9FAFB;font-weight:600;
    }
    /* Section B specific: KH row */
    .matrix-table .kh-row td {
      background:#FFFBEB;font-weight:600;color:#9A3412;
      transition:background .15s;
    }
    .matrix-table .kh-row .cell-editable {
      cursor:pointer;
    }
    .matrix-table .kh-row .cell-editable:hover {
      background:#FED7AA !important;
    }
    .matrix-table .kh-row .cell-diff {
      background:#FED7AA !important;color:#9A3412;
    }
    .matrix-table .kh-row .cell-editing {
      background:#fff !important;padding:2px;
    }
    .matrix-table .cell-input {
      width:100%;padding:3px 2px;
      border:1.5px solid #6366F1;border-radius:4px;
      text-align:center;font-size:12.5px;font-family:inherit;color:#1F2937;
      box-sizing:border-box;
    }
    .matrix-table .cell-diff-badge {
      display:inline-block;margin-left:2px;font-size:9px;color:#9A3412;font-weight:700;
    }
    .matrix-table .diff-row td {
      background:#FAFAFA;font-size:11px;color:#9CA3AF;font-weight:500;
    }
    /* Section A: cell display like employee timesheet */
    .matrix-table .cell-filled {
      display:flex;flex-direction:column;align-items:center;gap:1px;
    }
    .matrix-table .cell-h {
      color:#6366F1;font-weight:600;font-size:12.5px;line-height:1.2;
    }
    .matrix-table .cell-ot {
      color:#F59E0B;font-weight:700;font-size:10px;line-height:1;
    }
    .matrix-table .total-pill {
      display:inline-block;
      background:#EDE9FE;color:#5B21B6;
      font-weight:700;font-size:11.5px;
      padding:1px 7px;border-radius:6px;line-height:1.4;
    }
    .matrix-table .total-pill.grand {
      background:#DDD6FE;color:#4C1D95;
    }
    .matrix-table .ot-pill {
      display:inline-block;
      background:#FEF3C7;color:#92400E;
      font-weight:700;font-size:10px;
      padding:0px 5px;border-radius:5px;
      margin-top:2px;line-height:1.4;
    }
  `]
})
export class CustomerStatementComponent implements OnInit {
  statementSvc = inject(StatementService);
  private customerService = inject(CustomerService);
  private timesheetSvc = inject(TimesheetService);
  private snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  selectedMonth = new Date().toISOString().slice(0, 7);

  readonly view = signal<View>('list');
  readonly loading = signal(false);
  readonly exporting = signal(false);
  readonly calendarLoading = signal(false);
  readonly customers = signal<CustomerRow[]>([]);
  readonly timesheetLock = signal<TimesheetLock | null>(null);
  readonly activeStatement = signal<Statement | null>(null);
  readonly activeCustomer = signal<CustomerRow | null>(null);
  readonly activeLineItem = signal<StatementLineItem | null>(null);
  readonly dailyCalendar = signal<StatementDailyEntry[]>([]);
  readonly editingDate = signal<string | null>(null);
  readonly editingNoteDate = signal<string | null>(null);
  readonly showHistory = signal(false);
  readonly history = signal<StatementHistory[]>([]);
  readonly historyLoading = signal(false);

  /** Raw timesheet entries của nhân viên đang xem (cho Section A — matrix nội bộ). */
  readonly timesheetEntries = signal<TimesheetEntry[]>([]);

  /** Danh sách project keys phân biệt (sort theo tên) — dùng cho hàng của matrix. */
  readonly projectKeys = computed(() => {
    const set = new Set<string>();
    for (const e of this.timesheetEntries()) set.add(e.projectKey);
    return Array.from(set).sort();
  });

  /** Tổng giờ nội bộ trong tháng (theo dailyCalendar). */
  readonly totalInternal = computed(() =>
    this.dailyCalendar().reduce((s, d) => s + (d.internalHours || 0), 0)
  );

  /** Tổng giờ KH trong tháng. */
  readonly totalCustomer = computed(() =>
    this.dailyCalendar().reduce((s, d) => s + (d.customerHours || 0), 0)
  );

  /** Các ngày có chênh lệch giờ KH ≠ giờ nội bộ HOẶC có ghi chú kế toán. */
  readonly notesDays = computed(() => this.dailyCalendar().filter(d =>
    Math.abs((d.customerHours || 0) - (d.internalHours || 0)) > 0.001 ||
    (d.accountantNote && d.accountantNote.length > 0)
  ));

  /** Các khoảng phân công của line item đang mở (cho KH này). */
  readonly activePeriods = computed(() => this.activeLineItem()?.periods ?? []);

  // Day-level editing
  editDayHours = 0;
  editDayNote = '';

  ngOnInit() { this.load(); }

  onMonthChanged(val: string) { this.selectedMonth = val; this.load(); }

  load() {
    this.loading.set(true);
    this.view.set('list');
    // Load timesheet lock trạng thái tháng đang chọn (để gate việc tạo biên bản)
    this.timesheetSvc.getLockStatus(this.selectedMonth).subscribe({
      next: lock => this.timesheetLock.set(lock),
      error: () => this.timesheetLock.set(null)
    });
    this.customerService.list({ size: 100 }).subscribe({
      next: page => {
        const allCustomers = page.content || [];
        this.statementSvc.listCustomerStatements(this.selectedMonth).subscribe({
          next: statements => {
            const stmtMap = new Map(statements.map(s => [s.recipientId, s]));
            this.customers.set(allCustomers.map((c: any) => ({ id: c.id, name: c.name, statement: stmtMap.get(c.id) })));
            this.loading.set(false);
          },
          error: () => {
            this.customers.set(allCustomers.map((c: any) => ({ id: c.id, name: c.name })));
            this.loading.set(false);
          }
        });
      },
      error: () => this.loading.set(false)
    });
  }

  generateStatement(c: CustomerRow) {
    // Pre-check FE (guard UX) — BE cũng đã enforce timesheet phải được khóa.
    const lock = this.timesheetLock();
    if (!lock?.locked) {
      this.snackBar.open(
        'Timesheet tháng ' + this.selectedMonth + ' chưa được HR khóa. Vui lòng khóa timesheet trước.',
        'X', { duration: 5000 }
      );
      return;
    }
    this.loading.set(true);
    // Toast tạm thời để báo user biết tiến trình (BE sẽ auto-recalc billing → có thể mất vài giây)
    const inflightSnack = this.snackBar.open(
      'Đang đồng bộ phân công và tính lại chi phí…', '', { duration: 0 }
    );
    this.statementSvc.generateCustomerStatement(c.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.customers.update(list => list.map(x => x.id === c.id ? { ...x, statement: stmt } : x));
        this.loading.set(false);
        inflightSnack.dismiss();
        this.snackBar.open(`Đã tạo biên bản · ${stmt.totalEmployees} nhân sự`, 'OK', { duration: 2500 });
      },
      error: (err: any) => {
        this.loading.set(false);
        inflightSnack.dismiss();
        this.snackBar.open('Lỗi: ' + (err?.error?.message || err?.error?.error || 'Không thể tạo biên bản'), 'X', { duration: 5000 });
      }
    });
  }

  openStatement(c: CustomerRow) {
    this.loading.set(true);
    this.showHistory.set(false);
    this.statementSvc.getCustomerStatement(c.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.activeCustomer.set(c);
        this.view.set('statement');
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ── Status transitions ────────────────────────────────────────────────────

  /** Xuất biên bản: tạo Excel (đúng format biên bản) + chuyển status → EXPORTED */
  exportBienban() {
    const c = this.activeCustomer()!;
    this.exporting.set(true);
    this.statementSvc.exportCustomerExcel(c.id, this.selectedMonth).subscribe({
      next: blob => {
        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bienban_kh_${c.name}_${this.selectedMonth}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        this.exporting.set(false);
        this.snackBar.open('Xuất biên bản thành công! Trạng thái → Đã xuất', 'OK', { duration: 3500 });
        // Refresh statement to show new EXPORTED status
        this.refreshActiveStatement();
      },
      error: () => {
        this.exporting.set(false);
        this.snackBar.open('Lỗi xuất biên bản', 'X', { duration: 3000 });
      }
    });
  }

  /** Tải lại biên bản (sau khi đã EXPORTED/SENT/CONFIRMED) — không đổi trạng thái */
  downloadBienban() {
    const c = this.activeCustomer()!;
    this.exporting.set(true);
    this.statementSvc.exportCustomerExcel(c.id, this.selectedMonth).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bienban_kh_${c.name}_${this.selectedMonth}.xlsx`;
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
    const c = this.activeCustomer();
    if (!c) return;
    this.statementSvc.getCustomerStatement(c.id, this.selectedMonth).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        // Also update list item
        this.customers.update(list => list.map(row =>
          row.id === c.id ? { ...row, statement: stmt } : row
        ));
      }
    });
  }

  markSent() {
    const c = this.activeCustomer()!;
    if (!confirm(`Đánh dấu biên bản KH ${c.name} tháng ${this.selectedMonth} là Đã gửi?`)) return;
    this.statementSvc.markCustomerSent(c.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã đánh dấu gửi', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  markConfirmed() {
    const c = this.activeCustomer()!;
    if (!confirm(`Xác nhận KH ${c.name} đã xác nhận biên bản tháng ${this.selectedMonth}?`)) return;
    this.statementSvc.markCustomerConfirmed(c.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã xác nhận', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  resetToDraft() {
    const c = this.activeCustomer()!;
    if (!confirm('Reset biên bản về Nháp để tái tạo sau khi timesheet bị chỉnh?')) return;
    this.statementSvc.resetCustomerDraft(c.id, this.selectedMonth).subscribe({
      next: stmt => { this.activeStatement.set(stmt); this.snackBar.open('Đã reset về Nháp', 'OK', { duration: 2000 }); },
      error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
    });
  }

  closeStatement() {
    const c = this.activeCustomer()!;
    const reason = prompt('Nhập lý do đóng biên bản (tùy chọn):');
    if (reason === null) return; // user cancelled
    if (!confirm(`Đóng biên bản KH ${c.name} tháng ${this.selectedMonth}?\n\nSau khi đóng, timesheet sẽ bị khóa hoàn toàn.`)) return;
    this.statementSvc.closeCustomer(c.id, this.selectedMonth, reason || undefined).subscribe({
      next: stmt => {
        this.activeStatement.set(stmt);
        this.snackBar.open('Đã đóng biên bản — timesheet đã bị khóa', 'OK', { duration: 3000 });
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }

  reopenStatement() {
    const c = this.activeCustomer()!;
    const reason = prompt('Nhập lý do mở lại biên bản (bắt buộc):');
    if (!reason) {
      this.snackBar.open('Phải nhập lý do mở lại', 'X', { duration: 3000 });
      return;
    }
    if (!confirm(`Mở lại biên bản KH ${c.name} tháng ${this.selectedMonth}?\n\nTimesheet sẽ được mở khóa.`)) return;
    this.statementSvc.reopenCustomer(c.id, this.selectedMonth, reason).subscribe({
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
    const c = this.activeCustomer()!;
    this.statementSvc.getCustomerHistory(c.id, this.selectedMonth).subscribe({
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
    this.editingNoteDate.set(null);
    this.timesheetEntries.set([]);

    // Tải song song: lịch theo ngày (statement) + raw timesheet (cho matrix nội bộ).
    this.statementSvc.getLineItemDailyCalendar(item.id, this.selectedMonth).subscribe({
      next: days => { this.dailyCalendar.set(days); this.calendarLoading.set(false); },
      error: () => { this.calendarLoading.set(false); this.snackBar.open('Lỗi tải lịch', 'X', { duration: 3000 }); }
    });
    // Timesheet được lưu theo user_id, không phải employee_id → ưu tiên item.userId
    if (item.userId) {
      this.timesheetSvc.getMonth(this.selectedMonth, item.userId).subscribe({
        next: entries => this.timesheetEntries.set(entries || []),
        error: () => this.timesheetEntries.set([])
      });
    } else {
      // Nhân sự không có user account → không có timesheet để hiển thị
      this.timesheetEntries.set([]);
    }
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
    // Validate bounds
    const hrs = Number(this.editDayHours);
    if (Number.isNaN(hrs) || hrs < 0 || hrs > 24) {
      this.snackBar.open('Giờ phải nằm trong khoảng [0, 24]', 'X', { duration: 3000 });
      return;
    }
    // Bắt buộc nhập ghi chú khi điều chỉnh khác giờ nội bộ
    const internal = day.internalHours || 0;
    if (Math.abs(hrs - internal) > 0.001) {
      let note = (this.editDayNote || '').trim();
      if (!note) {
        const reason = window.prompt(
          `Giờ KH (${hrs}h) khác giờ nội bộ (${internal}h) ngày ${day.workDate}. Vui lòng nhập lý do điều chỉnh:`,
          ''
        );
        if (reason === null) return; // user cancel
        note = reason.trim();
        if (!note) {
          this.snackBar.open('Cần ghi chú lý do khi điều chỉnh', 'X', { duration: 3500 });
          return;
        }
        this.editDayNote = note;
      }
    }
    const item = this.activeLineItem()!;
    this.statementSvc.updateDailyEntry(item.id, day.workDate, { hours: hrs, note: this.editDayNote }).subscribe({
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
    const c = this.activeCustomer()!;
    this.statementSvc.getCustomerStatement(c.id, this.selectedMonth).subscribe({
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

  goToList() { this.view.set('list'); this.activeStatement.set(null); this.activeCustomer.set(null); }
  goToStatement() {
    this.view.set('statement');
    this.activeLineItem.set(null);
    this.editingDate.set(null);
    this.editingNoteDate.set(null);
    this.timesheetEntries.set([]);
    this.dailyCalendar.set([]);
  }

  /** Ngày `date` (yyyy-MM-dd) có nằm trong ít nhất 1 period phân công cho KH này không? */
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
    // d = 'yyyy-MM-dd'
    if (!d || d.length < 10) return d;
    return `${d.slice(8, 10)}/${d.slice(5, 7)}`;
  }

  // ── Section A · Matrix helpers ────────────────────────────────────────────

  /** Tổng giờ (hours + otHours) của 1 dự án trong tháng. */
  projectTotal(pk: string): number {
    let total = 0;
    for (const e of this.timesheetEntries()) {
      if (e.projectKey === pk) total += (e.hours || 0) + (e.otHours || 0);
    }
    return total;
  }

  /** Giờ của 1 ô (project, ngày). */
  cellHours(pk: string, date: string): number {
    for (const e of this.timesheetEntries()) {
      if (e.projectKey === pk && e.workDate === date) {
        return (e.hours || 0) + (e.otHours || 0);
      }
    }
    return 0;
  }

  cellRegularHours(pk: string, date: string): number {
    for (const e of this.timesheetEntries()) {
      if (e.projectKey === pk && e.workDate === date) return e.hours || 0;
    }
    return 0;
  }

  cellOtHours(pk: string, date: string): number {
    for (const e of this.timesheetEntries()) {
      if (e.projectKey === pk && e.workDate === date) return e.otHours || 0;
    }
    return 0;
  }

  projectRegularTotal(pk: string): number {
    return this.timesheetEntries().filter(e => e.projectKey === pk).reduce((s, e) => s + (e.hours || 0), 0);
  }

  projectOtTotal(pk: string): number {
    return this.timesheetEntries().filter(e => e.projectKey === pk).reduce((s, e) => s + (e.otHours || 0), 0);
  }

  dayRegularTotal(date: string): number {
    return this.timesheetEntries().filter(e => e.workDate === date).reduce((s, e) => s + (e.hours || 0), 0);
  }

  dayOtTotal(date: string): number {
    return this.timesheetEntries().filter(e => e.workDate === date).reduce((s, e) => s + (e.otHours || 0), 0);
  }

  totalRegularInternal(): number {
    return this.timesheetEntries().reduce((s, e) => s + (e.hours || 0), 0);
  }

  totalOtInternal(): number {
    return this.timesheetEntries().reduce((s, e) => s + (e.otHours || 0), 0);
  }

  nonLeaveDays(): StatementDailyEntry[] {
    return this.dailyCalendar().filter(d => !d.leaveDay);
  }

  // ── Section B · Cell-edit helpers ─────────────────────────────────────────

  /** Chỉ cho sửa khi statement đang DRAFT hoặc STALE. */
  canEditAny(): boolean {
    const s = this.activeStatement()?.status;
    return s === 'DRAFT' || s === 'STALE';
  }

  /** Cho sửa cell ngày này — không sửa cuối tuần (trừ khi có giờ nội bộ), và phải nằm trong period phân công. */
  canEditCell(d: StatementDailyEntry): boolean {
    if (!this.canEditAny()) return false;
    // Cuối tuần không có giờ nội bộ → không cần điều chỉnh
    if (d.weekend && (d.internalHours || 0) === 0 && (d.customerHours || 0) === 0) return false;
    // Ngoài khoảng phân công cho KH này → không cho sửa (vì sẽ không tính tiền cho KH)
    if (!this.isDateInAnyPeriod(d.workDate)) return false;
    return true;
  }

  /** Có chênh lệch giờ KH vs nội bộ? */
  hasCellDiff(d: StatementDailyEntry): boolean {
    return Math.abs((d.customerHours || 0) - (d.internalHours || 0)) > 0.001;
  }

  /** Tooltip cho cell. */
  cellTooltip(d: StatementDailyEntry): string {
    const internal = d.internalHours || 0;
    const customer = d.customerHours || 0;
    const dt = d.workDate;
    if (!this.canEditCell(d)) {
      return `${dt} · Nội bộ ${internal}h · KH ${customer}h`;
    }
    if (this.hasCellDiff(d)) {
      const delta = customer - internal;
      return `${dt} · Nội bộ ${internal}h, KH ${customer}h (${delta > 0 ? '+' : ''}${delta}h). Click để sửa.`;
    }
    return `${dt} · Nội bộ = KH = ${internal}h. Click để sửa.`;
  }

  /** Click vào cell trong hàng GIỜ KH (Section B) — bật chế độ inline-edit. */
  onKhCellClick(d: StatementDailyEntry) {
    if (!this.canEditCell(d)) return;
    if (this.editingDate() === d.workDate) return; // đang edit ô này rồi
    this.editingDate.set(d.workDate);
    this.editingNoteDate.set(null);
    this.editDayHours = d.customerHours || 0;
    this.editDayNote = d.accountantNote || '';
    // Auto-focus + select để gõ ngay
    setTimeout(() => {
      const el = document.querySelector(
        '.matrix-table .kh-row .cell-editing input.cell-input'
      ) as HTMLInputElement | null;
      if (el) { el.focus(); el.select(); }
    }, 0);
  }

  /** Sửa ghi chú trong Section C (không đổi giờ). */
  startEditNote(d: StatementDailyEntry) {
    if (!this.canEditCell(d)) return;
    this.editingNoteDate.set(d.workDate);
    this.editingDate.set(null);
    this.editDayNote = d.accountantNote || '';
  }

  /** Lưu ghi chú-only (Section C). */
  saveDayNote(d: StatementDailyEntry) {
    const item = this.activeLineItem()!;
    this.statementSvc.updateDailyEntry(item.id, d.workDate, { note: this.editDayNote }).subscribe({
      next: updated => {
        this.dailyCalendar.update(days => days.map(x => x.workDate === updated.workDate ? updated : x));
        this.editingNoteDate.set(null);
        this.snackBar.open('Đã lưu ghi chú', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Lỗi cập nhật', 'X', { duration: 3000 })
    });
  }
}
