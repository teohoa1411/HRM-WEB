import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CustomerService } from '../../../core/services/customer.service';

@Component({
  selector: 'app-customer-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container" style="max-width:700px;">
      <div class="page-header">
        <div class="page-title">{{ isEdit() ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới' }}</div>
      </div>

      <mat-card>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="save()" style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">

            <mat-form-field>
              <mat-label>Mã khách hàng *</mat-label>
              <input matInput formControlName="code" [readonly]="isEdit()" placeholder="KH001">
              @if (form.get('code')?.hasError('required')) {
                <mat-error>Bắt buộc</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Tên khách hàng *</mat-label>
              <input matInput formControlName="name" placeholder="Công ty ABC">
              @if (form.get('name')?.hasError('required')) {
                <mat-error>Bắt buộc</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Mã nhà cung cấp (Vendor Code)</mat-label>
              <input matInput formControlName="vendorCode" placeholder="VD: TCB-VC-0001">
              <mat-hint>Mã nội bộ do phía khách hàng cấp (xuất trên biên bản)</mat-hint>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Người liên hệ</mat-label>
              <input matInput formControlName="contactPerson">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Email liên hệ</mat-label>
              <input matInput formControlName="contactEmail" type="email">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Điện thoại</mat-label>
              <input matInput formControlName="contactPhone">
            </mat-form-field>

            <mat-form-field>
              <mat-label>Mã số thuế</mat-label>
              <input matInput formControlName="taxCode">
            </mat-form-field>

            <mat-form-field style="grid-column:1/-1;">
              <mat-label>Địa chỉ</mat-label>
              <input matInput formControlName="address">
            </mat-form-field>

            <mat-form-field style="grid-column:1/-1;">
              <mat-label>Ghi chú</mat-label>
              <textarea matInput formControlName="notes" rows="3"></textarea>
            </mat-form-field>

            <div style="grid-column:1/-1;display:flex;gap:12px;justify-content:flex-end;">
              <button mat-button type="button" (click)="cancel()">Hủy</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
                <mat-icon>save</mat-icon> {{ isEdit() ? 'Cập nhật' : 'Tạo mới' }}
              </button>
            </div>

          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class CustomerFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  private editId: number | null = null;

  readonly form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    vendorCode: [''],
    contactPerson: [''],
    contactEmail: [''],
    contactPhone: [''],
    taxCode: [''],
    address: [''],
    notes: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId = +id;
      this.customerService.getById(+id).subscribe(c => {
        this.form.patchValue(c);
        this.form.get('code')?.disable();
      });
    }
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.getRawValue() as any;
    const obs = this.isEdit()
      ? this.customerService.update(this.editId!, val)
      : this.customerService.create(val);

    obs.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Đã cập nhật' : 'Đã tạo mới', 'OK', { duration: 2000 });
        this.router.navigate(['/customers']);
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Lỗi', 'Close', { duration: 4000, panelClass: 'error-snack' })
    });
  }

  cancel() { this.router.navigate(['/customers']); }
}
