import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';
import { environment } from '@environments/environment';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const current = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return current && confirm && current !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  template: `
    <div class="wrapper">
      <mat-card class="card">
        <mat-card-header style="padding:24px 24px 8px;">
          <div style="display:flex;align-items:center;gap:12px;width:100%;">
            <mat-icon style="font-size:36px;width:36px;height:36px;color:#1565C0;">lock_reset</mat-icon>
            <div>
              <mat-card-title style="font-size:20px;">Đổi mật khẩu</mat-card-title>
              <mat-card-subtitle style="color:#e53935;font-weight:500;">
                Bạn cần đổi mật khẩu trước khi tiếp tục
              </mat-card-subtitle>
            </div>
          </div>
        </mat-card-header>

        <mat-card-content style="padding:16px 24px;">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <mat-form-field appearance="outline" class="full-width" style="margin-bottom:8px;">
              <mat-label>Mật khẩu hiện tại</mat-label>
              <input matInput [type]="show()['cur'] ? 'text' : 'password'" formControlName="currentPassword">
              <button mat-icon-button matSuffix type="button" (click)="toggle('cur')">
                <mat-icon>{{ show()['cur'] ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.get('currentPassword')?.hasError('required') && form.get('currentPassword')?.touched) {
                <mat-error>Bắt buộc</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width" style="margin-bottom:8px;">
              <mat-label>Mật khẩu mới</mat-label>
              <input matInput [type]="show()['new'] ? 'text' : 'password'" formControlName="newPassword">
              <button mat-icon-button matSuffix type="button" (click)="toggle('new')">
                <mat-icon>{{ show()['new'] ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Tối thiểu 8 ký tự</mat-hint>
              @if (form.get('newPassword')?.hasError('minlength') && form.get('newPassword')?.touched) {
                <mat-error>Tối thiểu 8 ký tự</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
              <mat-label>Xác nhận mật khẩu mới</mat-label>
              <input matInput [type]="show()['cfm'] ? 'text' : 'password'" formControlName="confirmPassword">
              <button mat-icon-button matSuffix type="button" (click)="toggle('cfm')">
                <mat-icon>{{ show()['cfm'] ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.hasError('mismatch') && form.get('confirmPassword')?.touched) {
                <mat-error>Mật khẩu không khớp</mat-error>
              }
            </mat-form-field>

            @if (errorMsg()) {
              <div style="background:#ffebee;color:#c62828;padding:10px 14px;border-radius:8px;
                          font-size:13px;margin-bottom:16px;display:flex;align-items:center;gap:8px;">
                <mat-icon style="font-size:18px;">error_outline</mat-icon>
                {{ errorMsg() }}
              </div>
            }

            <button mat-raised-button color="primary" type="submit"
                    class="full-width" style="height:44px;"
                    [disabled]="submitting() || form.invalid">
              {{ submitting() ? 'Đang lưu...' : 'Xác nhận đổi mật khẩu' }}
            </button>
          </form>
        </mat-card-content>

        <mat-card-footer style="padding:12px 24px;border-top:1px solid #eee;text-align:right;">
          <button mat-button color="warn" (click)="authService.logout()">
            <mat-icon>logout</mat-icon> Đăng xuất
          </button>
        </mat-card-footer>
      </mat-card>
    </div>
  `,
  styles: [`
    .wrapper {
      min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
      background: linear-gradient(135deg, #1565C0 0%, #0d47a1 100%);
      padding: 24px;
    }
    .card { width: 100%; max-width: 440px; border-radius: 16px !important; }
    .full-width { width: 100%; }
  `]
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  readonly authService = inject(AuthService);

  readonly submitting = signal(false);
  readonly errorMsg = signal<string | null>(null);
  readonly show = signal<Record<string, boolean>>({ cur: false, new: false, cfm: false });

  readonly form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  }, { validators: passwordMatchValidator });

  toggle(key: string) {
    this.show.update(s => ({ ...s, [key]: !s[key] }));
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    this.errorMsg.set(null);

    const { currentPassword, newPassword } = this.form.getRawValue();
    const token = this.authService.accessToken();

    this.http.patch<any>(`${environment.apiUrl}/auth/change-password`,
      { currentPassword, newPassword },
      { headers: { Authorization: `Bearer ${token}` } }
    ).subscribe({
      next: () => {
        this.authService.clearMustChangePassword();
        this.snackBar.open('Đổi mật khẩu thành công!', 'OK', { duration: 3000 });
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.errorMsg.set(err?.error?.message ?? 'Đổi mật khẩu thất bại');
      }
    });
  }
}
