import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatIconModule, MatProgressSpinnerModule],
  template: `
<div class="page">

  <!-- ═══ LEFT — Brand ═══ -->
  <div class="brand">
    <div class="brand-inner">

      <div class="brand-logo">
        <div class="brand-logo-icon">
          <mat-icon>corporate_fare</mat-icon>
        </div>
        <span class="brand-name">HRMS</span>
      </div>

      <div class="brand-copy">
        <h2 class="brand-headline">Quản lý nhân sự<br><span class="brand-accent">thông minh hơn</span></h2>
        <p class="brand-desc">Nền tảng quản lý toàn diện — chấm công, lịch làm việc, nghỉ phép và báo cáo chi phí trong một nơi duy nhất.</p>
      </div>

      <div class="features">
        <div class="feat">
          <div class="feat-icon"><mat-icon>schedule</mat-icon></div>
          <div class="feat-text">
            <div class="feat-title">Timesheet thông minh</div>
            <div class="feat-sub">Log giờ theo dự án, tính OT tự động</div>
          </div>
        </div>
        <div class="feat">
          <div class="feat-icon"><mat-icon>event_available</mat-icon></div>
          <div class="feat-text">
            <div class="feat-title">Quản lý nghỉ phép</div>
            <div class="feat-sub">Theo dõi quota, phê duyệt trực tuyến</div>
          </div>
        </div>
        <div class="feat">
          <div class="feat-icon"><mat-icon>analytics</mat-icon></div>
          <div class="feat-text">
            <div class="feat-title">Báo cáo & biên bản</div>
            <div class="feat-sub">Phân tích doanh thu, chi phí theo tháng</div>
          </div>
        </div>
      </div>

    </div>

    <!-- decorative blobs -->
    <div class="blob blob-1"></div>
    <div class="blob blob-2"></div>
    <div class="blob blob-3"></div>
  </div>

  <!-- ═══ RIGHT — Form ═══ -->
  <div class="panel">
    <div class="panel-inner">

      <!-- mobile logo -->
      <div class="mobile-logo">
        <div class="brand-logo-icon sm"><mat-icon>corporate_fare</mat-icon></div>
        <span class="brand-name dark">HRMS</span>
      </div>

      <div class="form-head">
        <div class="form-eyebrow">Chào mừng trở lại</div>
        <h1 class="form-title">Đăng nhập</h1>
        <p class="form-sub">Nhập thông tin tài khoản để tiếp tục</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()" autocomplete="off" class="login-form">

        <!-- Username -->
        <div class="field">
          <label class="field-label">Tên đăng nhập</label>
          <div class="input-box" [class.input-box--err]="form.get('username')?.invalid && form.get('username')?.touched">
            <mat-icon class="input-ico">person_outline</mat-icon>
            <input class="inp" formControlName="username"
              placeholder="Nhập tên đăng nhập"
              autocomplete="username" spellcheck="false">
          </div>
          @if (form.get('username')?.hasError('required') && form.get('username')?.touched) {
            <span class="field-err">Vui lòng nhập tên đăng nhập</span>
          }
        </div>

        <!-- Password -->
        <div class="field">
          <label class="field-label">Mật khẩu</label>
          <div class="input-box" [class.input-box--err]="form.get('password')?.invalid && form.get('password')?.touched">
            <mat-icon class="input-ico">lock_outline</mat-icon>
            <input class="inp" [type]="showPwd() ? 'text' : 'password'"
              formControlName="password"
              placeholder="Nhập mật khẩu"
              autocomplete="current-password">
            <button type="button" class="eye-btn" (click)="showPwd.set(!showPwd())" tabindex="-1">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </div>
          @if (form.get('password')?.hasError('required') && form.get('password')?.touched) {
            <span class="field-err">Vui lòng nhập mật khẩu</span>
          }
        </div>

        <!-- Server error -->
        @if (errorMsg()) {
          <div class="err-box">
            <mat-icon>error_outline</mat-icon>
            <span>{{ errorMsg() }}</span>
          </div>
        }

        <!-- Submit -->
        <button type="submit" class="btn-submit" [disabled]="loading()">
          @if (loading()) {
            <mat-spinner diameter="18" class="btn-spinner"></mat-spinner>
            <span>Đang đăng nhập…</span>
          } @else {
            <span>Đăng nhập</span>
            <mat-icon class="btn-arrow">arrow_forward</mat-icon>
          }
        </button>

      </form>

      <p class="footer-hint">© 2026 HRMS · Human Resource Management System</p>
    </div>
  </div>

</div>
  `,
  styles: [`
    :host {
      font-family: 'Be Vietnam Pro', 'Segoe UI', Tahoma, Arial, sans-serif;
    }

    /* ══ PAGE SHELL ════════════════════════════════════════ */
    .page {
      display: flex;
      min-height: 100vh;
      font-family: 'Be Vietnam Pro', 'Segoe UI', Tahoma, Arial, sans-serif;
    }

    /* ══ BRAND (LEFT) ══════════════════════════════════════ */
    .brand {
      flex: 0 0 48%;
      background: linear-gradient(150deg, #0F172A 0%, #1E3A5F 45%, #1E293B 100%);
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 56px 60px;
    }

    .brand-inner {
      position: relative;
      z-index: 2;
      max-width: 400px;
      width: 100%;
    }

    /* Logo */
    .brand-logo {
      display: flex;
      align-items: center;
      gap: 13px;
      margin-bottom: 52px;
    }
    .brand-logo-icon {
      width: 48px; height: 48px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 14px;
      display: flex; align-items: center; justify-content: center;
      backdrop-filter: blur(8px);
      mat-icon { color: #fff; font-size: 26px; width: 26px; height: 26px; }
      &.sm {
        width: 38px; height: 38px; border-radius: 11px;
        mat-icon { font-size: 20px; width: 20px; height: 20px; }
      }
    }
    .brand-name {
      font-size: 22px;
      font-weight: 800;
      color: #fff;
      letter-spacing: 2.5px;
      font-family: 'Be Vietnam Pro', sans-serif;
      &.dark { color: #1E293B; }
    }

    /* Headline */
    .brand-copy { margin-bottom: 44px; }
    .brand-headline {
      font-size: 38px;
      font-weight: 800;
      color: #fff;
      line-height: 1.22;
      margin: 0 0 16px;
      letter-spacing: -0.5px;
      font-family: 'Be Vietnam Pro', sans-serif;
    }
    .brand-accent {
      background: linear-gradient(90deg, #60A5FA 0%, #A78BFA 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    .brand-desc {
      font-size: 14.5px;
      color: rgba(255,255,255,0.58);
      line-height: 1.75;
      margin: 0;
      font-family: 'Be Vietnam Pro', sans-serif;
      font-weight: 400;
    }

    /* Features */
    .features { display: flex; flex-direction: column; gap: 22px; }
    .feat { display: flex; align-items: flex-start; gap: 14px; }
    .feat-icon {
      width: 40px; height: 40px; flex-shrink: 0;
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.14);
      border-radius: 11px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #60A5FA; }
    }
    .feat-title {
      font-size: 13.5px;
      font-weight: 700;
      color: rgba(255,255,255,0.92);
      line-height: 1.3;
      font-family: 'Be Vietnam Pro', sans-serif;
    }
    .feat-sub {
      font-size: 12px;
      color: rgba(255,255,255,0.45);
      margin-top: 3px;
      line-height: 1.45;
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* Decorative blobs */
    .blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(1px);
    }
    .blob-1 {
      width: 420px; height: 420px;
      background: radial-gradient(circle, rgba(96,165,250,0.08) 0%, transparent 70%);
      top: -140px; right: -140px;
    }
    .blob-2 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(167,139,250,0.07) 0%, transparent 70%);
      bottom: -80px; left: -80px;
    }
    .blob-3 {
      width: 180px; height: 180px;
      background: radial-gradient(circle, rgba(96,165,250,0.05) 0%, transparent 70%);
      bottom: 140px; right: 60px;
    }

    /* ══ FORM PANEL (RIGHT) ════════════════════════════════ */
    .panel {
      flex: 1;
      background: #F8FAFC;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 48px 40px;
    }
    .panel-inner {
      width: 100%;
      max-width: 420px;
    }

    /* Mobile logo */
    .mobile-logo {
      display: none;
      align-items: center;
      gap: 10px;
      margin-bottom: 40px;
    }

    /* Form header */
    .form-head { margin-bottom: 36px; }
    .form-eyebrow {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: #6366F1;
      margin-bottom: 8px;
      font-family: 'Be Vietnam Pro', sans-serif;
    }
    .form-title {
      font-size: 30px;
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 8px;
      letter-spacing: -0.5px;
      line-height: 1.2;
      font-family: 'Be Vietnam Pro', sans-serif;
    }
    .form-sub {
      font-size: 14px;
      color: #64748B;
      margin: 0;
      font-weight: 400;
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* ══ LOGIN FORM ════════════════════════════════════════ */
    .login-form { display: flex; flex-direction: column; gap: 0; }

    .field { margin-bottom: 22px; }

    .field-label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: #1E293B;
      margin-bottom: 8px;
      letter-spacing: 0.1px;
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    .input-box {
      display: flex;
      align-items: center;
      background: #fff;
      border: 1.5px solid #E2E8F0;
      border-radius: 12px;
      padding: 0 14px;
      transition: border-color 0.18s, box-shadow 0.18s;
      box-shadow: 0 1px 3px rgba(0,0,0,0.04);
      &:focus-within {
        border-color: #6366F1;
        box-shadow: 0 0 0 4px rgba(99,102,241,0.1), 0 1px 3px rgba(0,0,0,0.04);
      }
      &.input-box--err {
        border-color: #F87171;
        &:focus-within { box-shadow: 0 0 0 4px rgba(248,113,113,0.12); }
      }
    }
    .input-ico {
      font-size: 18px; width: 18px; height: 18px;
      color: #94A3B8;
      flex-shrink: 0;
      margin-right: 10px;
    }
    .inp {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      font-size: 14.5px;
      color: #0F172A;
      font-weight: 500;
      padding: 13px 0;
      font-family: 'Be Vietnam Pro', sans-serif;
      &::placeholder {
        color: #CBD5E1;
        font-weight: 400;
      }
    }
    .eye-btn {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0 0 0 8px;
      display: flex;
      align-items: center;
      color: #94A3B8;
      transition: color 0.14s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { color: #6366F1; }
    }
    .field-err {
      display: block;
      font-size: 12px;
      color: #EF4444;
      margin-top: 6px;
      font-weight: 500;
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* Error box */
    .err-box {
      display: flex;
      align-items: center;
      gap: 9px;
      background: #FFF1F2;
      color: #BE123C;
      border: 1.5px solid #FECDD3;
      padding: 12px 16px;
      border-radius: 11px;
      font-size: 13.5px;
      font-weight: 500;
      margin-bottom: 20px;
      font-family: 'Be Vietnam Pro', sans-serif;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    }

    /* Submit */
    .btn-submit {
      width: 100%;
      height: 52px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 9px;
      background: linear-gradient(135deg, #6366F1 0%, #7C3AED 100%);
      border: none;
      border-radius: 13px;
      color: #fff;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.18s;
      box-shadow: 0 4px 16px rgba(99,102,241,0.38);
      font-family: 'Be Vietnam Pro', sans-serif;
      letter-spacing: 0.2px;
      margin-top: 6px;
      &:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(99,102,241,0.48);
      }
      &:active:not(:disabled) {
        transform: translateY(0);
        box-shadow: 0 2px 8px rgba(99,102,241,0.3);
      }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
    }
    .btn-arrow {
      font-size: 18px; width: 18px; height: 18px;
      transition: transform 0.18s;
      .btn-submit:hover & { transform: translateX(4px); }
    }
    .btn-spinner { display: inline-block; }
    ::ng-deep .btn-spinner circle { stroke: rgba(255,255,255,0.9) !important; }

    /* Footer */
    .footer-hint {
      text-align: center;
      font-size: 12px;
      color: #94A3B8;
      margin: 32px 0 0;
      font-weight: 400;
      font-family: 'Be Vietnam Pro', sans-serif;
    }

    /* ══ RESPONSIVE ════════════════════════════════════════ */
    @media (max-width: 860px) {
      .brand { flex: 0 0 42%; padding: 40px 40px; }
      .brand-headline { font-size: 30px; }
    }

    @media (max-width: 680px) {
      .page { flex-direction: column; }
      .brand { display: none; }
      .panel { padding: 48px 24px; align-items: flex-start; }
      .mobile-logo { display: flex; }
      .panel-inner { max-width: 100%; }
    }
  `]
})
export class LoginComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private router      = inject(Router);
  private snackBar    = inject(MatSnackBar);

  readonly form = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  readonly loading  = signal(false);
  readonly showPwd  = signal(false);
  readonly errorMsg = signal<string | null>(null);

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.errorMsg.set(null);

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
        this.errorMsg.set(err?.error?.message ?? 'Tên đăng nhập hoặc mật khẩu không đúng');
      }
    });
  }
}
