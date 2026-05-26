import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContractService } from '../../../core/services/contract.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { EmployeeContract, EmployeeContractRequest, ContractType } from '../../../core/models/contract.models';
import { Employee } from '../../../core/models/employee.models';
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-contract-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatAutocompleteModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatProgressBarModule
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
      <div class="ef-title">{{ isEdit() ? 'Chỉnh sửa hợp đồng' : 'Thêm hợp đồng mới' }}</div>
      <div class="ef-subtitle">{{ isEdit() ? 'Cập nhật thông tin hợp đồng' : 'Tạo bản ghi hợp đồng mới' }}</div>
    </div>
    <button class="ef-back-btn" (click)="goBack()">
      <mat-icon>arrow_back</mat-icon>
      <span>Quay lại</span>
    </button>
  </div>

  <form [formGroup]="form" (ngSubmit)="onSubmit()">

    <!-- Section: Employee -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>badge</mat-icon>
        </div>
        <div>
          <div class="ef-section-title">Nhân viên</div>
          <div class="ef-section-desc">{{ isEdit() ? 'Thông tin nhân viên (chỉ xem)' : 'Chọn nhân viên ký hợp đồng' }}</div>
        </div>
      </div>

      @if (!isEdit()) {
        <div class="ef-grid ef-grid--1">
          <mat-form-field appearance="outline">
            <mat-label>Nhân viên *</mat-label>
            <input matInput [formControl]="employeeSearchCtrl" placeholder="Tìm tên hoặc mã nhân viên..."
              [matAutocomplete]="autoEmployee">
            <mat-icon matPrefix>person_search</mat-icon>
            <mat-autocomplete #autoEmployee="matAutocomplete"
              [displayWith]="displayEmployee"
              (optionSelected)="onEmployeeSelected($event)">
              @for (emp of filteredEmployees(); track emp.id) {
                <mat-option [value]="emp">
                  <span style="font-weight:500;">{{ emp.fullName }}</span>
                  <span style="color:#888;margin-left:8px;font-size:12px;">{{ emp.employeeCode }}</span>
                </mat-option>
              }
            </mat-autocomplete>
            @if (form.get('employeeId')?.hasError('required') && form.get('employeeId')?.touched) {
              <mat-error>Bắt buộc chọn nhân viên</mat-error>
            }
          </mat-form-field>
        </div>
      } @else {
        <div class="ef-readonly-field">
          <span class="ef-readonly-label">Nhân viên</span>
          <div class="ef-readonly-value">
            <mat-icon class="ef-readonly-icon">person</mat-icon>
            <span>{{ currentContract()?.employeeName }} ({{ currentContract()?.employeeCode }})</span>
          </div>
        </div>
      }
    </section>

    <!-- Section: Contract Type -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>description</mat-icon>
        </div>
        <div class="ef-section-title">Loại hợp đồng</div>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Loại hợp đồng *</mat-label>
          <mat-select formControlName="contractTypeId" (selectionChange)="onContractTypeChange()">
            <mat-option [value]="">-- Chọn loại --</mat-option>
            @for (type of contractTypes(); track type.id) {
              <mat-option [value]="type.id">{{ type.name }}</mat-option>
            }
          </mat-select>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Số hợp đồng</mat-label>
          <input matInput formControlName="contractNumber" placeholder="VD: HĐ-2026-001">
          <mat-icon matPrefix>confirmation_number</mat-icon>
        </mat-form-field>
      </div>

      @if (selectedContractType()) {
        <div class="contract-type-hint" [ngClass]="selectedContractType()?.category === 'CONTRACT' ? 'hint-contract' : 'hint-commitment'">
          <div class="hint-label">
            {{ selectedContractType()?.category === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản cam kết' }}
          </div>
          <div class="hint-details">
            @if (selectedContractType()?.hasExpiry) {
              <span>Có hạn • {{ selectedContractType()?.defaultDurationMonths ?? '—' }} tháng</span>
            } @else {
              <span>Vô hạn</span>
            }
            @if (selectedContractType()?.description) {
              <div style="margin-top:6px; font-size:12px; color:#64748b;">{{ selectedContractType()?.description }}</div>
            }
          </div>
        </div>
      }
    </section>

    <!-- Section: Dates -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>calendar_today</mat-icon>
        </div>
        <div class="ef-section-title">Thời hạn hợp đồng</div>
      </div>

      <div class="ef-grid ef-grid--2">
        <mat-form-field appearance="outline">
          <mat-label>Ngày ký</mat-label>
          <input matInput [matDatepicker]="signedPicker" formControlName="signedDate" placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="signedPicker"></mat-datepicker-toggle>
          <mat-datepicker #signedPicker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Hiệu lực từ ngày *</mat-label>
          <input matInput [matDatepicker]="effectiveFromPicker" formControlName="effectiveFrom" placeholder="DD/MM/YYYY"
            (dateChange)="onEffectiveFromChange()">
          <mat-datepicker-toggle matSuffix [for]="effectiveFromPicker"></mat-datepicker-toggle>
          <mat-datepicker #effectiveFromPicker></mat-datepicker>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>
      </div>

      @if (selectedContractType()?.hasExpiry) {
        <div class="ef-grid ef-grid--2">
          <mat-form-field appearance="outline">
            <mat-label>Thời hạn (tháng) *</mat-label>
            <input matInput formControlName="durationMonths" type="number" placeholder="VD: 12"
              (change)="onDurationChange()">
            <mat-icon matPrefix>schedule</mat-icon>
            <mat-error>Bắt buộc</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Hết hạn ngày (tự động)</mat-label>
            <input matInput [matDatepicker]="effectiveToPicker" formControlName="effectiveTo" placeholder="DD/MM/YYYY"
              readonly>
            <mat-datepicker-toggle matSuffix [for]="effectiveToPicker"></mat-datepicker-toggle>
            <mat-datepicker #effectiveToPicker></mat-datepicker>
          </mat-form-field>
        </div>
      }
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
          placeholder="Thông tin bổ sung về hợp đồng..."></textarea>
      </mat-form-field>
    </section>

    <!-- Section: Upload bản scan -->
    <section class="ef-section">
      <div class="ef-section-header">
        <div class="ef-section-icon">
          <mat-icon>upload_file</mat-icon>
        </div>
        <div>
          <div class="ef-section-title">Bản scan hợp đồng</div>
          <div class="ef-section-desc">Tải lên file scan hợp đồng (PDF, JPG, PNG — tối đa 50MB)</div>
        </div>
      </div>

      @if (uploadedFile() || existingDocumentId()) {
        <!-- File đã chọn / đã có -->
        <div class="upload-file-card">
          <div class="upload-file-info">
            <mat-icon class="upload-file-type-icon">
              {{ uploadedFile()?.type === 'application/pdf' ? 'picture_as_pdf' : 'image' }}
            </mat-icon>
            <div class="upload-file-details">
              <div class="upload-file-name">{{ uploadedFile()?.name || existingFileName() }}</div>
              <div class="upload-file-size">{{ uploadedFile() ? formatFileSize(uploadedFile()!.size) : 'Đã tải lên trước đó' }}</div>
            </div>
          </div>
          <button type="button" class="upload-file-remove" (click)="removeFile()" title="Xóa file">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        @if (uploading()) {
          <mat-progress-bar mode="indeterminate" class="upload-progress"></mat-progress-bar>
          <div class="upload-progress-text">Đang tải lên...</div>
        }
      } @else {
        <!-- Drop zone -->
        <div class="upload-dropzone"
          [class.upload-dropzone--drag]="isDragging()"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="fileInput.click()">
          <input #fileInput type="file" accept=".pdf,.jpg,.jpeg,.png" (change)="onFileSelected($event)" hidden>
          <mat-icon class="upload-dropzone-icon">cloud_upload</mat-icon>
          <div class="upload-dropzone-text">
            Kéo thả file vào đây hoặc <span class="upload-dropzone-link">chọn file</span>
          </div>
          <div class="upload-dropzone-hint">PDF, JPG, PNG — tối đa 50MB</div>
        </div>
      }

      @if (uploadError()) {
        <div class="upload-error">
          <mat-icon>error_outline</mat-icon>
          <span>{{ uploadError() }}</span>
        </div>
      }
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
          <span>{{ isEdit() ? 'Lưu thay đổi' : 'Tạo hợp đồng' }}</span>
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

    /* Contract Type Hint */
    .contract-type-hint {
      padding: 12px 16px;
      border-radius: 10px;
      margin-top: 12px;
      border-left: 3px solid;
    }
    .hint-contract {
      background: #dbeafe;
      border-left-color: #1e40af;
    }
    .hint-commitment {
      background: #fbdfe8;
      border-left-color: #be185d;
    }
    .hint-label {
      font-size: 12px;
      font-weight: 700;
      color: inherit;
    }
    .hint-details {
      font-size: 13px;
      color: inherit;
      margin-top: 4px;
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

    /* Upload dropzone */
    .upload-dropzone {
      border: 2px dashed #cbd5e1;
      border-radius: 12px;
      padding: 32px 24px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #fafbfc;
      &:hover { border-color: #6366f1; background: #f5f3ff; }
    }
    .upload-dropzone--drag {
      border-color: #6366f1;
      background: #eef2ff;
      box-shadow: 0 0 0 3px rgba(99,102,241,0.1);
    }
    .upload-dropzone-icon {
      font-size: 40px; width: 40px; height: 40px;
      color: #94a3b8;
      margin-bottom: 8px;
      .upload-dropzone:hover & { color: #6366f1; }
      .upload-dropzone--drag & { color: #6366f1; }
    }
    .upload-dropzone-text {
      font-size: 14px; color: #64748b; font-weight: 500;
    }
    .upload-dropzone-link {
      color: #6366f1; font-weight: 600; text-decoration: underline;
      cursor: pointer;
    }
    .upload-dropzone-hint {
      font-size: 12px; color: #94a3b8; margin-top: 6px;
    }

    /* File card */
    .upload-file-card {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px;
      background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px;
    }
    .upload-file-info {
      display: flex; align-items: center; gap: 12px; min-width: 0;
    }
    .upload-file-type-icon {
      font-size: 28px; width: 28px; height: 28px; color: #16a34a; flex-shrink: 0;
    }
    .upload-file-details { min-width: 0; }
    .upload-file-name {
      font-size: 14px; font-weight: 600; color: #15803d;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 400px;
    }
    .upload-file-size {
      font-size: 12px; color: #4ade80; margin-top: 2px;
    }
    .upload-file-remove {
      width: 32px; height: 32px; border-radius: 8px; border: none;
      background: transparent; cursor: pointer; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #94a3b8; }
      &:hover { background: #fee2e2; mat-icon { color: #dc2626; } }
    }

    /* Upload progress */
    .upload-progress { margin-top: 10px; border-radius: 4px; }
    .upload-progress-text {
      font-size: 12px; color: #6366f1; margin-top: 6px; text-align: center; font-weight: 500;
    }

    /* Upload error */
    .upload-error {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; padding: 8px 12px;
      background: #fef2f2; border-radius: 8px; border: 1px solid #fecaca;
      font-size: 13px; color: #dc2626;
      mat-icon { font-size: 16px; width: 16px; height: 16px; flex-shrink: 0; }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .ef-grid--2 { grid-template-columns: 1fr; }
      .ef-header { flex-direction: column; }
      .ef-actions { flex-direction: column; }
      .ef-btn { width: 100%; }
    }
  `]
})
export class ContractFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  private employeeService = inject(EmployeeService);
  private documentService = inject(DocumentService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);
  readonly currentContract = signal<EmployeeContract | null>(null);
  readonly contractTypes = signal<ContractType[]>([]);
  readonly selectedContractType = signal<ContractType | null>(null);
  readonly filteredEmployees = signal<Employee[]>([]);

  // Upload state
  readonly uploadedFile = signal<File | null>(null);
  readonly uploading = signal(false);
  readonly uploadError = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly existingDocumentId = signal<number | null>(null);
  readonly existingFileName = signal<string>('');
  readonly employeePublicId = signal<string | null>(null);

  employeeSearchCtrl = this.fb.control('');

  readonly form = this.fb.group({
    employeeId: [null as number | null, Validators.required],
    contractTypeId: [null as number | null, Validators.required],
    contractNumber: [''],
    signedDate: [null as Date | null],
    effectiveFrom: [null as Date | null, Validators.required],
    durationMonths: [null as number | null],
    effectiveTo: [{ value: null as Date | null, disabled: true }],
    notes: ['']
  });

  ngOnInit() {
    const publicId = this.route.snapshot.paramMap.get('id');
    if (publicId && publicId !== 'new') {
      this.isEdit.set(true);
      this.loadContract(publicId);
    }
    this.loadContractTypes();
    this.setupEmployeeSearch();
  }

  private setupEmployeeSearch() {
    this.employeeSearchCtrl.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (!term || typeof term !== 'string' || term.length < 1) return of([]);
        return this.employeeService.search(term);
      })
    ).subscribe(employees => this.filteredEmployees.set(employees));
  }

  displayEmployee(emp: Employee): string {
    return emp ? `${emp.fullName} (${emp.employeeCode})` : '';
  }

  onEmployeeSelected(event: any) {
    const emp: Employee = event.option.value;
    this.form.get('employeeId')?.setValue(emp.id);
    this.employeePublicId.set(emp.publicId);
  }

  private loadContract(publicId: string) {
    this.contractService.getByPublicId(publicId).subscribe(contract => {
      this.currentContract.set(contract);
      this.form.patchValue({
        employeeId: contract.employeeId,
        contractTypeId: contract.contractTypeId,
        contractNumber: contract.contractNumber || '',
        signedDate: contract.signedDate ? new Date(contract.signedDate) : null,
        effectiveFrom: new Date(contract.effectiveFrom),
        durationMonths: contract.durationMonths,
        effectiveTo: contract.effectiveTo ? new Date(contract.effectiveTo) : null,
        notes: contract.notes || ''
      });
      this.form.get('employeeId')?.disable();
      this.onContractTypeChange();

      // Store employee publicId for document upload
      if (contract.employeePublicId) {
        this.employeePublicId.set(contract.employeePublicId);
      }

      // Load existing document info
      if (contract.documentId) {
        this.existingDocumentId.set(contract.documentId);
        this.existingFileName.set(`HĐ_scan_${contract.contractNumber || contract.id}.pdf`);
      }
    });
  }

  private loadContractTypes() {
    this.contractService.listActiveTypes().subscribe(types => {
      this.contractTypes.set(types);
    });
  }

  onContractTypeChange() {
    const typeId = this.form.get('contractTypeId')?.value;
    if (typeId) {
      const selected = this.contractTypes().find(t => t.id === typeId) || null;
      this.selectedContractType.set(selected);

      const durationField = this.form.get('durationMonths');
      if (selected?.hasExpiry) {
        durationField?.setValidators([Validators.required]);
      } else {
        durationField?.setValidators([]);
        durationField?.setValue(null);
      }
      durationField?.updateValueAndValidity();
    }
  }

  onEffectiveFromChange() {
    this.calculateEffectiveTo();
  }

  onDurationChange() {
    this.calculateEffectiveTo();
  }

  private calculateEffectiveTo() {
    const effectiveFrom = this.form.get('effectiveFrom')?.value;
    const duration = this.form.get('durationMonths')?.value;

    if (effectiveFrom && duration && this.selectedContractType()?.hasExpiry) {
      const fromDate = new Date(effectiveFrom);
      const toDate = new Date(fromDate);
      toDate.setMonth(toDate.getMonth() + duration);
      this.form.get('effectiveTo')?.setValue(toDate);
    }
  }

  // ── Upload methods ──

  private readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.selectFile(file);
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) this.selectFile(file);
    input.value = ''; // reset to allow re-selecting same file
  }

  private selectFile(file: File) {
    this.uploadError.set(null);

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      this.uploadError.set('Chỉ hỗ trợ file PDF, JPG hoặc PNG');
      return;
    }
    if (file.size > this.MAX_FILE_SIZE) {
      this.uploadError.set('File vượt quá 50MB cho phép');
      return;
    }

    this.uploadedFile.set(file);
    this.existingDocumentId.set(null);
    this.existingFileName.set('');
  }

  removeFile() {
    this.uploadedFile.set(null);
    this.existingDocumentId.set(null);
    this.existingFileName.set('');
    this.uploadError.set(null);
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Submit ──

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.form.getRawValue();
    const empPublicId = this.employeePublicId();

    // If there's a new file, upload first then save contract
    if (this.uploadedFile() && empPublicId) {
      this.uploading.set(true);
      this.documentService.upload(empPublicId, this.uploadedFile()!, 'CONTRACT').subscribe({
        next: (doc) => {
          this.uploading.set(false);
          this.saveContract(doc.id);
        },
        error: (err) => {
          this.uploading.set(false);
          this.submitting.set(false);
          this.uploadError.set(err?.error?.message ?? 'Lỗi tải file lên');
        }
      });
    } else {
      // Keep existing documentId or null
      this.saveContract(this.existingDocumentId() || undefined);
    }
  }

  private saveContract(documentId?: number) {
    const raw = this.form.getRawValue();
    const payload: EmployeeContractRequest = {
      employeeId: raw.employeeId!,
      contractTypeId: raw.contractTypeId!,
      contractNumber: raw.contractNumber || undefined,
      signedDate: raw.signedDate ? this.formatDate(raw.signedDate as Date) : undefined,
      effectiveFrom: this.formatDate(raw.effectiveFrom as Date),
      effectiveTo: raw.effectiveTo ? this.formatDate(raw.effectiveTo as Date) : undefined,
      durationMonths: raw.durationMonths || undefined,
      documentId: documentId,
      notes: raw.notes || undefined
    };

    const publicId = this.route.snapshot.paramMap.get('id');
    const obs = publicId && publicId !== 'new'
      ? this.contractService.update(publicId, payload)
      : this.contractService.create(payload);

    obs.subscribe({
      next: () => {
        this.snackBar.open(publicId ? 'Hợp đồng được cập nhật' : 'Hợp đồng được tạo', 'OK', { duration: 3000 });
        this.router.navigate(['/contracts']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 4000, panelClass: 'error-snack' });
      }
    });
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  goBack() {
    this.router.navigate(['/contracts']);
  }
}
