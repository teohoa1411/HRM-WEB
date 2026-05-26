import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Subscription } from 'rxjs';
import { EmployeeService } from '../../../core/services/employee.service';
import { JobRoleService } from '../../../core/services/job-role.service';
import { CompanyService } from '../../../core/services/company.service';
import { VendorService } from '../../../core/services/vendor.service';
import { JobRole } from '../../../core/models/job-role.models';
import { Department } from '../../../core/models/company.models';
import { Vendor } from '../../../core/models/vendor.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';

/** Remove Vietnamese diacritics and normalize to ASCII lowercase */
function removeVietDiacritics(str: string): string {
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/gi, 'd')
            .replace(/[^a-zA-Z\s]/g, '')
            .toLowerCase()
            .trim();
}

/** Generate username base: {tên}{initials of họ+tên đệm}{DDMM} */
function buildUsernameBase(fullName: string, dob: string): string {
  if (!fullName || !dob) return '';
  const normalized = removeVietDiacritics(fullName);
  const words = normalized.split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return '';

  const ten = words[words.length - 1];
  const initials = words.slice(0, -1).map(w => w[0]).join('');

  const parts = dob.split('-');  // YYYY-MM-DD
  if (parts.length < 3) return ten + initials;
  const dd = parts[2].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');

  return ten + initials + dd + mm;
}

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule,
    MatDividerModule, MatTooltipModule, MoneyDirective
  ],
  providers: [
    { provide: DateAdapter, useClass: ViDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VI_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
<div class="ef-container">

  <!-- ── Header ── -->
  <div class="ef-header">
    <div class="ef-header-left">
      <div class="ef-title">{{ isEdit() ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới' }}</div>
      <div class="ef-subtitle">{{ isEdit() ? 'Cập nhật thông tin nhân viên' : 'Tạo tài khoản nhân viên — mật khẩu mặc định Admin@123' }}</div>
    </div>
    <button class="ef-back-btn" (click)="goBack()">
      <mat-icon>arrow_back</mat-icon>
      <span>Quay lại</span>
    </button>
  </div>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">

    <!-- ══════ SECTION: Tài khoản (create only) ══════ -->
    @if (!isEdit()) {
      <section class="ef-section ef-section--account">
        <div class="ef-section-header">
          <div class="ef-section-icon ef-section-icon--purple">
            <mat-icon>manage_accounts</mat-icon>
          </div>
          <div>
            <div class="ef-section-title">Thông tin tài khoản</div>
            <div class="ef-section-desc">Tự động tạo, không cần nhập</div>
          </div>
        </div>

        <div class="ef-grid ef-grid--2">
          <div class="ef-readonly-field">
            <span class="ef-readonly-label">Mã nhân viên</span>
            <div class="ef-readonly-value">
              <mat-icon class="ef-readonly-icon">badge</mat-icon>
              <span>{{ nextCode() }}</span>
            </div>
            <span class="ef-readonly-hint">Tự động tăng theo thứ tự</span>
          </div>

          <div class="ef-readonly-field">
            <span class="ef-readonly-label">Tên đăng nhập</span>
            <div class="ef-readonly-value">
              <mat-icon class="ef-readonly-icon">person</mat-icon>
              <span>{{ previewUsername() || 'Nhập họ tên + ngày sinh để xem' }}</span>
            </div>
            <span class="ef-readonly-hint">
              {{ previewUsername() ? 'Mật khẩu: Admin@123 (phải đổi khi đăng nhập)' : 'Tạo từ họ tên + ngày sinh' }}
            </span>
          </div>
        </div>
      </section>
    }

    <!-- ══════ SECTION: Thông tin cá nhân ══════ -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>person</mat-icon>
        </div>
        <div class="ef-section-title">Thông tin cá nhân</div>
      </div>

      <div class="ef-grid ef-grid--1" style="margin-bottom:16px;">
        <mat-form-field appearance="outline">
          <mat-label>Họ và tên đầy đủ *</mat-label>
          <input matInput formControlName="fullName" placeholder="VD: Nguyễn Văn Hạnh">
          <mat-icon matPrefix>person_outline</mat-icon>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Ngày sinh *</mat-label>
          <input matInput [matDatepicker]="dobPicker" formControlName="dateOfBirth"
                 placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="dobPicker"></mat-datepicker-toggle>
          <mat-datepicker #dobPicker></mat-datepicker>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Email công việc</mat-label>
          <input matInput formControlName="emailWork" type="email" placeholder="ten@company.com">
          <mat-icon matPrefix>email</mat-icon>
          <mat-error>Email không hợp lệ</mat-error>
        </mat-form-field>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>SĐT công việc</mat-label>
          <input matInput formControlName="phoneWork" placeholder="0901 234 567">
          <mat-icon matPrefix>phone</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>SĐT người thân</mat-label>
          <input matInput formControlName="emergencyPhone" placeholder="0901 234 567">
          <mat-icon matPrefix>emergency</mat-icon>
          <mat-hint>Liên hệ khẩn cấp</mat-hint>
        </mat-form-field>
      </div>
    </section>

    <!-- ══════ SECTION: Thông tin công việc ══════ -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>work</mat-icon>
        </div>
        <div class="ef-section-title">Thông tin công việc</div>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Loại nhân sự *</mat-label>
          <mat-select formControlName="sourceType">
            <mat-option value="INTERNAL">Nội bộ (Internal)</mat-option>
            <mat-option value="VENDOR">Từ đối tác (Vendor)</mat-option>
          </mat-select>
        </mat-form-field>

        @if (form.get('sourceType')?.value === 'VENDOR') {
          <mat-form-field appearance="outline">
            <mat-label>Đối tác (Vendor) *</mat-label>
            <mat-select formControlName="vendorId">
              @for (v of vendors(); track v.id) {
                <mat-option [value]="v.id">{{ v.name }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        }

        @if (!isEdit() && form.get('sourceType')?.value === 'INTERNAL') {
          <mat-form-field appearance="outline">
            <mat-label>Quyền tài khoản</mat-label>
            <mat-select formControlName="accountRole">
              <mat-option value="EMPLOYEE">Nhân viên</mat-option>
              <mat-option value="ACCOUNTANT">Kế toán</mat-option>
            </mat-select>
          </mat-form-field>
        }

        <mat-form-field appearance="outline">
          <mat-label>Job Role *</mat-label>
          <mat-select formControlName="jobRoleId">
            @for (jr of jobRoles(); track jr.id) {
              <mat-option [value]="jr.id">{{ jr.name }} ({{ jr.seniorityLevel }})</mat-option>
            }
          </mat-select>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Phòng ban</mat-label>
          <mat-select formControlName="departmentId">
            <mat-option [value]="null">— Chưa xác định —</mat-option>
            @for (d of departments(); track d.id) {
              <mat-option [value]="d.id">{{ d.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Loại hợp đồng</mat-label>
          <mat-select formControlName="employmentType">
            <mat-option value="FULL_TIME">Toàn thời gian</mat-option>
            <mat-option value="PART_TIME">Bán thời gian</mat-option>
            <mat-option value="CONTRACT">Hợp đồng</mat-option>
            <mat-option value="INTERN">Thực tập</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Trạng thái</mat-label>
          <mat-select formControlName="status">
            <mat-option value="ACTIVE">Đang làm việc</mat-option>
            <mat-option value="PROBATION">Thử việc</mat-option>
            <mat-option value="ON_LEAVE">Nghỉ phép</mat-option>
            <mat-option value="INACTIVE">Tạm ngưng</mat-option>
            <mat-option value="TERMINATED">Đã nghỉ</mat-option>
          </mat-select>
        </mat-form-field>
      </div>

      <mat-divider style="margin:8px 0 20px;"></mat-divider>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Ngày vào làm *</mat-label>
          <input matInput [matDatepicker]="startPicker" formControlName="startDate"
                 placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ngày kết thúc thử việc</mat-label>
          <input matInput [matDatepicker]="probPicker" formControlName="probationEndDate"
                 placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="probPicker"></mat-datepicker-toggle>
          <mat-datepicker #probPicker></mat-datepicker>
        </mat-form-field>
      </div>

      <mat-form-field appearance="outline" class="ef-full-width" style="margin-top:4px;">
        <mat-label>Ghi chú</mat-label>
        <textarea matInput formControlName="notes" rows="3"
                  placeholder="Thông tin bổ sung về nhân viên..."></textarea>
      </mat-form-field>
    </section>

    <!-- ── Actions ── -->
    <div class="ef-actions">
      <button type="button" class="ef-btn ef-btn--cancel" (click)="goBack()">Hủy</button>
      <button type="submit" class="ef-btn ef-btn--submit" [disabled]="submitting()">
        @if (submitting()) {
          <span class="ef-spinner"></span>
          <span>Đang lưu...</span>
        } @else {
          <mat-icon>{{ isEdit() ? 'save' : 'person_add' }}</mat-icon>
          <span>{{ isEdit() ? 'Lưu thay đổi' : 'Tạo nhân viên' }}</span>
        }
      </button>
    </div>

  </form>
</div>
  `,
  styles: [`
    /* ═══ Container ═══ */
    .ef-container {
      max-width: 840px;
      margin: 0 auto;
      padding: 24px 16px 40px;
    }

    /* ═══ Header ═══ */
    .ef-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 28px;
      gap: 16px;
    }
    .ef-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
      line-height: 1.2;
    }
    .ef-subtitle {
      font-size: 13.5px;
      color: #64748b;
      margin-top: 4px;
    }
    .ef-back-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      background: #fff;
      color: #475569;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      white-space: nowrap;
      font-family: inherit;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { border-color: #6366f1; color: #6366f1; background: #f8fafc; }
    }

    /* ═══ Sections ═══ */
    .ef-section {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 24px;
      margin-bottom: 20px;
      transition: box-shadow 0.15s;
      &:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
    }
    .ef-section--account {
      border-left: 4px solid #6366f1;
      background: linear-gradient(135deg, #fafaff 0%, #f5f3ff 100%);
    }
    .ef-section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .ef-section-icon {
      width: 38px; height: 38px;
      border-radius: 10px;
      background: #f1f5f9;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #475569; }
    }
    .ef-section-icon--purple {
      background: rgba(99,102,241,0.12);
      mat-icon { color: #6366f1; }
    }
    .ef-section-title {
      font-size: 15px;
      font-weight: 700;
      color: #1e293b;
    }
    .ef-section-desc {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 1px;
    }

    /* ═══ Grid layout ═══ */
    .ef-grid {
      display: grid;
      gap: 16px;
    }
    .ef-grid--1 { grid-template-columns: 1fr; }
    .ef-grid--2 { grid-template-columns: 1fr 1fr; }
    .ef-full-width { width: 100%; }

    /* ═══ Readonly preview fields ═══ */
    .ef-readonly-field {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .ef-readonly-label {
      font-size: 12px;
      font-weight: 600;
      color: #6366f1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .ef-readonly-value {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 9px;
      font-size: 14px;
      font-weight: 600;
      color: #1e293b;
    }
    .ef-readonly-icon {
      font-size: 18px; width: 18px; height: 18px;
      color: #94a3b8;
    }
    .ef-readonly-hint {
      font-size: 11.5px;
      color: #94a3b8;
    }

    /* ═══ Form fields override ═══ */
    mat-form-field {
      width: 100%;
    }
    ::ng-deep .ef-section .mat-mdc-form-field-subscript-wrapper {
      margin-bottom: 0;
    }

    /* ═══ Actions ═══ */
    .ef-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-bottom: 32px;
    }
    .ef-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px 28px;
      border-radius: 11px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.15s;
      font-family: inherit;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }
    .ef-btn--cancel {
      background: #fff;
      border: 1.5px solid #e2e8f0;
      color: #64748b;
      &:hover { border-color: #cbd5e1; background: #f8fafc; }
    }
    .ef-btn--submit {
      background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%);
      color: #fff;
      box-shadow: 0 4px 14px rgba(99,102,241,0.35);
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 6px 20px rgba(99,102,241,0.45);
      }
      &:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    }

    /* ═══ Spinner ═══ */
    .ef-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: ef-spin 0.6s linear infinite;
    }
    @keyframes ef-spin { to { transform: rotate(360deg); } }

    /* ═══ Responsive ═══ */
    @media (max-width: 640px) {
      .ef-grid--2 { grid-template-columns: 1fr; }
      .ef-header { flex-direction: column; }
      .ef-actions { flex-direction: column; }
      .ef-btn { width: 100%; }
    }
  `]
})
export class EmployeeFormComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private employeeService = inject(EmployeeService);
  private jobRoleService = inject(JobRoleService);
  private companyService = inject(CompanyService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly jobRoles = signal<JobRole[]>([]);
  readonly departments = signal<Department[]>([]);
  readonly vendors = signal<Vendor[]>([]);
  readonly nextCode = signal<string>('...');

  readonly previewUsername = signal<string>('');

  private subs = new Subscription();

  readonly form = this.fb.group({
    fullName:        ['', Validators.required],
    dateOfBirth:     [null as Date | null, Validators.required],
    emailWork:       ['', Validators.email],
    phoneWork:       [''],
    emergencyPhone:  [''],
    sourceType:      ['INTERNAL', Validators.required],
    vendorId:        [null as number | null],
    jobRoleId:       [null as number | null, Validators.required],
    departmentId:    [null as number | null],
    positionId:      [null as number | null],
    directManagerId: [null as number | null],
    employmentType:  ['FULL_TIME'],
    status:          ['ACTIVE'],
    startDate:       [null as Date | null, Validators.required],
    probationEndDate:[null as Date | null],
    notes:           [''],
    accountRole:     ['EMPLOYEE']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.loadEmployee(id);
    } else {
      this.employeeService.getNextCode().subscribe(code => this.nextCode.set(code));
      this.subs.add(
        this.form.valueChanges.subscribe(() => this.updateUsernamePreview())
      );
    }
    this.loadLookups();
  }

  ngOnDestroy() { this.subs.unsubscribe(); }

  private updateUsernamePreview() {
    const fn = this.form.get('fullName')?.value ?? '';
    const dobVal = this.form.get('dateOfBirth')?.value;
    if (!fn || !dobVal) { this.previewUsername.set(''); return; }
    const dob = dobVal instanceof Date
      ? `${dobVal.getFullYear()}-${String(dobVal.getMonth()+1).padStart(2,'0')}-${String(dobVal.getDate()).padStart(2,'0')}`
      : String(dobVal);
    this.previewUsername.set(buildUsernameBase(fn, dob));
  }

  private loadLookups() {
    this.jobRoleService.listActive().subscribe(jrs => this.jobRoles.set(jrs));
    this.companyService.listDepartments().subscribe(deps => this.departments.set(deps));
    this.vendorService.list({ size: 100 }).subscribe(p => this.vendors.set(p.content));
  }

  private loadEmployee(id: string) {
    this.employeeService.getById(id).subscribe(emp => {
      this.form.patchValue({
        fullName:        emp.fullName,
        dateOfBirth:     emp.dateOfBirth ? new Date(emp.dateOfBirth) : null,
        emailWork:       emp.emailWork,
        phoneWork:       emp.phoneWork,
        emergencyPhone:  emp.emergencyPhone ?? '',
        sourceType:      emp.sourceType,
        vendorId:        emp.vendorId,
        jobRoleId:       emp.jobRoleId,
        departmentId:    emp.departmentId,
        employmentType:  emp.employmentType,
        status:          emp.status,
        startDate:       emp.startDate ? new Date(emp.startDate) : null,
        probationEndDate: emp.probationEndDate ? new Date(emp.probationEndDate) : null,
        notes:           emp.notes ?? ''
      });
    });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    if (this.submitting()) return;
    this.submitting.set(true);
    const raw = this.form.getRawValue();

    const payload: any = {
      fullName:        raw.fullName,
      dateOfBirth:     this.formatDate(raw.dateOfBirth as Date | null),
      emailWork:       raw.emailWork || undefined,
      phoneWork:       raw.phoneWork || undefined,
      emergencyPhone:  raw.emergencyPhone || undefined,
      sourceType:      raw.sourceType,
      vendorId:        raw.vendorId || undefined,
      jobRoleId:       raw.jobRoleId,
      departmentId:    raw.departmentId || undefined,
      positionId:      raw.positionId || undefined,
      directManagerId: raw.directManagerId || undefined,
      employmentType:  raw.employmentType,
      status:          raw.status,
      startDate:       this.formatDate(raw.startDate as Date | null),
      probationEndDate: this.formatDate(raw.probationEndDate as Date | null),
      notes:           raw.notes || undefined,
      accountRole:     !this.isEdit() && raw.sourceType === 'INTERNAL' ? raw.accountRole : undefined
    };

    const obs = this.isEdit()
      ? this.employeeService.update(this.route.snapshot.paramMap.get('id')!, payload)
      : this.employeeService.create(payload);

    obs.subscribe({
      next: (emp) => {
        const msg = this.isEdit()
          ? 'Cập nhật thành công'
          : `Tạo nhân viên thành công. Tài khoản: ${emp.username ?? ''} | Mật khẩu: Admin@123`;
        this.snackBar.open(msg, 'OK', { duration: 5000 });
        this.router.navigate(['/employees']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi khi lưu', 'Đóng',
          { duration: 5000, panelClass: 'error-snack' });
      }
    });
  }

  private formatDate(d: Date | null | undefined): string | undefined {
    if (!d) return undefined;
    const date = d instanceof Date ? d : new Date(d);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  }

  goBack() { this.router.navigate(['/employees']); }
}