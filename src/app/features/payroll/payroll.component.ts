import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { PayrollService, PayrollRecord } from '../../core/services/payroll.service';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
    MatProgressSpinnerModule, MatDialogModule, MatTableModule, MonthPickerComponent],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Bảng Lương Nội Bộ</div>
          <div class="page-subtitle">Quản lý và xác nhận bảng lương hàng tháng</div>
        </div>
        <div class="flex-row gap-12">
          <app-month-picker [value]="selectedMonth" (valueChange)="onMonthChanged($event)" />
          <button mat-raised-button color="primary" (click)="generate()" [disabled]="loading()">
            <mat-icon>calculate</mat-icon> Sinh bảng lương
          </button>
          <button mat-stroked-button (click)="exportExcel()" [disabled]="records().length === 0">
            <mat-icon>download</mat-icon> Xuất Excel
          </button>
        </div>
      </div>

      <!-- Stale warning -->
      @if (hasStale()) {
        <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:10px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
          <mat-icon style="color:#d97706;">warning</mat-icon>
          <span style="color:#92400e; font-size:13.5px; font-weight:500;">
            ⚠ Bảng lương tháng này có thể không còn chính xác do timesheet đã bị thay đổi sau khi xác nhận.
            Vui lòng <strong>Reset & Tính lại</strong> hoặc xác nhận dữ liệu hiện tại vẫn đúng.
          </span>
          <button mat-stroked-button color="warn" style="margin-left:auto;" (click)="resetPayroll()">
            <mat-icon>refresh</mat-icon> Reset & Tính lại
          </button>
        </div>
      }

      <!-- Stats -->
      @if (records().length > 0) {
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px;">
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Tổng nhân sự</div>
              <div style="font-size:28px;font-weight:700;color:#111827;">{{ records().length }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Tổng lương Net</div>
              <div style="font-size:28px;font-weight:700;color:#1565c0;">{{ totalNetSalary() | number:'1.0-0' }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">BH NV đóng</div>
              <div style="font-size:28px;font-weight:700;color:#b45309;">{{ totalInsEmployee() | number:'1.0-0' }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Trạng thái</div>
              <div style="font-size:16px;font-weight:700;">
                <span [class]="'status-chip ' + overallStatus().toLowerCase()">{{ overallStatus() }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Table -->
      <mat-card>
        <mat-card-content style="padding:0;">
          @if (loading()) {
            <div style="padding:60px; text-align:center; color:#666;">
              <mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:12px;">Đang tải...</p>
            </div>
          } @else if (records().length === 0) {
            <div class="empty-state">
              <mat-icon>payments</mat-icon>
              <p>Chưa có dữ liệu bảng lương tháng {{ selectedMonth }}</p>
              <p style="font-size:12px; margin-top:4px;">Bấm "Sinh bảng lương" để tạo từ dữ liệu billing</p>
            </div>
          } @else {
            <div style="overflow-x:auto;">
              <table mat-table [dataSource]="records()" class="mat-elevation-z0">
                <ng-container matColumnDef="stt">
                  <th mat-header-cell *matHeaderCellDef style="width:50px">STT</th>
                  <td mat-cell *matCellDef="let r; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Nhân viên</th>
                  <td mat-cell *matCellDef="let r">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="avatar">{{ r.fullName?.charAt(0) }}</div>
                      <div>
                        <div style="font-weight:500;">{{ r.fullName }}</div>
                        <code style="font-size:11px;">{{ r.employeeCode }}</code>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="daysWorked">
                  <th mat-header-cell *matHeaderCellDef>Ngày làm</th>
                  <td mat-cell *matCellDef="let r">{{ r.daysWorked }}</td>
                </ng-container>
                <ng-container matColumnDef="calculatedSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương tính công</th>
                  <td mat-cell *matCellDef="let r">{{ r.calculatedSalary | number:'1.0-0' }}</td>
                </ng-container>
                <ng-container matColumnDef="insuranceSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương BH</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#f97316; font-weight:500;">{{ r.insuranceSalary | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhxhEmp">
                  <th mat-header-cell *matHeaderCellDef>BHXH NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhxhEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhytEmp">
                  <th mat-header-cell *matHeaderCellDef>BHYT NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhytEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhtnEmp">
                  <th mat-header-cell *matHeaderCellDef>BHTN NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhtnEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalInsEmp">
                  <th mat-header-cell *matHeaderCellDef>Tổng BH NV</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#dc2626;">{{ r.insuranceEmployeeAmount | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhxhEr">
                  <th mat-header-cell *matHeaderCellDef>BHXH Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhxhEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhytEr">
                  <th mat-header-cell *matHeaderCellDef>BHYT Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhytEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhtnEr">
                  <th mat-header-cell *matHeaderCellDef>BHTN Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhtnEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalInsEr">
                  <th mat-header-cell *matHeaderCellDef>Tổng BH Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#2563eb;">{{ r.insuranceEmployerAmount | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bonus">
                  <th mat-header-cell *matHeaderCellDef>Thưởng</th>
                  <td mat-cell *matCellDef="let r">
                    @if (editingId() === r.id) {
                      <input type="number" [(ngModel)]="editRow.bonus" min="0"
                        style="width:100px;padding:4px 8px;border:1.5px solid #6366f1;border-radius:6px;font-family:inherit;">
                    } @else {
                      <span style="color:#15803d;font-weight:500;">{{ r.bonus | number:'1.0-0' }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="deduction">
                  <th mat-header-cell *matHeaderCellDef>Khấu trừ</th>
                  <td mat-cell *matCellDef="let r">
                    @if (editingId() === r.id) {
                      <input type="number" [(ngModel)]="editRow.deduction" min="0"
                        style="width:100px;padding:4px 8px;border:1.5px solid #6366f1;border-radius:6px;font-family:inherit;">
                    } @else {
                      <span style="color:#dc2626;font-weight:500;">{{ r.deduction | number:'1.0-0' }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="netSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương Net</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#1565c0;font-size:14px;">{{ r.netSalary | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="note">
                  <th mat-header-cell *matHeaderCellDef>Ghi chú</th>
                  <td mat-cell *matCellDef="let r">
                    @if (editingId() === r.id) {
                      <input [(ngModel)]="editRow.adjustmentNote"
                        style="width:160px;padding:4px 8px;border:1.5px solid #6366f1;border-radius:6px;font-family:inherit;">
                    } @else {
                      <span style="color:#6b7280; font-size:12px;">{{ r.adjustmentNote || '—' }}</span>
                    }
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="'status-chip ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.status !== 'PAID') {
                      @if (editingId() === r.id) {
                        <button mat-icon-button color="primary" (click)="saveEdit(r)" matTooltip="Lưu">
                          <mat-icon>check</mat-icon>
                        </button>
                        <button mat-icon-button (click)="cancelEdit()" matTooltip="Hủy">
                          <mat-icon>close</mat-icon>
                        </button>
                      } @else {
                        @if (r.status === 'DRAFT' || r.status === 'ADJUSTED') {
                          <button mat-icon-button (click)="startEdit(r)" matTooltip="Chỉnh sửa">
                            <mat-icon>edit</mat-icon>
                          </button>
                        }
                      }
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
              </table>
            </div>

            <!-- Footer actions -->
            <div style="padding:16px 20px; display:flex; justify-content:flex-end; gap:12px; border-top:1px solid #f3f4f6; align-items:center;">
              @if (allPaid()) {
                <span style="background:#DCFCE7; color:#16A34A; padding:4px 12px; border-radius:12px; font-weight:600; font-size:12px;">ĐÃ TRẢ LƯƠNG</span>
              } @else {
                @if (canMarkPaid()) {
                  <button mat-raised-button style="background:#16A34A;color:#fff;" (click)="markPaid()" [disabled]="loading()">
                    <mat-icon>payments</mat-icon> Đã trả lương
                  </button>
                }
                @if (canConfirm()) {
                  <button mat-raised-button color="primary" (click)="confirmPayroll()" [disabled]="loading()">
                    <mat-icon>verified</mat-icon> Xác nhận bảng lương
                  </button>
                }
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .avatar {
      width:34px;height:34px;border-radius:50%;
      background:linear-gradient(135deg,#5B5BD6,#7C3AED);
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:600;font-size:13px;flex-shrink:0;
    }
    .status-chip {
      padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;
      &.draft    { background:#F3F4F6; color:#6B7280; }
      &.adjusted { background:#FEF3C7; color:#D97706; }
      &.confirmed { background:#DCFCE7; color:#16A34A; }
      &.exported { background:#DBEAFE; color:#1D4ED8; }
      &.paid     { background:#DCFCE7; color:#16A34A; }
      &.stale    { background:#FEE2E2; color:#DC2626; }
    }
  `]
})
export class PayrollComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['stt','employee','daysWorked','calculatedSalary','insuranceSalary','bhxhEmp','bhytEmp','bhtnEmp','totalInsEmp','bhxhEr','bhytEr','bhtnEr','totalInsEr','bonus','deduction','netSalary','status','actions'];
  readonly loading = signal(false);
  readonly records = signal<PayrollRecord[]>([]);
  readonly hasStale = signal(false);
  readonly editingId = signal<number | null>(null);

  editRow: { bonus: number; deduction: number; adjustmentNote: string } = { bonus: 0, deduction: 0, adjustmentNote: '' };
  selectedMonth = new Date().toISOString().slice(0, 7);

  readonly totalNetSalary = computed(() => this.records().reduce((s, r) => s + r.netSalary, 0));
  readonly totalBonus = computed(() => this.records().reduce((s, r) => s + r.bonus, 0));
  readonly totalInsEmployee = computed(() => this.records().reduce((s, r) => s + (r.insuranceEmployeeAmount || 0), 0));
  readonly overallStatus = computed(() => {
    const recs = this.records();
    if (recs.every(r => r.status === 'PAID'))                                  return 'PAID';
    if (recs.every(r => r.status === 'CONFIRMED' || r.status === 'EXPORTED' || r.status === 'PAID')) return 'CONFIRMED';
    if (recs.some(r => r.status === 'STALE'))                                  return 'STALE';
    if (recs.some(r => r.status === 'ADJUSTED'))                               return 'ADJUSTED';
    return 'DRAFT';
  });
  readonly canConfirm = computed(() =>
    this.records().length > 0 &&
    this.records().some(r => r.status === 'DRAFT' || r.status === 'ADJUSTED') &&
    !this.records().some(r => r.status === 'PAID')
  );
  readonly allPaid = computed(() => this.records().length > 0 && this.records().every(r => r.status === 'PAID'));
  readonly canMarkPaid = computed(() => this.records().length > 0 && this.records().every(r => r.status === 'CONFIRMED' || r.status === 'EXPORTED'));

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.payrollService.getPayroll(this.selectedMonth).subscribe({
      next: data => {
        this.records.set(data || []);
        this.loading.set(false);
        if (data?.length) this.checkStale();
      },
      error: () => this.loading.set(false)
    });
  }

  generate() {
    this.loading.set(true);
    this.payrollService.generate(this.selectedMonth).subscribe({
      next: data => {
        this.records.set(data || []);
        this.loading.set(false);
        this.snackBar.open('Đã sinh bảng lương', 'OK', { duration: 3000 });
      },
      error: () => { this.loading.set(false); this.snackBar.open('Lỗi sinh bảng lương', 'X', { duration: 3000 }); }
    });
  }

  startEdit(r: PayrollRecord) {
    this.editingId.set(r.id);
    this.editRow = { bonus: r.bonus, deduction: r.deduction, adjustmentNote: r.adjustmentNote || '' };
  }

  cancelEdit() { this.editingId.set(null); }

  saveEdit(r: PayrollRecord) {
    this.payrollService.update(r.id, this.editRow).subscribe({
      next: updated => {
        this.records.update(list => list.map(x => x.id === updated.id ? updated : x));
        this.editingId.set(null);
        this.snackBar.open('Đã lưu', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Lỗi cập nhật', 'X', { duration: 3000 })
    });
  }

  confirmPayroll() {
    if (!confirm(`Xác nhận toàn bộ bảng lương tháng ${this.selectedMonth}? Hành động không thể hoàn tác.`)) return;
    this.loading.set(true);
    this.payrollService.confirm(this.selectedMonth).subscribe({
      next: () => { this.load(); this.snackBar.open('Đã xác nhận bảng lương', 'OK', { duration: 3000 }); },
      error: () => { this.loading.set(false); this.snackBar.open('Lỗi xác nhận', 'X', { duration: 3000 }); }
    });
  }

  exportExcel() {
    this.payrollService.exportExcel(this.selectedMonth).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `payroll_${this.selectedMonth}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Lỗi xuất Excel', 'X', { duration: 3000 })
    });
  }

  resetPayroll() {
    const reason = prompt('Nhập lý do reset bảng lương:');
    if (!reason) return;
    this.payrollService.reset(this.selectedMonth, reason).subscribe({
      next: () => { this.load(); this.snackBar.open('Đã reset bảng lương', 'OK', { duration: 3000 }); },
      error: () => this.snackBar.open('Lỗi reset', 'X', { duration: 3000 })
    });
  }

  checkStale() {
    this.payrollService.staleCheck(this.selectedMonth).subscribe(v => this.hasStale.set(v));
  }

  markPaid() {
    if (!confirm(`Xác nhận đã trả lương tháng ${this.selectedMonth}?\n\nBảng lương sẽ bị KHÓA VĨNH VIỄN, không thể sửa hay reset.`)) return;
    this.payrollService.markPaid(this.selectedMonth).subscribe({
      next: () => {
        this.snackBar.open('Đã đánh dấu trả lương thành công', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 4000 })
    });
  }

  onMonthChanged(val: string) { this.selectedMonth = val; this.load(); }

  statusLabel(s: string) {
    const m: Record<string, string> = { DRAFT: 'Nháp', ADJUSTED: 'Đã điều chỉnh', CONFIRMED: 'Đã xác nhận', EXPORTED: 'Đã xuất', PAID: 'Đã trả', STALE: 'Lỗi thời' };
    return m[s] || s;
  }
  statusClass(s: string) { return s?.toLowerCase() || 'draft'; }
}
