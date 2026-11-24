import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../core/models/employee.models';
import { LeaveType, GrantLeaveBalanceRequest } from '../../../core/models/leave.models';

export interface LeaveGrantDialogData {
  year: number;
  leaveTypes: LeaveType[];
}

@Component({
  selector: 'app-leave-grant-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatDialogModule, MatButtonModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatAutocompleteModule, MatIconModule
  ],
  template: `
    <h2 mat-dialog-title style="display:flex;align-items:center;gap:8px;">
      <mat-icon style="color:#6366f1;">add_circle</mat-icon>
      Cấp phép mới
    </h2>

    <mat-dialog-content style="min-width:460px;padding-top:8px;">
      <!-- Employee autocomplete -->
      <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px;">
        <mat-label>Tìm nhân sự</mat-label>
        <mat-icon matPrefix style="margin-right:4px;">person_search</mat-icon>
        <input matInput
          placeholder="Gõ tên hoặc mã nhân viên (tối thiểu 2 ký tự)..."
          [(ngModel)]="employeeSearchText"
          (ngModelChange)="onEmployeeSearch($event)"
          [matAutocomplete]="empAuto">
        <mat-autocomplete #empAuto="matAutocomplete"
          (optionSelected)="onEmployeeSelected($event)">
          @for (emp of filteredEmployees(); track emp.id) {
            <mat-option [value]="emp">
              <span style="font-weight:600;">{{ emp.fullName }}</span>
              <span style="color:#94a3b8;margin-left:8px;font-size:12px;">{{ emp.employeeCode }}</span>
            </mat-option>
          }
          @if (filteredEmployees().length === 0 && employeeSearchText.length >= 2) {
            <mat-option disabled>Không tìm thấy nhân sự</mat-option>
          }
        </mat-autocomplete>
      </mat-form-field>

      <!-- Selected employee badge -->
      @if (selectedEmployee) {
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 12px;margin-bottom:16px;display:flex;align-items:center;gap:6px;">
          <mat-icon style="font-size:16px;width:16px;height:16px;color:#16a34a;">check_circle</mat-icon>
          <span style="font-size:13px;">Đã chọn: <strong>{{ selectedEmployee.fullName }}</strong>
            <span style="color:#6b7280;margin-left:6px;font-size:12px;">({{ selectedEmployee.employeeCode }})</span>
          </span>
        </div>
      }

      <!-- Leave type -->
      <mat-form-field appearance="outline" style="width:100%;margin-bottom:4px;">
        <mat-label>Loại phép</mat-label>
        <mat-select [(ngModel)]="form.leaveTypeId">
          <mat-option [value]="0" disabled>-- Chọn loại phép --</mat-option>
          @for (t of data.leaveTypes; track t.id) {
            <mat-option [value]="t.id">
              {{ t.name }}
              <span style="color:#9ca3af;font-size:12px;margin-left:6px;">{{ t.paid ? '(có lương)' : '(không lương)' }}</span>
            </mat-option>
          }
        </mat-select>
      </mat-form-field>

      <!-- Year + Quota -->
      <div style="display:flex;gap:12px;">
        <mat-form-field appearance="outline" style="width:110px;">
          <mat-label>Năm</mat-label>
          <input matInput [value]="data.year" readonly style="color:#6b7280;">
        </mat-form-field>
        <mat-form-field appearance="outline" style="flex:1;">
          <mat-label>Số ngày quota</mat-label>
          <input matInput type="number" [(ngModel)]="form.totalQuota" min="0.5" step="0.5">
          <span matSuffix style="color:#6b7280;font-size:13px;">ngày</span>
        </mat-form-field>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:12px 24px;gap:8px;">
      <button mat-button (click)="cancel()">Hủy</button>
      <button mat-flat-button color="primary" [disabled]="!isValid()" (click)="submit()">
        <mat-icon>save</mat-icon> Lưu
      </button>
    </mat-dialog-actions>
  `
})
export class LeaveGrantDialogComponent {
  readonly dialogRef = inject(MatDialogRef<LeaveGrantDialogComponent>);
  readonly data: LeaveGrantDialogData = inject(MAT_DIALOG_DATA);
  private employeeSvc = inject(EmployeeService);

  filteredEmployees = signal<Employee[]>([]);
  employeeSearchText = '';
  selectedEmployee: Employee | null = null;

  form: GrantLeaveBalanceRequest = {
    employeeId: 0,
    leaveTypeId: 0,
    year: this.data.year,
    totalQuota: 12
  };

  onEmployeeSearch(term: string) {
    if (!term || term.length < 2) { this.filteredEmployees.set([]); return; }
    this.employeeSvc.search(term).subscribe(r => this.filteredEmployees.set(r));
  }

  onEmployeeSelected(event: any) {
    const emp: Employee = event.option.value;
    this.selectedEmployee = emp;
    this.employeeSearchText = `${emp.fullName} (${emp.employeeCode})`;
    this.form.employeeId = emp.id;
    this.filteredEmployees.set([]);
  }

  isValid(): boolean {
    return this.form.employeeId > 0
      && this.form.leaveTypeId > 0
      && this.form.totalQuota > 0;
  }

  submit() {
    if (!this.isValid()) return;
    this.dialogRef.close({ ...this.form, year: this.data.year });
  }

  cancel() { this.dialogRef.close(null); }
}
