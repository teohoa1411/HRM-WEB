import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CompanyService } from '../../../core/services/company.service';

@Component({
  selector: 'app-company-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">{{ isEdit() ? 'Chỉnh sửa Công ty' : 'Thêm Công ty mới' }}</div>
          <div class="page-subtitle">{{ isEdit() ? 'Cập nhật thông tin công ty' : 'Tạo tenant mới trong hệ thống' }}</div>
        </div>
        <button mat-stroked-button (click)="goBack()"><mat-icon>arrow_back</mat-icon> Quay lại</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-card style="margin-bottom:16px;">
          <mat-card-header><mat-card-title>Company Information</mat-card-title></mat-card-header>
          <mat-card-content style="padding:16px;">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Company Code *</mat-label>
                <input matInput formControlName="code" placeholder="VNTECH01">
                <mat-hint>3-20 uppercase letters/numbers</mat-hint>
                <mat-error>Required, uppercase alphanumeric 3-20 chars</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Company Name *</mat-label>
                <input matInput formControlName="name">
                <mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Short Name</mat-label>
                <input matInput formControlName="shortName">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tax Code</mat-label>
                <input matInput formControlName="taxCode">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput formControlName="email" type="email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput formControlName="phone">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Address</mat-label>
                <input matInput formControlName="address">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>City</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        @if (!isEdit()) {
          <mat-card style="margin-bottom:16px;">
            <mat-card-header>
              <mat-card-title>Admin Account</mat-card-title>
              <mat-card-subtitle>A COMPANY_ADMIN account will be auto-created</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="padding:16px;">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Admin Username *</mat-label>
                  <input matInput formControlName="adminUsername">
                  <mat-error>Required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Admin Email *</mat-label>
                  <input matInput formControlName="adminEmail" type="email">
                  <mat-error>Valid email required</mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <div class="flex-row gap-16" style="justify-content:flex-end;">
          <button mat-stroked-button type="button" (click)="goBack()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Saving...' : (isEdit() ? 'Save Changes' : 'Create Company') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class CompanyFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private companyService = inject(CompanyService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.pattern('^[A-Z0-9]{3,20}$')]],
    name: ['', Validators.required],
    shortName: [''],
    taxCode: [''],
    email: ['', Validators.email],
    phone: [''],
    address: [''],
    city: [''],
    country: ['VN'],
    adminUsername: [''],
    adminEmail: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.form.get('code')?.disable();
      this.companyService.getById(+id).subscribe(c => this.form.patchValue(c as any));
    } else {
      this.form.get('adminUsername')?.setValidators(Validators.required);
      this.form.get('adminEmail')?.setValidators([Validators.required, Validators.email]);
      this.form.updateValueAndValidity();
    }
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    const val = this.form.getRawValue() as any;

    if (id) {
      this.companyService.update(+id, val).subscribe({
        next: () => {
          this.snackBar.open('Company updated', 'OK', { duration: 3000 });
          this.router.navigate(['/companies']);
        },
        error: (err) => {
          this.submitting.set(false);
          this.snackBar.open(err?.error?.message ?? 'Failed', 'Close', { duration: 4000, panelClass: 'error-snack' });
        }
      });
    } else {
      this.companyService.create(val).subscribe({
        next: (res: any) => {
          const data = res?.data ?? res;
          // Show password dialog — admin must note this down
          this.showPasswordDialog(data);
        },
        error: (err) => {
          this.submitting.set(false);
          this.snackBar.open(err?.error?.message ?? 'Failed', 'Close', { duration: 4000, panelClass: 'error-snack' });
        }
      });
    }
  }

  private showPasswordDialog(company: any) {
    const dialogRef = this.dialog.open(CompanyCreatedDialogComponent, {
      width: '480px',
      disableClose: true,
      data: {
        companyName: company.name,
        adminUsername: company.adminUsername,
        adminEmail: company.adminEmail,
        tempPassword: company.tempAdminPassword
      }
    });
    dialogRef.afterClosed().subscribe(() => this.router.navigate(['/companies']));
  }

  goBack() { this.router.navigate(['/companies']); }
}

// ── Dialog: shown after company creation with temp password ──
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { Clipboard } from '@angular/cdk/clipboard';
import { ClipboardModule } from '@angular/cdk/clipboard';

@Component({
  selector: 'app-company-created-dialog',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatDividerModule, ClipboardModule],
  template: `
    <div style="padding:24px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <mat-icon style="font-size:36px;width:36px;height:36px;color:#4caf50;">check_circle</mat-icon>
        <div>
          <h2 style="margin:0;font-size:20px;">Company Created!</h2>
          <p style="margin:4px 0 0;color:#666;font-size:13px;">{{ data.companyName }}</p>
        </div>
      </div>

      <mat-divider style="margin-bottom:16px;"></mat-divider>

      <p style="margin:0 0 16px;color:#333;font-size:14px;">
        Tài khoản <strong>COMPANY_ADMIN</strong> đã được tạo với mật khẩu tạm thời.<br>
        <strong style="color:#e53935;">Lưu lại ngay — mật khẩu này chỉ hiển thị một lần!</strong>
      </p>

      <div style="background:#f5f5f5;border-radius:8px;padding:16px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#666;font-size:13px;">Username</span>
          <strong>{{ data.adminUsername }}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#666;font-size:13px;">Email</span>
          <strong>{{ data.adminEmail }}</strong>
        </div>
        <mat-divider style="margin:8px 0;"></mat-divider>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="color:#666;font-size:13px;">Mật khẩu tạm</span>
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="font-size:16px;color:#1565C0;letter-spacing:1px;">{{ data.tempPassword }}</strong>
            <button mat-icon-button [cdkCopyToClipboard]="data.tempPassword" (click)="copied=true" matTooltip="Copy">
              <mat-icon style="font-size:18px;">{{ copied ? 'check' : 'content_copy' }}</mat-icon>
            </button>
          </div>
        </div>
      </div>

      <p style="margin:0 0 16px;font-size:12px;color:#999;">
        Admin sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
      </p>

      <div style="text-align:right;">
        <button mat-raised-button color="primary" (click)="close()">
          <mat-icon>done</mat-icon> Đã ghi lại, Đóng
        </button>
      </div>
    </div>
  `
})
export class CompanyCreatedDialogComponent {
  data = inject(MAT_DIALOG_DATA);
  private ref = inject(MatDialogRef);
  copied = false;
  close() { this.ref.close(); }
}
