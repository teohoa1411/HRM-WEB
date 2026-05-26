import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomerService } from '../../../core/services/customer.service';
import { JobRoleService } from '../../../core/services/job-role.service';
import { Customer, CustomerPrice } from '../../../core/models/customer.models';
import { JobRole } from '../../../core/models/job-role.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-customer-price-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatButtonModule, MatTableModule, MatIconModule,
    MoneyDirective],
  template: `
    <h2 mat-dialog-title>Cấu hình giá mua — {{ data.customer.name }}</h2>

    <mat-dialog-content style="min-width:600px;">

      <!-- Lịch sử giá -->
      <div style="margin-bottom:20px;">
        <div style="font-weight:600;margin-bottom:8px;color:#374151;">Lịch sử giá</div>
        @if (prices().length === 0) {
          <div style="color:#9ca3af;font-size:13px;padding:12px 0;">Chưa có giá nào được cấu hình</div>
        } @else {
          <table mat-table [dataSource]="prices()" style="width:100%;">
            <ng-container matColumnDef="jobRole">
              <th mat-header-cell *matHeaderCellDef>Job Role</th>
              <td mat-cell *matCellDef="let p">{{ p.jobRoleName }}</td>
            </ng-container>
            <ng-container matColumnDef="price">
              <th mat-header-cell *matHeaderCellDef>Giá</th>
              <td mat-cell *matCellDef="let p">{{ p.price | number:'1.0-0' }} {{ p.currency }}</td>
            </ng-container>
            <ng-container matColumnDef="unit">
              <th mat-header-cell *matHeaderCellDef>Đơn vị</th>
              <td mat-cell *matCellDef="let p">
                <span [style.color]="p.priceUnit === 'DAILY' ? '#0284c7' : '#7c3aed'">/{{ p.priceUnit === 'DAILY' ? 'ngày' : 'tháng' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="from">
              <th mat-header-cell *matHeaderCellDef>Từ ngày</th>
              <td mat-cell *matCellDef="let p">{{ p.effectiveFrom }}</td>
            </ng-container>
            <ng-container matColumnDef="to">
              <th mat-header-cell *matHeaderCellDef>Đến ngày</th>
              <td mat-cell *matCellDef="let p">{{ p.effectiveTo ?? 'Hiện tại' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="['jobRole','price','unit','from','to']"></tr>
            <tr mat-row *matRowDef="let row; columns: ['jobRole','price','unit','from','to'];"></tr>
          </table>
        }
      </div>

      <!-- Form thêm giá mới -->
      <div style="background:#f8fafc;border-radius:8px;padding:16px;">
        <div style="font-weight:600;margin-bottom:12px;color:#374151;">Thêm / cập nhật giá</div>
        <form [formGroup]="priceForm" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">

          <mat-form-field>
            <mat-label>Job Role *</mat-label>
            <mat-select formControlName="jobRoleId">
              @for (jr of jobRoles(); track jr.id) {
                <mat-option [value]="jr.id">{{ jr.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Đơn giá (VNĐ) *</mat-label>
            <input matInput formControlName="price" type="text" inputmode="numeric" appMoney>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Đơn vị tính *</mat-label>
            <mat-select formControlName="priceUnit">
              <mat-option value="MONTHLY">Tháng (MONTHLY)</mat-option>
              <mat-option value="DAILY">Ngày (DAILY)</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field>
            <mat-label>Ngày áp dụng *</mat-label>
            <input matInput formControlName="effectiveFrom" type="date">
          </mat-form-field>

          <mat-form-field style="grid-column:1/-1;">
            <mat-label>Ghi chú</mat-label>
            <input matInput formControlName="notes">
          </mat-form-field>

          <div style="grid-column:1/-1;display:flex;justify-content:flex-end;">
            <button mat-raised-button color="primary" type="button"
              [disabled]="priceForm.invalid" (click)="addPrice()">
              <mat-icon>save</mat-icon> Lưu giá
            </button>
          </div>
        </form>
      </div>

    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="close()">Đóng</button>
    </mat-dialog-actions>
  `
})
export class CustomerPriceDialogComponent implements OnInit {
  readonly data: { customer: Customer } = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CustomerPriceDialogComponent>);
  private customerService = inject(CustomerService);
  private jobRoleService = inject(JobRoleService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly prices = signal<CustomerPrice[]>([]);
  readonly jobRoles = signal<JobRole[]>([]);

  readonly priceForm = this.fb.group({
    jobRoleId: [null as number | null, Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0)]],
    priceUnit: ['MONTHLY', Validators.required],
    effectiveFrom: ['', Validators.required],
    notes: ['']
  });

  ngOnInit() {
    this.loadPrices();
    this.jobRoleService.listActive().subscribe(roles => this.jobRoles.set(roles));
  }

  loadPrices() {
    this.customerService.getPriceHistory(this.data.customer.id).subscribe(p => this.prices.set(p));
  }

  addPrice() {
    if (this.priceForm.invalid) return;
    const val = this.priceForm.getRawValue() as any;
    this.customerService.setPrice(this.data.customer.id, val).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu giá', 'OK', { duration: 2000 });
        this.priceForm.reset({ priceUnit: 'MONTHLY' });
        this.loadPrices();
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Lỗi', 'Close', { duration: 3000, panelClass: 'error-snack' })
    });
  }

  close() { this.dialogRef.close(); }
}
