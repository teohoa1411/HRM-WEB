import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ReportService, MonthlySummary, EmployeeFinancial } from '../../core/services/report.service';
import { BillingService } from '../../core/services/billing.service';
import { RevenueReportItem } from '../../core/models/billing.models';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';

@Component({
  selector: 'app-financial-report',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatRippleModule, MonthPickerComponent],
  template: `
<div class="fr-root">

  <!-- ── TOP HEADER ─────────────────────────────────────────── -->
  <div class="fr-header">
    <div class="fr-header-left">
      <div class="fr-title-row">
        <div class="fr-icon-wrap"><mat-icon>analytics</mat-icon></div>
        <div>
          <h1 class="fr-title">Báo Cáo Chi Phí &amp; Doanh Thu</h1>
          <p class="fr-subtitle">
            @if (summary()?.lastCalculatedAt) {
              <mat-icon class="inline-icon">schedule</mat-icon>
              Cập nhật lúc {{ summary()!.lastCalculatedAt | date:'dd/MM/yyyy HH:mm' }}
              &nbsp;·&nbsp; {{ summary()!.totalEmployees }} nhân viên
            } @else {
              Chọn tháng để xem báo cáo
            }
          </p>
        </div>
      </div>
    </div>
    <div class="fr-header-right">
      <app-month-picker [value]="selectedMonth" (valueChange)="onMonthChanged($event)" />
      <button class="btn-refresh" [class.spinning]="loading()" (click)="refresh()"
        [disabled]="loading()" matTooltip="Làm mới / tổng hợp lại dữ liệu">
        <mat-icon>refresh</mat-icon>
      </button>
    </div>
  </div>

  <!-- ── LOADING ─────────────────────────────────────────────── -->
  @if (loading()) {
    <div class="fr-loading">
      <mat-spinner diameter="40"></mat-spinner>
      <span>Đang tải dữ liệu tháng {{ selectedMonth }}...</span>
    </div>
  } @else if (!hasData()) {
    <div class="fr-empty">
      <div class="fr-empty-icon"><mat-icon>insert_chart_outlined</mat-icon></div>
      <h3>Chưa có dữ liệu tháng {{ selectedMonth }}</h3>
      <p>Dữ liệu sẽ được chuẩn bị tự động sau khi:<br>
         • Chạy <strong>Tính Chi Phí Billing</strong> (menu Billing)<br>
         • Hoặc <strong>Xác nhận Bảng Lương</strong> (menu Payroll)</p>
      <p style="font-size:12px;color:#9ca3af;margin-top:0">
        Nếu đã có billing, nhấn nút bên dưới để tổng hợp thủ công.
      </p>
      <button class="btn-primary" (click)="refresh()" [disabled]="loading()">
        <mat-icon>sync</mat-icon> Tổng hợp thủ công
      </button>
    </div>
  } @else {

    <!-- KPI CARDS -->
    <div class="kpi-grid">
      <!-- Revenue -->
      <div class="kpi-card kpi-blue">
        <div class="kpi-top">
          <span class="kpi-label">Tổng Doanh Thu</span>
          <div class="kpi-badge kpi-badge-blue">
            <mat-icon>trending_up</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ formatM(summary()!.totalRevenue) }}</div>
        <div class="kpi-sub">{{ summary()!.totalRevenue | number:'1.0-0' }} VND</div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill kpi-bar-blue" style="width:100%"></div>
        </div>
      </div>

      <!-- Total Cost -->
      <div class="kpi-card kpi-orange">
        <div class="kpi-top">
          <span class="kpi-label">Tổng Chi Phí</span>
          <div class="kpi-badge kpi-badge-orange">
            <mat-icon>payments</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ formatM(totalCostAll()) }}</div>
        <div class="kpi-sub">{{ totalCostAll() | number:'1.0-0' }} VND</div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill kpi-bar-orange" [style.width]="costRatio() + '%'"></div>
        </div>
      </div>

      <!-- Profit -->
      <div class="kpi-card kpi-green">
        <div class="kpi-top">
          <span class="kpi-label">Lợi Nhuận</span>
          <div class="kpi-badge kpi-badge-green">
            <mat-icon>savings</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ formatM(summary()!.totalProfit) }}</div>
        <div class="kpi-sub">{{ summary()!.totalProfit | number:'1.0-0' }} VND</div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill kpi-bar-green" [style.width]="summary()!.profitMargin + '%'"></div>
        </div>
      </div>

      <!-- Margin -->
      <div class="kpi-card kpi-purple">
        <div class="kpi-top">
          <span class="kpi-label">Profit Margin</span>
          <div class="kpi-badge kpi-badge-purple">
            <mat-icon>percent</mat-icon>
          </div>
        </div>
        <div class="kpi-value">{{ summary()!.profitMargin | number:'1.1-1' }}%</div>
        <div class="kpi-sub">
          <span [class]="summary()!.profitMargin >= 30 ? 'text-green' : summary()!.profitMargin >= 10 ? 'text-orange' : 'text-red'">
            {{ summary()!.profitMargin >= 30 ? 'Rất tốt' : summary()!.profitMargin >= 10 ? 'Trung bình' : 'Cần cải thiện' }}
          </span>
        </div>
        <div class="kpi-bar-track">
          <div class="kpi-bar-fill kpi-bar-purple" [style.width]="min100(summary()!.profitMargin) + '%'"></div>
        </div>
      </div>
    </div>

    <!-- COST BREAKDOWN + SUMMARY PANEL -->
    <div class="mid-grid">

      <!-- Cost breakdown -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon class="panel-icon">donut_small</mat-icon>
          <span>Phân Bổ Chi Phí</span>
        </div>
        <div class="breakdown-list">
          <div class="breakdown-item">
            <div class="breakdown-label">
              <span class="dot dot-orange"></span>
              <span>Lương nội bộ</span>
            </div>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar">
                <div class="breakdown-bar-fill fill-orange"
                  [style.width]="payrollRatio() + '%'"></div>
              </div>
              <span class="breakdown-amount">{{ formatM(summary()!.totalPayrollCost) }}</span>
              <span class="breakdown-pct">{{ payrollRatio() | number:'1.1-1' }}%</span>
            </div>
          </div>
          <div class="breakdown-item">
            <div class="breakdown-label">
              <span class="dot dot-red"></span>
              <span>Chi phí vendor</span>
            </div>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar">
                <div class="breakdown-bar-fill fill-red"
                  [style.width]="vendorRatio() + '%'"></div>
              </div>
              <span class="breakdown-amount">{{ formatM(summary()!.totalVendorCost) }}</span>
              <span class="breakdown-pct">{{ vendorRatio() | number:'1.1-1' }}%</span>
            </div>
          </div>
          <div class="breakdown-divider"></div>
          <div class="breakdown-item breakdown-total">
            <div class="breakdown-label">
              <span class="dot dot-blue"></span>
              <span>Doanh thu</span>
            </div>
            <div class="breakdown-bar-wrap">
              <div class="breakdown-bar">
                <div class="breakdown-bar-fill fill-blue" style="width:100%"></div>
              </div>
              <span class="breakdown-amount">{{ formatM(summary()!.totalRevenue) }}</span>
              <span class="breakdown-pct">100%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick stats -->
      <div class="panel">
        <div class="panel-header">
          <mat-icon class="panel-icon">people</mat-icon>
          <span>Tổng Quan Nhân Sự</span>
        </div>
        <div class="qs-grid">
          <div class="qs-item">
            <div class="qs-num">{{ summary()!.totalEmployees }}</div>
            <div class="qs-lbl">Tổng nhân viên</div>
          </div>
          <div class="qs-item">
            <div class="qs-num text-blue">{{ internalCount() }}</div>
            <div class="qs-lbl">Nội bộ</div>
          </div>
          <div class="qs-item">
            <div class="qs-num text-purple">{{ vendorCount() }}</div>
            <div class="qs-lbl">Vendor</div>
          </div>
          <div class="qs-item">
            <div class="qs-num text-green">{{ filteredEmployees().length }}</div>
            <div class="qs-lbl">Đang hiển thị</div>
          </div>
        </div>

        <!-- Revenue per employee avg -->
        <div class="qs-divider"></div>
        <div class="qs-avg-row">
          <span class="qs-avg-label">Doanh thu TB / người</span>
          <span class="qs-avg-val text-blue">
            {{ formatM(summary()!.totalRevenue / (summary()!.totalEmployees || 1)) }}
          </span>
        </div>
        <div class="qs-avg-row">
          <span class="qs-avg-label">LN TB / người</span>
          <span class="qs-avg-val text-green">
            {{ formatM(summary()!.totalProfit / (summary()!.totalEmployees || 1)) }}
          </span>
        </div>
      </div>
    </div>

    <!-- EMPLOYEE TABLE CARD -->
    <div class="table-card">
      <!-- Table header with search -->
      <div class="table-card-header">
        <div class="table-card-title">
          <mat-icon>group</mat-icon>
          <span>Chi Tiết Theo Nhân Viên</span>
          <span class="count-badge">{{ filteredEmployees().length }}/{{ employees().length }}</span>
        </div>
        <div class="table-filters">
          <!-- Search box -->
          <div class="search-box" [class.has-value]="searchText">
            <mat-icon class="search-icon">search</mat-icon>
            <input class="search-input" [(ngModel)]="searchText" (ngModelChange)="onSearch()"
              placeholder="Tìm tên, mã NV, khách hàng...">
            @if (searchText) {
              <button class="search-clear" (click)="clearSearch()">
                <mat-icon>close</mat-icon>
              </button>
            }
          </div>

          <!-- Type filter pills -->
          <div class="filter-pills">
            <button class="pill" [class.active]="filterType === ''" (click)="setFilter('')">Tất cả</button>
            <button class="pill pill-blue" [class.active]="filterType === 'INTERNAL'" (click)="setFilter('INTERNAL')">
              Nội bộ
            </button>
            <button class="pill pill-purple" [class.active]="filterType === 'VENDOR'" (click)="setFilter('VENDOR')">
              Vendor
            </button>
          </div>

          <!-- Sort -->
          <div class="sort-wrap">
            <mat-icon class="sort-icon">sort</mat-icon>
            <select class="sort-select" [(ngModel)]="sortBy" (ngModelChange)="onSearch()">
              <option value="name">Tên A→Z</option>
              <option value="revenue">Doanh thu ↓</option>
              <option value="profit">Lợi nhuận ↓</option>
              <option value="margin">Margin ↓</option>
            </select>
          </div>
        </div>
      </div>

      <!-- No search result -->
      @if (filteredEmployees().length === 0 && searchText) {
        <div class="table-empty">
          <mat-icon>search_off</mat-icon>
          <span>Không tìm thấy "<strong>{{ searchText }}</strong>"</span>
          <button class="link-btn" (click)="clearSearch()">Xóa tìm kiếm</button>
        </div>
      } @else {
        <!-- Table -->
        <div class="table-scroll">
          <table class="emp-table">
            <thead>
              <tr>
                <th class="th-emp">Nhân viên</th>
                <th class="th-type">Loại</th>
                <th class="th-cust">Khách hàng</th>
                <th class="th-num">Ngày công</th>
                <th class="th-num">Doanh thu</th>
                <th class="th-num">Chi phí</th>
                <th class="th-num">Lợi nhuận</th>
                <th class="th-margin">Margin</th>
              </tr>
            </thead>
            <tbody>
              @for (e of filteredEmployees(); track e.employeeId; let i = $index) {
                <tr class="emp-row">
                  <!-- Employee -->
                  <td class="td-emp">
                    <div class="emp-cell">
                      <div class="emp-avatar" [style.background]="avatarColor(e.fullName)">
                        {{ initials(e.fullName) }}
                      </div>
                      <div>
                        <div class="emp-name">{{ e.fullName }}</div>
                        <code class="emp-code">{{ e.employeeCode }}</code>
                      </div>
                    </div>
                  </td>
                  <!-- Type badge -->
                  <td>
                    <span [class]="'type-badge type-' + (e.sourceType || '').toLowerCase()">
                      {{ e.sourceType === 'INTERNAL' ? 'Nội bộ' : 'Vendor' }}
                    </span>
                  </td>
                  <!-- Customer -->
                  <td class="td-cust">{{ e.customerName || '—' }}</td>
                  <!-- Days -->
                  <td class="td-num">
                    <span class="days-chip">{{ e.billedDays }} ngày</span>
                  </td>
                  <!-- Revenue -->
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val blue">{{ formatM(e.revenueAmount) }}</span>
                      <span class="money-sub">{{ e.revenueAmount | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <!-- Cost -->
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val red">{{ formatM(e.netCostAmount) }}</span>
                      <span class="money-sub">{{ e.netCostAmount | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <!-- Profit -->
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val" [class.green]="e.profitAmount >= 0" [class.red]="e.profitAmount < 0">
                        {{ formatM(e.profitAmount) }}
                      </span>
                      <span class="money-sub">{{ e.profitAmount | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <!-- Margin with mini bar -->
                  <td class="td-margin">
                    <div class="margin-cell">
                      <span class="margin-pct" [class]="marginTextClass(e.profitMargin)">
                        {{ e.profitMargin | number:'1.1-1' }}%
                      </span>
                      <div class="margin-track">
                        <div class="margin-fill" [class]="marginBarClass(e.profitMargin)"
                          [style.width]="min100(e.profitMargin) + '%'"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <!-- Footer totals -->
            <tfoot>
              <tr class="total-row">
                <td colspan="3" class="total-label">
                  TỔNG ({{ filteredEmployees().length }} nhân viên)
                </td>
                <td class="td-num">
                  <span class="days-chip days-chip-dark">
                    {{ filteredDays() | number:'1.0-1' }} ngày
                  </span>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val blue bold">{{ formatM(filteredRevenue()) }}</span>
                    <span class="money-sub">{{ filteredRevenue() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val red bold">{{ formatM(filteredCost()) }}</span>
                    <span class="money-sub">{{ filteredCost() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val bold"
                      [class.green]="filteredProfit() >= 0" [class.red]="filteredProfit() < 0">
                      {{ formatM(filteredProfit()) }}
                    </span>
                    <span class="money-sub">{{ filteredProfit() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-margin">
                  <span class="margin-pct bold" [class]="marginTextClass(filteredMargin())">
                    {{ filteredMargin() | number:'1.1-1' }}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      }
    </div>

    <!-- DEPARTMENT BREAKDOWN SECTION -->
    @if (deptBreakdown().length > 0) {
      <div class="table-card" style="margin-top: 20px;">
        <div class="table-card-header">
          <div class="table-card-title">
            <mat-icon>domain</mat-icon>
            <span>Phân Bổ Theo Phòng Ban</span>
            <span class="count-badge">{{ deptBreakdown().length }} phòng</span>
          </div>
        </div>
        <div class="table-scroll">
          <table class="emp-table">
            <thead>
              <tr>
                <th style="text-align: left; min-width: 200px;">Phòng ban</th>
                <th class="th-num">Số NV</th>
                <th class="th-num">Chi phí</th>
                <th class="th-num">Doanh thu</th>
                <th class="th-num">Lợi nhuận</th>
                <th class="th-margin">Margin</th>
              </tr>
            </thead>
            <tbody>
              @for (dept of deptBreakdown(); track dept.jobRoleId; let i = $index) {
                <tr class="emp-row">
                  <td style="text-align: left;">
                    <div class="emp-cell">
                      <div class="emp-avatar" [style.background]="avatarColor(dept.jobRoleName)">
                        {{ initials(dept.jobRoleName) }}
                      </div>
                      <div>
                        <div class="emp-name">{{ dept.jobRoleName }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="td-num">
                    <span class="days-chip">{{ dept.headcount }}</span>
                  </td>
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val red">{{ formatM(dept.cost) }}</span>
                      <span class="money-sub">{{ dept.cost | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val blue">{{ formatM(dept.revenue) }}</span>
                      <span class="money-sub">{{ dept.revenue | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <td class="td-num">
                    <div class="money-cell">
                      <span class="money-val" [class.green]="dept.revenue - dept.cost >= 0" [class.red]="dept.revenue - dept.cost < 0">
                        {{ formatM(dept.revenue - dept.cost) }}
                      </span>
                      <span class="money-sub">{{ dept.revenue - dept.cost | number:'1.0-0' }}</span>
                    </div>
                  </td>
                  <td class="td-margin">
                    <div class="margin-cell">
                      <span class="margin-pct" [class]="marginTextClass(dept.margin)">
                        {{ dept.margin | number:'1.1-1' }}%
                      </span>
                      <div class="margin-track">
                        <div class="margin-fill" [class]="marginBarClass(dept.margin)"
                          [style.width]="min100(dept.margin) + '%'"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
            <!-- Footer totals -->
            <tfoot>
              <tr class="total-row">
                <td style="text-align: left;" class="total-label">
                  TỔNG ({{ deptBreakdown().length }} phòng)
                </td>
                <td class="td-num">
                  <span class="days-chip days-chip-dark">
                    {{ deptTotalHeadcount() }}
                  </span>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val red bold">{{ formatM(deptTotalCost()) }}</span>
                    <span class="money-sub">{{ deptTotalCost() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val blue bold">{{ formatM(deptTotalRevenue()) }}</span>
                    <span class="money-sub">{{ deptTotalRevenue() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-num">
                  <div class="money-cell">
                    <span class="money-val bold"
                      [class.green]="deptTotalProfit() >= 0" [class.red]="deptTotalProfit() < 0">
                      {{ formatM(deptTotalProfit()) }}
                    </span>
                    <span class="money-sub">{{ deptTotalProfit() | number:'1.0-0' }}</span>
                  </div>
                </td>
                <td class="td-margin">
                  <span class="margin-pct bold" [class]="marginTextClass(deptAvgMargin())">
                    {{ deptAvgMargin() | number:'1.1-1' }}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    }

  } <!-- end else hasData -->
</div>
  `,
  styles: [`
/* ── ROOT ─────────────────────────────────────────────────────── */
.fr-root {
  padding: 28px 32px;
  min-height: 100vh;
  background: #f0f2f5;
  font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif;
}

/* ── HEADER ───────────────────────────────────────────────────── */
.fr-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}
.fr-header-left { display: flex; align-items: center; }
.fr-title-row { display: flex; align-items: center; gap: 14px; }

.fr-icon-wrap {
  width: 46px; height: 46px;
  border-radius: 12px;
  background: linear-gradient(135deg, #1565c0, #3b82f6);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(21,101,192,.3);
  flex-shrink: 0;
}
.fr-icon-wrap mat-icon { color: #fff; font-size: 24px; width: 24px; height: 24px; }

.fr-title { font-size: 22px; font-weight: 700; color: #0f172a; margin: 0; line-height: 1.3; }
.fr-subtitle {
  display: flex; align-items: center; gap: 4px;
  font-size: 12.5px; color: #6b7280; margin: 3px 0 0;
}
.inline-icon { font-size: 13px; width: 13px; height: 13px; color: #9ca3af; }

.fr-header-right { display: flex; align-items: center; gap: 10px; }
.btn-refresh {
  width: 40px; height: 40px; border-radius: 10px; border: 1.5px solid #e2e8f0;
  background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center;
  color: #6366f1; transition: all .2s;
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.btn-refresh:hover:not(:disabled) { background: #eef2ff; border-color: #6366f1; }
.btn-refresh:disabled { opacity: .5; cursor: not-allowed; }
.btn-refresh mat-icon { font-size: 20px; width: 20px; height: 20px; }
.btn-refresh.spinning mat-icon { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── LOADING / EMPTY ──────────────────────────────────────────── */
.fr-loading {
  display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: 80px 24px; color: #6b7280; font-size: 14px;
}
.fr-empty {
  display: flex; flex-direction: column; align-items: center;
  padding: 80px 24px; text-align: center;
}
.fr-empty-icon {
  width: 72px; height: 72px; border-radius: 20px;
  background: #f1f5f9; display: flex; align-items: center; justify-content: center;
  margin-bottom: 20px;
}
.fr-empty-icon mat-icon { font-size: 36px; width: 36px; height: 36px; color: #94a3b8; }
.fr-empty h3 { font-size: 17px; font-weight: 600; color: #374151; margin: 0 0 8px; }
.fr-empty p { font-size: 13.5px; color: #6b7280; margin: 0 0 24px; line-height: 1.7; }
.btn-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 20px; border-radius: 10px; border: none;
  background: linear-gradient(135deg, #1565c0, #3b82f6);
  color: #fff; font-family: inherit; font-size: 14px; font-weight: 600;
  cursor: pointer; box-shadow: 0 4px 12px rgba(21,101,192,.3); transition: opacity .2s;
}
.btn-primary:hover { opacity: .9; }
.btn-primary mat-icon { font-size: 18px; width: 18px; height: 18px; }

/* ── KPI GRID ─────────────────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}
.kpi-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 22px 16px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 1px 3px rgba(0,0,0,.06), 0 1px 2px rgba(0,0,0,.04);
  position: relative;
  overflow: hidden;
}
.kpi-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
}
.kpi-blue::before  { background: linear-gradient(90deg, #1565c0, #3b82f6); }
.kpi-orange::before { background: linear-gradient(90deg, #d97706, #f59e0b); }
.kpi-green::before  { background: linear-gradient(90deg, #15803d, #22c55e); }
.kpi-purple::before { background: linear-gradient(90deg, #7c3aed, #a78bfa); }

.kpi-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.kpi-label { font-size: 11.5px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: #6b7280; }
.kpi-badge {
  width: 34px; height: 34px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
}
.kpi-badge mat-icon { font-size: 18px; width: 18px; height: 18px; }
.kpi-badge-blue   { background: #dbeafe; } .kpi-badge-blue   mat-icon { color: #1d4ed8; }
.kpi-badge-orange { background: #fef3c7; } .kpi-badge-orange mat-icon { color: #d97706; }
.kpi-badge-green  { background: #dcfce7; } .kpi-badge-green  mat-icon { color: #16a34a; }
.kpi-badge-purple { background: #ede9fe; } .kpi-badge-purple mat-icon { color: #7c3aed; }

.kpi-value { font-size: 28px; font-weight: 700; color: #0f172a; line-height: 1; margin-bottom: 4px; }
.kpi-sub { font-size: 11.5px; color: #9ca3af; margin-bottom: 14px; }

.kpi-bar-track {
  height: 4px; background: #f1f5f9; border-radius: 9px; overflow: hidden;
}
.kpi-bar-fill { height: 100%; border-radius: 9px; transition: width .8s ease; }
.kpi-bar-blue   { background: linear-gradient(90deg, #1565c0, #3b82f6); }
.kpi-bar-orange { background: linear-gradient(90deg, #d97706, #f59e0b); }
.kpi-bar-green  { background: linear-gradient(90deg, #15803d, #22c55e); }
.kpi-bar-purple { background: linear-gradient(90deg, #7c3aed, #a78bfa); }

/* ── MID GRID ─────────────────────────────────────────────────── */
.mid-grid {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
}
.panel {
  background: #fff;
  border-radius: 16px;
  padding: 20px 22px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
}
.panel-header {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 700; color: #1e293b;
  margin-bottom: 18px; padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
}
.panel-icon { font-size: 20px; width: 20px; height: 20px; color: #6366f1; }

/* Cost breakdown */
.breakdown-list { display: flex; flex-direction: column; gap: 14px; }
.breakdown-item { display: flex; align-items: center; gap: 12px; }
.breakdown-label {
  display: flex; align-items: center; gap: 8px;
  font-size: 13px; color: #374151; min-width: 120px; font-weight: 500;
}
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot-orange { background: #f59e0b; }
.dot-red    { background: #f87171; }
.dot-blue   { background: #3b82f6; }
.breakdown-bar-wrap {
  flex: 1; display: flex; align-items: center; gap: 10px;
}
.breakdown-bar {
  flex: 1; height: 8px; background: #f1f5f9; border-radius: 9px; overflow: hidden;
}
.breakdown-bar-fill { height: 100%; border-radius: 9px; transition: width .8s ease; }
.fill-orange { background: linear-gradient(90deg, #d97706, #f59e0b); }
.fill-red    { background: linear-gradient(90deg, #dc2626, #f87171); }
.fill-blue   { background: linear-gradient(90deg, #1565c0, #3b82f6); }
.breakdown-amount { font-size: 13px; font-weight: 600; color: #374151; min-width: 55px; text-align: right; }
.breakdown-pct    { font-size: 11.5px; color: #9ca3af; min-width: 40px; text-align: right; }
.breakdown-divider { height: 1px; background: #f1f5f9; margin: 4px 0; }
.breakdown-total .breakdown-label { font-weight: 700; color: #0f172a; }
.breakdown-total .breakdown-amount { color: #1d4ed8; }

/* Quick stats */
.qs-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px;
}
.qs-item {
  background: #f8faff; border-radius: 10px; padding: 12px 10px;
  text-align: center;
}
.qs-num { font-size: 24px; font-weight: 700; color: #0f172a; line-height: 1; }
.qs-lbl { font-size: 11px; color: #6b7280; margin-top: 4px; font-weight: 500; }
.qs-divider { height: 1px; background: #f1f5f9; margin: 14px 0; }
.qs-avg-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; font-size: 13px;
}
.qs-avg-label { color: #6b7280; }
.qs-avg-val { font-weight: 700; }

/* ── TABLE CARD ───────────────────────────────────────────────── */
.table-card {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(0,0,0,.06);
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  overflow: hidden;
}
.table-card-header {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid #f1f5f9;
}
.table-card-title {
  display: flex; align-items: center; gap: 10px;
  font-size: 14px; font-weight: 700; color: #1e293b;
}
.table-card-title mat-icon { font-size: 20px; width: 20px; height: 20px; color: #6366f1; }
.count-badge {
  background: #eef2ff; color: #4f46e5;
  font-size: 11.5px; font-weight: 700;
  padding: 2px 8px; border-radius: 20px;
}
.table-filters { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

/* Search */
.search-box {
  display: flex; align-items: center; gap: 8px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 0 10px; height: 36px; background: #fff;
  transition: border-color .2s;
  width: 260px;
}
.search-box:focus-within, .search-box.has-value { border-color: #6366f1; }
.search-icon { font-size: 17px; width: 17px; height: 17px; color: #9ca3af; flex-shrink: 0; }
.search-input {
  flex: 1; border: none; outline: none; font-family: inherit;
  font-size: 13.5px; color: #374151; background: transparent;
}
.search-input::placeholder { color: #9ca3af; }
.search-clear {
  background: none; border: none; cursor: pointer; padding: 0;
  color: #9ca3af; display: flex; align-items: center;
}
.search-clear mat-icon { font-size: 16px; width: 16px; height: 16px; }

/* Filter pills */
.filter-pills { display: flex; align-items: center; gap: 4px; }
.pill {
  padding: 5px 12px; border-radius: 20px; border: 1.5px solid #e2e8f0;
  background: #fff; font-family: inherit; font-size: 12.5px; font-weight: 600;
  color: #6b7280; cursor: pointer; transition: all .15s;
}
.pill:hover { border-color: #6366f1; color: #6366f1; }
.pill.active { background: #6366f1; border-color: #6366f1; color: #fff; }
.pill-blue.active  { background: #1d4ed8; border-color: #1d4ed8; }
.pill-purple.active { background: #7c3aed; border-color: #7c3aed; }

/* Sort */
.sort-wrap {
  display: flex; align-items: center; gap: 6px;
  border: 1.5px solid #e2e8f0; border-radius: 10px;
  padding: 0 10px; height: 36px; background: #fff;
}
.sort-icon { font-size: 16px; width: 16px; height: 16px; color: #9ca3af; }
.sort-select {
  border: none; outline: none; font-family: inherit;
  font-size: 13px; color: #374151; background: transparent; cursor: pointer;
}

/* Table empty */
.table-empty {
  display: flex; align-items: center; gap: 10px;
  padding: 40px 24px; justify-content: center;
  color: #6b7280; font-size: 13.5px;
}
.table-empty mat-icon { font-size: 22px; width: 22px; height: 22px; color: #9ca3af; }
.link-btn {
  background: none; border: none; color: #6366f1;
  font-size: 13.5px; cursor: pointer; font-family: inherit;
  text-decoration: underline;
}

/* ── EMPLOYEE TABLE ───────────────────────────────────────────── */
.table-scroll { overflow-x: auto; }
.emp-table { width: 100%; border-collapse: collapse; min-width: 900px; }

.emp-table thead tr {
  background: #f9fafb;
  border-bottom: 2px solid #e5e7eb;
}
.emp-table th {
  padding: 11px 16px;
  font-size: 11px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .5px; color: #6b7280;
  white-space: nowrap;
}
.th-num, .td-num { text-align: right; }
.th-margin, .td-margin { text-align: center; min-width: 120px; }
.th-emp { min-width: 200px; }
.th-cust { min-width: 130px; }

.emp-row { transition: background .12s; border-bottom: 1px solid #f3f4f6; }
.emp-row:last-child { border-bottom: none; }
.emp-row:hover { background: #f8faff; }
.emp-table td { padding: 12px 16px; font-size: 13.5px; color: #374151; }

/* Employee cell */
.td-emp { padding: 10px 16px !important; }
.emp-cell { display: flex; align-items: center; gap: 11px; }
.emp-avatar {
  width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 13px; font-weight: 700;
  flex-shrink: 0; letter-spacing: .5px;
}
.emp-name { font-size: 13.5px; font-weight: 600; color: #1e293b; line-height: 1.3; }
.emp-code { font-size: 11px; color: #64748b; font-family: 'JetBrains Mono', monospace; }

/* Type badge */
.type-badge {
  display: inline-block; padding: 3px 10px; border-radius: 20px;
  font-size: 11.5px; font-weight: 600; white-space: nowrap;
}
.type-internal { background: #eff6ff; color: #1d4ed8; }
.type-vendor   { background: #f5f3ff; color: #7c3aed; }

.td-cust { color: #6b7280; font-size: 13px; }

/* Days chip */
.days-chip {
  display: inline-block; padding: 3px 9px; border-radius: 20px;
  background: #f1f5f9; color: #374151; font-size: 12px; font-weight: 600;
}
.days-chip-dark { background: #e2e8f0; }

/* Money cell */
.money-cell { display: flex; flex-direction: column; align-items: flex-end; }
.money-val { font-size: 14px; font-weight: 700; line-height: 1.2; }
.money-sub { font-size: 10.5px; color: #9ca3af; }
.money-val.blue  { color: #1d4ed8; }
.money-val.green { color: #16a34a; }
.money-val.red   { color: #dc2626; }
.money-val.bold  { }

/* Margin mini bar */
.margin-cell { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.margin-pct { font-size: 13px; font-weight: 700; }
.margin-track {
  width: 80px; height: 5px; background: #f1f5f9; border-radius: 9px; overflow: hidden;
}
.margin-fill { height: 100%; border-radius: 9px; transition: width .6s ease; }
.fill-good   { background: linear-gradient(90deg, #15803d, #22c55e); }
.fill-ok     { background: linear-gradient(90deg, #d97706, #f59e0b); }
.fill-bad    { background: linear-gradient(90deg, #dc2626, #f87171); }

/* Tfoot */
.total-row {
  background: #f9fafb;
  border-top: 2px solid #e5e7eb;
}
.total-row td { padding: 12px 16px; }
.total-label {
  font-size: 12px; font-weight: 700; text-transform: uppercase;
  letter-spacing: .4px; color: #374151;
}

/* ── HELPERS ──────────────────────────────────────────────────── */
.text-blue   { color: #1d4ed8; }
.text-green  { color: #16a34a; }
.text-orange { color: #d97706; }
.text-red    { color: #dc2626; }
.text-purple { color: #7c3aed; }
.bold        { font-weight: 700; }

/* Margin text classes */
.margin-good   { color: #16a34a; }
.margin-ok     { color: #d97706; }
.margin-bad    { color: #dc2626; }

/* ── RESPONSIVE ───────────────────────────────────────────────── */
@media (max-width: 1280px) {
  .kpi-grid { grid-template-columns: repeat(2, 1fr); }
  .mid-grid { grid-template-columns: 1fr; }
  .qs-grid  { grid-template-columns: repeat(4, 1fr); }
}
@media (max-width: 768px) {
  .fr-root { padding: 16px; }
  .kpi-grid { grid-template-columns: 1fr 1fr; }
  .fr-header { flex-direction: column; align-items: flex-start; }
  .search-box { width: 100%; }
  .table-filters { width: 100%; }
}
  `]
})
export class FinancialReportComponent implements OnInit {
  private reportService = inject(ReportService);
  private billingService = inject(BillingService);
  private snackBar = inject(MatSnackBar);

