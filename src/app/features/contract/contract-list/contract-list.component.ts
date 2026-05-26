import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ContractService } from '../../../core/services/contract.service';
import { EmployeeContractGroup, EmployeeContract, ContractType } from '../../../core/models/contract.models';
import { ContractDetailDialogComponent } from '../contract-detail-dialog/contract-detail-dialog.component';
import { ContractExtendDialogComponent } from '../contract-extend-dialog/contract-extend-dialog.component';

@Component({
  selector: 'app-contract-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatMenuModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatTooltipModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Quản lý hợp đồng</div>
          <div class="page-subtitle">Danh sách nhân sự và hợp đồng</div>
        </div>
        <button mat-raised-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Thêm hợp đồng
        </button>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon si-total"><mat-icon>people</mat-icon></div>
          <div><div class="stat-label">Nhân sự</div><div class="stat-value">{{ groups().length }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-active"><mat-icon>check_circle</mat-icon></div>
          <div><div class="stat-label">HĐ đang hiệu lực</div><div class="stat-value">{{ countByStatus('ACTIVE') }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-expiring"><mat-icon>schedule</mat-icon></div>
          <div><div class="stat-label">Sắp hết hạn</div><div class="stat-value">{{ countByStatus('EXPIRING_SOON') }}</div></div>
        </div>
        <div class="stat-card">
          <div class="stat-icon si-expired"><mat-icon>warning</mat-icon></div>
          <div><div class="stat-label">Đã hết hạn</div><div class="stat-value">{{ countByStatus('EXPIRED') }}</div></div>
        </div>
      </div>

      <!-- Table -->
      <mat-card>
        <mat-card-content style="padding:0;">
          @if (loading()) {
            <div style="padding:60px; text-align:center;"><mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner><p style="margin-top:12px; color:#666;">Đang tải...</p></div>
          } @else if (groups().length === 0) {
            <div style="padding:60px; text-align:center; color:#9ca3af;">
              <mat-icon style="font-size:48px; width:48px; height:48px;">description</mat-icon>
              <p>Chưa có hợp đồng nào</p>
            </div>
          } @else {
            <table class="contract-table">
              <thead>
                <tr>
                  <th style="width:40px;"></th>
                  <th>Nhân viên</th>
                  <th style="width:60px;">Số HĐ</th>
                  <th>Các loại HĐ đã ký</th>
                  <th>HĐ hiện tại</th>
                  <th>Hết hạn</th>
                  <th style="width:100px;">Trạng thái</th>
                  <th style="width:48px;"></th>
                </tr>
              </thead>
              <tbody>
                @for (g of groups(); track g.employeeId) {
                  <!-- Employee row -->
                  <tr class="emp-row" (click)="toggle(g.employeeId)">
                    <td><span class="toggle-icon" [class.open]="expandedId() === g.employeeId">&#9654;</span></td>
                    <td>
                      <div class="emp-cell">
                        <div class="avatar" [style.background]="avatarColor(g.employeeName)">{{ avatarText(g.employeeName) }}</div>
                        <div>
                          <div class="emp-name">{{ g.employeeName }}</div>
                          <div class="emp-code">{{ g.employeeCode }}</div>
                        </div>
                      </div>
                    </td>
                    <td style="font-weight:600; text-align:center;">{{ g.contractCount }}</td>
                    <td>
                      @for (tn of g.contractTypeNames; track tn) {
                        <span class="type-chip">{{ tn }}</span>
                      }
                    </td>
                    <td style="font-weight:500;">{{ g.currentContractTypeName || '—' }}</td>
                    <td>
                      @if (g.currentEffectiveTo) {
                        <span [class]="expiryClass(g.daysUntilExpiry)">{{ expiryLabel(g.daysUntilExpiry) }}</span>
                      } @else {
                        <span style="color:#6b7280; font-size:12px;">Vô thời hạn</span>
                      }
                    </td>
                    <td><span [class]="'status-chip s-' + g.worstStatus.toLowerCase()">{{ statusLabel(g.worstStatus) }}</span></td>
                    <td>
                      <button mat-icon-button [matMenuTriggerFor]="empMenu" (click)="$event.stopPropagation()">
                        <mat-icon>more_vert</mat-icon>
                      </button>
                      <mat-menu #empMenu="matMenu">
                        <button mat-menu-item routerLink="new"><mat-icon>add</mat-icon> Thêm HĐ cho NV này</button>
                      </mat-menu>
                    </td>
                  </tr>

                  <!-- Expanded: contract sub-rows -->
                  @if (expandedId() === g.employeeId) {
                    @for (c of g.contracts; track c.id) {
                      <tr class="sub-row" [class.sub-active]="c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON'" (click)="openDetail(c)">
                        <td></td>
                        <td colspan="2" style="padding-left:60px;">
                          <span [class]="'status-chip s-' + c.status.toLowerCase()" style="margin-right:8px;">{{ statusLabel(c.status) }}</span>
                          <span [style.fontWeight]="(c.status === 'ACTIVE' || c.status === 'EXPIRING_SOON') ? '600' : '400'">{{ c.contractTypeName }}</span>
                        </td>
                        <td>
                          <code style="font-size:11px; background:#f5f5f5; padding:2px 6px; border-radius:4px;">{{ c.contractNumber || '—' }}</code>
                        </td>
                        <td style="font-size:12px;">
                          {{ formatDate(c.effectiveFrom) }} → {{ c.effectiveTo ? formatDate(c.effectiveTo) : 'Vĩnh viễn' }}
                        </td>
                        <td>
                          @if (c.durationMonths) {
                            <span style="font-size:12px;">{{ c.durationMonths }} tháng</span>
                          } @else {
                            <span style="font-size:12px; color:#9ca3af;">—</span>
                          }
                        </td>
                        <td>
                          <span [class]="'cat-badge cat-' + c.contractTypeCategory.toLowerCase()">
                            {{ c.contractTypeCategory === 'CONTRACT' ? 'HĐ' : 'CK' }}
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    }
                  }
                }
              </tbody>
            </table>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { max-width:1400px; margin:0 auto; padding:24px 16px; }
    .page-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; }
    .page-title { font-size:24px; font-weight:800; color:#0f172a; }
    .page-subtitle { font-size:13px; color:#64748b; margin-top:4px; }

    .stats-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:24px; }
    .stat-card { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:16px; display:flex; align-items:center; gap:16px; }
    .stat-icon { width:48px; height:48px; border-radius:10px; display:flex; align-items:center; justify-content:center; mat-icon{font-size:24px;width:24px;height:24px;} }
    .si-total { background:#f3f4f6; } .si-active { background:#dcfce7; } .si-expiring { background:#fef3c7; } .si-expired { background:#fee2e2; }
    .stat-label { font-size:12px; font-weight:600; color:#64748b; text-transform:uppercase; letter-spacing:.5px; }
    .stat-value { font-size:24px; font-weight:800; color:#0f172a; margin-top:4px; }

    .contract-table { width:100%; border-collapse:collapse; }
    .contract-table th { text-align:left; padding:10px 14px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.5px; color:#64748b; background:#f9fafb; border-bottom:1px solid #e5e7eb; }
    .contract-table td { padding:10px 14px; border-bottom:1px solid #f3f4f6; font-size:13px; }

    .emp-row { cursor:pointer; transition:background .1s; }
    .emp-row:hover td { background:#fafbff; }
    .emp-cell { display:flex; align-items:center; gap:12px; }
    .avatar { width:38px; height:38px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#fff; font-size:13px; font-weight:700; flex-shrink:0; }
    .emp-name { font-weight:600; font-size:13.5px; }
    .emp-code { font-size:11px; color:#888; }
    .toggle-icon { display:inline-block; font-size:12px; color:#9ca3af; transition:transform .15s; }
    .toggle-icon.open { transform:rotate(90deg); color:#5B5BD6; }

    .sub-row { cursor:pointer; transition:background .1s; }
    .sub-row:hover td { background:#f5f6ff !important; }
    .sub-row td { border-bottom:1px solid #f9fafb; }
    .sub-active td { background:#f0fdf4; }

    .type-chip { display:inline-block; padding:2px 8px; border-radius:10px; font-size:10.5px; font-weight:500; margin:1px 2px; background:#eef2ff; color:#4338ca; }
    .status-chip { display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600; }
    .s-active { background:#dcfce7; color:#166534; }
    .s-expiring_soon { background:#fef3c7; color:#92400e; }
    .s-expired { background:#fee2e2; color:#991b1b; }
    .s-terminated { background:#f3f4f6; color:#4b5563; }
    .cat-badge { padding:2px 6px; border-radius:8px; font-size:10px; font-weight:600; }
    .cat-contract { background:#dbeafe; color:#1e40af; }
    .cat-commitment { background:#fce7f3; color:#be185d; }

    .expiry-ok { color:#16a34a; font-size:12px; }
    .expiry-warn { color:#d97706; font-weight:600; font-size:12px; }
    .expiry-danger { color:#dc2626; font-weight:700; font-size:12px; }

    @media (max-width:768px) { .stats-grid{grid-template-columns:repeat(2,1fr);} }
  `]
})
export class ContractListComponent implements OnInit {
  private svc = inject(ContractService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly loading = signal(false);
  readonly groups = signal<EmployeeContractGroup[]>([]);
  readonly expandedId = signal<number | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.svc.getGroupedByEmployee().subscribe({
      next: data => { this.groups.set(data || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  toggle(empId: number) {
    this.expandedId.set(this.expandedId() === empId ? null : empId);
  }

  openDetail(contract: EmployeeContract) {
    this.dialog.open(ContractDetailDialogComponent, { width: '560px', data: contract })
      .afterClosed().subscribe(result => { if (result === 'updated') this.load(); });
  }

  countByStatus(status: string): number {
    return this.groups().filter(g => g.worstStatus === status).length;
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { ACTIVE:'Đang hiệu lực', EXPIRING_SOON:'Sắp hết hạn', EXPIRED:'Đã hết hạn', TERMINATED:'Chấm dứt' };
    return m[s] || s;
  }

  expiryLabel(days: number | null): string {
    if (days === null) return 'Vô thời hạn';
    if (days < 0) return `Quá ${-days} ngày`;
    return `Còn ${days} ngày`;
  }

  expiryClass(days: number | null): string {
    if (days === null) return 'expiry-ok';
    if (days < 0) return 'expiry-danger';
    if (days <= 30) return 'expiry-warn';
    return 'expiry-ok';
  }

  avatarText(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length-1][0]).toUpperCase() : p[0].substring(0,2).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = ['#3b82f6','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#6366f1'];
    let h = 0; for (let i=0;i<name.length;i++) h = name.charCodeAt(i)+((h<<5)-h);
    return colors[Math.abs(h)%colors.length];
  }

  formatDate(d: string): string { return new Date(d).toLocaleDateString('vi-VN'); }
}
