import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CommonModule } from '@angular/common';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  roles: string[];
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule
  ],
  template: `
    <mat-sidenav-container class="sidenav-container">

      <!-- SIDEBAR -->
      <mat-sidenav #drawer
        [mode]="isMobile() ? 'over' : 'side'"
        [opened]="!isMobile()"
        class="sidenav">

        <!-- Logo -->
        <div class="sidebar-logo">
          <div class="logo-icon">
            <mat-icon>corporate_fare</mat-icon>
          </div>
          <div>
            <div class="logo-title">HRMS</div>
            <div class="logo-subtitle">Human Resource</div>
          </div>
        </div>

        <!-- User info badge -->
        <div class="user-badge">
          <div class="user-avatar">{{ authService.username()?.charAt(0)?.toUpperCase() }}</div>
          <div class="user-info">
            <div class="user-name">{{ authService.username() }}</div>
            <div class="user-role">{{ authService.currentRole()?.replace('_', ' ') }}</div>
          </div>
        </div>

        <!-- Nav items -->
        <nav class="nav-list">
          @for (section of navSections(); track section.title) {
            <div class="nav-section-title">{{ section.title }}</div>
            @for (item of section.items; track item.route) {
              <a class="nav-link" [routerLink]="item.route" routerLinkActive="nav-link--active"
                 [routerLinkActiveOptions]="{exact: true}"
                 (click)="isMobile() && drawer.close()">
                <mat-icon class="nav-icon">{{ item.icon }}</mat-icon>
                <span class="nav-label">{{ item.label }}</span>
              </a>
            }
          }
        </nav>

        <!-- Spacer -->
        <div class="sidebar-spacer"></div>

        <!-- Logout -->
        <div class="sidebar-footer">
          <button class="logout-btn" (click)="authService.logout()">
            <mat-icon>logout</mat-icon>
            <span>Đăng xuất</span>
          </button>
        </div>

      </mat-sidenav>

      <!-- MAIN CONTENT -->
      <mat-sidenav-content class="main-content">

        <!-- TOP BAR -->
        <mat-toolbar class="topbar">
          <button mat-icon-button (click)="drawer.toggle()" matTooltip="Thu/mở menu" style="color:#374151;">
            <mat-icon>menu</mat-icon>
          </button>
          <span class="topbar-title">HRMS Portal</span>
          <span class="flex-spacer"></span>

          <!-- User menu -->
          <button mat-button [matMenuTriggerFor]="userMenu" class="topbar-user-btn">
            <mat-icon>account_circle</mat-icon>
            <span>{{ authService.username() }}</span>
            <mat-icon>arrow_drop_down</mat-icon>
          </button>
          <mat-menu #userMenu="matMenu">
            <div class="menu-role-label">
              Role: <strong>{{ authService.currentRole() }}</strong>
            </div>
            <mat-divider></mat-divider>
            <button mat-menu-item routerLink="/auth/change-password">
              <mat-icon>lock</mat-icon>
              <span>Đổi mật khẩu</span>
            </button>
            <button mat-menu-item (click)="authService.logout()">
              <mat-icon>logout</mat-icon>
              <span>Đăng xuất</span>
            </button>
          </mat-menu>
        </mat-toolbar>

        <!-- PAGE CONTENT -->
        <main class="page-main">
          <router-outlet />
        </main>
      </mat-sidenav-content>

    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      display: block; height: 100%;
      font-family: 'Be Vietnam Pro', 'Segoe UI', Tahoma, Arial, sans-serif;
      -webkit-font-smoothing: auto;
      text-rendering: optimizeSpeed;
    }

    .sidenav-container { height: 100%; }

    /* ════════════════════════════════
       SIDEBAR — Light & Modern
    ════════════════════════════════ */
    .sidenav {
      width: 252px;
      background: #FFFFFF;
      border-right: 1px solid #EAECF0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 2px 0 12px rgba(16,24,40,0.05);
    }

    /* ── Logo ── */
    .sidebar-logo {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 22px 18px 18px;
      border-bottom: 1px solid #F2F4F7;
    }
    .logo-icon {
      width: 38px; height: 38px;
      background: linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%);
      border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      box-shadow: 0 2px 8px rgba(91,91,214,0.35);
      flex-shrink: 0;
      mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    }
    .logo-title {
      font-size: 17px; font-weight: 800;
      color: #101828; letter-spacing: -0.4px;
    }
    .logo-subtitle {
      font-size: 10.5px; color: #98A2B3; margin-top: 1px; font-weight: 500;
    }

    /* ── User badge ── */
    .user-badge {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px;
      background: #F9FAFB;
      margin: 14px 12px 6px;
      border-radius: 10px;
      border: 1px solid #F2F4F7;
    }
    .user-avatar {
      width: 34px; height: 34px;
      background: linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; color: #fff;
      flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(91,91,214,0.3);
    }
    .user-info { min-width: 0; }
    .user-name {
      font-size: 12.5px; font-weight: 700; color: #101828;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .user-role {
      font-size: 10.5px; color: #667085; font-weight: 500;
      text-transform: capitalize; margin-top: 1px;
    }

    /* ── Nav ── */
    .nav-list { padding: 10px 10px 0; flex: 1; overflow-y: auto; }

    .nav-section-title {
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px;
      color: #98A2B3;
      padding: 18px 8px 6px;
    }

    .nav-link {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 10px;
      border-radius: 8px;
      margin-bottom: 1px;
      color: #344054;
      text-decoration: none;
      font-size: 13.5px; font-weight: 500;
      transition: background 0.12s, color 0.12s;
      cursor: pointer;
      position: relative;

      &:hover {
        background: #F5F6FF;
        color: #5B5BD6;
        .nav-icon { color: #5B5BD6; }
      }
    }

    .nav-link--active {
      background: #EEEEFF !important;
      color: #4B4ACF !important;
      font-weight: 700 !important;

      .nav-icon { color: #4B4ACF !important; }

      &::before {
        content: '';
        position: absolute;
        left: 0; top: 6px; bottom: 6px;
        width: 3px;
        background: #5B5BD6;
        border-radius: 0 3px 3px 0;
      }
    }

    .nav-icon {
      font-size: 19px; width: 19px; height: 19px;
      color: #98A2B3; flex-shrink: 0;
      transition: color 0.12s;
    }
    .nav-label { flex: 1; line-height: 1.5; }

    /* ── Spacer ── */
    .sidebar-spacer { flex: 1; min-height: 12px; }

    /* ── Footer ── */
    .sidebar-footer {
      padding: 12px;
      border-top: 1px solid #F2F4F7;
    }
    .logout-btn {
      display: flex; align-items: center; gap: 10px;
      width: 100%; padding: 9px 12px;
      background: transparent;
      border: 1px solid #EAECF0; border-radius: 8px;
      color: #667085; font-size: 13.5px; font-weight: 500;
      cursor: pointer; transition: all 0.12s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #98A2B3; }
      &:hover {
        background: #FFF1F2; border-color: #FDA4AF;
        color: #BE123C;
        mat-icon { color: #BE123C; }
      }
    }

    /* ════════════════════════════════
       TOPBAR
    ════════════════════════════════ */
    .topbar {
      background: #FFFFFF !important;
      color: #101828 !important;
      position: sticky; top: 0; z-index: 100;
      border-bottom: 1px solid #EAECF0 !important;
      box-shadow: 0 1px 4px rgba(16,24,40,0.06) !important;
      height: 58px !important;
    }
    .topbar-title {
      font-size: 14px; font-weight: 600;
      margin-left: 4px; color: #344054; letter-spacing: 0.1px;
    }
    .flex-spacer { flex: 1; }
    .topbar-user-btn {
      display: flex; align-items: center; gap: 6px;
      color: #344054; font-size: 13px; font-weight: 500;
      border-radius: 8px; padding: 4px 8px;
      transition: background 0.12s;
      &:hover { background: #F9FAFB; }
    }
    .menu-role-label {
      padding: 8px 16px; font-size: 12px; color: #667085;
    }

    /* ════════════════════════════════
       MAIN CONTENT
    ════════════════════════════════ */
    .main-content { background: #F6F8FC; }
    .page-main { min-height: calc(100vh - 58px); }
  `]
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  readonly authService = inject(AuthService);
  private readonly bpObserver = inject(BreakpointObserver);
  private bpSub?: Subscription;

  isMobile = signal(false);

  ngOnInit() {
    this.bpSub = this.bpObserver
      .observe([Breakpoints.Handset, '(max-width: 768px)'])
      .subscribe(result => this.isMobile.set(result.matches));
  }

  ngOnDestroy() { this.bpSub?.unsubscribe(); }

  readonly navSections = computed(() => {
    const role = this.authService.currentRole();
    const sections: { title: string; items: NavItem[] }[] = [];

    sections.push({ title: 'Overview', items: [
      { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', roles: ['*'] }
    ]});

    if (role === 'SUPER_ADMIN') {
      sections.push({ title: 'System', items: [
        { label: 'Companies', icon: 'business', route: '/companies', roles: ['SUPER_ADMIN'] },
        { label: 'Job Roles', icon: 'work', route: '/job-roles', roles: ['SUPER_ADMIN'] }
      ]});
    }

    if (role === 'COMPANY_ADMIN') {
      sections.push({ title: 'Nhân sự & Đối tác', items: [
        { label: 'Nhân viên', icon: 'people', route: '/employees', roles: ['COMPANY_ADMIN'] },
        { label: 'Vendors', icon: 'store', route: '/vendors', roles: ['COMPANY_ADMIN'] },
        { label: 'Khách hàng', icon: 'handshake', route: '/customers', roles: ['COMPANY_ADMIN'] },
        { label: 'Job Roles & Prices', icon: 'work_outline', route: '/job-roles', roles: ['COMPANY_ADMIN'] },
        { label: 'Quản lý tài khoản', icon: 'manage_accounts', route: '/users', roles: ['COMPANY_ADMIN', 'MANAGER'] },
        { label: 'Phòng ban', icon: 'corporate_fare', route: '/departments', roles: ['COMPANY_ADMIN'] }
      ]});
      sections.push({ title: 'Hợp đồng', items: [
        { label: 'Quản lý hợp đồng', icon: 'description', route: '/contracts', roles: ['COMPANY_ADMIN'] },
        { label: 'Loại hợp đồng', icon: 'category', route: '/contracts/types', roles: ['COMPANY_ADMIN'] }
      ]});
      sections.push({ title: 'Tài sản', items: [
        { label: 'Quản lý tài sản', icon: 'inventory_2', route: '/assets', roles: ['COMPANY_ADMIN'] },
        { label: 'Loại tài sản', icon: 'category', route: '/assets/categories', roles: ['COMPANY_ADMIN'] }
      ]});
      sections.push({ title: 'Cài đặt', items: [
        { label: 'Đồng bộ tài liệu', icon: 'cloud_sync', route: '/document-sync', roles: ['COMPANY_ADMIN'] }
      ]});
      sections.push({ title: 'Lịch & Chấm công', items: [
        { label: 'Lịch làm việc', icon: 'calendar_month', route: '/work-calendars', roles: ['COMPANY_ADMIN'] },
        { label: 'Tổng quan nhân sự', icon: 'people_alt', route: '/timesheets/overview', roles: ['COMPANY_ADMIN'] },
        { label: 'Cấu hình trường', icon: 'tune', route: '/timesheets/fields', roles: ['COMPANY_ADMIN'] },
        { label: 'Nghỉ phép', icon: 'event_busy', route: '/leave', roles: ['COMPANY_ADMIN'] },
        { label: 'Quota nghỉ phép', icon: 'calendar_today', route: '/leave/balances', roles: ['COMPANY_ADMIN'] }
      ]});
      sections.push({ title: 'Kế toán', items: [
        { label: 'Biên bản Nội bộ', icon: 'assignment_ind', route: '/internal-statements', roles: ['COMPANY_ADMIN'] },
        { label: 'Bảo hiểm', icon: 'health_and_safety', route: '/insurance', roles: ['COMPANY_ADMIN'] },
        { label: 'Bảng lương', icon: 'payments', route: '/payroll', roles: ['COMPANY_ADMIN'] },
        { label: 'Biên bản KH', icon: 'description', route: '/statements/customer', roles: ['COMPANY_ADMIN'] },
        { label: 'Biên bản Vendor', icon: 'receipt_long', route: '/statements/vendor', roles: ['COMPANY_ADMIN'] },
        { label: 'Báo cáo tài chính', icon: 'account_balance', route: '/financial-report', roles: ['COMPANY_ADMIN'] }
      ]});
    }

    if (role === 'MANAGER') {
      sections.push({ title: 'Nhân sự', items: [
        { label: 'Nhân viên', icon: 'people', route: '/employees', roles: ['MANAGER'] },
        { label: 'Quản lý tài khoản', icon: 'manage_accounts', route: '/users', roles: ['MANAGER'] },
        { label: 'Phòng ban', icon: 'corporate_fare', route: '/departments', roles: ['MANAGER'] }
      ]});
      sections.push({ title: 'Hợp đồng', items: [
        { label: 'Quản lý hợp đồng', icon: 'description', route: '/contracts', roles: ['MANAGER'] },
        { label: 'Loại hợp đồng', icon: 'category', route: '/contracts/types', roles: ['MANAGER'] }
      ]});
      sections.push({ title: 'Lịch & Chấm công', items: [
        { label: 'Lịch làm việc', icon: 'calendar_month', route: '/work-calendars', roles: ['MANAGER'] },
        { label: 'Tổng quan nhân sự', icon: 'people_alt', route: '/timesheets/overview', roles: ['MANAGER'] },
        { label: 'Cấu hình trường', icon: 'tune', route: '/timesheets/fields', roles: ['MANAGER'] },
        { label: 'Nghỉ phép', icon: 'event_busy', route: '/leave', roles: ['MANAGER'] },
        { label: 'Quota nghỉ phép', icon: 'calendar_today', route: '/leave/balances', roles: ['MANAGER'] }
      ]});
      sections.push({ title: 'Kế toán', items: [
        { label: 'Biên bản Nội bộ', icon: 'assignment_ind', route: '/internal-statements', roles: ['MANAGER'] },
        { label: 'Bảo hiểm', icon: 'health_and_safety', route: '/insurance', roles: ['MANAGER'] },
        { label: 'Bảng lương', icon: 'payments', route: '/payroll', roles: ['MANAGER'] },
        { label: 'Biên bản KH', icon: 'description', route: '/statements/customer', roles: ['MANAGER'] },
        { label: 'Biên bản Vendor', icon: 'receipt_long', route: '/statements/vendor', roles: ['MANAGER'] },
        { label: 'Báo cáo tài chính', icon: 'account_balance', route: '/financial-report', roles: ['MANAGER'] }
      ]});
    }

    if (role === 'ACCOUNTANT') {
      sections.push({ title: 'Kế toán', items: [
        { label: 'Biên bản Nội bộ', icon: 'assignment_ind', route: '/internal-statements', roles: ['ACCOUNTANT'] },
        { label: 'Bảo hiểm', icon: 'health_and_safety', route: '/insurance', roles: ['ACCOUNTANT'] },
        { label: 'Bảng lương', icon: 'payments', route: '/payroll', roles: ['ACCOUNTANT'] },
        { label: 'Biên bản KH', icon: 'description', route: '/statements/customer', roles: ['ACCOUNTANT'] },
        { label: 'Biên bản Vendor', icon: 'receipt_long', route: '/statements/vendor', roles: ['ACCOUNTANT'] },
        { label: 'Báo cáo tài chính', icon: 'account_balance', route: '/financial-report', roles: ['ACCOUNTANT'] }
      ]});
    }

    if (role === 'EMPLOYEE') {
      sections.push({ title: 'My Profile', items: [
        { label: 'My Profile', icon: 'person', route: '/employees/me', roles: ['EMPLOYEE'] }
      ]});
      sections.push({ title: 'Công việc', items: [
        { label: 'Log Timesheet', icon: 'schedule', route: '/timesheets', roles: ['EMPLOYEE'] },
        { label: 'Đơn nghỉ phép', icon: 'event_busy', route: '/leave/my', roles: ['EMPLOYEE'] }
      ]});
    }

    return sections;
  });
}
