import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { InsuranceService, InsurancePolicy, InsuranceDeclaration, InsuranceConfig } from '../../core/services/insurance.service';
import { EmployeeService } from '../../core/services/employee.service';
import { AuthService } from '../../core/auth/auth.service';
import { MoneyDirective } from '../../shared/directives/money.directive';
import { Employee } from '../../core/models/employee.models';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';

@Component({
  selector: 'app-insurance',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
    MatProgressSpinnerModule, MatTableModule, MatTabsModule, MatChipsModule, MatDialogModule,
    MatAutocompleteModule, MoneyDirective],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Quản lý Bảo hiểm</div>
          <div class="page-subtitle">Chính sách BH nhân viên, báo tăng/giảm, cấu hình tỷ lệ</div>
        </div>
      </div>

      <!-- Stats -->
      <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px;">
        <mat-card style="padding:0;">
          <mat-card-content style="padding:18px 20px!important;">
            <div class="stat-label">Đang tham gia BH</div>
            <div class="stat-value" style="color:#16a34a;">{{ activePolicies().length }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card style="padding:0;">
          <mat-card-content style="padding:18px 20px!important;">
            <div class="stat-label">Báo tăng/giảm chờ xử lý</div>
            <div class="stat-value" style="color:#d97706;">{{ pendingDeclarations().length }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card style="padding:0;">
          <mat-card-content style="padding:18px 20px!important;">
            <div class="stat-label">Quá hạn</div>
            <div class="stat-value" style="color:#dc2626;">{{ overdueDeclarations().length }}</div>
          </mat-card-content>
        </mat-card>
        <mat-card style="padding:0;">
          <mat-card-content style="padding:18px 20px!important;">
            <div class="stat-label">Tổng BH CTy đóng/tháng</div>
            <div class="stat-value" style="color:#1d4ed8;">{{ totalEmployerCost() | number:'1.0-0' }}đ</div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-tab-group animationDuration="200ms">
        <!-- TAB 1: POLICIES -->
        <mat-tab label="Chính sách BH">
          <div style="padding:16px 0;">
            <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
              <button mat-raised-button color="primary" (click)="showAddPolicy = true">
                <mat-icon>add</mat-icon> Thêm NV tham gia BH
              </button>
            </div>

            <!-- Form thêm NV tham gia BH -->
            @if (showAddPolicy) {
              <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-bottom:20px;
                font-family:'Inter','Be Vietnam Pro','Segoe UI',sans-serif;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                  <div style="width:36px;height:36px;border-radius:10px;background:#eff6ff;
                    display:flex;align-items:center;justify-content:center;">
                    <mat-icon style="font-size:18px;width:18px;height:18px;color:#1d4ed8;">person_add</mat-icon>
                  </div>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:#1e293b;">Thêm nhân viên tham gia bảo hiểm</div>
                    <div style="font-size:12px;color:#94a3b8;">Tìm nhân viên theo tên hoặc mã, nhập thông tin đóng BH</div>
                  </div>
                </div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                  <!-- Autocomplete nhân viên -->
                  <mat-form-field appearance="outline">
                    <mat-label>Nhân viên</mat-label>
                    <input matInput placeholder="Gõ tên hoặc mã nhân viên..."
                      [(ngModel)]="employeeSearchText"
                      (ngModelChange)="onEmployeeSearch($event)"
                      [matAutocomplete]="empAuto">
                    <mat-icon matPrefix style="color:#6366f1;">person_search</mat-icon>
                    <mat-autocomplete #empAuto="matAutocomplete"
                      [displayWith]="displayEmployee"
                      (optionSelected)="onEmployeeSelected($event)">
                      @for (emp of filteredEmployees(); track emp.id) {
                        <mat-option [value]="emp">
                          <span style="font-weight:600;">{{ emp.fullName }}</span>
                          <span style="color:#94a3b8;margin-left:8px;font-size:12px;">{{ emp.employeeCode }}</span>
                        </mat-option>
                      }
                    </mat-autocomplete>
                  </mat-form-field>

                  <!-- Lương đóng BH -->
                  <mat-form-field appearance="outline">
                    <mat-label>Mức lương đóng BH (VNĐ)</mat-label>
                    <input matInput type="text" inputmode="numeric" appMoney
                      [(ngModel)]="newPolicy.insuranceSalary"
                      placeholder="VD: 5,500,000">
                    <mat-icon matPrefix style="color:#d97706;">payments</mat-icon>
                  </mat-form-field>

                  <!-- Số sổ BHXH -->
                  <mat-form-field appearance="outline">
                    <mat-label>Số sổ BHXH</mat-label>
                    <input matInput [(ngModel)]="newPolicy.socialInsuranceNumber"
                      placeholder="VD: 0198765432">
                    <mat-icon matPrefix style="color:#94a3b8;">badge</mat-icon>
                  </mat-form-field>

                  <!-- Ngày bắt đầu -->
                  <mat-form-field appearance="outline">
                    <mat-label>Ngày bắt đầu tham gia</mat-label>
                    <input matInput type="date" [(ngModel)]="newPolicy.startDate">
                    <mat-icon matPrefix style="color:#94a3b8;">event</mat-icon>
                  </mat-form-field>
                </div>

                @if (selectedEmployeeName) {
                  <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                    background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;margin-top:8px;margin-bottom:12px;">
                    <mat-icon style="font-size:18px;width:18px;height:18px;color:#16a34a;">check_circle</mat-icon>
                    <span style="font-size:13px;color:#166534;font-weight:500;">
                      Đã chọn: <strong>{{ selectedEmployeeName }}</strong>
                    </span>
                  </div>
                }

                <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
                  <button mat-stroked-button (click)="showAddPolicy = false; selectedEmployeeName = ''"
                    style="border-radius:10px;height:42px;padding:0 20px;">
                    Hủy
                  </button>
                  <button mat-flat-button (click)="createPolicy()"
                    [disabled]="!newPolicy.employeeId || !newPolicy.startDate"
                    style="background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border-radius:10px;
                    height:42px;padding:0 24px;font-weight:600;">
                    <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">save</mat-icon>
                    Lưu đăng ký BH
                  </button>
                </div>
              </div>
            }

            @if (loading()) {
              <div style="text-align:center; padding:40px;"><mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner></div>
            } @else {
              <table mat-table [dataSource]="policies()" class="mat-elevation-z1" style="width:100%;">
                <ng-container matColumnDef="stt">
                  <th mat-header-cell *matHeaderCellDef style="width:50px">STT</th>
                  <td mat-cell *matCellDef="let r; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Nhân viên</th>
                  <td mat-cell *matCellDef="let r">
                    <div style="font-weight:500;">{{ r.employeeName }}</div>
                    <code style="font-size:11px;">{{ r.employeeCode }}</code>
                  </td>
                </ng-container>
                <ng-container matColumnDef="insuranceSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương đóng BH</th>
                  <td mat-cell *matCellDef="let r" style="font-weight:600; color:#b45309;">{{ r.insuranceSalary | number:'1.0-0' }}đ</td>
                </ng-container>
                <ng-container matColumnDef="bhxh">
                  <th mat-header-cell *matHeaderCellDef>Số sổ BHXH</th>
                  <td mat-cell *matCellDef="let r">{{ r.socialInsuranceNumber || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="startDate">
                  <th mat-header-cell *matHeaderCellDef>Từ ngày</th>
                  <td mat-cell *matCellDef="let r">{{ r.startDate }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="'chip chip-' + r.status.toLowerCase()">{{ statusLabel(r.status) }}</span>
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="policyColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: policyColumns;"></tr>
              </table>
            }
          </div>
        </mat-tab>

        <!-- TAB 2: DECLARATIONS -->
        <mat-tab label="Báo tăng / giảm">
          <div style="padding:16px 0;">
            @if (declarations().length === 0) {
              <div class="empty-state">
                <mat-icon>assignment</mat-icon>
                <p>Chưa có tờ khai báo tăng/giảm nào</p>
              </div>
            } @else {
              <table mat-table [dataSource]="declarations()" class="mat-elevation-z1" style="width:100%;">
                <ng-container matColumnDef="stt">
                  <th mat-header-cell *matHeaderCellDef style="width:50px">STT</th>
                  <td mat-cell *matCellDef="let r; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Nhân viên</th>
                  <td mat-cell *matCellDef="let r">
                    <div style="font-weight:500;">{{ r.employeeName }}</div>
                    <code style="font-size:11px;">{{ r.employeeCode }}</code>
                  </td>
                </ng-container>
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Loại</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="'chip chip-' + r.declarationType.toLowerCase()">{{ typeLabel(r.declarationType) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="month">
                  <th mat-header-cell *matHeaderCellDef>Tháng áp dụng</th>
                  <td mat-cell *matCellDef="let r">{{ r.effectiveMonth }}</td>
                </ng-container>
                <ng-container matColumnDef="deadline">
                  <th mat-header-cell *matHeaderCellDef>Hạn nộp</th>
                  <td mat-cell *matCellDef="let r">
                    <span [style.color]="isOverdue(r.deadline) ? '#dc2626' : '#333'" [style.fontWeight]="isOverdue(r.deadline) ? '700' : '400'">
                      {{ r.deadline }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="reason">
                  <th mat-header-cell *matHeaderCellDef>Lý do</th>
                  <td mat-cell *matCellDef="let r" style="font-size:12px; color:#666;">{{ r.reason || '—' }}</td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="'chip chip-' + r.status.toLowerCase()">{{ declStatusLabel(r.status) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    @if (r.status === 'PENDING') {
                      <button mat-stroked-button color="primary" style="font-size:11px; padding:0 8px; min-width:0; line-height:28px;"
                        (click)="markSubmitted(r)">Đã nộp</button>
                    }
                    @if (r.status === 'SUBMITTED') {
                      <button mat-stroked-button style="font-size:11px; padding:0 8px; min-width:0; line-height:28px; color:#16a34a;"
                        (click)="markApproved(r)">Duyệt</button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="declColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: declColumns;"></tr>
              </table>
            }
          </div>
        </mat-tab>

        <!-- TAB 3: CONFIG — chỉ COMPANY_ADMIN -->
        @if (isStrictAdmin()) {
        <mat-tab label="Cấu hình tỷ lệ">
          <div style="padding:16px 0;">
            <div style="display:flex; justify-content:flex-end; margin-bottom:12px;">
              <button mat-raised-button color="accent" (click)="seedConfig()">
                <mat-icon>settings_suggest</mat-icon> Seed tỷ lệ mặc định
              </button>
            </div>
            @if (configs().length > 0) {
              <table mat-table [dataSource]="configs()" class="mat-elevation-z1" style="width:100%;">
                <ng-container matColumnDef="type">
                  <th mat-header-cell *matHeaderCellDef>Loại BH</th>
                  <td mat-cell *matCellDef="let r" style="font-weight:600;">{{ r.insuranceType }}</td>
                </ng-container>
                <ng-container matColumnDef="empRate">
                  <th mat-header-cell *matHeaderCellDef>NV đóng (%)</th>
                  <td mat-cell *matCellDef="let r" style="color:#1d4ed8; font-weight:600;">{{ r.employeeRate }}%</td>
                </ng-container>
                <ng-container matColumnDef="erRate">
                  <th mat-header-cell *matHeaderCellDef>CTy đóng (%)</th>
                  <td mat-cell *matCellDef="let r" style="color:#b45309; font-weight:600;">{{ r.employerRate }}%</td>
                </ng-container>
                <ng-container matColumnDef="min">
                  <th mat-header-cell *matHeaderCellDef>Sàn</th>
                  <td mat-cell *matCellDef="let r">{{ r.minSalary | number:'1.0-0' }}đ</td>
                </ng-container>
                <ng-container matColumnDef="max">
                  <th mat-header-cell *matHeaderCellDef>Trần</th>
                  <td mat-cell *matCellDef="let r">{{ r.maxSalary | number:'1.0-0' }}đ</td>
                </ng-container>
                <ng-container matColumnDef="from">
                  <th mat-header-cell *matHeaderCellDef>Hiệu lực từ</th>
                  <td mat-cell *matCellDef="let r">{{ r.effectiveFrom }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="configColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: configColumns;"></tr>
              </table>
            } @else {
              <div class="empty-state">
                <mat-icon>tune</mat-icon>
                <p>Chưa cấu hình tỷ lệ BH. Bấm "Seed tỷ lệ mặc định" để tạo.</p>
              </div>
            }
          </div>
        </mat-tab>
        } <!-- end @if isStrictAdmin -->
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .stat-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.6px; color:#6b7280; margin-bottom:6px; }
    .stat-value { font-size:28px; font-weight:700; }
    .chip {
      display:inline-block; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600;
      &.chip-active, &.chip-approved { background:#DCFCE7; color:#16A34A; }
      &.chip-suspended, &.chip-submitted { background:#DBEAFE; color:#1D4ED8; }
      &.chip-closed, &.chip-rejected { background:#F3F4F6; color:#6B7280; }
      &.chip-pending { background:#FEF3C7; color:#D97706; }
      &.chip-increase { background:#DCFCE7; color:#16A34A; }
      &.chip-decrease { background:#FEE2E2; color:#DC2626; }
      &.chip-adjustment { background:#DBEAFE; color:#1D4ED8; }
    }
    .empty-state {
      text-align:center; padding:60px 20px; color:#9ca3af;
      mat-icon { font-size:48px; width:48px; height:48px; margin-bottom:12px; }
    }
  `]
})
export class InsuranceComponent implements OnInit {
  private svc = inject(InsuranceService);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);
  readonly isStrictAdmin = computed(() => this.authService.isStrictAdmin());

  readonly loading = signal(false);
  readonly policies = signal<InsurancePolicy[]>([]);
  readonly declarations = signal<InsuranceDeclaration[]>([]);
  readonly configs = signal<InsuranceConfig[]>([]);

  readonly activePolicies = computed(() => this.policies().filter(p => p.status === 'ACTIVE'));
  readonly pendingDeclarations = computed(() => this.declarations().filter(d => d.status === 'PENDING'));
  readonly overdueDeclarations = signal<InsuranceDeclaration[]>([]);
  readonly totalEmployerCost = computed(() => {
    // Rough estimate: sum insuranceSalary * 21.5%
    return this.activePolicies().reduce((s, p) => s + (p.insuranceSalary * 0.215), 0);
  });

  readonly policyColumns = ['stt', 'employee', 'insuranceSalary', 'bhxh', 'startDate', 'status'];
  readonly declColumns = ['stt', 'employee', 'type', 'month', 'deadline', 'reason', 'status', 'actions'];
  readonly configColumns = ['type', 'empRate', 'erRate', 'min', 'max', 'from'];

  showAddPolicy = false;
  newPolicy = { employeeId: 0, insuranceSalary: 5000000, socialInsuranceNumber: '', startDate: '' };

  // Autocomplete nhân viên
  private employeeService = inject(EmployeeService);
  readonly filteredEmployees = signal<Employee[]>([]);
  employeeSearchText: any = '';
  selectedEmployeeName = '';

  onEmployeeSearch(term: any) {
    if (!term || typeof term !== 'string' || term.length < 1) {
      this.filteredEmployees.set([]);
      return;
    }
    this.employeeService.search(term).subscribe(list => this.filteredEmployees.set(list));
  }

  displayEmployee(emp: Employee): string {
    return emp ? `${emp.fullName} (${emp.employeeCode})` : '';
  }

  onEmployeeSelected(event: any) {
    const emp: Employee = event.option.value;
    this.newPolicy.employeeId = emp.id;
    this.selectedEmployeeName = `${emp.fullName} (${emp.employeeCode})`;
  }

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.loading.set(true);
    this.svc.getPolicies().subscribe({ next: d => this.policies.set(d || []), error: () => {} });
    this.svc.getDeclarations().subscribe({ next: d => this.declarations.set(d || []), error: () => {} });
    this.svc.getConfigs().subscribe({
      next: d => { this.configs.set(d || []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
    this.svc.getOverdue().subscribe({ next: d => this.overdueDeclarations.set(d || []), error: () => {} });
  }

  createPolicy() {
    const payload = {
      ...this.newPolicy,
      insuranceSalary: typeof this.newPolicy.insuranceSalary === 'string'
        ? Number(String(this.newPolicy.insuranceSalary).replace(/,/g, ''))
        : this.newPolicy.insuranceSalary
    };
    this.svc.createPolicy(payload).subscribe({
      next: () => { this.showAddPolicy = false; this.loadAll(); this.snackBar.open('Đã thêm NV tham gia BH', 'OK', { duration: 3000 }); },
      error: (e) => this.snackBar.open(e.error?.message || 'Lỗi', 'X', { duration: 3000 })
    });
  }

  seedConfig() {
    this.svc.seedDefaultConfig().subscribe({
      next: () => { this.loadAll(); this.snackBar.open('Đã tạo cấu hình mặc định', 'OK', { duration: 3000 }); },
      error: () => this.snackBar.open('Lỗi seed config', 'X', { duration: 3000 })
    });
  }

  markSubmitted(d: InsuranceDeclaration) {
    this.svc.updateDeclarationStatus(d.id, 'SUBMITTED').subscribe({
      next: () => { this.loadAll(); this.snackBar.open('Đã đánh dấu đã nộp', 'OK', { duration: 2000 }); }
    });
  }

  markApproved(d: InsuranceDeclaration) {
    this.svc.updateDeclarationStatus(d.id, 'APPROVED').subscribe({
      next: () => { this.loadAll(); this.snackBar.open('Đã duyệt', 'OK', { duration: 2000 }); }
    });
  }

  isOverdue(deadline: string): boolean {
    return new Date(deadline) < new Date();
  }

  statusLabel(s: string) {
    const m: Record<string, string> = { ACTIVE: 'Đang tham gia', SUSPENDED: 'Tạm dừng', CLOSED: 'Đã ngừng' };
    return m[s] || s;
  }
  typeLabel(t: string) {
    const m: Record<string, string> = { INCREASE: 'Báo tăng', DECREASE: 'Báo giảm', ADJUSTMENT: 'Điều chỉnh' };
    return m[t] || t;
  }
  declStatusLabel(s: string) {
    const m: Record<string, string> = { PENDING: 'Chờ xử lý', SUBMITTED: 'Đã nộp', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối' };
    return m[s] || s;
  }
}
