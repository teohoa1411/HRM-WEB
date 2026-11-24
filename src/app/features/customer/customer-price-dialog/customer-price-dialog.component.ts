import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CustomerService } from '../../../core/services/customer.service';
import { JobRoleService } from '../../../core/services/job-role.service';
import { Customer, CustomerPrice } from '../../../core/models/customer.models';
import { JobRole } from '../../../core/models/job-role.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-customer-price-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule, MatRippleModule, MatTooltipModule, MoneyDirective],
  template: `
    <div class="cp-shell">

      <!-- HEADER -->
      <div class="cp-header">
        <div class="cp-header-left">
          <div class="cp-icon"><mat-icon>sell</mat-icon></div>
          <div>
            <div class="cp-title">Cấu hình giá bán</div>
            <div class="cp-sub">
              <mat-icon class="cp-sub-icon">business</mat-icon>
              {{ data.customer.name }}
            </div>
          </div>
        </div>
        <button class="cp-close" mat-dialog-close matRipple>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- BODY -->
      <div class="cp-body">

        <!-- LEFT: Form -->
        <div class="cp-form-col">
          <div class="col-title">
            <mat-icon>add_circle_outline</mat-icon>
            Thêm / cập nhật giá
          </div>

          <form [formGroup]="priceForm" (ngSubmit)="addPrice()" class="cp-form">

            <!-- Job Role -->
            <div class="ff">
              <label class="fl">Job Role <span class="req">*</span></label>
              <select class="fi" formControlName="jobRoleId"
                [class.fi-error]="priceForm.get('jobRoleId')?.invalid && priceForm.get('jobRoleId')?.touched">
                <option [ngValue]="null" disabled>-- Chọn Job Role --</option>
                @for (jr of jobRoles(); track jr.id) {
                  <option [ngValue]="jr.id">{{ jr.name }}</option>
                }
              </select>
              @if (priceForm.get('jobRoleId')?.invalid && priceForm.get('jobRoleId')?.touched) {
                <div class="field-err">Vui lòng chọn Job Role</div>
              }
            </div>

            <!-- Đơn giá -->
            <div class="ff">
              <label class="fl">Đơn giá (VNĐ) <span class="req">*</span></label>
              <input class="fi" formControlName="price" type="text" inputmode="numeric" appMoney
                placeholder="VD: 30,000,000"
                [class.fi-error]="priceForm.get('price')?.invalid && priceForm.get('price')?.touched">
              @if (priceForm.get('price')?.invalid && priceForm.get('price')?.touched) {
                <div class="field-err">Vui lòng nhập đơn giá hợp lệ</div>
              }
            </div>

            <!-- Đơn vị + Ngày áp dụng -->
            <div class="ff-row">
              <div class="ff">
                <label class="fl">Đơn vị tính <span class="req">*</span></label>
                <select class="fi" formControlName="priceUnit">
                  <option value="HOURLY">Giờ (HOURLY)</option>
                  <option value="DAILY">Ngày (DAILY)</option>
                  <option value="MONTHLY">Tháng (MONTHLY)</option>
                </select>
              </div>
              <div class="ff">
                <label class="fl">Ngày áp dụng <span class="req">*</span></label>
                <input class="fi" type="date" formControlName="effectiveFrom"
                  [class.fi-error]="priceForm.get('effectiveFrom')?.invalid && priceForm.get('effectiveFrom')?.touched">
                @if (priceForm.get('effectiveFrom')?.invalid && priceForm.get('effectiveFrom')?.touched) {
                  <div class="field-err">Bắt buộc nhập ngày</div>
                }
              </div>
            </div>

            <!-- Ghi chú -->
            <div class="ff">
              <label class="fl">Ghi chú <span class="opt">(lý do thay đổi)</span></label>
              <textarea class="fi fi-textarea" formControlName="notes"
                placeholder="VD: Tăng giá theo hợp đồng mới Q3/2025..." rows="2"></textarea>
            </div>

            <!-- Submit -->
            <button type="submit" class="btn-save" matRipple
              [disabled]="priceForm.invalid || saving()">
              @if (saving()) {
                <mat-icon class="spin">autorenew</mat-icon> Đang lưu...
              } @else {
                <mat-icon>save</mat-icon> Lưu giá
              }
            </button>

          </form>
        </div>

        <!-- RIGHT: History -->
        <div class="cp-history-col">
          <div class="col-title">
            <mat-icon>history</mat-icon>
            Lịch sử giá
            @if (prices().length > 0) {
              <span class="history-count">{{ prices().length }}</span>
            }
          </div>

          @if (prices().length === 0) {
            <div class="history-empty">
              <div class="history-empty-icon"><mat-icon>price_change</mat-icon></div>
              <div class="history-empty-title">Chưa có giá nào</div>
              <div class="history-empty-sub">Thêm cấu hình giá đầu tiên ở bên trái</div>
            </div>
          } @else {
            <div class="price-list">
              @for (p of prices(); track p.id) {
                <div class="price-card" [class.pc-active]="!p.effectiveTo">
                  <div class="pc-top">
                    <div class="pc-role-wrap">
                      <div class="pc-dot" [class.dot-active]="!p.effectiveTo"></div>
                      <span class="pc-role">{{ p.jobRoleName }}</span>
                    </div>
                    @if (!p.effectiveTo) {
                      <span class="pc-badge-active">
                        <span class="badge-dot"></span>Hiện tại
                      </span>
                    }
                  </div>

                  <div class="pc-price-row">
                    <span class="pc-amount">{{ p.price | number:'1.0-0' }}</span>
                    <span class="pc-currency">{{ p.currency }}</span>
                    <span class="pc-unit"
                      [class.unit-hourly]="p.priceUnit === 'HOURLY'"
                      [class.unit-daily]="p.priceUnit === 'DAILY'">
                      /{{ p.priceUnit === 'HOURLY' ? 'giờ' : p.priceUnit === 'DAILY' ? 'ngày' : 'tháng' }}
                    </span>
                  </div>

                  <div class="pc-dates">
                    <mat-icon>calendar_today</mat-icon>
                    <span>{{ formatDate(p.effectiveFrom) }}</span>
                    <span class="pc-arrow">→</span>
                    @if (p.effectiveTo) {
                      <span>{{ formatDate(p.effectiveTo) }}</span>
                    } @else {
                      <span class="pc-current">Hiện tại</span>
                    }
                  </div>

                  @if (p.notes) {
                    <div class="pc-notes">
                      <mat-icon>notes</mat-icon>
                      <span>{{ p.notes }}</span>
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

      </div><!-- /cp-body -->

      <!-- FOOTER -->
      <div class="cp-footer">
        <span class="cp-footer-info">
          <mat-icon>info_outline</mat-icon>
          {{ prices().length }} bản ghi giá · {{ activeCount() }} đang áp dụng
        </span>
        <button class="btn-close" mat-dialog-close matRipple>Đóng</button>
      </div>

    </div>
  `,
  styles: [`
    /* ══ SHELL ══════════════════════════════════════════════ */
    .cp-shell {
      display: flex; flex-direction: column;
      width: 100%; max-height: 90vh;
      background: #fff; border-radius: 16px;
      overflow: hidden;
      font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif;
    }

    /* ══ HEADER ════════════════════════════════════════════ */
    .cp-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 18px;
      background: linear-gradient(135deg, #1565C0 0%, #7C3AED 100%);
      flex-shrink: 0;
    }
    .cp-header-left { display: flex; align-items: center; gap: 14px; }
    .cp-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(255,255,255,0.2); backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    }
    .cp-title { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.3; }
    .cp-sub {
      display: flex; align-items: center; gap: 4px;
      font-size: 12.5px; color: rgba(255,255,255,0.85); margin-top: 2px;
    }
    .cp-sub-icon { font-size: 13px; width: 13px; height: 13px; }
    .cp-close {
      width: 34px; height: 34px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.15); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff; transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.25); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ══ BODY ══════════════════════════════════════════════ */
    .cp-body {
      display: flex; flex: 1;
      overflow: hidden; min-height: 0;
    }

    .col-title {
      display: flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: #6B7280; margin-bottom: 18px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9CA3AF; }
    }
    .history-count {
      background: #1565C0; color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 1px 6px; border-radius: 10px;
      text-transform: none; letter-spacing: 0;
    }

    /* ── Left: Form ── */
    .cp-form-col {
      width: 380px; flex-shrink: 0;
      padding: 24px 22px 24px 26px;
      border-right: 1px solid #F3F4F6;
      overflow-y: auto; background: #FAFAFA;
    }

    /* ── Right: History ── */
    .cp-history-col {
      flex: 1;
      padding: 24px 26px 24px 22px;
      overflow-y: auto; background: #fff;
    }

    /* ══ FORM ══════════════════════════════════════════════ */
    .cp-form { display: flex; flex-direction: column; gap: 14px; }
    .ff { display: flex; flex-direction: column; gap: 5px; }
    .ff-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fl { font-size: 12px; font-weight: 600; color: #374151; }
    .req { color: #EF4444; margin-left: 2px; }
    .opt { font-size: 11px; font-weight: 400; color: #9CA3AF; margin-left: 3px; }

    .fi {
      height: 38px; padding: 0 11px;
      border: 1.5px solid #E5E7EB; border-radius: 8px;
      font-size: 13px; color: #111827;
      background: #fff; box-sizing: border-box; width: 100%;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
      &:focus { outline: none; border-color: #1565C0; box-shadow: 0 0 0 3px rgba(21,101,192,0.12); }
    }
    .fi-textarea { height: auto; padding: 9px 11px; resize: none; line-height: 1.5; }
    .fi-error { border-color: #EF4444 !important; }
    select.fi { cursor: pointer; }

    .field-err { font-size: 11.5px; color: #EF4444; font-weight: 500; }

    .btn-save {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      height: 42px; width: 100%;
      background: linear-gradient(135deg, #1565C0, #7C3AED);
      color: #fff; border: none; border-radius: 9px;
      font-size: 13.5px; font-weight: 700;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit; margin-top: 4px;
      box-shadow: 0 2px 8px rgba(21,101,192,0.3);
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(21,101,192,0.4);
      }
      &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    }

    /* ══ PRICE HISTORY CARDS ═══════════════════════════════ */
    .price-list { display: flex; flex-direction: column; gap: 10px; }

    .price-card {
      background: #F9FAFB; border: 1.5px solid #E5E7EB;
      border-radius: 12px; padding: 14px 16px;
      transition: all 0.15s;
      &:hover { border-color: #BFDBFE; background: #EFF6FF; }
    }
    .pc-active {
      border-color: #93C5FD !important;
      background: #EFF6FF !important;
    }

    .pc-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 10px;
    }
    .pc-role-wrap { display: flex; align-items: center; gap: 8px; }
    .pc-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #D1D5DB; flex-shrink: 0;
    }
    .dot-active { background: #1565C0; box-shadow: 0 0 0 3px rgba(21,101,192,0.2); }
    .pc-role { font-size: 13.5px; font-weight: 700; color: #111827; }

    .pc-badge-active {
      display: inline-flex; align-items: center; gap: 5px;
      background: #DBEAFE; color: #1D4ED8;
      font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
    }
    .badge-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #3B82F6;
      animation: pulse 1.5s ease-in-out infinite;
    }

    .pc-price-row {
      display: flex; align-items: baseline; gap: 5px;
      margin-bottom: 8px;
    }
    .pc-amount { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
    .pc-currency { font-size: 12px; color: #6B7280; font-weight: 600; }
    .pc-unit {
      font-size: 13px; font-weight: 700; color: #7C3AED;
      background: #EDE9FE; padding: 1px 7px; border-radius: 6px;
      margin-left: 4px;
    }
    .unit-hourly { color: #059669; background: #D1FAE5; }
    .unit-daily  { color: #0284C7; background: #E0F2FE; }

    .pc-dates {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #6B7280; margin-bottom: 4px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; color: #9CA3AF; }
    }
    .pc-arrow { color: #9CA3AF; }
    .pc-current { color: #1565C0; font-weight: 600; }

    .pc-notes {
      display: flex; align-items: flex-start; gap: 4px;
      font-size: 11.5px; color: #9CA3AF; margin-top: 4px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; margin-top: 1px; flex-shrink: 0; }
      span {
        overflow: hidden; text-overflow: ellipsis;
        display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
      }
    }

    /* ══ EMPTY STATE ═══════════════════════════════════════ */
    .history-empty {
      padding: 48px 20px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .history-empty-icon {
      width: 56px; height: 56px; border-radius: 50%;
      background: #EFF6FF;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #1565C0; }
    }
    .history-empty-title { font-size: 14px; font-weight: 700; color: #374151; }
    .history-empty-sub   { font-size: 12.5px; color: #9CA3AF; }

    /* ══ FOOTER ════════════════════════════════════════════ */
    .cp-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px; border-top: 1px solid #F3F4F6;
      background: #FAFAFA; flex-shrink: 0;
    }
    .cp-footer-info {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #9CA3AF;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .btn-close {
      height: 34px; padding: 0 18px;
      border: 1.5px solid #E5E7EB; border-radius: 8px;
      background: #fff; color: #374151; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit; transition: all 0.15s;
      &:hover { background: #F3F4F6; }
    }

    /* ══ UTILS ═════════════════════════════════════════════ */
    .spin { animation: spin 0.8s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

    /* ══ RESPONSIVE ════════════════════════════════════════ */
    @media (max-width: 800px) {
      .cp-form-col { width: 300px; padding: 18px; }
      .cp-history-col { padding: 18px; }
    }
    @media (max-width: 640px) {
      .cp-shell { border-radius: 12px; }
      .cp-body { flex-direction: column; overflow-y: auto; }
      .cp-form-col { width: 100%; border-right: none; border-bottom: 1px solid #F3F4F6; padding: 16px; }
      .cp-history-col { padding: 16px; }
      .ff-row { grid-template-columns: 1fr; }
    }
  `]
})
export class CustomerPriceDialogComponent implements OnInit {
  readonly data: { customer: Customer } = inject(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<CustomerPriceDialogComponent>);
  private customerService = inject(CustomerService);
  private jobRoleService = inject(JobRoleService);
  private snackBar = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  readonly prices   = signal<CustomerPrice[]>([]);
  readonly jobRoles = signal<JobRole[]>([]);
  readonly saving   = signal(false);

