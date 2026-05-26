import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EmployeeService } from '../../../core/services/employee.service';
import { CompanyService } from '../../../core/services/company.service';
import { Employee, EmployeeStatus } from '../../../core/models/employee.models';
import { Department } from '../../../core/models/company.models';
import { PageResponse } from '../../../core/models/api.models';
import { AssignmentDialogComponent } from '../assignment-dialog/assignment-dialog.component';
import { SalaryDialogComponent } from '../salary-dialog/salary-dialog.component';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule,
    MatMenuModule, MatTooltipModule, MatDialogModule, MatSelectModule,
    MatDividerModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="emp-page">

      <!-- ── Header ─────────────────────────────────────────────────────── -->
      <div class="emp-header">
        <div>
          <h1 class="emp-title">Nhân viên</h1>
          <p class="emp-sub">Quản lý toàn bộ nhân sự trong công ty</p>
        </div>
        <button class="btn-primary" routerLink="new">
          <mat-icon>person_add</mat-icon>
          Thêm nhân viên
        </button>
      </div>

      <!-- ── Stats ──────────────────────────────────────────────────────── -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-icon blue"><mat-icon>people</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ allEmployees().length }}</div>
            <div class="stat-lbl">Tổng nhân viên</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon green"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countByStatus('ACTIVE') }}</div>
            <div class="stat-lbl">Đang làm việc</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon yellow"><mat-icon>schedule</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countByStatus('PROBATION') }}</div>
            <div class="stat-lbl">Thử việc</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon purple"><mat-icon>business</mat-icon></div>
          <div class="stat-body">
            <div class="stat-num">{{ countBySource('VENDOR') }}</div>
            <div class="stat-lbl">Từ Vendor · {{ vendorNames() }}</div>
          </div>
        </div>
      </div>

      <!-- ── Filters ─────────────────────────────────────────────────────── -->
      <div class="filter-bar">
        <div class="search-wrap">
          <mat-icon class="search-icon">search</mat-icon>
          <input class="search-input" [formControl]="searchCtrl"
            placeholder="Tìm theo tên, mã, email...">
          @if (searchCtrl.value) {
            <mat-icon class="clear-icon" (click)="searchCtrl.setValue('')">close</mat-icon>
          }
        </div>
        <div class="filter-chips">
          <button class="chip" [class.active]="statusCtrl.value === ''"
            (click)="statusCtrl.setValue('')">Tất cả</button>
          <button class="chip" [class.active]="statusCtrl.value === 'ACTIVE'"
            (click)="statusCtrl.setValue('ACTIVE')">Đang làm</button>
          <button class="chip" [class.active]="statusCtrl.value === 'PROBATION'"
            (click)="statusCtrl.setValue('PROBATION')">Thử việc</button>
          <button class="chip" [class.active]="statusCtrl.value === 'ON_LEAVE'"
            (click)="statusCtrl.setValue('ON_LEAVE')">Nghỉ phép</button>
          <button class="chip" [class.active]="statusCtrl.value === 'INACTIVE'"
            (click)="statusCtrl.setValue('INACTIVE')">Không HĐ</button>
          <button class="chip" [class.active]="statusCtrl.value === 'TERMINATED'"
            (click)="statusCtrl.setValue('TERMINATED')">Đã nghỉ</button>
        </div>
        <div class="filter-select-wrap">
          <mat-icon class="filter-select-icon">filter_list</mat-icon>
          <select class="filter-select" [formControl]="sourceCtrl">
            <option value="">Tất cả loại</option>
            <option value="INTERNAL">Nội bộ</option>
            <option value="VENDOR">Vendor</option>
          </select>
        </div>
        <div class="filter-select-wrap">
          <mat-icon class="filter-select-icon">corporate_fare</mat-icon>
          <select class="filter-select" (change)="onDeptChange($event)">
            <option value="">Tất cả phòng ban</option>
            @for (d of departments(); track d.id) {
              <option [value]="d.id">{{ d.name }}</option>
            }
          </select>
        </div>
      </div>

      <!-- ── Loading ─────────────────────────────────────────────────────── -->
      @if (loading()) {
        <div class="loading-state">
          <mat-spinner diameter="40"></mat-spinner>
          <p>Đang tải danh sách nhân viên...</p>
        </div>
      } @else if (employees().length === 0) {
        <div class="empty-state">
          <div class="empty-icon"><mat-icon>people_outline</mat-icon></div>
          <h3>Không tìm thấy nhân viên</h3>
          <p>{{ searchCtrl.value || statusCtrl.value ? 'Thử thay đổi bộ lọc tìm kiếm' : 'Bắt đầu bằng cách thêm nhân viên đầu tiên' }}</p>
          @if (!searchCtrl.value && !statusCtrl.value) {
            <button class="btn-primary" routerLink="new">
              <mat-icon>person_add</mat-icon> Thêm nhân viên
            </button>
          }
        </div>
      } @else {
        <div class="result-info">
          Hiển thị <strong>{{ employees().length }}</strong> / {{ allEmployees().length }} nhân viên
        </div>
        <div class="emp-grid">
          @for (e of employees(); track e.id) {
            <div class="emp-card" [routerLink]="[e.publicId]">

              <!-- Card top: avatar + name + actions -->
              <div class="card-top">
                <div class="avatar" [style.background]="avatarColor(e.fullName)">
                  {{ initials(e.fullName) }}
                </div>
                <div class="card-name-wrap">
                  <div class="card-name">{{ e.fullName }}</div>
                  <code class="card-code">{{ e.employeeCode }}</code>
                </div>
                <button class="action-btn" [matMenuTriggerFor]="menu"
                  (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="[e.publicId]">
                    <mat-icon>visibility</mat-icon> Xem hồ sơ
                  </button>
                  <button mat-menu-item [routerLink]="[e.publicId, 'edit']">
                    <mat-icon>edit</mat-icon> Chỉnh sửa
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="openAssignment(e)">
                    <mat-icon style="color:#0284c7;">assignment_ind</mat-icon>
                    <span style="color:#0284c7;">Phân công dự án</span>
                  </button>
                  @if (e.sourceType === 'INTERNAL') {
                    <button mat-menu-item (click)="openSalary(e)">
                      <mat-icon style="color:#7C3AED;">payments</mat-icon>
                      <span style="color:#7C3AED;">Cấu hình lương</span>
                    </button>
                  }
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="resetPassword(e)">
                    <mat-icon style="color:#EA580C;">lock_reset</mat-icon>
                    <span style="color:#EA580C;">Reset mật khẩu</span>
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item (click)="confirmDelete(e)">
                    <mat-icon color="warn">delete</mat-icon>
                    <span style="color:#DC2626;">Xóa</span>
                  </button>
                </mat-menu>
              </div>

              <!-- Status + source badges -->
              <div class="card-badges">
                <span [class]="'badge status-' + e.status.toLowerCase().replace('_','-')">
                  <span class="badge-dot"></span>
                  {{ statusLabel(e.status) }}
                </span>
                @if (e.sourceType === 'INTERNAL') {
                  <span class="badge source-internal">Nội bộ</span>
                } @else {
                  <span class="badge source-vendor" [title]="e.vendorName || 'Vendor'">
                    <mat-icon style="font-size:11px;width:11px;height:11px;vertical-align:middle;">business</mat-icon>
                    {{ e.vendorName || 'Vendor' }}
                  </span>
                }
              </div>

              <!-- Card info rows -->
              <div class="card-info">
                <div class="info-row">
                  <mat-icon class="info-icon">work</mat-icon>
                  <span class="info-val" [title]="e.jobRoleName">{{ e.jobRoleName || '—' }}</span>
                </div>
                <div class="info-row">
                  <mat-icon class="info-icon">account_circle</mat-icon>
                  @if (e.username) {
                    <span class="info-val account">{{ e.username }}</span>
                  } @else {
                    <span class="info-val no-account">Chưa có tài khoản</span>
                  }
                </div>
                <div class="info-row">
                  <mat-icon class="info-icon">email</mat-icon>
                  <span class="info-val email">{{ e.emailWork || '—' }}</span>
                </div>
                @if (e.phoneWork) {
                  <div class="info-row">
                    <mat-icon class="info-icon">phone</mat-icon>
                    <span class="info-val">{{ e.phoneWork }}</span>
                  </div>
                }
                <div class="info-row">
                  <mat-icon class="info-icon">calendar_today</mat-icon>
                  <span class="info-val">
                    Từ {{ e.startDate | date:'dd/MM/yyyy' }}
                    <span class="tenure">· {{ tenure(e.startDate) }}</span>
                  </span>
                </div>
                @if (e.employmentType) {
                  <div class="info-row">
                    <mat-icon class="info-icon">badge</mat-icon>
                    <span class="info-val">{{ employmentTypeLabel(e.employmentType) }}</span>
                  </div>
                }
              </div>

              <!-- Card footer -->
              <div class="card-footer">
                <button class="footer-btn" [routerLink]="[e.publicId]"
                  (click)="$event.stopPropagation()">
                  <mat-icon>open_in_new</mat-icon> Xem hồ sơ
                </button>
                <button class="footer-btn accent" [routerLink]="[e.publicId, 'edit']"
                  (click)="$event.stopPropagation()">
                  <mat-icon>edit</mat-icon> Chỉnh sửa
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .emp-page { padding: 0; }

    /* ── Header ─────────────────────────────────────────────────── */
    .emp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 24px; flex-wrap: wrap; gap: 12px;
    }
    .emp-title { margin: 0; font-size: 24px; font-weight: 700; color: #111827; }
    .emp-sub   { margin: 4px 0 0; font-size: 14px; color: #6b7280; }
    .btn-primary {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; border-radius: 10px; border: none; cursor: pointer;
      background: linear-gradient(135deg, #5B5BD6, #7C3AED);
      color: #fff; font-size: 14px; font-weight: 600;
      box-shadow: 0 2px 8px rgba(91,91,214,.35);
      transition: opacity .15s, transform .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { opacity: .9; transform: translateY(-1px); }
    }

    /* ── Stats ──────────────────────────────────────────────────── */
    .stats-row {
      display: grid; grid-template-columns: repeat(4, 1fr);
      gap: 16px; margin-bottom: 24px;
    }
    .stat-card {
      background: #fff; border-radius: 14px; padding: 18px 20px;
      display: flex; align-items: center; gap: 14px;
      box-shadow: 0 1px 3px rgba(0,0,0,.08);
      border: 1px solid #f1f5f9;
    }
    .stat-icon {
      width: 46px; height: 46px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 22px; width: 22px; height: 22px; color: #fff; }
      &.blue   { background: linear-gradient(135deg, #3B82F6, #1D4ED8); }
      &.green  { background: linear-gradient(135deg, #22C55E, #16A34A); }
      &.yellow { background: linear-gradient(135deg, #F59E0B, #D97706); }
      &.purple { background: linear-gradient(135deg, #A855F7, #7C3AED); }
    }
    .stat-num { font-size: 26px; font-weight: 700; color: #111827; line-height: 1; }
    .stat-lbl { font-size: 12px; color: #6b7280; margin-top: 3px; }

    /* ── Filters ─────────────────────────────────────────────────── */
    .filter-bar {
      display: flex; align-items: center; gap: 12px;
      flex-wrap: wrap; margin-bottom: 20px;
    }
    .search-wrap {
      position: relative; display: flex; align-items: center;
      background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px;
      padding: 0 12px; height: 42px; min-width: 260px; flex: 1;
      transition: border-color .15s;
      &:focus-within { border-color: #5B5BD6; box-shadow: 0 0 0 3px rgba(91,91,214,.12); }
    }
    .search-icon { color: #9ca3af; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .search-input {
      border: none; outline: none; background: transparent;
      flex: 1; padding: 0 8px; font-size: 14px; color: #374151;
      &::placeholder { color: #9ca3af; }
    }
    .clear-icon {
      color: #9ca3af; font-size: 16px; width: 16px; height: 16px;
      cursor: pointer; flex-shrink: 0;
      &:hover { color: #374151; }
    }
    .filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
    .chip {
      padding: 6px 14px; border-radius: 20px; border: 1.5px solid #e5e7eb;
      background: #fff; font-size: 13px; font-weight: 500; color: #6b7280;
      cursor: pointer; transition: all .15s; white-space: nowrap;
      &:hover { border-color: #5B5BD6; color: #5B5BD6; }
      &.active { background: #5B5BD6; border-color: #5B5BD6; color: #fff; }
    }
    .filter-select-wrap {
      display: flex; align-items: center; gap: 6px;
      background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px;
      padding: 0 12px; height: 42px;
    }
    .filter-select-icon { color: #9ca3af; font-size: 18px; width: 18px; height: 18px; }
    .filter-select {
      border: none; outline: none; background: transparent;
      font-size: 13px; color: #374151; cursor: pointer;
    }

    /* ── States ──────────────────────────────────────────────────── */
    .loading-state, .empty-state {
      text-align: center; padding: 80px 24px; color: #9ca3af;
      p { margin: 8px 0 0; font-size: 14px; }
    }
    .empty-icon {
      width: 80px; height: 80px; border-radius: 20px;
      background: #f8faff; display: flex; align-items: center; justify-content: center;
      margin: 0 auto 16px;
      mat-icon { font-size: 40px; width: 40px; height: 40px; color: #c7d2fe; }
    }
    .empty-state h3 { margin: 0 0 6px; font-size: 18px; font-weight: 600; color: #374151; }

    /* ── Result info ─────────────────────────────────────────────── */
    .result-info { font-size: 13px; color: #9ca3af; margin-bottom: 14px; }

    /* ── Grid ────────────────────────────────────────────────────── */
    .emp-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    /* ── Card ────────────────────────────────────────────────────── */
    .emp-card {
      background: #fff; border-radius: 16px;
      border: 1px solid #f1f5f9;
      box-shadow: 0 1px 4px rgba(0,0,0,.06);
      padding: 20px; cursor: pointer;
      transition: box-shadow .18s, transform .18s, border-color .18s;
      display: flex; flex-direction: column; gap: 14px;
      &:hover {
        box-shadow: 0 6px 24px rgba(91,91,214,.12);
        transform: translateY(-2px);
        border-color: #c7d2fe;
      }
    }

    /* Card top */
    .card-top {
      display: flex; align-items: center; gap: 12px;
    }
    .avatar {
      width: 48px; height: 48px; border-radius: 14px;
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 16px; flex-shrink: 0;
      letter-spacing: .5px;
    }
    .card-name-wrap { flex: 1; min-width: 0; }
    .card-name {
      font-weight: 700; font-size: 15px; color: #111827;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .card-code {
      background: #f3f4f6; color: #6b7280;
      padding: 1px 7px; border-radius: 6px; font-size: 11px; font-weight: 500;
    }
    .action-btn {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0; color: #9ca3af;
      transition: background .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #f3f4f6; color: #374151; }
    }

    /* Badges */
    .card-badges { display: flex; gap: 6px; flex-wrap: wrap; }
    .badge {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600;
    }
    .badge-dot {
      width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
    }
    .status-active     { background: #DCFCE7; color: #16A34A; .badge-dot { background: #16A34A; } }
    .status-inactive   { background: #F3F4F6; color: #6B7280; .badge-dot { background: #9CA3AF; } }
    .status-probation  { background: #FEF3C7; color: #D97706; .badge-dot { background: #F59E0B; } }
    .status-on-leave   { background: #DBEAFE; color: #1D4ED8; .badge-dot { background: #3B82F6; } }
    .status-terminated { background: #FEE2E2; color: #DC2626; .badge-dot { background: #EF4444; } }
    .source-internal   { background: #EEF2FF; color: #3730A3; }
    .source-vendor     { background: #F5F3FF; color: #6D28D9; }

    /* Info rows */
    .card-info { display: flex; flex-direction: column; gap: 7px; }
    .info-row  { display: flex; align-items: center; gap: 8px; }
    .info-icon { font-size: 15px; width: 15px; height: 15px; color: #9ca3af; flex-shrink: 0; }
    .info-val  {
      font-size: 13px; color: #4b5563;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      &.email    { color: #5B5BD6; }
      &.account  { color: #0284C7; font-family: monospace; }
      &.no-account { color: #9ca3af; font-style: italic; }
    }
    .tenure { color: #9ca3af; font-size: 12px; }

    /* Footer */
    .card-footer {
      display: flex; gap: 8px; margin-top: auto;
      padding-top: 12px; border-top: 1px solid #f3f4f6;
    }
    .footer-btn {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 5px;
      padding: 7px 12px; border-radius: 8px; border: 1.5px solid #e5e7eb;
      background: transparent; cursor: pointer; font-size: 12px; font-weight: 600;
      color: #6b7280; transition: all .15s;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { border-color: #5B5BD6; color: #5B5BD6; background: #f8f7ff; }
      &.accent { border-color: #e5e7eb; }
      &.accent:hover { border-color: #7C3AED; color: #7C3AED; background: #faf5ff; }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .stats-row { grid-template-columns: repeat(2, 1fr); }
      .emp-grid  { grid-template-columns: 1fr; }
      .filter-bar { flex-direction: column; align-items: stretch; }
      .search-wrap { min-width: unset; }
    }
    @media (max-width: 480px) {
      .stats-row { grid-template-columns: 1fr 1fr; }
    }
  `]
})
export class EmployeeListComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private companyService = inject(CompanyService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly statusOptions: EmployeeStatus[] = ['ACTIVE', 'INACTIVE', 'ON_LEAVE', 'TERMINATED', 'PROBATION'];

  readonly loading = signal(false);
  readonly allEmployees = signal<Employee[]>([]);
  readonly departments = signal<Department[]>([]);

  readonly searchCtrl = new FormControl('');
  readonly statusCtrl = new FormControl('');
  readonly sourceCtrl = new FormControl('');
  readonly filterDepartment = signal<number | null>(null);

  // Bridge FormControl → signal để computed() track được
  readonly searchSignal = signal('');
  readonly statusSignal = signal('');
  readonly sourceSignal = signal('');

  onDeptChange(event: Event) {
    const v = (event.target as HTMLSelectElement).value;
    this.filterDepartment.set(v ? Number(v) : null);
  }

  readonly vendorNames = computed(() => {
    const names = [...new Set(
      this.allEmployees()
        .filter(e => e.sourceType === 'VENDOR' && e.vendorName)
        .map(e => e.vendorName!)
    )];
    return names.length > 0 ? names.join(', ') : '—';
  });

  readonly employees = computed(() => {
    const search = this.searchSignal().toLowerCase().trim();
    const status = this.statusSignal();
    const source = this.sourceSignal();
    const dept = this.filterDepartment();
    return this.allEmployees().filter(e => {
      if (search && !e.fullName.toLowerCase().includes(search)
          && !e.employeeCode.toLowerCase().includes(search)
          && !(e.emailWork || '').toLowerCase().includes(search)) return false;
      if (status && e.status !== status) return false;
      if (source && e.sourceType !== source) return false;
      if (dept && (!e.departmentId || e.departmentId !== dept)) return false;
      return true;
    });
  });

  ngOnInit() {
    this.loadDepartments();
    this.loadEmployees();
    this.searchCtrl.valueChanges.pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(v => this.searchSignal.set(v || ''));
    this.statusCtrl.valueChanges
      .subscribe(v => this.statusSignal.set(v || ''));
    this.sourceCtrl.valueChanges
      .subscribe(v => this.sourceSignal.set(v || ''));
  }

  loadDepartments() {
    this.companyService.listDepartments().subscribe({
      next: d => this.departments.set(d),
      error: () => this.departments.set([])
    });
  }

  loadEmployees() {
    this.loading.set(true);
    this.employeeService.list({ size: 200 }).subscribe({
      next: p => { this.allEmployees.set(p.content); this.loading.set(false); },
      error: ()  => this.loading.set(false)
    });
  }

  countByStatus(s: string) { return this.allEmployees().filter(e => e.status === s).length; }
  countBySource(s: string) { return this.allEmployees().filter(e => e.sourceType === s).length; }

  initials(name: string): string {
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  avatarColor(name: string): string {
    const colors = [
      'linear-gradient(135deg,#5B5BD6,#7C3AED)',
      'linear-gradient(135deg,#0EA5E9,#0284C7)',
      'linear-gradient(135deg,#10B981,#059669)',
      'linear-gradient(135deg,#F59E0B,#D97706)',
      'linear-gradient(135deg,#EF4444,#DC2626)',
      'linear-gradient(135deg,#8B5CF6,#6D28D9)',
      'linear-gradient(135deg,#EC4899,#DB2777)',
      'linear-gradient(135deg,#14B8A6,#0D9488)',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  tenure(startDate: string): string {
    if (!startDate) return '';
    const months = Math.floor((Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
    if (months < 1)  return 'Mới vào';
    if (months < 12) return `${months} tháng`;
    const years = Math.floor(months / 12);
    const rem   = months % 12;
    return rem > 0 ? `${years} năm ${rem} tháng` : `${years} năm`;
  }

  statusLabel(status: string): string {
    const m: Record<string, string> = {
      ACTIVE: 'Đang làm', INACTIVE: 'Không HĐ',
      PROBATION: 'Thử việc', ON_LEAVE: 'Nghỉ phép', TERMINATED: 'Đã nghỉ'
    };
    return m[status] || status;
  }

  employmentTypeLabel(t: string): string {
    const m: Record<string, string> = {
      FULL_TIME: 'Toàn thời gian', PART_TIME: 'Bán thời gian',
      CONTRACT: 'Hợp đồng', INTERN: 'Thực tập sinh'
    };
    return m[t] || t;
  }

  openAssignment(emp: Employee) {
    this.dialog.open(AssignmentDialogComponent, {
      data: { employeeId: emp.id, employeeName: emp.fullName },
      width: '90vw', maxWidth: '1200px', panelClass: 'assignment-dialog-panel'
    });
  }

  openSalary(emp: Employee) {
    this.dialog.open(SalaryDialogComponent, {
      data: { publicId: emp.publicId, employeeName: emp.fullName },
      width: '620px'
    });
  }

  resetPassword(emp: Employee) {
    if (confirm(`Reset mật khẩu của "${emp.fullName}" về Admin@123?`)) {
      this.employeeService.resetPassword(emp.publicId).subscribe({
        next: () => this.snackBar.open('Đã reset mật khẩu về Admin@123', 'OK', { duration: 3000 }),
        error: (err) => {
          const msg = err?.error?.message || 'Lỗi khi reset mật khẩu';
          this.snackBar.open(msg, 'Đóng', { duration: 4000 });
        }
      });
    }
  }

  confirmDelete(emp: Employee) {
    if (confirm(`Xóa nhân viên "${emp.fullName}"? Hành động này không thể hoàn tác.`)) {
      this.employeeService.delete(emp.publicId).subscribe({
        next: () => {
          this.snackBar.open('Đã xóa nhân viên', 'OK', { duration: 3000 });
          this.loadEmployees();
        },
        error: () => this.snackBar.open('Lỗi khi xóa nhân viên', 'Đóng', { duration: 3000 })
      });
    }
  }
}