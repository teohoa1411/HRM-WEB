import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { LeaveBalance } from '../../../core/models/leave.models';

export interface LeaveAdjustDialogData {
  balance: LeaveBalance;
}

export interface LeaveAdjustDialogResult {
  balanceId: number;
  delta: number;
}

@Component({
  selector: 'app-leave-adjust-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatButtonToggleModule,
    MatFormFieldModule, MatInputModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px;">
      <mat-icon style="color:#6366f1;">tune</mat-icon>
      Điều chỉnh quota phép
    </h2>

    <mat-dialog-content style="min-width:420px;padding-top:8px;">
      <!-- Info panel -->
      <div style="background:#f8faff;border:1px solid #e0e7ff;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
        <div style="font-weight:700;font-size:15px;color:#1e293b;">{{ data.balance.employeeName }}</div>
        <div style="font-size:12px;color:#9ca3af;margin-bottom:10px;"><code>{{ data.balance.employeeCode }}</code></div>
        <div style="display:flex;gap:0;flex-wrap:wrap;">
          <div style="flex:1;min-width:120px;padding:6px 0;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Loại phép</div>
            <div style="font-size:13px;font-weight:600;color:#374151;">{{ data.balance.leaveTypeName }}</div>
          </div>
          <div style="flex:1;min-width:100px;padding:6px 0;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Quota hiện tại</div>
            <div style="font-size:13px;font-weight:700;color:#1e293b;">{{ data.balance.totalQuota }}d</div>
          </div>
          <div style="flex:1;min-width:100px;padding:6px 0;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Đã dùng</div>
            <div style="font-size:13px;font-weight:700;color:#D97706;">{{ data.balance.usedDays }}d</div>
          </div>
          <div style="flex:1;min-width:100px;padding:6px 0;">
            <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;">Còn lại</div>
            <div style="font-size:13px;font-weight:700;"
              [style.color]="data.balance.remainingDays <= 0 ? '#dc2626' : '#16a34a'">
              {{ data.balance.remainingDays }}d
            </div>
          </div>
        </div>
      </div>

      <!-- Mode toggle -->
      <div style="margin-bottom:16px;">
        <div style="font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Thao tác</div>
        <mat-button-toggle-group [value]="mode()" (change)="mode.set($event.value)" style="width:100%;">
          <mat-button-toggle value="add" style="flex:1;">
            <mat-icon style="margin-right:4px;">add_circle</mat-icon> Cộng thêm
          </mat-button-toggle>
          <mat-button-toggle value="subtract" style="flex:1;">
            <mat-icon style="margin-right:4px;">remove_circle</mat-icon> Trừ đi
          </mat-button-toggle>
        </mat-button-toggle-group>
      </div>

      <!-- Days input -->
      <mat-form-field appearance="outline" style="width:100%;margin-bottom:8px;">
        <mat-label>Số ngày</mat-label>
        <input matInput type="number"
          [ngModel]="days()"
          (ngModelChange)="days.set(+$event)"
          min="0.5" step="0.5">
        <span matSuffix style="color:#6b7280;font-size:13px;">ngày</span>
        @if (mode() === 'subtract' && days() > data.balance.totalQuota) {
          <mat-hint style="color:#dc2626;">
            Không thể trừ quá quota hiện tại ({{ data.balance.totalQuota }}d)
          </mat-hint>
        }
        @if (subtractWarning()) {
          <mat-hint style="color:#dc2626;">{{ subtractWarning() }}</mat-hint>
        }
      </mat-form-field>

      <!-- Live preview -->
      <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:8px;">
        <mat-icon style="font-size:18px;width:18px;height:18px;color:#d97706;">preview</mat-icon>
        <span style="font-size:13px;color:#6b7280;">Quota mới sẽ là:</span>
        <strong style="font-size:16px;color:#1e293b;margin-left:4px;">{{ previewQuota() | number:'1.1-1' }}d</strong>
        @if (mode() === 'add') {
          <span style="font-size:12px;color:#16a34a;margin-left:auto;">(+{{ days() }}d)</span>
        } @else {
          <span style="font-size:12px;color:#dc2626;margin-left:auto;">(-{{ days() }}d)</span>
        }
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px;gap:8px;">
      <button mat-button (click)="cancel()">Hủy</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="submit()">
        <mat-icon>check</mat-icon> Xác nhận
      </button>
    </mat-dialog-actions>
  `
})
export class LeaveAdjustDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LeaveAdjustDialogComponent>);
  readonly data: LeaveAdjustDialogData = inject(MAT_DIALOG_DATA);

  mode = signal<'add' | 'subtract'>('add');
  days = signal(1);

  previewQuota = computed(() => {
    const delta = this.mode() === 'add' ? this.days() : -this.days();
    return Math.max(0, this.data.balance.totalQuota + delta);
  });

  isValid(): boolean {
    if (this.days() <= 0) return false;
    if (this.mode() === 'subtract') {
      // Không cho trừ quá totalQuota
      if (this.days() > this.data.balance.totalQuota) return false;
      // Không cho trừ để quota < usedDays (tránh remainingDays âm)
      if (this.previewQuota() < this.data.balance.usedDays) return false;
    }
    return true;
  }

  subtractWarning(): string | null {
    if (this.mode() !== 'subtract' || this.days() <= 0) return null;
    if (this.previewQuota() < this.data.balance.usedDays) {
      return `Quota mới (${this.previewQuota()}d) thấp hơn số ngày đã dùng (${this.data.balance.usedDays}d). Hãy giảm bớt số ngày trừ.`;
    }
    return null;
  }

  submit() {
    if (!this.isValid()) return;
    const delta = this.mode() === 'add' ? this.days() : -this.days();
    const result: LeaveAdjustDialogResult = {
      balanceId: this.data.balance.id,
      delta
    };
    this.dialogRef.close(result);
  }

  cancel() { this.dialogRef.close(null); }
}