  readonly priceForm = this.fb.group({
    jobRoleId:     [null as number | null, Validators.required],
    price:         [null as number | null, [Validators.required, Validators.min(0)]],
    priceUnit:     ['MONTHLY', Validators.required],
    effectiveFrom: ['', Validators.required],
    notes:         ['']
  });

  ngOnInit() {
    this.loadPrices();
    this.jobRoleService.listActive().subscribe(roles => this.jobRoles.set(roles));
  }

  loadPrices() {
    this.customerService.getPriceHistory(this.data.customer.id).subscribe(p => this.prices.set(p));
  }

  activeCount(): number {
    return this.prices().filter(p => !p.effectiveTo).length;
  }

  addPrice() {
    this.priceForm.markAllAsTouched();
    if (this.priceForm.invalid) return;
    this.saving.set(true);
    const val = this.priceForm.getRawValue() as any;
    this.customerService.setPrice(this.data.customer.id, val).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu giá thành công', 'OK', { duration: 2500 });
        this.priceForm.reset({ priceUnit: 'MONTHLY' });
        this.priceForm.markAsUntouched();
        this.saving.set(false);
        this.loadPrices();
      },
      error: (e) => {
        this.snackBar.open(e.error?.message || 'Lỗi khi lưu giá', 'Đóng', { duration: 3500 });
        this.saving.set(false);
      }
    });
  }

  formatDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }

  close() { this.dialogRef.close(); }
}