  selectedMonth = new Date().toISOString().slice(0, 7);
  readonly loading  = signal(false);
  readonly summary  = signal<MonthlySummary | null>(null);
  readonly employees = signal<EmployeeFinancial[]>([]);
  readonly filteredEmployees = signal<EmployeeFinancial[]>([]);
  readonly deptBreakdown = signal<RevenueReportItem[]>([]);

  // Filter state
  searchText = '';
  filterType = '';
  sortBy = 'name';

  onMonthChanged(val: string) { this.selectedMonth = val; this.load(); }

  // ── Computed ────────────────────────────────────────────────────
  readonly hasData = computed(() => this.employees().length > 0 || !!this.summary());

  readonly totalCostAll = computed(() =>
    (this.summary()?.totalPayrollCost ?? 0) + (this.summary()?.totalVendorCost ?? 0));

  readonly costRatio = computed(() => {
    const rev = this.summary()?.totalRevenue ?? 0;
    return rev > 0 ? Math.min(100, (this.totalCostAll() / rev) * 100) : 0;
  });
  readonly payrollRatio = computed(() => {
    const total = this.totalCostAll();
    return total > 0 ? ((this.summary()?.totalPayrollCost ?? 0) / total) * 100 : 0;
  });
  readonly vendorRatio = computed(() => {
    const total = this.totalCostAll();
    return total > 0 ? ((this.summary()?.totalVendorCost ?? 0) / total) * 100 : 0;
  });

