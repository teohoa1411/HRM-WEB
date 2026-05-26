import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContractService } from '../../../core/services/contract.service';
import { EmployeeContract, ContractType, ExtendContractRequest, RenewContractRequest } from '../../../core/models/contract.models';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';

type ActionType = 'extend' | 'renew' | 'terminate';

@Component({
  selector: 'app-contract-extend-dialog',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatRadioModule, MatButtonModule, MatIconModule, MatDatepickerModule
  ],
  providers: [
    { provide: DateAdapter, useClass: ViDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VI_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
    @if (contract) {
      <div class="dialog-container">
        <h2 mat-dialog-title>Quản lý hợp đồng</h2>

        <!-- Contract Info -->
        <div class="contract-info">
          <div class="info-item">
            <span class="info-label">Nhân viên:</span>
            <span class="info-value">{{ contract.employeeName }} ({{ contract.employeeCode }})</span>
          </div>
          <div class="info-item">
            <span class="info-label">Số hợp đồng:</span>
            <span class="info-value">{{ contract.contractNumber || '—' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Hiệu lực:</span>
            <span class="info-value">{{ formatDate(contract.effectiveFrom) }} → {{ contract.effectiveTo ? formatDate(contract.effectiveTo) : '—' }}</span>
          </div>
        </div>

        <!-- Action Selection -->
        <mat-radio-group [(ngModel)]="selectedAction" class="action-radio-group">
          <!-- Option 1: Extend -->
          <div class="radio-option">
            <mat-radio-button value="extend"></mat-radio-button>
            <div class="radio-label">
              <div class="radio-title">Gia hạn hợp đồng hiện tại</div>
              <div class="radio-desc">Kéo dài thêm thời hạn cho hợp đồng đang có</div>
            </div>
          </div>

          @if (selectedAction === 'extend') {
            <form [formGroup]="extendForm" class="form-section">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Thêm (tháng) *</mat-label>
                  <input matInput formControlName="additionalMonths" type="number" placeholder="VD: 12">
                  <mat-icon matPrefix>schedule</mat-icon>
                  <mat-error>Bắt buộc</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Ghi chú</mat-label>
                  <textarea matInput formControlName="notes" rows="2" placeholder="Lý do gia hạn..."></textarea>
                </mat-form-field>
              </div>
            </form>
          }

          <!-- Option 2: Renew -->
          <div class="radio-option">
            <mat-radio-button value="renew"></mat-radio-button>
            <div class="radio-label">
              <div class="radio-title">Ký hợp đồng mới (tái ký)</div>
              <div class="radio-desc">Chấm dứt hợp đồng cũ và ký hợp đồng mới</div>
            </div>
          </div>

          @if (selectedAction === 'renew') {
            <form [formGroup]="renewForm" class="form-section">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Loại hợp đồng *</mat-label>
                  <mat-select formControlName="contractTypeId">
                    <mat-option [value]="">-- Chọn loại --</mat-option>
                    @for (type of contractTypes(); track type.id) {
                      <mat-option [value]="type.id">{{ type.name }}</mat-option>
                    }
                  </mat-select>
                  <mat-error>Bắt buộc</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Số hợp đồng mới</mat-label>
                  <input matInput formControlName="contractNumber" placeholder="VD: HĐ-2026-002">
                  <mat-icon matPrefix>confirmation_number</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Ngày ký *</mat-label>
                  <input matInput [matDatepicker]="signedPicker" formControlName="signedDate" placeholder="DD/MM/YYYY">
                  <mat-datepicker-toggle matSuffix [for]="signedPicker"></mat-datepicker-toggle>
                  <mat-datepicker #signedPicker></mat-datepicker>
                  <mat-error>Bắt buộc</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Hiệu lực từ *</mat-label>
                  <input matInput [matDatepicker]="effectiveFromPicker" formControlName="effectiveFrom" placeholder="DD/MM/YYYY">
                  <mat-datepicker-toggle matSuffix [for]="effectiveFromPicker"></mat-datepicker-toggle>
                  <mat-datepicker #effectiveFromPicker></mat-datepicker>
                  <mat-error>Bắt buộc</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Thời hạn (tháng)</mat-label>
                  <input matInput formControlName="durationMonths" type="number" placeholder="VD: 36">
                  <mat-icon matPrefix>schedule</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Ghi chú</mat-label>
                  <textarea matInput formControlName="notes" rows="2" placeholder="Thông tin tái ký..."></textarea>
                </mat-form-field>
              </div>
            </form>
          }

          <!-- Option 3: Terminate -->
          <div class="radio-option">
            <mat-radio-button value="terminate"></mat-radio-button>
            <div class="radio-label">
              <div class="radio-title">Chấm dứt hợp đồng</div>
              <div class="radio-desc">Kết thúc hợp đồng (không tái ký)</div>
            </div>
          </div>

          @if (selectedAction === 'terminate') {
            <form [formGroup]="terminateForm" class="form-section">
              <div class="form-grid">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Lý do chấm dứt *</mat-label>
                  <textarea matInput formControlName="reason" rows="3" placeholder="Nhập lý do chấm dứt hợp đồng..."></textarea>
                  <mat-error>Bắt buộc</mat-error>
                </mat-form-field>
              </div>
            </form>
          }
        </mat-radio-group>
      </div>
    }

    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Hủy</button>
      <button mat-raised-button color="primary" (click)="onConfirm()" [disabled]="!canSubmit()">
        @if (submitting()) {
          <span class="spinner"></span> Đang xử lý...
        } @else {
          Xác nhận
        }
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-container {
      width: 100%;
      min-width: 400px;
    }

    /* Contract Info */
    .contract-info {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 16px;
      margin: 20px 0;
    }

    .info-item {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      color: #1e293b;
      margin-bottom: 8px;
      &:last-child { margin-bottom: 0; }
    }

    .info-label {
      font-weight: 600;
      color: #64748b;
    }

    .info-value {
      font-weight: 500;
    }

    /* Radio Group */
    .action-radio-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 20px 0;
    }

    .radio-option {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.15s;
      &:hover { background: #f8fafc; border-color: #6366f1; }
    }

    .radio-label {
      flex: 1;
    }

    .radio-title {
      font-weight: 600;
      color: #1e293b;
      font-size: 14px;
    }

    .radio-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Form Section */
    .form-section {
      padding: 12px 16px 0 40px;
      margin-top: -4px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 12px;
    }

    mat-form-field {
      width: 100%;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    /* Actions */
    mat-dialog-actions {
      padding: 16px 0 0;
      margin-top: 24px;
    }

    /* Spinner */
    .spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      display: inline-block;
      margin-right: 6px;
      animation: spin 0.6s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Responsive */
    @media (max-width: 640px) {
      .dialog-container {
        min-width: 100%;
      }
      mat-dialog-actions {
        flex-direction: column;
        gap: 8px;
      }
      button {
        width: 100%;
      }
    }
  `]
})
export class ContractExtendDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  dialogRef = inject(MatDialogRef<ContractExtendDialogComponent>);
  private data = inject(MAT_DIALOG_DATA);
  private snackBar = inject(MatSnackBar);

  readonly contract: EmployeeContract = this.data?.contract;
  selectedAction: ActionType = 'extend';
  readonly contractTypes = signal<ContractType[]>([]);
  readonly submitting = signal(false);

  readonly extendForm = this.fb.group({
    additionalMonths: [12, Validators.required],
    notes: ['']
  });

  readonly renewForm = this.fb.group({
    contractTypeId: [null as number | null, Validators.required],
    contractNumber: [''],
    signedDate: [null as Date | null, Validators.required],
    effectiveFrom: [null as Date | null, Validators.required],
    durationMonths: [null as number | null],
    notes: ['']
  });

  readonly terminateForm = this.fb.group({
    reason: ['', Validators.required]
  });

  ngOnInit() {
    this.loadContractTypes();
    this.initializeDefaultValues();
  }

  private loadContractTypes() {
    this.contractService.listActiveTypes().subscribe(types => {
      this.contractTypes.set(types);
    });
  }

  private initializeDefaultValues() {
    const today = new Date();
    this.renewForm.patchValue({
      effectiveFrom: today,
      signedDate: today
    });
  }

  canSubmit(): boolean {
    const action = this.selectedAction;
    if (action === 'extend') return this.extendForm.valid && !this.submitting();
    if (action === 'renew') return this.renewForm.valid && !this.submitting();
    if (action === 'terminate') return this.terminateForm.valid && !this.submitting();
    return false;
  }

  onConfirm() {
    const action = this.selectedAction;
    if (!this.contract) return;

    if (action === 'extend') {
      this.performExtend();
    } else if (action === 'renew') {
      this.performRenew();
    } else if (action === 'terminate') {
      this.performTerminate();
    }
  }

  private performExtend() {
    if (this.extendForm.invalid) return;
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.extendForm.getRawValue();
    const payload: ExtendContractRequest = {
      additionalMonths: raw.additionalMonths!,
      notes: raw.notes || undefined
    };

    this.contractService.extend(this.contract.publicId, payload).subscribe({
      next: () => {
        this.snackBar.open('Hợp đồng được gia hạn', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' });
      }
    });
  }

  private performRenew() {
    if (this.renewForm.invalid) return;
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.renewForm.getRawValue();
    const payload: RenewContractRequest = {
      contractTypeId: raw.contractTypeId!,
      contractNumber: raw.contractNumber || undefined,
      signedDate: raw.signedDate ? this.toDateStr(raw.signedDate as Date) : undefined,
      effectiveFrom: this.toDateStr(raw.effectiveFrom as Date),
      effectiveTo: undefined,
      durationMonths: raw.durationMonths || undefined,
      notes: raw.notes || undefined
    };

    this.contractService.renew(this.contract.publicId, payload).subscribe({
      next: () => {
        this.snackBar.open('Hợp đồng được tái ký', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' });
      }
    });
  }

  private performTerminate() {
    if (this.terminateForm.invalid) return;
    if (this.submitting()) return;
    this.submitting.set(true);

    const raw = this.terminateForm.getRawValue();
    this.contractService.terminate(this.contract.publicId, raw.reason!).subscribe({
      next: () => {
        this.snackBar.open('Hợp đồng được chấm dứt', 'OK', { duration: 2000 });
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' });
      }
    });
  }

  private toDateStr(date: Date | null): string {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }
}
