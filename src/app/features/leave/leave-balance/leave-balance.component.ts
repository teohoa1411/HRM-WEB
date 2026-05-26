import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveBalance, LeaveType, GrantLeaveBalanceRequest } from '../../../core/models/leave.models';

@Component({
  selector: 'app-leave-balance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
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
          <button mat-stroked-button (click)="showGrantForm = !showGrantForm">
            <mat-icon>add</mat-icon> Cấp phép
          </button>
        </div>
      </div>

      <!-- Quick grant form -->
      @if (showGrantForm) {
        <mat-card style="margin-bottom:16px;">
          <mat-card-content style="padding:16px 20px!important;">
            <div style="font-weight:600;font-size:14px;margin-bottom:12px;">Cấp quota nghỉ phép</div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end;">
              <div>
                <label class="field-label">Mã / ID nhân sự</label>
                <input [(ngModel)]="grantForm.employeeId" type="number" placeholder="Employee ID"
                  class="field-input">
              </div>
              <div>
                <label class="field-label">Loại phép</label>
                <select [(ngModel)]="grantForm.leaveTypeId" class="field-input">
                  <option value="">-- Chọn loại phép --</option>
                  @for (t of leaveTypes(); track t.id) {
                    <option [value]="t.id">{{ t.name }} {{ t.paid ? '(có lương)' : '(không lương)' }}</option>
                  }
                </select>
              </div>
              <div>
                <label class="field-label">Năm</label>
                <input [(ngModel)]="grantForm.year" type="number" [value]="selectedYear" class="field-input" style="width:80px;">
              </div>
              <div>
                <label class="field-label">Số ngày quota</label>
                <input [(ngModel)]="grantForm.totalQuota" type="number" min="0" step="0.5" placeholder="12"
                  class="field-input" style="width:80px;">
              </div>
              <button mat-raised-button color="primary" (click)="grantBalance()" [disabled]="grantLoading()">
                <mat-icon>save</mat-icon> Lưu
              </button>
              <button mat-stroked-button (click)="showGrantForm = false">Hủy</button>
            </div>
          </mat-card-content>
        </mat-card>
      }

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
            <div style="padding:12px 16px;border-bottom:1px solid #F3F4F6;display:flex;gap:8px;align-items:center;">
              <input [(ngModel)]="searchQuery" placeholder="Tìm tên nhân sự..."
                style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-family:inherit;font-size:13px;width:220px;">
              <select [(ngModel)]="filterLeaveType"
                style="padding:6px 12px;border:1.5px solid #e2e8f0;border-radius:6px;font-family:inherit;font-size:13px;">
                <option value="">Tất cả loại phép</option>
                @for (t of leaveTypes(); track t.id) { <option [value]="t.id">{{ t.name }}</option> }
              </select>
            </div>

            <table class="bal-table">
              <thead>
                <tr>
                  <th>Nhân sự</th><th>Loại phép</th><th>Năm</th>
                  <th>Quota</th><th>Đã dùng</th><th>Chuyển kỳ</th><th>Còn lại</th>
                  <th>Tiến độ</th>
                </tr>
              </thead>
              <tbody>
                @for (b of filteredBalances(); track b.id) {
                  <tr>
                    <td>
                      <div style="font-weight:500;">{{ b.employeeName }}</div>
                      <div style="font-size:11px;color:#9ca3af;"><code>{{ b.employeeCode }}</code></div>
                    </td>
                    <td>
                      <span [class]="'type-chip ' + (b.paid ? 'paid' : 'unpaid')">
                        {{ b.leaveTypeName }}
                      </span>
                    </td>
                    <td style="color:#6b7280;">{{ b.year }}</td>
                    <td style="text-align:right;font-weight:600;">{{ b.totalQuota | number:'1.1-1' }}d</td>
                    <td style="text-align:right;"
                        [style.color]="b.usedDays > b.totalQuota ? '#DC2626' : '#374151'">
                      {{ b.usedDays | number:'1.1-1' }}d
                    </td>
                    <td style="text-align:right;color:#6b7280;">{{ b.carriedOver | number:'1.1-1' }}d</td>
                    <td style="text-align:right;font-weight:700;"
                        [style.color]="b.remainingDays <= 1 ? '#DC2626' : b.remainingDays <= 3 ? '#D97706' : '#22C55E'">
                      {{ b.remainingDays | number:'1.1-1' }}d
                    </td>
                    <td style="min-width:100px;">
                      <div class="progress-bar-bg">
                        <div class="progress-bar-fill"
                          [style.width]="getUsagePercent(b) + '%'"
                          [style.background]="getUsagePercent(b) >= 100 ? '#DC2626' : getUsagePercent(b) >= 80 ? '#F59E0B' : '#22C55E'">
                        </div>
                      </div>
                      <div style="font-size:10px;color:#9ca3af;text-align:right;margin-top:2px;">{{ getUsagePercent(b) | number:'1.0-0' }}%</div>
                    </td>
                  </tr>
                }
                @if (filteredBalances().length === 0) {
                  <tr><td colspan="8" style="text-align:center;padding:40px;color:#9ca3af;">Không có dữ liệu</td></tr>
                }
              </tbody>
            </table>
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .field-label { display:block;font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px; }
    .field-input { padding:8px 12px;border:1.5px solid #e2e8f0;border-radius:8px;font-family:inherit;font-size:14px;outline:none;
      &:focus { border-color:#6366f1; } }
    .bal-table { width:100%;border-collapse:collapse; }
    .bal-table th { background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;padding:10px 14px;border-bottom:1px solid #e5e7eb; }
    .bal-table td { padding:10px 14px;border-bottom:1px solid #f3f4f6;font-size:13.5px;color:#374151; }
    .bal-table tr:hover td { background:#f8faff; }
    .type-chip {
      display:inline-block;padding:2px 8px;border-radius:8px;font-size:11px;font-weight:600;
      &.paid { background:#DCFCE7;color:#166534; }
      &.unpaid { background:#FEE2E2;color:#991B1B; }
    }
    .progress-bar-bg { height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden; }
    .progress-bar-fill { height:100%;border-radius:3px;transition:width .3s; }
  `]
})
export class LeaveBalanceComponent implements OnInit {
  private leaveSvc = inject(LeaveService);
  private snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly grantLoading = signal(false);
  readonly balances = signal<LeaveBalance[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);

  selectedYear = new Date().getFullYear();
  years = [this.selectedYear - 1, this.selectedYear, this.selectedYear + 1].map(y => y);
  searchQuery = '';
  filterLeaveType: number | string = '';
  showGrantForm = false;

  grantForm: GrantLeaveBalanceRequest = {
    employeeId: 0,
    leaveTypeId: 0,
    year: this.selectedYear,
    totalQuota: 12
  };

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

  grantBalance() {
    if (!this.grantForm.employeeId || !this.grantForm.leaveTypeId) {
      this.snackBar.open('Vui lòng điền đầy đủ thông tin', 'X', { duration: 2500 }); return;
    }
    this.grantLoading.set(true);
    this.leaveSvc.grantLeaveBalance({ ...this.grantForm, year: this.selectedYear }).subscribe({
      next: b => {
        this.balances.update(list => {
          const idx = list.findIndex(x => x.id === b.id);
          return idx >= 0 ? list.map((x, i) => i === idx ? b : x) : [...list, b];
        });
        this.grantLoading.set(false);
        this.showGrantForm = false;
        this.snackBar.open('Đã cấp quota phép', 'OK', { duration: 2000 });
      },
      error: () => { this.grantLoading.set(false); this.snackBar.open('Lỗi cấp phép', 'X', { duration: 3000 }); }
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
