import { Component, inject, OnInit, signal } from '@angular/core';
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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetService } from '../../../core/services/asset.service';
import { VendorService } from '../../../core/services/vendor.service';
import { AssetCategory, Asset } from '../../../core/models/asset.models';
import { Vendor } from '../../../core/models/vendor.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';

@Component({
  selector: 'app-asset-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatCheckboxModule, MoneyDirective
  ],
  providers: [
    { provide: DateAdapter, useClass: ViDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VI_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
<div class="ef-container">

  <!-- Header -->
  <div class="ef-header">
    <div class="ef-header-left">
      <div class="ef-title">{{ isEdit() ? 'Chỉnh sửa thiết bị' : 'Thêm thiết bị mới' }}</div>
      <div class="ef-subtitle">{{ isEdit() ? 'Cập nhật thông tin thiết bị' : 'Tạo bản ghi thiết bị mới' }}</div>
    </div>
    <button class="ef-back-btn" (click)="goBack()">
      <mat-icon>arrow_back</mat-icon>
      <span>Quay lại</span>
    </button>
  </div>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">

    <!-- Section: Account (Auto) -->
    @if (!isEdit()) {
      <section class="ef-section ef-section--account">
        <div class="ef-section-header">
          <div class="ef-section-icon ef-section-icon--purple">
            <mat-icon>badge</mat-icon>
          </div>
          <div>
            <div class="ef-section-title">Mã thiết bị</div>
            <div class="ef-section-desc">Tự động tạo, không cần nhập</div>
          </div>
        </div>

        <div class="ef-grid ef-grid--1">
          <div class="ef-readonly-field">
            <span class="ef-readonly-label">Mã thiết bị</span>
            <div class="ef-readonly-value">
              <mat-icon class="ef-readonly-icon">inventory_2</mat-icon>
              <span>{{ nextCode() }}</span>
            </div>
            <span class="ef-readonly-hint">Tự động tăng theo thứ tự</span>
          </div>
        </div>
      </section>
    }

    <!-- Section: Info -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>info</mat-icon>
        </div>
        <div class="ef-section-title">Thông tin thiết bị</div>
      </div>

      <div class="ef-grid ef-grid--2" style="margin-bottom:16px;">
        <mat-form-field appearance="outline">
          <mat-label>Tên thiết bị *</mat-label>
          <input matInput formControlName="name" placeholder="VD: Laptop Dell XPS 13">
          <mat-icon matPrefix>inventory_2</mat-icon>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Số seri</mat-label>
          <input matInput formControlName="serialNumber" placeholder="VD: SN123456789">
          <mat-icon matPrefix>qr_code</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Mã tem</mat-label>
          <input matInput formControlName="labelCode" placeholder="VD: TEM-2026-001">
          <mat-icon matPrefix>label</mat-icon>
          <mat-hint>Mã tem dán trên thiết bị</mat-hint>
        </mat-form-field>
      </div>

      <div class="ef-grid ef-grid--1">
        <mat-form-field appearance="outline">
          <mat-label>Mô tả / Cấu hình</mat-label>
          <textarea matInput formControlName="description" rows="3"
            placeholder="VD: CPU i7-13700H, RAM 16GB DDR5, SSD 512GB, Màn 14 inch 2K..."></textarea>
          <mat-icon matPrefix>description</mat-icon>
          <mat-hint>Ghi thông tin cấu hình, đặc điểm thiết bị</mat-hint>
        </mat-form-field>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Loại tài sản *</mat-label>
          <mat-select formControlName="categoryId">
            <mat-option [value]="">-- Chọn loại --</mat-option>
            @for (cat of categories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Tình trạng *</mat-label>
          <mat-select formControlName="assetCondition">
            <mat-option value="NEW">Mới</mat-option>
            <mat-option value="GOOD">Tốt</mat-option>
            <mat-option value="FAIR">Bình thường</mat-option>
            <mat-option value="POOR">Kém</mat-option>
          </mat-select>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>
      </div>
    </section>

    <!-- Section: Ownership (Highlighted) -->
    <section class="ef-section ef-section--highlighted">
      <div class="ef-section-header">
        <div class="ef-section-icon ef-section-icon--orange">
          <mat-icon>business</mat-icon>
        </div>
        <div class="ef-section-title">Loại sở hữu</div>
      </div>

      <div class="ef-grid ef-grid--2" style="margin-bottom:16px;">
        <mat-form-field appearance="outline">
          <mat-label>Loại sở hữu *</mat-label>
          <mat-select formControlName="ownershipType" (selectionChange)="onOwnershipChange()">
            <mat-option value="COMPANY_OWNED">Công ty sở hữu</mat-option>
            <mat-option value="VENDOR_OWNED">Đối tác sở hữu</mat-option>
          </mat-select>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        @if (form.get('ownershipType')?.value === 'VENDOR_OWNED') {
          <mat-form-field appearance="outline">
            <mat-label>Chủ sở hữu (Vendor) *</mat-label>
            <mat-select formControlName="ownerVendorId">
              <mat-option [value]="">-- Chọn vendor --</mat-option>
              @for (v of vendors(); track v.id) {
                <mat-option [value]="v.id">{{ v.name }}</mat-option>
              }
            </mat-select>
            <mat-error>Bắt buộc</mat-error>
          </mat-form-field>
        }
      </div>

      <div class="ef-grid ef-grid--1" style="margin-bottom:12px;">
        <mat-form-field appearance="outline">
          <mat-label>Nhà cung cấp</mat-label>
          <mat-select formControlName="supplierVendorId">
            <mat-option [value]="">-- Chọn nhà cung cấp --</mat-option>
            @for (v of vendors(); track v.id) {
              <mat-option [value]="v.id">{{ v.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Rental Section -->
      <div style="padding:12px 16px; background:#fff9f0; border-radius:10px; border-left:3px solid #f97316;">
        <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:12px;">
          <mat-checkbox formControlName="isRented" (change)="onRentalChange()"></mat-checkbox>
          <span style="font-weight:600; color:#1e293b;">Đây là máy thuê</span>
        </label>

        @if (form.get('isRented')?.value) {
          <mat-form-field appearance="outline" class="ef-full-width">
            <mat-label>Ghi chú thuê</mat-label>
            <textarea matInput formControlName="rentalNotes" rows="2"
              placeholder="Thông tin về thỏa thuận thuê..."></textarea>
          </mat-form-field>
        }
      </div>
    </section>

    <!-- Section: Purchase & Warranty -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>shopping_bag</mat-icon>
        </div>
        <div class="ef-section-title">Thông tin mua hàng & Bảo hành</div>
      </div>

      <div class="ef-grid ef-grid--2" style="margin-bottom:16px;">
        <mat-form-field appearance="outline">
          <mat-label>Giá mua</mat-label>
          <input matInput formControlName="purchasePrice" type="text" appMoney
            placeholder="VD: 15000000">
          <mat-icon matPrefix>attach_money</mat-icon>
          <mat-hint>VNĐ</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Ngày mua</mat-label>
          <input matInput [matDatepicker]="purchasePicker" formControlName="purchaseDate"
            placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="purchasePicker"></mat-datepicker-toggle>
          <mat-datepicker #purchasePicker></mat-datepicker>
        </mat-form-field>
      </div>

      <div class="ef-grid ef-grid--1">
        <mat-form-field appearance="outline">
          <mat-label>Tháng bảo hành</mat-label>
          <input matInput formControlName="warrantyMonths" type="number" placeholder="VD: 12">
          <mat-icon matPrefix>shield</mat-icon>
          <mat-hint>Số tháng từ ngày mua</mat-hint>
        </mat-form-field>
      </div>
    </section>

    <!-- Section: Notes -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>description</mat-icon>
        </div>
        <div class="ef-section-title">Ghi chú</div>
      </div>

      <mat-form-field appearance="outline" class="ef-full-width">
        <mat-label>Ghi chú bổ sung</mat-label>
        <textarea matInput formControlName="notes" rows="3"
          placeholder="Thông tin bổ sung về thiết bị..."></textarea>
      </mat-form-field>
    </section>

    <!-- Actions -->
    <div class="ef-actions">
      <button type="button" class="ef-btn ef-btn--cancel" (click)="goBack()">Hủy</button>
      <button type="submit" class="ef-btn ef-btn--submit" [disabled]="submitting()">
        @if (submitting()) {
          <span class="ef-spinner"></span>
          <span>Đang lưu...</span>
        } @else {
          <mat-icon>{{ isEdit() ? 'save' : 'add' }}</mat-icon>
          <span>{{ isEdit() ? 'Lưu thay đổi' : 'Tạo thiết bị' }}</span>
        }
      </button>
    </div>

  </form>
</div>
  `,
  styles: [`
    /* Container */
    .ef-container {
      max-width: 840px;
      margin: 0 auto;
      padding: 24px 16px 40px;
    }

    /* Header */
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

    /* Sections */
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
    .ef-section--highlighted {
      border-left: 4px solid #f97316;
      background: linear-gradient(135deg, #fffbf0 0%, #fff7f1 100%);
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
    .ef-section-icon--orange {
      background: rgba(249,115,22,0.12);
      mat-icon { color: #f97316; }
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

    /* Grid layout */
    .ef-grid {
      display: grid;
      gap: 16px;
    }
    .ef-grid--1 { grid-template-columns: 1fr; }
    .ef-grid--2 { grid-template-columns: 1fr 1fr; }
    .ef-full-width { width: 100%; }

    /* Readonly fields */
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

    /* Form fields */
    mat-form-field {
      width: 100%;
    }
    ::ng-deep .ef-section .mat-mdc-form-field-subscript-wrapper {
      margin-bottom: 0;
    }

    /* Actions */
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

    /* Spinner */
    .ef-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: ef-spin 0.6s linear infinite;
    }
    @keyframes ef-spin { to { transform: rotate(360deg); } }

    /* Responsive */
    @media (max-width: 640px) {
      .ef-grid--2 { grid-template-columns: 1fr; }
      .ef-header { flex-direction: column; }
      .ef-actions { flex-direction: column; }
      .ef-btn { width: 100%; }
    }
  `]
})
export class AssetFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private assetService = inject(AssetService);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly nextCode = signal<string>('...');
  readonly categories = signal<AssetCategory[]>([]);
  readonly vendors = signal<Vendor[]>([]);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    serialNumber: [''],
    labelCode: [''],
    description: [''],
    categoryId: [null as number | null, Validators.required],
    ownershipType: ['COMPANY_OWNED', Validators.required],
    ownerVendorId: [null as number | null],
    supplierVendorId: [null as number | null],
    isRented: [false],
    rentalNotes: [''],
    purchasePrice: [null as number | null],
    purchaseDate: [null as Date | null],
    warrantyMonths: [null as number | null],
    assetCondition: ['GOOD', Validators.required],
    notes: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'new') {
      this.isEdit.set(true);
      this.loadAsset(+id);
    } else {
      this.assetService.getNextCode().subscribe(code => this.nextCode.set(code));
    }
    this.loadCategories();
    this.loadVendors();
  }

  private loadAsset(id: number) {
    this.assetService.getById(id).subscribe(asset => {
      this.form.patchValue({
        name: asset.name,
        serialNumber: asset.serialNumber || '',
        labelCode: asset.labelCode || '',
        description: asset.description || '',
        categoryId: asset.categoryId,
        ownershipType: asset.ownershipType,
        ownerVendorId: asset.ownerVendorId,
        supplierVendorId: asset.supplierVendorId,
        isRented: asset.isRented,
        rentalNotes: asset.rentalNotes || '',
        purchasePrice: asset.purchasePrice,
        purchaseDate: asset.purchaseDate ? new Date(asset.purchaseDate) : null,
        warrantyMonths: asset.warrantyMonths,
        assetCondition: asset.assetCondition,
        notes: asset.notes || ''
      });
    });
  }

  private loadCategories() {
    this.assetService.listActiveCategories().subscribe(cats => this.categories.set(cats));
  }

  private loadVendors() {
    this.vendorService.list({ size: 100 }).subscribe(p => this.vendors.set(p.content));
  }

  onOwnershipChange() {
    const ownershipType = this.form.get('ownershipType')?.value;
    const ownerVendorField = this.form.get('ownerVendorId');
    if (ownershipType === 'VENDOR_OWNED') {
      ownerVendorField?.setValidators([Validators.required]);
    } else {
      ownerVendorField?.setValidators([]);
      ownerVendorField?.setValue(null);
    }
    ownerVendorField?.updateValueAndValidity();
  }

  onRentalChange() {
    const isRented = this.form.get('isRented')?.value;
    const rentalNotesField = this.form.get('rentalNotes');
    if (isRented) {
      rentalNotesField?.setValidators([Validators.required]);
    } else {
      rentalNotesField?.setValidators([]);
      rentalNotesField?.setValue('');
    }
    rentalNotesField?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const payload: any = {
      name: raw.name,
      serialNumber: raw.serialNumber || undefined,
      labelCode: raw.labelCode || undefined,
      description: raw.description || undefined,
      categoryId: raw.categoryId,
      ownershipType: raw.ownershipType,
      ownerVendorId: raw.ownerVendorId || undefined,
      supplierVendorId: raw.supplierVendorId || undefined,
      isRented: raw.isRented,
      rentalNotes: raw.rentalNotes || undefined,
      purchasePrice: raw.purchasePrice || undefined,
      purchaseDate: raw.purchaseDate
        ? this.formatDate(raw.purchaseDate as Date)
        : undefined,
      warrantyMonths: raw.warrantyMonths || undefined,
      assetCondition: raw.assetCondition,
      notes: raw.notes || undefined
    };

    const id = this.route.snapshot.paramMap.get('id');
    const obs = id ? this.assetService.update(+id, payload) : this.assetService.create(payload);

    obs.subscribe({
      next: () => {
        this.snackBar.open(id ? 'Thiết bị được cập nhật' : 'Thiết bị được tạo', 'OK', { duration: 3000 });
        this.router.navigate(['/assets']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 4000, panelClass: 'error-snack' });
      }
    });
  }

  private formatDate(date: Date | null): string | undefined {
    if (!date) return undefined;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goBack() {
    this.router.navigate(['/assets']);
  }
}