  readonly internalCount = computed(() => this.employees().filter(e => e.sourceType === 'INTERNAL').length);
  readonly vendorCount   = computed(() => this.employees().filter(e => e.sourceType === 'VENDOR').length);

  readonly filteredRevenue = computed(() => this.filteredEmployees().reduce((s, e) => s + e.revenueAmount, 0));
  readonly filteredCost    = computed(() => this.filteredEmployees().reduce((s, e) => s + e.netCostAmount, 0));
  readonly filteredProfit  = computed(() => this.filteredRevenue() - this.filteredCost());
  readonly filteredDays    = computed(() => this.filteredEmployees().reduce((s, e) => s + e.billedDays, 0));
  readonly filteredMargin  = computed(() =>
    this.filteredRevenue() > 0 ? (this.filteredProfit() / this.filteredRevenue()) * 100 : 0);

  readonly deptTotalHeadcount = computed(() =>
    this.deptBreakdown().reduce((s, d) => s + d.headcount, 0));
  readonly deptTotalRevenue = computed(() =>
    this.deptBreakdown().reduce((s, d) => s + d.revenue, 0));
  readonly deptTotalCost = computed(() =>
    this.deptBreakdown().reduce((s, d) => s + d.cost, 0));
  readonly deptTotalProfit = computed(() =>
    this.deptTotalRevenue() - this.deptTotalCost());
  readonly deptAvgMargin = computed(() =>
    this.deptBreakdown().length > 0
      ? this.deptBreakdown().reduce((s, d) => s + d.margin, 0) / this.deptBreakdown().length
      : 0);

