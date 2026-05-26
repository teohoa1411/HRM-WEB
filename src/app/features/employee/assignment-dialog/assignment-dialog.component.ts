import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AssignmentService } from '../../../core/services/assignment.service';
import { CustomerService } from '../../../core/services/customer.service';
import { Assignment } from '../../../core/models/assignment.models';
import { Customer } from '../../../core/models/customer.models';

@Component({
  selector: 'app-assignment-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule,
    MatButtonModule, MatIconModule,
    MatSnackBarModule, MatRippleModule, MatTooltipModule
  ],
  template: `
    <!-- ══ DIALOG SHELL ══════════════════════════════════════════ -->
    <div class="ad-shell">

      <!-- HEADER -->
      <div class="ad-header">
        <div class="ad-header-left">
          <div class="ad-icon"><mat-icon>assignment_ind</mat-icon></div>
          <div>
            <div class="ad-title">Phân công dự án</div>
            <div class="ad-sub">
              <mat-icon class="ad-sub-icon">person</mat-icon>
              {{ data.employeeName || ('Nhân sự #' + data.employeeId) }}
            </div>
          </div>
        </div>
        <button class="ad-close" mat-dialog-close matRipple>
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <!-- BODY: two-column layout -->
      <div class="ad-body">

        <!-- ── LEFT: ADD FORM ───────────────────────── -->
        <div class="ad-form-col">
          <div class="col-title">
            <mat-icon>add_circle_outline</mat-icon>
            Thêm phân công mới
          </div>

          <form [formGroup]="form" (ngSubmit)="save()" class="ad-form">

            <!-- Khách hàng -->
            <div class="ff">
              <label class="fl">Khách hàng <span class="req">*</span></label>
              @if (loadingCustomers()) {
                <div class="field-loading">
                  <mat-icon class="spin">autorenew</mat-icon>
                  Đang tải...
                </div>
              } @else {
                <select class="fi" formControlName="customerId"
                  [class.fi-error]="form.get('customerId')?.invalid && form.get('customerId')?.touched">
                  <option [ngValue]="null" disabled>-- Chọn khách hàng --</option>
                  @for (c of customers(); track c.id) {
                    <option [ngValue]="c.id">{{ c.name }}</option>
                  }
                </select>
                @if (customers().length === 0 && !loadingCustomers()) {
                  <div class="field-hint warn">
                    <mat-icon>warning_amber</mat-icon>
                    Chưa có khách hàng nào. Vui lòng thêm khách hàng trước.
                  </div>
                }
              }
              @if (form.get('customerId')?.invalid && form.get('customerId')?.touched) {
                <div class="field-err">Vui lòng chọn khách hàng</div>
              }
            </div>

            <!-- TCB User + Location -->
            <div class="ff-row">
              <div class="ff">
                <label class="fl">TCB user <span class="opt">(username KH)</span></label>
                <input class="fi" formControlName="clientUsername"
                  placeholder="VD: ps1.linhdn">
              </div>
              <div class="ff">
                <label class="fl">Location <span class="opt">(văn phòng)</span></label>
                <input class="fi" formControlName="workLocation"
                  placeholder="VD: QT, TDH, THD">
              </div>
            </div>

            <!-- Ngày bắt đầu / kết thúc -->
            <div class="ff-row">
              <div class="ff">
                <label class="fl">Ngày bắt đầu <span class="req">*</span></label>
                <input class="fi" type="date" formControlName="startDate"
                  [class.fi-error]="form.get('startDate')?.invalid && form.get('startDate')?.touched">
                @if (form.get('startDate')?.invalid && form.get('startDate')?.touched) {
                  <div class="field-err">Bắt buộc nhập ngày bắt đầu</div>
                }
              </div>
              <div class="ff">
                <label class="fl">Ngày kết thúc <span class="opt">(tùy chọn)</span></label>
                <input class="fi" type="date" formControlName="endDate">
              </div>
            </div>

            <!-- Validate end >= start -->
            @if (dateRangeError()) {
              <div class="field-err" style="margin-top:-8px;">
                <mat-icon style="font-size:14px;width:14px;height:14px;">error_outline</mat-icon>
                Ngày kết thúc phải sau ngày bắt đầu
              </div>
            }

            <!-- Ghi chú -->
            <div class="ff">
              <label class="fl">Ghi chú</label>
              <textarea class="fi fi-textarea" formControlName="notes"
                placeholder="Mô tả chi tiết dự án, yêu cầu..." rows="2"></textarea>
            </div>

            <!-- Submit -->
            <button type="submit" class="btn-save" matRipple
              [disabled]="form.invalid || saving() || dateRangeError()">
              @if (saving()) {
                <mat-icon class="spin">autorenew</mat-icon>
                Đang lưu...
              } @else {
                <mat-icon>save</mat-icon>
                Lưu phân công
              }
            </button>

          </form>
        </div>

        <!-- ── RIGHT: HISTORY ───────────────────────── -->
        <div class="ad-history-col">
          <div class="col-title">
            <mat-icon>history</mat-icon>
            Lịch sử phân công
            @if (assignments().length > 0) {
              <span class="history-count">{{ assignments().length }}</span>
            }
          </div>

          @if (loadingAssignments()) {
            <!-- Skeleton -->
            @for (i of [1,2]; track i) {
              <div class="assignment-card skeleton">
                <div class="sk-line sk-name"></div>
                <div class="sk-line sk-meta"></div>
              </div>
            }
          } @else if (assignments().length === 0) {
            <div class="history-empty">
              <div class="history-empty-icon"><mat-icon>folder_open</mat-icon></div>
              <div class="history-empty-title">Chưa có phân công</div>
              <div class="history-empty-sub">Thêm phân công đầu tiên ở bên trái</div>
            </div>
          } @else {
            <div class="assignment-list">
              @for (a of assignments(); track a.id) {
                <div class="assignment-card" [class.ac-active]="!a.endDate">
                  <!-- Card top: customer + delete -->
                  <div class="ac-top">
                    <div class="ac-customer-wrap">
                      <div class="ac-dot" [class.dot-active]="!a.endDate"></div>
                      <span class="ac-customer">{{ a.customerName || 'Khách hàng #' + a.customerId }}</span>
                    </div>
                    <button class="ac-del" (click)="deleteAssignment(a)"
                      matRipple matTooltip="Xóa phân công">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </div>

                  <!-- Project name + code -->
                  @if (a.projectName) {
                    <div class="ac-project">
                      <mat-icon>work_outline</mat-icon>
                      {{ a.projectName }}
                      @if (a.projectCode) {
                        <span class="ac-code">{{ a.projectCode }}</span>
                      }
                    </div>
                  }

                  <!-- Client user + location -->
                  @if (a.clientUsername || a.workLocation) {
                    <div class="ac-meta-row">
                      @if (a.clientUsername) {
                        <span class="ac-meta-chip">
                          <mat-icon>badge</mat-icon>{{ a.clientUsername }}
                        </span>
                      }
                      @if (a.workLocation) {
                        <span class="ac-meta-chip">
                          <mat-icon>location_on</mat-icon>{{ a.workLocation }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Date range -->
                  <div class="ac-dates">
                    <mat-icon>calendar_today</mat-icon>
                    <span>{{ formatDate(a.startDate) }}</span>
                    <span class="ac-arrow">→</span>
                    @if (a.endDate) {
                      <span>{{ formatDate(a.endDate) }}</span>
                    } @else {
                      <span class="ac-current">Hiện tại</span>
                    }
                  </div>

                  <!-- Notes -->
                  @if (a.notes) {
                    <div class="ac-notes">
                      <mat-icon>notes</mat-icon>
                      <span>{{ a.notes }}</span>
                    </div>
                  }

                  <!-- Active badge -->
                  @if (!a.endDate) {
                    <div class="ac-active-badge">
                      <span class="ac-badge-dot"></span>
                      Đang thực hiện
                    </div>
                  }
                </div>
              }
            </div>
          }
        </div>

      </div><!-- /ad-body -->

      <!-- FOOTER -->
      <div class="ad-footer">
        <span class="ad-footer-info">
          <mat-icon>info_outline</mat-icon>
          {{ assignments().length }} phân công · {{ activeCount() }} đang thực hiện
        </span>
        <button class="btn-close" mat-dialog-close matRipple>Đóng</button>
      </div>

    </div>
  `,
  styles: [`
    /* ══ SHELL ══════════════════════════════════════════════ */
    .ad-shell {
      display: flex; flex-direction: column;
      width: 100%;
      max-height: 90vh;
      background: #fff;
      border-radius: 16px;
      overflow: hidden;
      font-family: 'Be Vietnam Pro', 'Segoe UI', sans-serif;
    }

    /* ══ HEADER ════════════════════════════════════════════ */
    .ad-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 24px 18px;
      background: linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%);
      flex-shrink: 0;
    }
    .ad-header-left { display: flex; align-items: center; gap: 14px; }
    .ad-icon {
      width: 44px; height: 44px; border-radius: 12px;
      background: rgba(255,255,255,0.2);
      backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { color: #fff; font-size: 22px; width: 22px; height: 22px; }
    }
    .ad-title { font-size: 17px; font-weight: 800; color: #fff; line-height: 1.3; }
    .ad-sub {
      display: flex; align-items: center; gap: 4px;
      font-size: 12.5px; color: rgba(255,255,255,0.8); margin-top: 2px;
    }
    .ad-sub-icon { font-size: 13px; width: 13px; height: 13px; }
    .ad-close {
      width: 34px; height: 34px; border-radius: 8px; border: none;
      background: rgba(255,255,255,0.15); cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff; transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.25); }
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* ══ BODY ══════════════════════════════════════════════ */
    .ad-body {
      display: flex;
      flex: 1;
      overflow: hidden;
      min-height: 0;
    }

    /* ── Column shared ── */
    .col-title {
      display: flex; align-items: center; gap: 7px;
      font-size: 12px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 0.8px;
      color: #6B7280; margin-bottom: 16px;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #9CA3AF; }
    }
    .history-count {
      background: #6366F1; color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 1px 6px; border-radius: 10px;
      text-transform: none; letter-spacing: 0;
    }

    /* ── Left: Form column ── */
    .ad-form-col {
      width: 420px;
      flex-shrink: 0;
      padding: 24px 24px 24px 28px;
      border-right: 1px solid #F3F4F6;
      overflow-y: auto;
      background: #FAFAFA;
    }

    /* ── Right: History column ── */
    .ad-history-col {
      flex: 1;
      padding: 24px 28px 24px 24px;
      overflow-y: auto;
      background: #fff;
    }

    /* ══ FORM FIELDS ═══════════════════════════════════════ */
    .ad-form { display: flex; flex-direction: column; gap: 14px; }
    .ff { display: flex; flex-direction: column; gap: 5px; }
    .ff-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .fl {
      font-size: 12px; font-weight: 600; color: #374151;
    }
    .req { color: #EF4444; margin-left: 2px; }
    .opt { font-size: 11px; font-weight: 400; color: #9CA3AF; margin-left: 3px; }

    .fi {
      height: 36px;
      padding: 0 10px;
      border: 1.5px solid #E5E7EB;
      border-radius: 8px;
      font-size: 13px; color: #111827;
      background: #fff;
      box-sizing: border-box;
      width: 100%;
      font-family: inherit;
      transition: border-color 0.15s, box-shadow 0.15s;
      &:focus {
        outline: none;
        border-color: #6366F1;
        box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
      }
    }
    .fi-textarea {
      height: auto; padding: 8px 10px; resize: none;
      line-height: 1.5;
    }
    .fi-error {
      border-color: #EF4444 !important;
      &:focus { box-shadow: 0 0 0 3px rgba(239,68,68,0.12) !important; }
    }
    select.fi { cursor: pointer; }

    .field-err {
      display: flex; align-items: center; gap: 4px;
      font-size: 11.5px; color: #EF4444; font-weight: 500;
    }
    .field-hint {
      display: flex; align-items: center; gap: 4px;
      font-size: 11.5px; font-weight: 500;
      &.warn { color: #D97706; }
      mat-icon { font-size: 13px; width: 13px; height: 13px; }
    }
    .field-loading {
      display: flex; align-items: center; gap: 6px;
      font-size: 13px; color: #9CA3AF; padding: 8px 0;
    }

    .btn-save {
      display: flex; align-items: center; justify-content: center; gap: 7px;
      height: 40px; width: 100%;
      background: linear-gradient(135deg, #0EA5E9, #6366F1);
      color: #fff; border: none; border-radius: 9px;
      font-size: 13.5px; font-weight: 700;
      cursor: pointer; transition: all 0.15s;
      font-family: inherit; margin-top: 4px;
      box-shadow: 0 2px 8px rgba(99,102,241,0.3);
      mat-icon { font-size: 17px; width: 17px; height: 17px; }
      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 14px rgba(99,102,241,0.4);
      }
      &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    }

    /* ══ ASSIGNMENT HISTORY CARDS ══════════════════════════ */
    .assignment-list { display: flex; flex-direction: column; gap: 10px; }

    .assignment-card {
      background: #F9FAFB;
      border: 1.5px solid #E5E7EB;
      border-radius: 12px;
      padding: 12px 14px;
      transition: all 0.15s;
      &:hover { border-color: #C7D2FE; background: #F5F7FF; }
    }
    .ac-active {
      border-color: #BAE6FD !important;
      background: #F0F9FF !important;
    }

    .ac-top {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 6px;
    }
    .ac-customer-wrap { display: flex; align-items: center; gap: 8px; }
    .ac-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: #D1D5DB; flex-shrink: 0;
    }
    .dot-active { background: #22C55E; box-shadow: 0 0 0 3px rgba(34,197,94,0.2); }
    .ac-customer { font-size: 13.5px; font-weight: 700; color: #111827; }

    .ac-del {
      width: 28px; height: 28px; border: none; border-radius: 6px;
      background: transparent; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #D1D5DB; transition: all 0.15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: #FEE2E2; color: #EF4444; }
    }

    .ac-project {
      display: flex; align-items: center; gap: 5px;
      font-size: 12.5px; color: #6366F1; font-weight: 600;
      margin-bottom: 5px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .ac-code {
      background: #EEF2FF; color: #6366F1;
      font-size: 10.5px; font-weight: 700;
      padding: 1px 6px; border-radius: 6px;
      letter-spacing: 0.3px;
    }
    .ac-meta-row {
      display: flex; align-items: center; gap: 6px;
      flex-wrap: wrap; margin-bottom: 5px;
    }
    .ac-meta-chip {
      display: inline-flex; align-items: center; gap: 3px;
      font-size: 11px; color: #6B7280;
      background: #F3F4F6; border-radius: 6px;
      padding: 2px 7px;
      mat-icon { font-size: 12px; width: 12px; height: 12px; color: #9CA3AF; }
    }

    .ac-dates {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #6B7280; margin-bottom: 4px;
      mat-icon { font-size: 13px; width: 13px; height: 13px; color: #9CA3AF; }
    }
    .ac-arrow { color: #9CA3AF; }
    .ac-current { color: #22C55E; font-weight: 600; }

    .ac-notes {
      display: flex; align-items: flex-start; gap: 4px;
      font-size: 11.5px; color: #9CA3AF;
      mat-icon { font-size: 13px; width: 13px; height: 13px; margin-top: 1px; flex-shrink: 0; }
      span { overflow: hidden; text-overflow: ellipsis;
        display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
    }

    .ac-active-badge {
      display: inline-flex; align-items: center; gap: 5px;
      margin-top: 7px;
      background: #DCFCE7; color: #16A34A;
      font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 10px;
    }
    .ac-badge-dot {
      width: 6px; height: 6px; border-radius: 50%;
      background: #22C55E;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }

    /* ══ EMPTY STATE ═══════════════════════════════════════ */
    .history-empty {
      padding: 40px 20px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .history-empty-icon {
      width: 52px; height: 52px; border-radius: 50%;
      background: #F3F4F6;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 24px; width: 24px; height: 24px; color: #9CA3AF; }
    }
    .history-empty-title { font-size: 14px; font-weight: 700; color: #374151; }
    .history-empty-sub   { font-size: 12.5px; color: #9CA3AF; }

    /* ══ SKELETON ══════════════════════════════════════════ */
    .sk-line {
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 6px; height: 12px; margin-bottom: 8px;
    }
    .sk-name  { width: 65%; height: 14px; }
    .sk-meta  { width: 85%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ══ FOOTER ════════════════════════════════════════════ */
    .ad-footer {
      display: flex; align-items: center; justify-content: space-between;
      padding: 12px 24px;
      border-top: 1px solid #F3F4F6;
      background: #FAFAFA;
      flex-shrink: 0;
    }
    .ad-footer-info {
      display: flex; align-items: center; gap: 5px;
      font-size: 12px; color: #9CA3AF;
      mat-icon { font-size: 14px; width: 14px; height: 14px; }
    }
    .btn-close {
      height: 34px; padding: 0 18px;
      border: 1.5px solid #E5E7EB; border-radius: 8px;
      background: #fff; color: #374151; font-size: 13px; font-weight: 600;
      cursor: pointer; font-family: inherit;
      transition: all 0.15s;
      &:hover { background: #F3F4F6; }
    }

    /* ══ UTILS ═════════════════════════════════════════════ */
    .spin {
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }

    /* ══ RESPONSIVE ════════════════════════════════════════ */

    /* Tablet: form col thu hẹp, history giãn */
    @media (max-width: 900px) {
      .ad-form-col { width: 340px; padding: 20px; }
      .ad-history-col { padding: 20px; }
    }

    /* Mobile: stack dọc */
    @media (max-width: 640px) {
      .ad-shell { border-radius: 12px; }
      .ad-body { flex-direction: column; overflow-y: auto; }
      .ad-form-col {
        width: 100%; border-right: none;
        border-bottom: 1px solid #F3F4F6;
        padding: 16px;
      }
      .ad-history-col { padding: 16px; }
      .ff-row { grid-template-columns: 1fr; }
    }

    /* Very small */
    @media (max-width: 400px) {
      .ad-shell { border-radius: 0; }
      .ad-header { padding: 14px 16px; }
      .ad-footer { padding: 10px 16px; }
    }
  `]
})
export class AssignmentDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private assignmentService = inject(AssignmentService);
  private customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);
  readonly data: { employeeId: string; employeeName?: string } = inject(MAT_DIALOG_DATA);

  readonly assignments      = signal<Assignment[]>([]);
  readonly customers        = signal<Customer[]>([]);
  readonly saving           = signal(false);
  readonly loadingCustomers = signal(false);
  readonly loadingAssignments = signal(false);

  readonly form = this.fb.group({
    customerId:     [null as number | null, Validators.required],
    clientUsername: [''],
    workLocation:   [''],
    startDate:      ['', Validators.required],
    endDate:        [''],
    notes:          ['']
  });

  ngOnInit() {
    this.loadAssignments();
    this.loadCustomers();
  }

  loadAssignments() {
    this.loadingAssignments.set(true);
    this.assignmentService.getByEmployee(this.data.employeeId).subscribe({
      next: list => { this.assignments.set(list); this.loadingAssignments.set(false); },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Lỗi khi tải danh sách phân công', 'Đóng', { duration: 3000 });
        this.loadingAssignments.set(false);
      }
    });
  }

  loadCustomers() {
    this.loadingCustomers.set(true);
    this.customerService.listActive().subscribe({
      next: list => { this.customers.set(list); this.loadingCustomers.set(false); },
      error: () => {
        // fallback: thử lấy toàn bộ danh sách
        this.customerService.list({ size: 100 }).subscribe({
          next: page => { this.customers.set(page.content ?? []); this.loadingCustomers.set(false); },
          error: () => this.loadingCustomers.set(false)
        });
      }
    });
  }

  dateRangeError(): boolean {
    const start = this.form.get('startDate')?.value;
    const end   = this.form.get('endDate')?.value;
    if (!start || !end) return false;
    return end < start;
  }

  activeCount(): number {
    return this.assignments().filter(a => !a.endDate).length;
  }

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.dateRangeError()) return;

    const v = this.form.getRawValue();
    this.saving.set(true);

    this.assignmentService.create(this.data.employeeId, {
      customerId:     v.customerId!,
      clientUsername: v.clientUsername?.trim() || undefined,
      workLocation:   v.workLocation?.trim() || undefined,
      startDate:      v.startDate!,
      endDate:        v.endDate?.trim() || undefined,
      notes:          v.notes?.trim() || undefined
    }).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu phân công thành công', 'OK', {
          duration: 2500,
          panelClass: ['success-snack']
        });
        this.saving.set(false);
        this.form.reset({ customerId: null, clientUsername: '', workLocation: '', startDate: '', endDate: '', notes: '' });
        this.form.markAsUntouched();
        this.loadAssignments();
      },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Lỗi khi lưu phân công', 'Đóng', {
          duration: 3500,
          panelClass: ['error-snack']
        });
        this.saving.set(false);
      }
    });
  }

  deleteAssignment(a: Assignment) {
    if (!confirm(`Xóa phân công dự án "${a.projectName || a.customerName}"?`)) return;
    this.assignmentService.delete(a.id).subscribe({
      next: () => {
        this.snackBar.open('Đã xóa phân công', 'OK', { duration: 2000 });
        this.loadAssignments();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi khi xóa', 'Đóng', { duration: 3000 })
    });
  }

  formatDate(d: string): string {
    if (!d) return '';
    const [y, m, day] = d.split('-');
    return `${day}/${m}/${y}`;
  }
}
