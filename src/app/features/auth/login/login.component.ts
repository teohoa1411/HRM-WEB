import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatIconModule, MatProgressSpinnerModule
  ],
  template: `
<div class="lp">

  <!-- ═══ LEFT — Brand panel ═══ -->
  <div class="lp-brand">
    <div class="lp-brand-inner">

      <!-- Logo -->
      <div class="lp-logo">
        <div class="lp-logo-icon">
          <mat-icon>corporate_fare</mat-icon>
        </div>
        <span class="lp-logo-text">HRMS</span>
      </div>

      <!-- Headline -->
      <h2 class="lp-headline">
        Quản lý nhân sự<br>
        <span class="lp-headline-accent">thông minh hơn</span>
      </h2>
      <p class="lp-desc">
        Nền tảng quản lý toàn diện — chấm công, lịch làm việc, nghỉ phép và báo cáo chi phí chỉ trong một nơi.
      </p>

      <!-- Features -->
      <div class="lp-features">
        <div class="lp-feat">
          <div class="lp-feat-icon"><mat-icon>schedule</mat-icon></div>
          <div>
            <div class="lp-feat-title">Timesheet thông minh</div>
            <div class="lp-feat-sub">Log giờ theo project, tính OT tự động</div>
          </div>
        </div>
        <div class="lp-feat">
          <div class="lp-feat-icon"><mat-icon>calendar_month</mat-icon></div>
          <div>
            <div class="lp-feat-title">Lịch làm việc linh hoạt</div>
            <div class="lp-feat-sub">Ngày lễ, nửa ngày, tính công chính xác</div>
          </div>
        </div>
        <div class="lp-feat">
          <div class="lp-feat-icon"><mat-icon>bar_chart</mat-icon></div>
          <div>
            <div class="lp-feat-title">Báo cáo chi phí & doanh thu</div>
            <div class="lp-feat-sub">Phân tích theo phòng ban, khách hàng</div>
          </div>
        </div>
      </div>

    </div>

    <!-- Decorative circles -->
    <div class="lp-deco lp-deco--1"></div>
    <div class="lp-deco lp-deco--2"></div>
    <div class="lp-deco lp-deco--3"></div>
  </div>

  <!-- ═══ RIGHT — Form panel ═══ -->
  <div class="lp-form-panel">
    <div class="lp-form-wrap">

      <!-- Mobile logo -->
      <div class="lp-mobile-logo">
        <div class="lp-logo-icon sm"><mat-icon>corporate_fare</mat-icon></div>
        <span class="lp-logo-text dark">HRMS</span>
      </div>

      <div class="lp-form-header">
        <h1 class="lp-form-title">Đăng nhập</h1>
        <p class="lp-form-sub">Nhập thông tin tài khoản để tiếp tục</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" autocomplete="off">

        <!-- Username -->
        <div class="lp-field">
          <label class="lp-label">Tên đăng nhập</label>
          <div class="lp-input-wrap" [class.lp-input--error]="form.get('username')?.invalid && form.get('username')?.touched">
            <mat-icon class="lp-input-icon">person_outline</mat-icon>
            <input class="lp-input" formControlName="username"
                   placeholder="Nhập tên đăng nhập"
                   autocomplete="username" spellcheck="false">
          </div>
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <span class="lp-field-err">Vui lòng nhập tên đăng nhập</span>
          }
        </div>

        <!-- Password -->
        <div class="lp-field">
          <label class="lp-label">Mật khẩu</label>
          <div class="lp-input-wrap" [class.lp-input--error]="form.get('password')?.invalid && form.get('password')?.touched">
            <mat-icon class="lp-input-icon">lock_outline</mat-icon>
            <input class="lp-input" [type]="showPassword() ? 'text' : 'password'"
                   formControlName="password"
                   placeholder="Nhập mật khẩu"
                   autocomplete="current-password">
            <button type="button" class="lp-eye-btn" (click)="showPassword.set(!showPassword())" tabindex="-1">
              <mat-icon>{{ showPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
            <span class="lp-field-err">Vui lòng nhập mật khẩu</span>
          }
        </div>

        <!-- Error -->
        @if (errorMessage()) {
          <div class="lp-error-box">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMessage() }}</span>
          </div>
        }

        <!-- Submit -->
        <button type="submit" class="lp-submit" [class.lp-submit--loading]="loading()" [disabled]="loading()">
          @if (loading()) {
            <mat-spinner diameter="18" class="lp-spinner"></mat-spinner>
            <span>Đang đăng nhập…</span>
          } @else {
            <span>Đăng nhập</span>
            <mat-icon class="lp-arrow">arrow_forward</mat-icon>
          }
        </button>

      </form>

      <p class="lp-hint">© 2026 HRMS · Human Resource Management System</p>
    </div>
  </div>

</div>
  `,
  styles: [`
    /* ════ Layout ════ */
    .lp {
      display: flex; min-height: 100vh;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ════ LEFT BRAND PANEL ════ */
    .lp-brand {
      flex: 0 0 46%;
      background: linear-gradient(145deg, #1E1B4B 0%, #312E81 40%, #4C1D95 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 48px 56px;
      position: relative; overflow: hidden;
    }
    .lp-brand-inner { position: relative; z-index: 2; max-width: 380px; }

    /* Logo */
    .lp-logo {
      display: flex; align-items: center; gap: 12px;
      margin-bottom: 48px;
    }
    .lp-logo-icon {
      width: 46px; height: 46px;
      background: rgba(255,255,255,0.18);
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 13px;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(6px);
      mat-icon { color: #fff; font-size: 26px; width: 26px; height: 26px; }
      &.sm { width: 36px; height: 36px; border-radius: 10px;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
      }
    }
    .lp-logo-text {
      font-size: 22px; font-weight: 900; color: #fff;
      letter-spacing: 1.5px;
      &.dark { color: #1E1B4B; }
    }

    /* Headline */
    .lp-headline {
      font-size: 36px; font-weight: 800; color: #fff;
      line-height: 1.2; margin: 0 0 18px;
      letter-spacing: -0.8px;
    }
    .lp-headline-accent {
      background: linear-gradient(90deg, #A78BFA, #60A5FA);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .lp-desc {
      font-size: 14.5px; color: rgba(255,255,255,0.65);
      line-height: 1.7; margin: 0 0 40px; font-weight: 400;
    }

    /* Features */
    .lp-features { display: flex; flex-direction: column; gap: 20px; }
    .lp-feat {
      display: flex; align-items: flex-start; gap: 14px;
    }
    .lp-feat-icon {
      width: 38px; height: 38px; flex-shrink: 0;
      background: rgba(255,255,255,0.12);
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #A78BFA; }
    }
    .lp-feat-title { font-size: 13.5px; font-weight: 700; color: #fff; line-height: 1.3; }
    .lp-feat-sub { font-size: 12px; color: rgba(255,255,255,0.55); margin-top: 2px; line-height: 1.4; }

    /* Decorative circles */
    .lp-deco {
      position: absolute; border-radius: 50%;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
    }
    .lp-deco--1 { width: 380px; height: 380px; top: -100px; right: -120px; }
    .lp-deco--2 { width: 260px; height: 260px; bottom: -60px; left: -80px; }
    .lp-deco--3 { width: 160px; height: 160px; bottom: 120px; right: 40px; }

    /* ════ RIGHT FORM PANEL ════ */
    .lp-form-panel {
      flex: 1;
      background: #FAFBFF;
      display: flex; align-items: center; justify-content: center;
      padding: 40px 32px;
    }
    .lp-form-wrap { width: 100%; max-width: 400px; }

    /* Mobile logo (hidden on desktop) */
    .lp-mobile-logo {
      display: none;
      align-items: center; gap: 10px;
      margin-bottom: 36px;
    }

    /* Form header */
    .lp-form-header { margin-bottom: 32px; }
    .lp-form-title {
      font-size: 28px; font-weight: 800; color: #0F172A;
      margin: 0 0 6px; letter-spacing: -0.6px;
    }
    .lp-form-sub { font-size: 14px; color: #64748B; margin: 0; font-weight: 400; }

    /* Field */
    .lp-field { margin-bottom: 20px; }
    .lp-label {
      display: block; font-size: 13px; font-weight: 600;
      color: #374151; margin-bottom: 7px; letter-spacing: 0.1px;
    }
    .lp-input-wrap {
      display: flex; align-items: center;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 11px;
      padding: 0 14px;
      transition: border-color 0.15s, box-shadow 0.15s;
      &:focus-within {
        border-color: #6366F1;
        box-shadow: 0 0 0 4px rgba(99,102,241,0.12);
      }
      &.lp-input--error { border-color: #EF4444;
        &:focus-within { box-shadow: 0 0 0 4px rgba(239,68,68,0.1); }
      }
    }
    .lp-input-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: #94A3B8; flex-shrink: 0; margin-right: 10px;
    }
    .lp-input {
      flex: 1; border: none; outline: none; background: transparent;
      font-size: 14.5px; color: #0F172A; font-weight: 500;
      padding: 13px 0; font-family: inherit;
      &::placeholder { color: #CBD5E1; font-weight: 400; }
    }
    .lp-eye-btn {
      background: none; border: none; cursor: pointer; padding: 0 0 0 8px;
      display: flex; align-items: center; color: #94A3B8; transition: color 0.12s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #6366F1; }
    }
    .lp-field-err {
      display: block; font-size: 12px; color: #EF4444;
      margin-top: 5px; font-weight: 500;
    }

    /* Error box */
    .lp-error-box {
      display: flex; align-items: center; gap: 9px;
      background: #FFF1F2; color: #BE123C;
      border: 1px solid #FECDD3;
      padding: 11px 14px; border-radius: 10px;
      font-size: 13.5px; font-weight: 500;
      margin-bottom: 18px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    /* Submit button */
    .lp-submit {
      width: 100%; height: 50px;
      display: flex; align-items: center; justify-content: center; gap: 8px;
      background: linear-gradient(135deg, #6366F1 0%, #7C3AED 100%);
      border: none; border-radius: 12px;
      color: #fff; font-size: 15px; font-weight: 700;
      cursor: pointer; transition: all 0.18s;
      box-shadow: 0 4px 14px rgba(99,102,241,0.4);
      font-family: inherit; letter-spacing: 0.1px;
      margin-top: 4px;
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99,102,241,0.5);
      }
      &:active:not(:disabled) { transform: translateY(0); }
      &:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
      &.lp-submit--loading { opacity: 0.85; }
    }
    .lp-arrow { font-size: 18px; width: 18px; height: 18px; transition: transform 0.15s;
      .lp-submit:hover & { transform: translateX(3px); }
    }
    .lp-spinner { display: inline-block; }
    ::ng-deep .lp-spinner circle { stroke: rgba(255,255,255,0.9) !important; }

    /* Hint */
    .lp-hint {
      text-align: center; font-size: 11.5px; color: #94A3B8;
      margin: 28px 0 0; font-weight: 400;
    }

    /* ════ Responsive ════ */
    @media (max-width: 768px) {
      .lp { flex-direction: column; }
      .lp-brand { display: none; }
      .lp-form-panel { padding: 36px 24px; align-items: flex-start; padding-top: 60px; }
      .lp-mobile-logo { display: flex; }
    }
  `]
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  readonly loading = signal(false);
  readonly showPassword = signal(false);
  readonly errorMessage = signal<string | null>(null);

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.form.getRawValue() as any).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.authService.mustChangePassword()) {
          this.router.navigate(['/auth/change-password']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message ?? 'Invalid username or password';
        this.errorMessage.set(msg);
      }
    });
  }
}
