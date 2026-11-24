import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { EmployeeService } from '../../core/services/employee.service';
import { AlertService, AlertItem, AlertCount } from '../../core/services/alert.service';

interface StatCard { label: string; value: string | number; icon: string; color: string; route?: string; }

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, RouterLink],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-subtitle">Xin chào, <strong>{{ authService.username() }}</strong></div>
        </div>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid">
        @for (card of statCards(); track card.label) {
          <mat-card class="stat-card" [routerLink]="card.route">
            <mat-card-content>
              <div class="stat-icon" [style.background]="card.color + '18'">
                <mat-icon [style.color]="card.color">{{ card.icon }}</mat-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ card.value }}</div>
                <div class="stat-label">{{ card.label }}</div>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </div>

      <!-- Alert Center Widget -->
      @if (authService.isAdminOrManager() && (alertCount()?.total ?? 0) > 0) {
        <mat-card style="margin-top:24px; border-left:4px solid #1d4ed8;">
          <mat-card-content style="padding:16px 20px!important;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
              <mat-icon style="color:#1d4ed8; font-size:28px; width:28px; height:28px;">notifications_active</mat-icon>
              <div>
                <div style="font-weight:700; font-size:15px; color:#1e3a5f;">Trung tâm cảnh báo</div>
                <div style="font-size:12px; color:#6b7280;">{{ alertCount()?.total }} cảnh báo cần xử lý</div>
              </div>
            </div>
            <!-- Severity row -->
            <div style="display:flex; gap:12px; margin-bottom:14px;">
              @if ((alertCount()?.urgent ?? 0) > 0) {
                <div style="background:#fef2f2; border-radius:8px; padding:10px 16px; flex:1;">
                  <div style="font-size:24px; font-weight:700; color:#dc2626;">{{ alertCount()?.urgent }}</div>
                  <div style="font-size:11px; color:#991b1b; font-weight:600; text-transform:uppercase;">Khẩn cấp</div>
                </div>
              }
              @if ((alertCount()?.warning ?? 0) > 0) {
                <div style="background:#fffbeb; border-radius:8px; padding:10px 16px; flex:1;">
                  <div style="font-size:24px; font-weight:700; color:#d97706;">{{ alertCount()?.warning }}</div>
                  <div style="font-size:11px; color:#92400e; font-weight:600; text-transform:uppercase;">Cảnh báo</div>
                </div>
              }
            </div>
            <!-- Category row -->
            <div style="display:flex; gap:12px;">
              @if ((alertCount()?.insurance ?? 0) > 0) {
                <a routerLink="/insurance" style="background:#fee2e2; border-radius:8px; padding:8px 14px; flex:1; text-decoration:none; text-align:center;">
                  <div style="font-size:18px; font-weight:700; color:#dc2626;">{{ alertCount()?.insurance }}</div>
                  <div style="font-size:10px; color:#991b1b; font-weight:600;">Bảo hiểm</div>
                </a>
              }
              @if ((alertCount()?.contract ?? 0) > 0) {
                <a routerLink="/contracts" style="background:#fef3c7; border-radius:8px; padding:8px 14px; flex:1; text-decoration:none; text-align:center;">
                  <div style="font-size:18px; font-weight:700; color:#b45309;">{{ alertCount()?.contract }}</div>
                  <div style="font-size:10px; color:#92400e; font-weight:600;">Hợp đồng</div>
                </a>
              }
            </div>
            <!-- Alert items -->
            @if (alerts().length > 0) {
              <div style="margin-top:14px; border-top:1px solid #f3f4f6; padding-top:12px;">
                @for (alert of alerts().slice(0, 5); track alert.id) {
                  <div style="display:flex; align-items:center; gap:10px; padding:6px 0; border-bottom:1px solid #f9fafb;">
                    <span [style.background]="alert.severity === 'URGENT' ? '#dc2626' : '#d97706'" style="width:8px;height:8px;border-radius:50%;flex-shrink:0;"></span>
                    <span style="font-size:12.5px; flex:1;">{{ alert.title }}</span>
                    <span style="font-size:11px; color:#6b7280;">{{ alert.dueDate }}</span>
                    <button mat-icon-button style="width:28px;height:28px;" (click)="dismissAlert(alert.id)">
                      <mat-icon style="font-size:16px;width:16px;height:16px;color:#9ca3af;">close</mat-icon>
                    </button>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }

      <!-- Quick Actions -->
      <mat-card style="margin-top:24px;">
        <mat-card-header style="padding:20px 20px 0;">
          <mat-card-title>Thao tác nhanh</mat-card-title>
        </mat-card-header>
        <mat-card-content style="padding:16px 20px 20px;">
          <div class="actions-grid">
            @if (authService.isAdminOrManager()) {
              <a class="action-card" routerLink="/employees/new">
                <div class="action-icon" style="background:#dbeafe;"><mat-icon style="color:#1d4ed8;">person_add</mat-icon></div>
                <div class="action-label">Thêm Nhân viên</div>
              </a>
              <a class="action-card" routerLink="/vendors/new">
                <div class="action-icon" style="background:#dcfce7;"><mat-icon style="color:#15803d;">store</mat-icon></div>
                <div class="action-label">Thêm Vendor</div>
              </a>
              @if (authService.isStrictAdmin()) {
                <a class="action-card" routerLink="/financial-report">
                  <div class="action-icon" style="background:#fef3c7;"><mat-icon style="color:#d97706;">bar_chart</mat-icon></div>
                  <div class="action-label">Xem Báo cáo</div>
                </a>
              }
              <a class="action-card" routerLink="/job-roles">
                <div class="action-icon" style="background:#f3e8ff;"><mat-icon style="color:#7c3aed;">work</mat-icon></div>
                <div class="action-label">Giá Job Role</div>
              </a>
            }
            @if (authService.isSuperAdmin()) {
              <a class="action-card" routerLink="/companies/new">
                <div class="action-icon" style="background:#dbeafe;"><mat-icon style="color:#1d4ed8;">add_business</mat-icon></div>
                <div class="action-label">Thêm Công ty</div>
              </a>
              <a class="action-card" routerLink="/job-roles">
                <div class="action-icon" style="background:#dcfce7;"><mat-icon style="color:#15803d;">work</mat-icon></div>
                <div class="action-label">Quản lý Job Roles</div>
              </a>
            }
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
    }
    .stat-card {
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      &:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,.1) !important; }
    }
    .stat-card mat-card-content {
      display: flex; align-items: center; gap: 18px; padding: 22px !important;
    }
    .stat-icon {
      width: 56px; height: 56px; border-radius: 14px; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 30px; width: 30px; height: 30px; }
    }
    .stat-value { font-size: 30px; font-weight: 700; line-height: 1; color: #111827; }
    .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; font-weight: 500; }

    .actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }
    .action-card {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; padding: 20px 16px;
      border-radius: 10px; border: 1px solid #e5e7eb;
      cursor: pointer; text-decoration: none; color: #374151;
      transition: border-color .15s, box-shadow .15s;
      &:hover { border-color: #1565C0; box-shadow: 0 2px 12px rgba(21,101,192,.12); }
    }
    .action-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
    }
    .action-label { font-size: 13px; font-weight: 600; text-align: center; }

    @media (max-width: 1280px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 640px)  { .stats-grid { grid-template-columns: 1fr; } }
  `]
})
export class DashboardComponent implements OnInit {
  readonly authService = inject(AuthService);
  private employeeService = inject(EmployeeService);
  private alertService = inject(AlertService);

  readonly statCards = signal<StatCard[]>([]);
  readonly alerts = signal<AlertItem[]>([]);
  readonly alertCount = signal<AlertCount | null>(null);

  ngOnInit() {
    this.loadStats();
    this.loadAlerts();
  }

  private loadAlerts() {
    if (this.authService.isAdminOrManager()) {
      this.alertService.getActive().subscribe({
        next: d => this.alerts.set(d || []),
        error: () => {}
      });
      this.alertService.getCounts().subscribe({
        next: c => this.alertCount.set(c),
        error: () => {}
      });
    }
  }

  dismissAlert(id: number) {
    this.alertService.dismiss(id).subscribe({
      next: () => {
        this.alerts.update(list => list.filter(a => a.id !== id));
        this.loadAlerts(); // refresh counts
      }
    });
  }

  private loadStats() {
    if (this.authService.isAdminOrManager()) {
      this.employeeService.list({ size: 1 }).subscribe(page => {
        const cards: StatCard[] = [
          { label: 'Total Employees', value: page.totalElements, icon: 'people', color: '#3f51b5', route: '/employees' },
          { label: 'Active Vendors', value: '—', icon: 'store', color: '#e91e63', route: '/vendors' },
          { label: 'Job Roles', value: '—', icon: 'work', color: '#ff9800', route: '/job-roles' }
        ];
        if (this.authService.isStrictAdmin()) {
          cards.push({ label: 'Reports', value: 'View', icon: 'bar_chart', color: '#4caf50', route: '/financial-report' });
        }
        this.statCards.set(cards);
      });
    } else if (this.authService.isSuperAdmin()) {
      this.statCards.set([
        { label: 'Companies', value: '—', icon: 'business', color: '#3f51b5', route: '/companies' },
        { label: 'Global Job Roles', value: '—', icon: 'work', color: '#e91e63', route: '/job-roles' }
      ]);
    } else {
      this.statCards.set([
        { label: 'My Profile', value: 'View', icon: 'person', color: '#3f51b5', route: '/employees/me' }
      ]);
    }
  }
}
