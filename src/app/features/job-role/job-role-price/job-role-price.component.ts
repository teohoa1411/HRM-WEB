import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { JobRoleService } from '../../../core/services/job-role.service';
import { JobRole, JobRolePrice } from '../../../core/models/job-role.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-job-role-price',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatDatepickerModule, MatNativeDateModule, MatTooltipModule,
    MatDividerModule, MoneyDirective],
  template: `
    <div class="page-container" style="max-width:960px;">

      <!-- Header -->
      <div class="page-header">
        <div style="display:flex;align-items:center;gap:12px;">
          <button mat-icon-button routerLink="/job-roles" matTooltip="Quay lại danh sách">
            <mat-icon>arrow_back</mat-icon>
          </button>
          <div>
            <div class="page-title">{{ jobRole()?.name ?? '...' }}</div>
            <div class="page-subtitle">
              <span class="role-badge">{{ jobRole()?.code }}</span>
              <span style="margin-left:8px;color:#6b7280;">Cấu hình giá mua theo đơn vị tính</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Active Price Card -->
      @if (activePrice()) {
        <div class="active-price-banner">
          <div class="active-price-label">
            <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;margin-right:4px;">bolt</mat-icon>
            Giá hiện hành
          </div>
          <div style="display:flex;gap:32px;flex-wrap:wrap;margin-top:10px;">
            <div class="price-stat">
              <div class="price-stat-label">Giá mua (Cost)</div>
              <div class="price-stat-value cost">
                {{ activePrice()!.costPrice | number:'1.0-0' }}
                <span class="price-unit">VND/{{ unitLabel(activePrice()!.billingUnit) }}</span>
              </div>
            </div>
            <div class="price-divider"></div>
            <div class="price-stat">
              <div class="price-stat-label">Giá bán (Sell)</div>
              <div class="price-stat-value sell">
                {{ activePrice()!.sellPrice | number:'1.0-0' }}
                <span class="price-unit">VND/{{ unitLabel(activePrice()!.billingUnit) }}</span>
              </div>
            </div>
            <div class="price-divider"></div>
            <div class="price-stat">
              <div class="price-stat-label">Biên lợi nhuận</div>
              <div class="price-stat-value margin">
                +{{ activePrice()!.sellPrice - activePrice()!.costPrice | number:'1.0-0' }} VND
                <span class="price-unit">({{ marginPercent(activePrice()!) | number:'1.1-1' }}%)</span>
              </div>
            </div>
            <div class="price-divider"></div>
            <div class="price-stat">
              <div class="price-stat-label">Hiệu lực từ</div>
              <div class="price-stat-value" style="font-size:16px;color:#374151;">
                {{ activePrice()!.effectiveFrom | date:'dd/MM/yyyy' }}
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Set New Price Form -->
      <mat-card class="form-card">
        <div class="section-title">
          <mat-icon>add_circle</mat-icon>
          Thiết lập giá mới
        </div>
        <mat-divider style="margin-bottom:20px;"></mat-divider>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <!-- Row 1: Đơn vị + Cost + Sell -->
          <div class="form-grid-3">
            <mat-form-field appearance="outline">
              <mat-label>Đơn vị tính *</mat-label>
              <mat-select formControlName="billingUnit">
                @for (u of billingUnits; track u.value) {
                  <mat-option [value]="u.value">
                    <mat-icon style="font-size:16px;width:16px;height:16px;vertical-align:middle;margin-right:6px;">{{ u.icon }}</mat-icon>
                    {{ u.label }}
                  </mat-option>
                }
              </mat-select>
              <mat-hint>Cách tính giá theo thời gian</mat-hint>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Giá mua (Cost Price) *</mat-label>
              <input matInput type="text" inputmode="numeric" formControlName="costPrice" appMoney>
              <span matSuffix style="font-size:12px;color:#9ca3af;margin-right:4px;">VND/{{ selectedUnitLabel() }}</span>
              <mat-hint>Tiền trả cho vendor</mat-hint>
              <mat-error>Bắt buộc, phải lớn hơn 0</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Giá bán (Sell Price) *</mat-label>
              <input matInput type="text" inputmode="numeric" formControlName="sellPrice" appMoney>
              <span matSuffix style="font-size:12px;color:#9ca3af;margin-right:4px;">VND/{{ selectedUnitLabel() }}</span>
              <mat-hint>Tiền thu từ khách hàng</mat-hint>
              <mat-error>Bắt buộc, phải lớn hơn 0</mat-error>
            </mat-form-field>
          </div>

          <!-- Row 2: Effective date + Notes -->
          <div class="form-grid-2" style="margin-top:8px;">
            <mat-form-field appearance="outline">
              <mat-label>Hiệu lực từ ngày *</mat-label>
              <input matInput [matDatepicker]="dp" formControlName="effectiveFrom">
              <mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
              <mat-datepicker #dp></mat-datepicker>
              <mat-hint>Ngày giá mới bắt đầu áp dụng</mat-hint>
              <mat-error>Bắt buộc</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Ghi chú</mat-label>
              <input matInput formControlName="notes" placeholder="Lý do thay đổi giá...">
              <mat-icon matPrefix style="color:#9ca3af;">notes</mat-icon>
            </mat-form-field>
          </div>

          <!-- Margin Preview -->
          @if (previewCost() > 0 && previewSell() > 0) {
            <div [class]="'margin-preview ' + (previewSell() >= previewCost() ? 'positive' : 'negative')">
              <mat-icon style="font-size:18px;width:18px;height:18px;vertical-align:middle;margin-right:6px;">
                {{ previewSell() >= previewCost() ? 'trending_up' : 'trending_down' }}
              </mat-icon>
              @if (previewSell() >= previewCost()) {
                <span>Biên lợi nhuận: <strong>+{{ previewSell() - previewCost() | number:'1.0-0' }} VND/{{ selectedUnitLabel() }}</strong>
                  &nbsp;·&nbsp; <strong>{{ previewMarginPct() | number:'1.1-1' }}%</strong> so với giá mua</span>
              } @else {
                <span style="color:#dc2626;">Cảnh báo: Giá bán thấp hơn giá mua — biên âm <strong>{{ previewSell() - previewCost() | number:'1.0-0' }} VND</strong></span>
              }
            </div>
          }

          <div style="display:flex;justify-content:flex-end;margin-top:16px;">
            <button mat-flat-button color="primary" type="submit" [disabled]="submitting()" style="min-width:140px;">
              @if (submitting()) {
                <ng-container>
                  <mat-icon style="animation:spin 1s linear infinite;font-size:18px;margin-right:4px;">autorenew</mat-icon>
                  Đang lưu...
                </ng-container>
              } @else {
                <ng-container>
                  <mat-icon>save</mat-icon> Lưu giá mới
                </ng-container>
              }
            </button>
          </div>
        </form>
      </mat-card>

      <!-- Price History -->
      <mat-card class="history-card">
        <div class="section-title">
          <mat-icon>history</mat-icon>
          Lịch sử giá
          <span style="margin-left:auto;font-size:12px;font-weight:400;color:#9ca3af;">{{ priceHistory().length }} bản ghi</span>
        </div>
        <mat-divider></mat-divider>

        @if (priceHistory().length === 0) {
          <div style="text-align:center;padding:40px;color:#9ca3af;">
            <mat-icon style="font-size:36px;width:36px;height:36px;margin-bottom:8px;display:block;">price_change</mat-icon>
            Chưa có giá nào được thiết lập
          </div>
        } @else {
          <div style="overflow-x:auto;">
            <table class="price-table">
              <thead>
                <tr>
                  <th>Trạng thái</th>
                  <th>Đơn vị</th>
                  <th>Giá mua</th>
                  <th>Giá bán</th>
                  <th>Biên LN</th>
                  <th>Hiệu lực từ</th>
                  <th>Đến ngày</th>
                  <th>Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                @for (p of priceHistory(); track p.id) {
                  <tr [class.active-row]="!p.effectiveTo">
                    <td>
                      @if (!p.effectiveTo) {
                        <span class="status-badge active">Đang áp dụng</span>
                      } @else {
                        <span class="status-badge expired">Đã hết hạn</span>
                      }
                    </td>
                    <td>
                      <span class="unit-badge">{{ unitLabel(p.billingUnit) }}</span>
                    </td>
                    <td class="price-cost">{{ p.costPrice | number:'1.0-0' }}<span class="currency"> VND</span></td>
                    <td class="price-sell">{{ p.sellPrice | number:'1.0-0' }}<span class="currency"> VND</span></td>
                    <td>
                      <span [style.color]="p.sellPrice >= p.costPrice ? '#16a34a' : '#dc2626'" style="font-weight:600;">
                        {{ p.sellPrice >= p.costPrice ? '+' : '' }}{{ p.sellPrice - p.costPrice | number:'1.0-0' }}
                      </span>
                      <span style="font-size:11px;color:#9ca3af;margin-left:4px;">({{ marginPercent(p) | number:'1.1-1' }}%)</span>
                    </td>
                    <td style="color:#374151;">{{ p.effectiveFrom | date:'dd/MM/yyyy' }}</td>
                    <td style="color:#6b7280;">
                      @if (!p.effectiveTo) { <span style="color:#16a34a;font-weight:500;">—</span> }
                      @else { {{ p.effectiveTo | date:'dd/MM/yyyy' }} }
                    </td>
                    <td style="color:#6b7280;max-width:180px;white-space:normal;">{{ p.notes || '—' }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .role-badge {
      display:inline-block;padding:2px 8px;background:#ede9fe;color:#5b21b6;
      border-radius:6px;font-size:11px;font-weight:700;letter-spacing:.5px;
    }
    .active-price-banner {
      background:linear-gradient(135deg,#1e293b 0%,#334155 100%);
      color:#fff;border-radius:14px;padding:18px 24px;margin-bottom:20px;
    }
    .active-price-label {
      font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;
      color:#94a3b8;
    }
    .price-stat { display:flex;flex-direction:column;gap:4px; }
    .price-stat-label { font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.5px; }
    .price-stat-value { font-size:20px;font-weight:800;line-height:1; }
    .price-stat-value.cost { color:#fca5a5; }
    .price-stat-value.sell { color:#86efac; }
    .price-stat-value.margin { color:#fde68a; }
    .price-unit { font-size:12px;font-weight:400;margin-left:4px;opacity:.8; }
    .price-divider { width:1px;background:rgba(255,255,255,.1);align-self:stretch; }

    .form-card { padding:20px;margin-bottom:20px; }
    .history-card { padding:20px; }
    .section-title {
      display:flex;align-items:center;gap:8px;font-size:15px;font-weight:700;
      color:#1e293b;margin-bottom:16px;
    }
    .section-title mat-icon { color:#6366f1; }

    .form-grid-3 { display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px; }
    .form-grid-2 { display:grid;grid-template-columns:1fr 1fr;gap:16px; }

    .margin-preview {
      padding:12px 16px;border-radius:10px;font-size:13px;margin-top:4px;
      display:flex;align-items:center;
      &.positive { background:#f0fdf4;border:1px solid #bbf7d0;color:#166534; }
      &.negative { background:#fef2f2;border:1px solid #fecaca;color:#dc2626; }
    }

    .price-table { width:100%;border-collapse:collapse;font-size:13px; }
    .price-table th {
      background:#f9fafb;font-size:11px;font-weight:700;text-transform:uppercase;
      letter-spacing:.5px;color:#6b7280;padding:10px 14px;border-bottom:2px solid #e5e7eb;
      text-align:left;white-space:nowrap;
    }
    .price-table td { padding:12px 14px;border-bottom:1px solid #f3f4f6;vertical-align:middle; }
    .price-table tr:hover td { background:#f8faff; }
    .price-table tr.active-row td { background:#f0fdf4; }
    .price-table tr.active-row:hover td { background:#dcfce7; }

    .status-badge {
      display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;
      &.active { background:#dcfce7;color:#166534; }
      &.expired { background:#f3f4f6;color:#9ca3af; }
    }
    .unit-badge {
      display:inline-block;padding:2px 8px;background:#eff6ff;color:#1d4ed8;
      border-radius:6px;font-size:11px;font-weight:600;
    }
    .price-cost { font-weight:700;color:#dc2626; }
    .price-sell { font-weight:700;color:#16a34a; }
    .currency { font-size:11px;font-weight:400;color:#9ca3af;margin-left:2px; }

    @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }

    @media (max-width:768px) {
      .form-grid-3 { grid-template-columns:1fr; }
      .form-grid-2 { grid-template-columns:1fr; }
      .active-price-banner { padding:14px 16px; }
      .price-divider { display:none; }
    }
  `]
})
export class JobRolePriceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private jobRoleService = inject(JobRoleService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly jobRole = signal<JobRole | null>(null);
  readonly priceHistory = signal<JobRolePrice[]>([]);
  readonly submitting = signal(false);

  readonly billingUnits = [
    { value: 'HOURLY',  label: 'Theo giờ',   icon: 'schedule' },
    { value: 'DAILY',   label: 'Theo ngày',   icon: 'today' },
    { value: 'MONTHLY', label: 'Theo tháng',  icon: 'calendar_month' },
  ];

  readonly form = this.fb.group({
    billingUnit:   ['MONTHLY', Validators.required],
    costPrice:     [null as number | null, [Validators.required, Validators.min(1)]],
    sellPrice:     [null as number | null, [Validators.required, Validators.min(1)]],
    effectiveFrom: ['', Validators.required],
    notes:         ['']
  });

  private jobRoleId = 0;

  /** Giá đang áp dụng (effectiveTo = null) */
  activePrice = computed(() => this.priceHistory().find(p => !p.effectiveTo) ?? null);

  /** Convert form valueChanges → signals for reactive preview */
  private formValues = toSignal(this.form.valueChanges, { initialValue: this.form.value });

  previewCost = computed(() => +(this.formValues()?.costPrice ?? 0));
  previewSell = computed(() => +(this.formValues()?.sellPrice ?? 0));
  previewMarginPct = computed(() => {
    const c = this.previewCost();
    return c > 0 ? ((this.previewSell() - c) / c) * 100 : 0;
  });

  selectedUnitLabel = computed(() => this.unitLabel(this.formValues()?.billingUnit ?? 'MONTHLY'));

  ngOnInit() {
    this.jobRoleId = +this.route.snapshot.paramMap.get('id')!;
    this.jobRoleService.getById(this.jobRoleId).subscribe(jr => this.jobRole.set(jr));
    this.loadHistory();
  }

  loadHistory() {
    this.jobRoleService.getPriceHistory(this.jobRoleId).subscribe(h => this.priceHistory.set(h));
  }

  unitLabel(unit: string): string {
    return { HOURLY: 'giờ', DAILY: 'ngày', MONTHLY: 'tháng' }[unit] ?? unit.toLowerCase();
  }

  marginPercent(p: JobRolePrice): number {
    return p.costPrice > 0 ? ((p.sellPrice - p.costPrice) / p.costPrice) * 100 : 0;
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const val = this.form.getRawValue();
    this.jobRoleService.setPrice(this.jobRoleId, val as any).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu giá mới thành công', 'OK', { duration: 3000 });
        this.form.reset({ billingUnit: 'MONTHLY' });
        this.loadHistory();
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Lỗi lưu giá', 'Đóng', { duration: 4000 });
      }
    });
  }
}
