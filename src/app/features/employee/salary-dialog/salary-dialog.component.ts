import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { SalaryService } from '../../../core/services/salary.service';
import { InternalSalary } from '../../../core/models/salary.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-salary-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatTableModule, MatDividerModule,
    MoneyDirective
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon style="vertical-align:middle;margin-right:8px;color:#5B5BD6;">payments</mat-icon>
      Cấu hình lương — {{ data.employeeName }}
    </h2>

    <mat-dialog-content style="min-width:560px; max-height:70vh; overflow-y:auto;">

      <!-- Lịch sử lương -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:600; margin-bottom:8px; color:#374151; font-size:14px;">Lịch sử lương</div>
        @if (history().length === 0) {
          <div style="color:#9ca3af; font-size:13px; padding:12px 0; text-align:center;">
            Chưa có lịch sử lương nào
          </div>
        } @else {
          <table mat-table [dataSource]="history()" style="width:100%;">
            <ng-container matColumnDef="salary">
              <th mat-header-cell *matHeaderCellDef>Lương tháng (VNĐ)</th>
              <td mat-cell *matCellDef="let s" style="font-weight:600; color:#1d4ed8;">
                {{ s.monthlySalary | number:'1.0-0' }}
              </td>
            </ng-container>
            <ng-container matColumnDef="from">
              <th mat-header-cell *matHeaderCellDef>Từ ngày</th>
              <td mat-cell *matCellDef="let s">{{ s.effectiveFrom }}</td>
            </ng-container>
            <ng-container matColumnDef="to">
              <th mat-header-cell *matHeaderCellDef>Đến ngày</th>
              <td mat-cell *matCellDef="let s">
                @if (s.effectiveTo) {
                  {{ s.effectiveTo }}
                } @else {
                  <span style="color:#16a34a; font-weight:500;">Hiện tại</span>
                }
              </td>
            </ng-container>
            <ng-container matColumnDef="notes">
              <th mat-header-cell *matHeaderCellDef>Ghi chú</th>
              <td mat-cell *matCellDef="let s" style="color:#6b7280; font-size:12px;">{{ s.notes || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
        }
      </div>

      <mat-divider style="margin-bottom:20px;"></mat-divider>

      <!-- Form thêm mức lương mới -->
      <div style="font-weight:600; margin-bottom:12px; color:#374151; font-size:14px;">
        Cập nhật mức lương mới
      </div>
      <div style="background:#F9FAFB; border-radius:8px; padding:16px; border:1px solid #EAECF0;">
        <form [formGroup]="form" style="display:flex; flex-direction:column; gap:14px;">

          <mat-form-field appearance="outline">
            <mat-label>Lương tháng (VNĐ) *</mat-label>
            <input matInput formControlName="monthlySalary" type="text" inputmode="numeric" appMoney placeholder="15,000,000">
            <mat-hint>Nhập số tiền lương/tháng</mat-hint>
            <mat-error>Bắt buộc và phải lớn hơn 0</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ngày áp dụng *</mat-label>
            <input matInput formControlName="effectiveFrom" placeholder="2026-04-01">
            <mat-hint>YYYY-MM-DD</mat-hint>
            <mat-error>Bắt buộc (YYYY-MM-DD)</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Ghi chú</mat-label>
            <input matInput formControlName="notes" placeholder="VD: Tăng lương định kỳ Q2/2026">
          </mat-form-field>

        </form>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px 24px; gap:8px;">
      <button mat-button mat-dialog-close>Đóng</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid || saving()">
        <mat-icon>save</mat-icon>
        {{ saving() ? 'Đang lưu...' : 'Lưu mức lương' }}
      </button>
    </mat-dialog-actions>
  `
})
export class SalaryDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private salaryService = inject(SalaryService);
  private snackBar = inject(MatSnackBar);
  readonly dialogRef = inject(MatDialogRef<SalaryDialogComponent>);
  readonly data: { publicId: string; employeeName: string } = inject(MAT_DIALOG_DATA);

  readonly history = signal<InternalSalary[]>([]);
  readonly saving = signal(false);
  readonly cols = ['salary', 'from', 'to', 'notes'];

  readonly form = this.fb.group({
    monthlySalary: [null as number | null, [Validators.required, Validators.min(1)]],
    effectiveFrom: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}-\d{2}$/)]],
    notes: ['']
  });

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.salaryService.getHistory(this.data.publicId).subscribe({
      next: list => this.history.set(list),
      error: () => {}
    });
  }

  save() {
    if (this.form.invalid) return;
    const v = this.form.getRawValue();
    this.saving.set(true);
    this.salaryService.setSalary(this.data.publicId, {
      monthlySalary: v.monthlySalary!,
      effectiveFrom: v.effectiveFrom!,
      notes: v.notes || undefined
    }).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu mức lương mới', 'OK', { duration: 2500 });
        this.saving.set(false);
        this.form.reset();
        this.loadHistory();
      },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Lỗi khi lưu lương', 'Close', { duration: 3500 });
        this.saving.set(false);
      }
    });
  }
}
