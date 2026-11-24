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
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTableModule } from '@angular/material/table';
import { PayrollAdjustment, PayrollService, PayrollRecord } from '../../core/services/payroll.service';
import { MonthPickerComponent } from '../../shared/components/month-picker/month-picker.component';
import { AuthService } from '../../core/auth/auth.service';

type AdjustmentFormItem = PayrollAdjustment & { clientId: string };

@Component({
  selector: 'app-payroll',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule,
    MatInputModule, MatFormFieldModule, MatSelectModule, MatTooltipModule,
    MatProgressSpinnerModule, MatDialogModule, MatTableModule, MonthPickerComponent],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Bảng Lương Nội Bộ</div>
          <div class="page-subtitle">Quản lý và xác nhận bảng lương hàng tháng</div>
        </div>
        <div class="flex-row gap-12">
          <app-month-picker [value]="selectedMonth" (valueChange)="onMonthChanged($event)" />
          <button mat-raised-button color="primary" (click)="generate()" [disabled]="loading() || !auth.canPreparePayroll()">
            <mat-icon>calculate</mat-icon> Sinh bảng lương
          </button>
          <button mat-stroked-button (click)="exportExcel()" [disabled]="records().length === 0">
            <mat-icon>download</mat-icon> Xuất Excel
          </button>
        </div>
      </div>

      <!-- Stale warning -->
      @if (hasStale()) {
        <div style="background:#fef3c7; border:1px solid #fcd34d; border-radius:10px; padding:12px 16px; margin-bottom:16px; display:flex; align-items:center; gap:10px;">
          <mat-icon style="color:#d97706;">warning</mat-icon>
          <span style="color:#92400e; font-size:13.5px; font-weight:500;">
            ⚠ Bảng lương tháng này có thể không còn chính xác do timesheet đã bị thay đổi sau khi xác nhận.
            Vui lòng <strong>Reset & Tính lại</strong> hoặc xác nhận dữ liệu hiện tại vẫn đúng.
          </span>
          @if (auth.canConfirmFinancialData()) {
          <button mat-stroked-button color="warn" style="margin-left:auto;" (click)="resetPayroll()">
            <mat-icon>refresh</mat-icon> Reset & Tính lại
          </button>
          }
        </div>
      }

      <!-- Stats -->
      @if (records().length > 0) {
        <div style="display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-bottom:20px;">
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Tổng nhân sự</div>
              <div style="font-size:28px;font-weight:700;color:#111827;">{{ records().length }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Tổng lương Net</div>
              <div style="font-size:28px;font-weight:700;color:#1565c0;">{{ totalNetSalary() | number:'1.0-0' }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">BH NV đóng</div>
              <div style="font-size:28px;font-weight:700;color:#b45309;">{{ totalInsEmployee() | number:'1.0-0' }}</div>
            </mat-card-content>
          </mat-card>
          <mat-card style="padding:0;">
            <mat-card-content style="padding:18px 20px!important;">
              <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:#6b7280;margin-bottom:6px;">Trạng thái</div>
              <div style="font-size:16px;font-weight:700;">
                <span [class]="'status-chip ' + overallStatus().toLowerCase()">{{ overallStatus() }}</span>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- Table -->
      <mat-card>
        <mat-card-content style="padding:0;">
          @if (loading()) {
            <div style="padding:60px; text-align:center; color:#666;">
              <mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner>
              <p style="margin-top:12px;">Đang tải...</p>
            </div>
          } @else if (records().length === 0) {
            <div class="empty-state">
              <mat-icon>payments</mat-icon>
              <p>Chưa có dữ liệu bảng lương tháng {{ selectedMonth }}</p>
              <p style="font-size:12px; margin-top:4px;">Bấm "Sinh bảng lương" để tạo từ dữ liệu billing</p>
            </div>
          } @else {
            <div style="overflow-x:auto;">
              <table mat-table [dataSource]="records()" class="mat-elevation-z0">
                <ng-container matColumnDef="stt">
                  <th mat-header-cell *matHeaderCellDef style="width:50px">STT</th>
                  <td mat-cell *matCellDef="let r; let i = index">{{ i + 1 }}</td>
                </ng-container>
                <ng-container matColumnDef="employee">
                  <th mat-header-cell *matHeaderCellDef>Nhân viên</th>
                  <td mat-cell *matCellDef="let r">
                    <div style="display:flex;align-items:center;gap:10px;">
                      <div class="avatar">{{ r.fullName?.charAt(0) }}</div>
                      <div>
                        <div style="font-weight:500;">{{ r.fullName }}</div>
                        <code style="font-size:11px;">{{ r.employeeCode }}</code>
                      </div>
                    </div>
                  </td>
                </ng-container>
                <ng-container matColumnDef="daysWorked">
                  <th mat-header-cell *matHeaderCellDef>Ngày làm</th>
                  <td mat-cell *matCellDef="let r">{{ r.daysWorked }}</td>
                </ng-container>
                <ng-container matColumnDef="calculatedSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương tính công</th>
                  <td mat-cell *matCellDef="let r">{{ r.calculatedSalary | number:'1.0-0' }}</td>
                </ng-container>
                <ng-container matColumnDef="overtimeAmount">
                  <th mat-header-cell *matHeaderCellDef>Tiền OT</th>
                  <td mat-cell *matCellDef="let r"><span style="color:#7c3aed;font-weight:600;">{{ r.overtimeAmount | number:'1.0-0' }}</span></td>
                </ng-container>
                <ng-container matColumnDef="insuranceSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương BH</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#f97316; font-weight:500;">{{ r.insuranceSalary | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhxhEmp">
                  <th mat-header-cell *matHeaderCellDef>BHXH NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhxhEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhytEmp">
                  <th mat-header-cell *matHeaderCellDef>BHYT NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhytEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhtnEmp">
                  <th mat-header-cell *matHeaderCellDef>BHTN NV</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#dc2626; font-weight:500;">{{ r.bhtnEmployeeAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalInsEmp">
                  <th mat-header-cell *matHeaderCellDef>Tổng BH NV</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#dc2626;">{{ r.insuranceEmployeeAmount | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhxhEr">
                  <th mat-header-cell *matHeaderCellDef>BHXH Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhxhEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhytEr">
                  <th mat-header-cell *matHeaderCellDef>BHYT Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhytEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bhtnEr">
                  <th mat-header-cell *matHeaderCellDef>BHTN Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <span style="color:#2563eb; font-weight:500;">{{ r.bhtnEmployerAmount | number:'1.0-0' }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="totalInsEr">
                  <th mat-header-cell *matHeaderCellDef>Tổng BH Ng</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#2563eb;">{{ r.insuranceEmployerAmount | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="bonus">
                  <th mat-header-cell *matHeaderCellDef>Thưởng</th>
                  <td mat-cell *matCellDef="let r">
                    <button class="adjustment-total bonus-total" type="button" (click)="openAdjustmentDialog(r)" [disabled]="!canAdjust(r)">
                      <span>+{{ r.bonus | number:'1.0-0' }}</span>
                      @if (adjustmentCount(r, 'BONUS') > 0) { <small>{{ adjustmentCount(r, 'BONUS') }} khoản</small> }
                    </button>
                  </td>
                </ng-container>
                <ng-container matColumnDef="deduction">
                  <th mat-header-cell *matHeaderCellDef>Khấu trừ</th>
                  <td mat-cell *matCellDef="let r">
                    <button class="adjustment-total deduction-total" type="button" (click)="openAdjustmentDialog(r)" [disabled]="!canAdjust(r)">
                      <span>-{{ r.deduction | number:'1.0-0' }}</span>
                      @if (adjustmentCount(r, 'DEDUCTION') > 0) { <small>{{ adjustmentCount(r, 'DEDUCTION') }} khoản</small> }
                    </button>
                  </td>
                </ng-container>
                <ng-container matColumnDef="netSalary">
                  <th mat-header-cell *matHeaderCellDef>Lương Net</th>
                  <td mat-cell *matCellDef="let r">
                    <strong style="color:#1565c0;font-size:14px;">{{ r.netSalary | number:'1.0-0' }}</strong>
                  </td>
                </ng-container>
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                  <td mat-cell *matCellDef="let r">
                    <span [class]="'status-chip ' + statusClass(r.status)">{{ statusLabel(r.status) }}</span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="actions">
                  <th mat-header-cell *matHeaderCellDef></th>
                  <td mat-cell *matCellDef="let r">
                    @if (canAdjust(r)) {
                      <button mat-icon-button (click)="openAdjustmentDialog(r)" matTooltip="Quản lý thưởng và khấu trừ">
                        <mat-icon>tune</mat-icon>
                      </button>
                    }
                  </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="columns"></tr>
                <tr mat-row *matRowDef="let row; columns: columns;"></tr>
              </table>
            </div>

            @if (adjustmentRecord()) {
              <div class="adjustment-backdrop" (click)="closeAdjustmentDialog()">
                <section class="adjustment-dialog" role="dialog" aria-modal="true" aria-label="Điều chỉnh lương" (click)="$event.stopPropagation()">
                  <header class="adjustment-dialog__header">
                    <div class="adjustment-dialog__icon"><mat-icon>tune</mat-icon></div>
                    <div class="adjustment-dialog__title">
                      <h2>Điều chỉnh lương</h2>
                      <p>{{ adjustmentRecord()!.fullName }} · {{ adjustmentRecord()!.employeeCode }} · Tháng {{ selectedMonth }}</p>
                    </div>
                    <button mat-icon-button (click)="closeAdjustmentDialog()" [disabled]="savingAdjustments()" aria-label="Đóng"><mat-icon>close</mat-icon></button>
                  </header>

                  @if (adjustmentsLoading()) {
                    <div class="adjustment-loading"><mat-spinner diameter="32"></mat-spinner><span>Đang tải các khoản điều chỉnh…</span></div>
                  } @else {
                    <div class="adjustment-dialog__body">
                      <div class="adjustment-editor">
                        <section class="adjustment-section bonus-section">
                          <div class="adjustment-section__head">
                            <div><span class="adjustment-section__badge"><mat-icon>add_circle</mat-icon></span><h3>Thưởng & phụ cấp</h3></div>
                            <button class="add-adjustment-btn" type="button" (click)="addAdjustment('BONUS')"><mat-icon>add</mat-icon> Thêm khoản</button>
                          </div>
                          @for (item of bonusAdjustments(); track item.clientId) {
                            <div class="adjustment-row">
                              <input class="adjustment-description" [(ngModel)]="item.description" placeholder="Ví dụ: Chi phí đi lại" [disabled]="savingAdjustments()">
                              <div class="money-input-wrap"><span>₫</span><input inputmode="numeric" [value]="formatMoney(item.amount)" (input)="setAdjustmentAmount(item.clientId, $any($event.target).value)" placeholder="0" [disabled]="savingAdjustments()"></div>
                              <button mat-icon-button class="remove-adjustment" type="button" (click)="removeAdjustment(item.clientId)" [disabled]="savingAdjustments()" matTooltip="Xóa khoản"><mat-icon>delete_outline</mat-icon></button>
                            </div>
                          } @empty {
                            <div class="adjustment-empty">Chưa có khoản thưởng hoặc phụ cấp.</div>
                          }
                        </section>

                        <section class="adjustment-section deduction-section">
                          <div class="adjustment-section__head">
                            <div><span class="adjustment-section__badge"><mat-icon>remove_circle</mat-icon></span><h3>Khấu trừ</h3></div>
                            <button class="add-adjustment-btn deduction-add" type="button" (click)="addAdjustment('DEDUCTION')"><mat-icon>add</mat-icon> Thêm khoản</button>
                          </div>
                          @for (item of deductionAdjustments(); track item.clientId) {
                            <div class="adjustment-row">
                              <input class="adjustment-description" [(ngModel)]="item.description" placeholder="Ví dụ: Khấu trừ lương tháng trước" [disabled]="savingAdjustments()">
                              <div class="money-input-wrap"><span>₫</span><input inputmode="numeric" [value]="formatMoney(item.amount)" (input)="setAdjustmentAmount(item.clientId, $any($event.target).value)" placeholder="0" [disabled]="savingAdjustments()"></div>
                              <button mat-icon-button class="remove-adjustment" type="button" (click)="removeAdjustment(item.clientId)" [disabled]="savingAdjustments()" matTooltip="Xóa khoản"><mat-icon>delete_outline</mat-icon></button>
                            </div>
                          } @empty {
                            <div class="adjustment-empty">Chưa có khoản khấu trừ.</div>
                          }
                        </section>
                      </div>

                      <aside class="adjustment-summary">
                        <p class="adjustment-summary__eyebrow">TẠM TÍNH THỰC NHẬN</p>
                        <div class="summary-line"><span>Lương tính công</span><strong>{{ formatMoney(adjustmentRecord()!.calculatedSalary) }} ₫</strong></div>
                        <div class="summary-line positive"><span>Tổng thưởng</span><strong>+{{ formatMoney(adjustmentBonusTotal()) }} ₫</strong></div>
                        <div class="summary-line negative"><span>Tổng khấu trừ</span><strong>-{{ formatMoney(adjustmentDeductionTotal()) }} ₫</strong></div>
                        <div class="summary-line"><span>Bảo hiểm nhân viên</span><strong>-{{ formatMoney(adjustmentRecord()!.insuranceEmployeeAmount || 0) }} ₫</strong></div>
                        <div class="summary-net"><span>Thực nhận</span><strong>{{ formatMoney(adjustmentNetSalary()) }} ₫</strong></div>
                      </aside>
                    </div>
                  }

                  <footer class="adjustment-dialog__footer">
                    <span class="adjustment-hint">Số tiền được nhập và hiển thị theo định dạng VNĐ.</span>
                    <div><button mat-button (click)="closeAdjustmentDialog()" [disabled]="savingAdjustments()">Hủy</button><button mat-flat-button color="primary" (click)="saveAdjustments()" [disabled]="adjustmentsLoading() || savingAdjustments() || !isAdjustmentFormValid()"><mat-icon>save</mat-icon>{{ savingAdjustments() ? 'Đang lưu…' : 'Lưu điều chỉnh' }}</button></div>
                  </footer>
                </section>
              </div>
            }

            <!-- Footer actions -->
            <div style="padding:16px 20px; display:flex; justify-content:flex-end; gap:12px; border-top:1px solid #f3f4f6; align-items:center;">
              @if (allPaid()) {
                <span style="background:#DCFCE7; color:#16A34A; padding:4px 12px; border-radius:12px; font-weight:600; font-size:12px;">ĐÃ TRẢ LƯƠNG</span>
              } @else {
                @if (canMarkPaid()) {
                  <button mat-raised-button style="background:#16A34A;color:#fff;" (click)="markPaid()" [disabled]="loading()">
                    <mat-icon>payments</mat-icon> Đã trả lương
                  </button>
                }
                @if (canConfirm()) {
                  <button mat-raised-button color="primary" (click)="confirmPayroll()" [disabled]="loading()">
                    <mat-icon>verified</mat-icon> Xác nhận bảng lương
                  </button>
                }
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .avatar {
      width:34px;height:34px;border-radius:50%;
      background:linear-gradient(135deg,#5B5BD6,#7C3AED);
      color:#fff;display:flex;align-items:center;justify-content:center;
      font-weight:600;font-size:13px;flex-shrink:0;
    }
    .status-chip {
      padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;
      &.draft    { background:#F3F4F6; color:#6B7280; }
      &.adjusted { background:#FEF3C7; color:#D97706; }
      &.confirmed { background:#DCFCE7; color:#16A34A; }
      &.exported { background:#DBEAFE; color:#1D4ED8; }
      &.paid     { background:#DCFCE7; color:#16A34A; }
      &.stale    { background:#FEE2E2; color:#DC2626; }
    }
    .adjustment-total { border:0; background:transparent; padding:5px 7px; border-radius:8px; cursor:pointer; text-align:left; font:inherit; display:flex; flex-direction:column; gap:1px; }
    .adjustment-total:hover:not(:disabled) { background:#f8fafc; }
    .adjustment-total:disabled { cursor:default; }
    .adjustment-total small { color:#94a3b8; font-size:10px; font-weight:600; }
    .bonus-total span { color:#15803d; font-weight:700; }
    .deduction-total span { color:#dc2626; font-weight:700; }
    .adjustment-backdrop { position:fixed; inset:0; z-index:1000; background:rgba(15,23,42,.52); backdrop-filter:blur(3px); display:flex; align-items:center; justify-content:center; padding:24px; }
    .adjustment-dialog { width:min(920px,100%); max-height:calc(100vh - 48px); overflow:auto; background:#fff; border-radius:20px; box-shadow:0 24px 60px rgba(15,23,42,.28); }
    .adjustment-dialog__header { padding:24px 28px 20px; display:flex; align-items:center; gap:14px; border-bottom:1px solid #e2e8f0; }
    .adjustment-dialog__icon { width:44px; height:44px; border-radius:14px; background:linear-gradient(135deg,#4f46e5,#7c3aed); color:#fff; display:grid; place-items:center; }
    .adjustment-dialog__title { flex:1; } .adjustment-dialog__title h2 { margin:0; font-size:20px; color:#0f172a; } .adjustment-dialog__title p { margin:4px 0 0; font-size:13px; color:#64748b; }
    .adjustment-dialog__body { padding:24px 28px; display:grid; grid-template-columns:minmax(0,1fr) 250px; gap:24px; background:#f8fafc; }
    .adjustment-editor { display:flex; flex-direction:column; gap:16px; }
    .adjustment-section { background:#fff; border:1px solid #e2e8f0; border-radius:14px; padding:16px; }
    .adjustment-section__head { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; } .adjustment-section__head > div { display:flex; align-items:center; gap:8px; } .adjustment-section h3 { margin:0; font-size:14px; color:#1e293b; }
    .adjustment-section__badge { display:grid; place-items:center; width:26px; height:26px; border-radius:8px; } .adjustment-section__badge mat-icon { font-size:17px; width:17px; height:17px; }
    .bonus-section .adjustment-section__badge { background:#dcfce7; color:#15803d; } .deduction-section .adjustment-section__badge { background:#fee2e2; color:#dc2626; }
    .add-adjustment-btn { border:1px solid #bbf7d0; background:#f0fdf4; color:#15803d; border-radius:8px; padding:5px 9px; display:flex; align-items:center; gap:3px; font:600 12px inherit; cursor:pointer; } .add-adjustment-btn mat-icon { font-size:15px; width:15px; height:15px; }
    .deduction-add { border-color:#fecaca; background:#fff1f2; color:#dc2626; }
    .adjustment-row { display:grid; grid-template-columns:minmax(0,1fr) 155px 36px; gap:8px; align-items:center; margin-top:8px; }
    .adjustment-description,.money-input-wrap input { width:100%; min-width:0; box-sizing:border-box; border:1px solid #cbd5e1; border-radius:8px; padding:9px 10px; outline:none; font:13px inherit; color:#1e293b; } .adjustment-description:focus,.money-input-wrap:focus-within { border-color:#6366f1; box-shadow:0 0 0 3px #e0e7ff; }
    .money-input-wrap { display:flex; align-items:center; border:1px solid #cbd5e1; border-radius:8px; overflow:hidden; background:#fff; } .money-input-wrap span { padding-left:10px; color:#64748b; font-weight:700; } .money-input-wrap input { border:0; text-align:right; box-shadow:none!important; }
    .remove-adjustment { color:#94a3b8; } .remove-adjustment:hover:not(:disabled) { color:#dc2626; background:#fef2f2; }
    .adjustment-empty { color:#94a3b8; font-size:12px; padding:9px 2px 3px; }
    .adjustment-summary { align-self:start; background:linear-gradient(160deg,#1e293b,#334155); color:#e2e8f0; border-radius:14px; padding:18px; box-shadow:0 8px 18px rgba(15,23,42,.15); } .adjustment-summary__eyebrow { margin:0 0 14px; font-size:10px; font-weight:700; letter-spacing:.7px; color:#94a3b8; }
    .summary-line { display:flex; justify-content:space-between; gap:8px; padding:8px 0; font-size:12px; border-bottom:1px solid rgba(226,232,240,.14); } .summary-line strong { font-size:12px; text-align:right; } .summary-line.positive strong { color:#86efac; } .summary-line.negative strong { color:#fca5a5; }
    .summary-net { margin-top:14px; padding-top:14px; border-top:1px solid rgba(226,232,240,.28); display:flex; flex-direction:column; gap:4px; } .summary-net span { font-size:12px; color:#cbd5e1; } .summary-net strong { font-size:20px; color:#fff; }
    .adjustment-dialog__footer { padding:16px 28px; display:flex; justify-content:space-between; align-items:center; gap:16px; border-top:1px solid #e2e8f0; } .adjustment-dialog__footer > div { display:flex; gap:8px; } .adjustment-hint { color:#64748b; font-size:12px; }
    .adjustment-loading { min-height:250px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; color:#64748b; }
    @media(max-width:760px) { .adjustment-backdrop { padding:10px; } .adjustment-dialog__body { grid-template-columns:1fr; padding:16px; } .adjustment-dialog__header,.adjustment-dialog__footer { padding:16px; } .adjustment-summary { order:-1; } .adjustment-row { grid-template-columns:minmax(0,1fr) 120px 36px; } .adjustment-dialog__footer { align-items:flex-start; flex-direction:column; } }
  `]
})
export class PayrollComponent implements OnInit {
  private payrollService = inject(PayrollService);
  private snackBar = inject(MatSnackBar);
  readonly auth = inject(AuthService);

  readonly columns = ['stt','employee','daysWorked','calculatedSalary','overtimeAmount','insuranceSalary','bhxhEmp','bhytEmp','bhtnEmp','totalInsEmp','bhxhEr','bhytEr','bhtnEr','totalInsEr','bonus','deduction','netSalary','status','actions'];
  readonly loading = signal(false);
  readonly records = signal<PayrollRecord[]>([]);
  readonly hasStale = signal(false);
  readonly adjustmentRecord = signal<PayrollRecord | null>(null);
  readonly adjustmentItems = signal<AdjustmentFormItem[]>([]);
  readonly adjustmentsLoading = signal(false);
  readonly savingAdjustments = signal(false);
  selectedMonth = new Date().toISOString().slice(0, 7);

  readonly totalNetSalary = computed(() => this.records().reduce((s, r) => s + r.netSalary, 0));
  readonly totalBonus = computed(() => this.records().reduce((s, r) => s + r.bonus, 0));
  readonly totalInsEmployee = computed(() => this.records().reduce((s, r) => s + (r.insuranceEmployeeAmount || 0), 0));
  readonly bonusAdjustments = computed(() => this.adjustmentItems().filter(a => a.type === 'BONUS' || a.type === 'ALLOWANCE'));
  readonly deductionAdjustments = computed(() => this.adjustmentItems().filter(a => a.type === 'DEDUCTION'));
  readonly adjustmentBonusTotal = computed(() => this.bonusAdjustments().reduce((sum, item) => sum + (item.amount || 0), 0));
  readonly adjustmentDeductionTotal = computed(() => this.deductionAdjustments().reduce((sum, item) => sum + (item.amount || 0), 0));
  readonly adjustmentNetSalary = computed(() => {
    const record = this.adjustmentRecord();
    return !record ? 0 : record.calculatedSalary + (record.overtimeAmount || 0) + this.adjustmentBonusTotal() - this.adjustmentDeductionTotal() - (record.insuranceEmployeeAmount || 0);
  });
  readonly overallStatus = computed(() => {
    const recs = this.records();
    if (recs.every(r => r.status === 'PAID'))                                  return 'PAID';
    if (recs.every(r => r.status === 'CONFIRMED' || r.status === 'EXPORTED' || r.status === 'PAID')) return 'CONFIRMED';
    if (recs.some(r => r.status === 'STALE'))                                  return 'STALE';
    if (recs.some(r => r.status === 'ADJUSTED'))                               return 'ADJUSTED';
    return 'DRAFT';
  });
  readonly canConfirm = computed(() =>
    this.auth.canConfirmFinancialData() &&
    this.records().length > 0 &&
    this.records().every(r => r.status === 'DRAFT' || r.status === 'ADJUSTED') &&
    !this.records().some(r => r.status === 'STALE' || r.status === 'PAID')
  );
  readonly allPaid = computed(() => this.records().length > 0 && this.records().every(r => r.status === 'PAID'));
  readonly canMarkPaid = computed(() => this.auth.canMarkPayrollPaid() && this.records().length > 0 && this.records().every(r => r.status === 'CONFIRMED' || r.status === 'EXPORTED'));

  ngOnInit() { this.load(); }

  load() {
    this.hasStale.set(false);
    this.loading.set(true);
    this.payrollService.getPayroll(this.selectedMonth).subscribe({
      next: data => {
        this.records.set(data || []);
        this.loading.set(false);
        if (data?.length) this.checkStale();
      },
      error: () => this.loading.set(false)
    });
  }

  generate() {
    this.loading.set(true);
    this.payrollService.generate(this.selectedMonth).subscribe({
      next: data => {
        this.records.set(data || []);
        this.loading.set(false);
        this.snackBar.open('Đã sinh bảng lương', 'OK', { duration: 3000 });
      },
      error: () => { this.loading.set(false); this.snackBar.open('Lỗi sinh bảng lương', 'X', { duration: 3000 }); }
    });
  }

  canAdjust(record: PayrollRecord): boolean {
    return record.status === 'DRAFT' || record.status === 'ADJUSTED';
  }

  adjustmentCount(record: PayrollRecord, type: 'BONUS' | 'DEDUCTION'): number {
    if (!record.adjustments?.length) return type === 'BONUS' ? (record.bonus > 0 ? 1 : 0) : (record.deduction > 0 ? 1 : 0);
    return record.adjustments.filter(item => type === 'BONUS'
      ? item.type === 'BONUS' || item.type === 'ALLOWANCE'
      : item.type === 'DEDUCTION').length;
  }

  openAdjustmentDialog(record: PayrollRecord) {
    if (!this.canAdjust(record)) return;
    this.adjustmentRecord.set(record);
    this.adjustmentItems.set([]);
    this.adjustmentsLoading.set(true);
    this.payrollService.getAdjustments(record.id).subscribe({
      next: adjustments => {
        if (adjustments.length) {
          this.adjustmentItems.set(adjustments.map(item => ({ ...item, clientId: crypto.randomUUID() })));
        } else {
          const legacy: AdjustmentFormItem[] = [];
          if (record.bonus > 0) legacy.push({ clientId: crypto.randomUUID(), type: 'BONUS', description: 'Thưởng điều chỉnh', amount: record.bonus, taxable: true });
          if (record.deduction > 0) legacy.push({ clientId: crypto.randomUUID(), type: 'DEDUCTION', description: 'Khấu trừ điều chỉnh', amount: record.deduction, taxable: true });
          this.adjustmentItems.set(legacy);
        }
        this.adjustmentsLoading.set(false);
      },
      error: () => { this.adjustmentsLoading.set(false); this.snackBar.open('Không thể tải các khoản điều chỉnh', 'Đóng', { duration: 3000 }); }
    });
  }

  closeAdjustmentDialog() {
    if (this.savingAdjustments()) return;
    this.adjustmentRecord.set(null);
    this.adjustmentItems.set([]);
  }

  addAdjustment(type: 'BONUS' | 'DEDUCTION') {
    this.adjustmentItems.update(items => [...items, { clientId: crypto.randomUUID(), type, description: '', amount: 0, taxable: true }]);
  }

  removeAdjustment(clientId: string) {
    this.adjustmentItems.update(items => items.filter(item => item.clientId !== clientId));
  }

  setAdjustmentAmount(clientId: string, value: string) {
    const amount = Number(value.replace(/[^0-9]/g, '')) || 0;
    this.adjustmentItems.update(items => items.map(item => item.clientId === clientId ? { ...item, amount } : item));
  }

  formatMoney(value: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(value || 0);
  }

  isAdjustmentFormValid(): boolean {
    return this.adjustmentItems().every(item => item.description.trim().length > 0 && item.amount > 0);
  }

  saveAdjustments() {
    const record = this.adjustmentRecord();
    if (!record || !this.isAdjustmentFormValid()) return;
    this.savingAdjustments.set(true);
    const adjustments = this.adjustmentItems().map((item, index) => ({
      type: item.type,
      description: item.description.trim(),
      amount: item.amount,
      taxable: item.taxable ?? true,
      sortOrder: index
    }));
    this.payrollService.update(record.id, { adjustments }).subscribe({
      next: updated => {
        this.records.update(list => list.map(item => item.id === updated.id ? updated : item));
        this.savingAdjustments.set(false);
        this.closeAdjustmentDialog();
        this.snackBar.open('Đã lưu các khoản điều chỉnh', 'OK', { duration: 2500 });
      },
      error: err => { this.savingAdjustments.set(false); this.snackBar.open(err?.error?.message || 'Lỗi lưu điều chỉnh', 'Đóng', { duration: 4000 }); }
    });
  }

  confirmPayroll() {
    if (!confirm(`Xác nhận toàn bộ bảng lương tháng ${this.selectedMonth}? Hành động không thể hoàn tác.`)) return;
    this.loading.set(true);
    this.payrollService.confirm(this.selectedMonth).subscribe({
      next: () => { this.load(); this.snackBar.open('Đã xác nhận bảng lương', 'OK', { duration: 3000 }); },
      error: () => { this.loading.set(false); this.snackBar.open('Lỗi xác nhận', 'X', { duration: 3000 }); }
    });
  }

  exportExcel() {
    this.payrollService.exportExcel(this.selectedMonth).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `payroll_${this.selectedMonth}.xlsx`; a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.snackBar.open('Lỗi xuất Excel', 'X', { duration: 3000 })
    });
  }

  resetPayroll() {
    const reason = prompt('Nhập lý do reset bảng lương:');
    if (!reason) return;
    this.payrollService.reset(this.selectedMonth, reason).subscribe({
      next: () => { this.load(); this.snackBar.open('Đã reset bảng lương', 'OK', { duration: 3000 }); },
      error: () => this.snackBar.open('Lỗi reset', 'X', { duration: 3000 })
    });
  }

  checkStale() {
    if (this.records().some(r => r.status === 'STALE')) {
      this.hasStale.set(true);
      return;
    }
    this.payrollService.staleCheck(this.selectedMonth).subscribe({
      next: v => this.hasStale.set(v),
      error: () => this.hasStale.set(false)
    });
  }

  markPaid() {
    if (!confirm(`Xác nhận đã trả lương tháng ${this.selectedMonth}?\n\nBảng lương sẽ bị KHÓA VĨNH VIỄN, không thể sửa hay reset.`)) return;
    this.payrollService.markPaid(this.selectedMonth).subscribe({
      next: () => {
        this.snackBar.open('Đã đánh dấu trả lương thành công', 'OK', { duration: 3000 });
        this.load();
      },
      error: (err) => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 4000 })
    });
  }

  onMonthChanged(val: string) { this.selectedMonth = val; this.load(); }

  statusLabel(s: string) {
    const m: Record<string, string> = { DRAFT: 'Nháp', ADJUSTED: 'Đã điều chỉnh', CONFIRMED: 'Đã xác nhận', EXPORTED: 'Đã xuất', PAID: 'Đã trả', STALE: 'Lỗi thời' };
    return m[s] || s;
  }
  statusClass(s: string) { return s?.toLowerCase() || 'draft'; }
}
