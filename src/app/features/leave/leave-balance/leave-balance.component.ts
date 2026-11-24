import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveBalance, LeaveType } from '../../../core/models/leave.models';
import { LeaveGrantDialogComponent, LeaveGrantDialogData } from './leave-grant-dialog.component';
import { LeaveAdjustDialogComponent, LeaveAdjustDialogData, LeaveAdjustDialogResult } from './leave-adjust-dialog.component';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatTooltipModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Quản lý quota nghỉ phép</div>
          <div class="page-subtitle">Phân bổ và theo dõi số ngày phép của nhân sự</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <select [(ngModel)]="selectedYear" (change)="load()"
            style="padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;">
            @for (y of years; track y) { <option [value]="y">{{ y }}</option> }
          </select>
          <button mat-flat-button color="primary" (click)="openGrantDialog()">
            <mat-icon>add_circle</mat-icon> Cấp phép mới
          </button>
        </div>
      </div>

      @if (loading()) {
        <div style="padding:60px;text-align:center;"><mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner></div>
      } @else {
        <!-- Summary cards -->
        @if (balances().length > 0) {
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:20px;">
            <mat-card>
              <mat-card-content style="padding:16px!important;">
                <div style="font-size:12px;color:#6b7280;">Tổng nhân sự có quota</div>
                <div style="font-size:24px;font-weight:700;color:#1565c0;">{{ uniqueEmployees() }}</div>
              </mat-card-content>
            </mat-card>
            <mat-card>
              <mat-card-content style="padding:16px!important;">
                <div style="font-size:12px;color:#6b7280;">Tổng ngày phép đã cấp</div>
                <div style="font-size:24px;font-weight:700;color:#374151;">{{ totalQuota() | number:'1.0-0' }}d</div>
              </mat-card-content>
            </mat-card>
            <mat-card>
              <mat-card-content style="padding:16px!important;">
                <div style="font-size:12px;color:#6b7280;">Đã sử dụng</div>
                <div style="font-size:24px;font-weight:700;color:#D97706;">{{ totalUsed() | number:'1.1-1' }}d</div>
              </mat-card-content>
            </mat-card>
            <mat-card>
              <mat-card-content style="padding:16px!important;">
                <div style="font-size:12px;color:#6b7280;">Còn lại</div>
                <div style="font-size:24px;font-weight:700;color:#22C55E;">{{ totalRemaining() | number:'1.1-1' }}d</div>
              </mat-card-content>
            </mat-card>
          </div>
        }

        <!-- Balances table -->
        <mat-card>
          <mat-card-content style="padding:0;">
            <!-- Filter bar -->
            <div style="padding:12px 16px;border-bottom:1px solid #F3F4F6;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <div style="position:relative;">
                <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#9ca3af;font-size:16px;pointer-events:none;">&#128269;</span>
                <input [(ngModel)]="searchQuery" placeholder="Tìm tên hoặc mã nhân sự..."
                  style="padding:7px 12px 7px 34px;border:1.5px solid #e2e8f0;border-radius:6px;font-family:inherit;font-size:13px;width:240px;outline:none;">
              </div>
              <select [(ngModel)]="filterLeaveType"
                style="padding:7px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-family:inherit;font-size:13px;">
                <option value="">Tất cả loại phép</option>
                @for (t of leaveTypes(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
              </select>
              @if (searchQuery || filterLeaveType) {
                <span style="font-size:12px;color:#6b7280;">
                  {{ groupedBalances().length }} / {{ uniqueEmployees() }} nhân sự
                </span>
              }
            </div>

            <table class="bal-table">
              <thead>
                <tr>
                  <th style="width:200px;">Nhân sự</th>
                  <th>Quota theo loại phép</th>
                </tr>
              </thead>
              <tbody>
                @for (group of groupedBalances(); track group.employeeId) {
                  <tr>
                    <!-- Employee info -->
                    <td style="vertical-align:top;padding-top:16px;">
                      <div style="font-weight:600;font-size:14px;">{{ group.employeeName }}</div>
                      <div style="font-size:11px;color:#9ca3af;margin-bottom:10px;"><code>{{ group.employeeCode }}</code></div>
                      <div style="font-size:11px;color:#6b7280;line-height:1.8;">
                        <div>Tổng quota: <strong>{{ group.totalQuota | number:'1.1-1' }}d</strong></div>
                        <div>Đã dùng: <strong style="color:#D97706;">{{ group.totalUsed | number:'1.1-1' }}d</strong></div>
                        <div>Còn lại: <strong [style.color]="group.totalRemaining <= 0 ? '#DC2626' : '#16a34a'">{{ group.totalRemaining | number:'1.1-1' }}d</strong></div>
                      </div>
                    </td>
                    <!-- Leave type cards -->
                    <td style="padding:12px 14px;">
                      <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        @for (b of group.balances; track b.id) {
                          <div class="leave-card">
                            <!-- Header: type chip + tune button -->
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                              <span [class]="'type-chip ' + (b.paid ? 'paid' : 'unpaid')">
                                {{ b.leaveTypeName }}
                              </span>
                              <button mat-icon-button style="width:24px;height:24px;line-height:24px;"
                                (click)="openAdjustDialog(b)"
                                matTooltip="Điều chỉnh quota (+/-)">
                                <mat-icon style="font-size:16px;width:16px;height:16px;line-height:16px;">tune</mat-icon>
                              </button>
                            </div>
                            <!-- Stats row -->
                            <div style="display:flex;gap:14px;font-size:12px;margin-bottom:7px;">
                              <div>
                                <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Quota</div>
                                <div style="font-weight:700;color:#1e293b;">{{ b.totalQuota | number:'1.1-1' }}d</div>
                              </div>
                              <div>
                                <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Đã dùng</div>
                                <div style="font-weight:700;" [style.color]="b.usedDays > b.totalQuota ? '#DC2626' : '#D97706'">{{ b.usedDays | number:'1.1-1' }}d</div>
                              </div>
                              @if (b.carriedOver > 0) {
                                <div>
                                  <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Chuyển kỳ</div>
                                  <div style="font-weight:700;color:#6b7280;">+{{ b.carriedOver | number:'1.1-1' }}d</div>
                                </div>
                              }
                              <div>
                                <div style="color:#9ca3af;font-size:10px;text-transform:uppercase;letter-spacing:.4px;">Còn lại</div>
                                <div style="font-weight:700;" [style.color]="b.remainingDays <= 0 ? '#DC2626' : b.remainingDays <= 2 ? '#D97706' : '#16a34a'">{{ b.remainingDays | number:'1.1-1' }}d</div>
                              </div>
                            </div>
                            <!-- Progress bar -->
                            <div class="progress-bar-bg">
                              <div class="progress-bar-fill"
                                [style.width]="getUsagePercent(b) + '%'"
                                [style.background]="getUsagePercent(b) >= 100 ? '#DC2626' : getUsagePercent(b) >= 80 ? '#F59E0B' : '#22C55E'">
                              </div>
                            </div>
                            <div style="font-size:10px;color:#9ca3af;text-align:right;margin-top:2px;">{{ getUsagePercent(b) | number:'1.0-0' }}%</div>
                          </div>
                        }
                      </div>
                    </td>
                  </tr>
                }
                @if (groupedBalances().length === 0) {
                  <tr><td colspan="2" style="text-align:center;padding:40px;color:#9ca3af;">
                    @if (balances().length === 0) {
                      Chưa có quota nào được cấp. Nhấn "Cấp phép mới" để bắt đầu.
                    } @else {
                      Không tìm thấy kết quả phù hợp.
                    }
                  </td></tr>
                }
              </tbody>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .bal-table { width:100%;border-collapse:collapse; }
    .bal-table th { background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;padding:10px 14px;border-bottom:1px solid #e5e7eb; }
    .bal-table td { padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13.5px;color:#374151; }
    .bal-table tr:hover td { background:#f8faff; }
    .type-chip {
      display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;
      &.paid { background:#DCFCE7;color:#166534; }
      &.unpaid { background:#FEE2E2;color:#991B1B; }
    }
    .leave-card {
      border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;
      min-width:155px;background:#fafafa;
      transition:box-shadow .15s;
      &:hover { box-shadow:0 2px 8px rgba(0,0,0,.08);background:#fff; }
    }
    .progress-bar-bg { height:5px;background:#E5E7EB;border-radius:3px;overflow:hidden; }
    .progress-bar-fill { height:100%;border-radius:3px;transition:width .3s; }
  `]
})
export class LeaveBalanceComponent implements OnInit {
  private leaveSvc = inject(LeaveService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);

  selectedYear = new Date().getFullYear();
  years = [this.selectedYear - 1, this.selectedYear, this.selectedYear + 1];
  searchQuery = '';
  filterLeaveType: number | string = '';

  ngOnInit() {
    this.load();
    this.leaveSvc.getAllLeaveTypes().subscribe({ next: t => this.leaveTypes.set(t) });
  }

  load() {
    this.loading.set(true);
    this.leaveSvc.getLeaveBalances(this.selectedYear).subscribe({
      next: data => { this.balances.set(data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openGrantDialog() {
    const dialogRef = this.dialog.open(LeaveGrantDialogComponent, {
      data: { year: this.selectedYear, leaveTypes: this.leaveTypes() } as LeaveGrantDialogData,
      width: '520px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result) return;
      this.leaveSvc.grantLeaveBalance(result).subscribe({
        next: b => {
          this.balances.update(list => {
            const idx = list.findIndex(x => x.id === b.id);
            return idx >= 0 ? list.map((x, i) => i === idx ? b : x) : [...list, b];
          });
          this.snackBar.open('Đã cấp quota phép', 'OK', { duration: 2000 });
        },
        error: e => this.snackBar.open(e.error?.message || 'Lỗi cấp phép', 'X', { duration: 3000 })
      });
    });
  }

  openAdjustDialog(balance: LeaveBalance) {
    const dialogRef = this.dialog.open(LeaveAdjustDialogComponent, {
      data: { balance } as LeaveAdjustDialogData,
      width: '460px',
      disableClose: true
    });
    dialogRef.afterClosed().subscribe((result: LeaveAdjustDialogResult | null) => {
      if (!result) return;
      this.leaveSvc.adjustLeaveBalance(result.balanceId, result.delta).subscribe({
        next: updated => {
          this.balances.update(list => list.map(b => b.id === updated.id ? updated : b));
          this.snackBar.open('Đã điều chỉnh quota', 'OK', { duration: 2000 });
        },
        error: e => this.snackBar.open(e.error?.message || 'Lỗi điều chỉnh', 'X', { duration: 3000 })
      });
    });
  }

  filteredBalances(): LeaveBalance[] {
    const q = this.searchQuery.toLowerCase();
    return this.balances().filter(b => {
      const matchName = !q || b.employeeName?.toLowerCase().includes(q) || b.employeeCode?.toLowerCase().includes(q);
      const matchType = !this.filterLeaveType || b.leaveTypeId === +this.filterLeaveType;
      return matchName && matchType;
    });
  }

  groupedBalances(): { employeeId: number; employeeName: string; employeeCode: string; balances: LeaveBalance[]; totalQuota: number; totalUsed: number; totalRemaining: number }[] {
    const map = new Map<number, { employeeId: number; employeeName: string; employeeCode: string; balances: LeaveBalance[] }>();
    for (const b of this.filteredBalances()) {
      if (!map.has(b.employeeId)) {
        map.set(b.employeeId, { employeeId: b.employeeId, employeeName: b.employeeName, employeeCode: b.employeeCode, balances: [] });
      }
      map.get(b.employeeId)!.balances.push(b);
    }
    return Array.from(map.values()).map(g => ({
      ...g,
      totalQuota: g.balances.reduce((s, b) => s + b.totalQuota, 0),
      totalUsed: g.balances.reduce((s, b) => s + b.usedDays, 0),
      totalRemaining: g.balances.reduce((s, b) => s + b.remainingDays, 0),
    }));
  }

  uniqueEmployees(): number {
    return new Set(this.balances().map(b => b.employeeId)).size;
  }

  totalQuota(): number { return this.balances().reduce((s, b) => s + b.totalQuota, 0); }
  totalUsed(): number { return this.balances().reduce((s, b) => s + b.usedDays, 0); }
  totalRemaining(): number { return this.balances().reduce((s, b) => s + b.remainingDays, 0); }

  getUsagePercent(b: LeaveBalance): number {
    const total = b.totalQuota + b.carriedOver;
    if (total <= 0) return 0;
    return Math.min(100, (b.usedDays / total) * 100);
  }
}