  // ── Lifecycle ────────────────────────────────────────────────────
  ngOnInit() { this.load(); }

  // ── Data loading ─────────────────────────────────────────────────
  load() {
    this.loading.set(true);
    this.summary.set(null);
    this.employees.set([]);
    this.filteredEmployees.set([]);
    this.deptBreakdown.set([]);
    const [year, month] = this.selectedMonth.split('-').map(Number);
    const yearMonthStr = `${year}-${String(month).padStart(2, '0')}`;

    forkJoin({
      summary: this.reportService.getMonthlySummary(month, year).pipe(catchError(() => of(null))),
      employees: this.reportService.getPerEmployee(month, year).pipe(catchError(() => of([]))),
      deptBreakdown: this.billingService.getRevenueByDepartment(yearMonthStr, yearMonthStr).pipe(catchError(() => of([])))
    }).subscribe(({ summary, employees, deptBreakdown }) => {
      this.summary.set(summary);
      this.employees.set(employees || []);
      this.deptBreakdown.set(deptBreakdown || []);
      this.searchText = ''; this.filterType = ''; this.sortBy = 'name';
      this.applyFilter();
      this.loading.set(false);
    });
  }

  refresh() {
    this.loading.set(true);
    this.reportService.generate(this.selectedMonth).subscribe({
      next: () => { this.load(); this.snackBar.open('Đã làm mới báo cáo', 'OK', { duration: 2000 }); },
      error: () => { this.load(); this.snackBar.open('Không có dữ liệu billing để tổng hợp', 'X', { duration: 3000 }); }
    });
  }

  // ── Filter / Search ──────────────────────────────────────────────
  onSearch() { this.applyFilter(); }
  clearSearch() { this.searchText = ''; this.applyFilter(); }
  setFilter(type: string) { this.filterType = type; this.applyFilter(); }

  private applyFilter() {
    const q = this.norm(this.searchText.trim());
    let result = this.employees().filter(e => {
      const match = !q || this.norm(e.fullName).includes(q)
        || this.norm(e.employeeCode).includes(q)
        || this.norm(e.customerName).includes(q);
      const type  = !this.filterType || e.sourceType === this.filterType;
      return match && type;
    });

    switch (this.sortBy) {
      case 'revenue': result = [...result].sort((a, b) => b.revenueAmount - a.revenueAmount); break;
      case 'profit':  result = [...result].sort((a, b) => b.profitAmount  - a.profitAmount);  break;
      case 'margin':  result = [...result].sort((a, b) => b.profitMargin  - a.profitMargin);  break;
      default:        result = [...result].sort((a, b) => (a.fullName||'').localeCompare(b.fullName||'', 'vi')); break;
    }
    this.filteredEmployees.set(result);
  }

  // ── Helpers ──────────────────────────────────────────────────────
  private norm(s: string) {
    return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  formatM(val: number): string {
    if (!val && val !== 0) return '—';
    const abs = Math.abs(val);
    const sign = val < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1) + 'B';
    if (abs >= 1_000_000)     return sign + (abs / 1_000_000).toFixed(1) + 'M';
    if (abs >= 1_000)         return sign + (abs / 1_000).toFixed(0) + 'K';
    return sign + abs.toFixed(0);
  }

  min100(val: number) { return Math.min(100, Math.max(0, val)); }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg,#1565c0,#3b82f6)',
      'linear-gradient(135deg,#7c3aed,#a78bfa)',
      'linear-gradient(135deg,#15803d,#22c55e)',
      'linear-gradient(135deg,#c2410c,#fb923c)',
      'linear-gradient(135deg,#0f766e,#2dd4bf)',
      'linear-gradient(135deg,#be185d,#f472b6)',
    ];
    let hash = 0;
    for (const c of (name || '')) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return colors[hash % colors.length];
  }

  marginTextClass(m: number) { return m >= 20 ? 'margin-good' : m >= 0 ? 'margin-ok' : 'margin-bad'; }
  marginBarClass(m: number)  { return m >= 20 ? 'fill-good'   : m >= 0 ? 'fill-ok'   : 'fill-bad'; }
}
