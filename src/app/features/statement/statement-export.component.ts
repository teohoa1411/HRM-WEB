import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import {
  StatementService, Statement, StatementHistory, StatementStatus
} from '../../core/services/statement.service';

type Step = 'DRAFT' | 'EXPORTED' | 'SENT' | 'CONFIRMED';

interface StepMeta {
  key: Step;
  label: string;
  icon: string;
  caption: string;
}

/**
 * Screen 07 — Xác nhận & Xuất Biên Bản Khách Hàng
 *
 * Route: /statements/customer/:customerId/:yearMonth/export
 *
 * Luồng 4 bước (stepper):
 *   DRAFT → EXPORTED → SENT → CONFIRMED
 * Mỗi bước có action button + timestamp khi hoàn tất.
 */
@Component({
  selector: 'app-statement-export',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, MatTooltipModule, MatChipsModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header" style="margin-bottom:16px;">
        <div>
          <div class="page-title">Xác Nhận & Xuất Biên Bản</div>
          <div class="page-subtitle">Quy trình 4 bước: xuất Excel → gửi KH → xác nhận</div>
        </div>
        <button mat-stroked-button [routerLink]="['/statements/customer']">
          <mat-icon>arrow_back</mat-icon> Quay lại danh sách
        </button>
      </div>

      @if (loading()) {
        <div style="padding:60px;text-align:center;">
          <mat-spinner diameter="36" style="margin:0 auto;"></mat-spinner>
        </div>
      } @else if (statement()) {
        <!-- ─── KH info card ─────────────────────────────────────────── -->
        <mat-card style="margin-bottom:18px;">
          <mat-card-content style="padding:20px!important;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;">
              <div>
                <div style="font-size:18px;font-weight:700;">{{ statement()!.recipientName }}</div>
                <div style="color:#6b7280;font-size:13px;margin-top:4px;">
                  Tháng <strong>{{ yearMonth }}</strong> ·
                  {{ statement()!.totalEmployees }} nhân sự ·
                  {{ statement()!.totalDaysWorked | number:'1.1-2' }} ngày
                </div>
              </div>
              <div style="text-align:right;">
                <div style="font-size:12px;color:#6b7280;">Tổng biên bản</div>
                <div style="font-size:22px;font-weight:700;color:#1565c0;">
                  {{ statement()!.totalAmount | number:'1.0-0' }} {{ statement()!.currency }}
                </div>
                <span class="status-chip"
                      [class.draft]="statement()!.status === 'DRAFT'"
                      [class.exported]="statement()!.status === 'EXPORTED'"
                      [class.sent]="statement()!.status === 'SENT'"
                      [class.confirmed]="statement()!.status === 'CONFIRMED'"
                      [class.stale]="statement()!.status === 'STALE'">
                  {{ svc.statusLabel(statement()!.status) }}
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- STALE banner -->
        @if (statement()!.status === 'STALE') {
          <div class="stale-banner">
            <mat-icon>warning</mat-icon>
            <div style="flex:1;">
              <strong>Biên bản đã lỗi thời</strong>
              @if (statement()!.staleReason) {
                <div style="font-size:12px;margin-top:2px;opacity:.85;">{{ statement()!.staleReason }}</div>
              }
            </div>
            <button mat-stroked-button (click)="resetToDraft()" style="border-color:#fff;color:#fff;">
              <mat-icon>restart_alt</mat-icon> Reset Nháp
            </button>
          </div>
        }

        <!-- ─── STEPPER ──────────────────────────────────────────────── -->
        <div class="stepper">
          @for (step of STEPS; track step.key; let i = $index) {
            <div class="step"
                 [class.done]="isStepDone(step.key)"
                 [class.current]="isStepCurrent(step.key)">
              <div class="step-node">
                @if (isStepDone(step.key)) {
                  <mat-icon>check</mat-icon>
                } @else {
                  <span class="step-num">{{ i + 1 }}</span>
                }
              </div>
              <div class="step-label">
                <div class="step-title">{{ step.label }}</div>
                <div class="step-caption">{{ step.caption }}</div>
              </div>
              @if (i < STEPS.length - 1) {
                <div class="step-connector" [class.done]="isStepDone(STEPS[i + 1].key)"></div>
              }
            </div>
          }
        </div>

        <!-- ─── CURRENT STEP DETAIL ─────────────────────────────────── -->
        <mat-card style="margin-top:18px;">
          <mat-card-content style="padding:24px!important;">
            <!-- STEP 1 (DRAFT → EXPORTED): Xuất Excel -->
            @if (currentStep() === 'DRAFT' || currentStep() === 'EXPORTED' || statement()!.status === 'STALE') {
              <div class="step-detail">
                <div class="step-detail-header">
                  <mat-icon class="step-icon step-icon-export">file_download</mat-icon>
                  <div>
                    <div class="sd-title">Bước 1 — Xuất file Excel biên bản</div>
                    <div class="sd-sub">
                      Tạo file Excel đa sheet (1 sheet tổng hợp + {{ statement()!.totalEmployees }} sheet chi tiết timesheet).
                      Bấm "Xuất Excel" để tải file, trạng thái sẽ chuyển sang <strong>Đã xuất</strong>.
                    </div>
                  </div>
                </div>
                @if (statement()!.exportedAt) {
                  <div class="done-note">
                    <mat-icon>check_circle</mat-icon>
                    Đã xuất lần đầu: <strong>{{ statement()!.exportedAt | date:'dd/MM/yyyy HH:mm' }}</strong>
                  </div>
                }
                <div class="step-actions">
                  <button mat-raised-button color="accent"
                          (click)="exportExcel()"
                          [disabled]="busy()">
                    @if (busy()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px;"></mat-spinner> }
                    <mat-icon>file_download</mat-icon>
                    {{ statement()!.status === 'DRAFT' ? 'Xuất Excel' : 'Tải lại Excel' }}
                  </button>
                  @if (statement()!.status === 'EXPORTED') {
                    <button mat-stroked-button color="primary" (click)="goNextStep()">
                      Tiếp tục bước 2 <mat-icon>arrow_forward</mat-icon>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- STEP 2 (EXPORTED → SENT): Gửi khách hàng -->
            @if (currentStep() === 'EXPORTED' && showStep2()) {
              <div class="step-detail" style="margin-top:24px;">
                <div class="step-detail-header">
                  <mat-icon class="step-icon step-icon-send">send</mat-icon>
                  <div>
                    <div class="sd-title">Bước 2 — Gửi biên bản cho Khách hàng</div>
                    <div class="sd-sub">
                      Sau khi gửi email/bàn giao bản in cho KH, bấm <strong>"Đã gửi KH"</strong>
                      để ghi nhận thời gian gửi và chuyển sang trạng thái chờ xác nhận.
                    </div>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-raised-button color="primary" (click)="markSent()" [disabled]="busy()">
                    <mat-icon>mark_email_read</mat-icon> Đã gửi KH
                  </button>
                </div>
              </div>
            }

            <!-- STEP 3 (SENT → CONFIRMED): KH xác nhận -->
            @if (currentStep() === 'SENT') {
              <div class="step-detail">
                <div class="step-detail-header">
                  <mat-icon class="step-icon step-icon-wait">hourglass_top</mat-icon>
                  <div>
                    <div class="sd-title">Bước 3 — Chờ Khách hàng xác nhận</div>
                    <div class="sd-sub">
                      Đã gửi: <strong>{{ statement()!.sentAt | date:'dd/MM/yyyy HH:mm' }}</strong>.
                      Khi nhận được phản hồi đồng ý từ KH (email/bản ký), bấm <strong>"KH đã xác nhận"</strong>.
                    </div>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-raised-button style="background:#16a34a;color:#fff;"
                          (click)="markConfirmed()" [disabled]="busy()">
                    <mat-icon>task_alt</mat-icon> KH đã xác nhận
                  </button>
                  <button mat-stroked-button (click)="resetToDraft()">
                    <mat-icon>restart_alt</mat-icon> Hủy & về Nháp
                  </button>
                </div>
              </div>
            }

            <!-- STEP 4 (CONFIRMED): Hoàn tất -->
            @if (currentStep() === 'CONFIRMED') {
              <div class="step-detail done">
                <div class="step-detail-header">
                  <mat-icon class="step-icon step-icon-confirm">verified</mat-icon>
                  <div>
                    <div class="sd-title" style="color:#16a34a;">Hoàn tất — Biên bản đã được Khách hàng xác nhận</div>
                    <div class="sd-sub">
                      Xác nhận: <strong>{{ statement()!.confirmedAt | date:'dd/MM/yyyy HH:mm' }}</strong>.
                      Biên bản đã chốt và có thể chuyển sang bộ phận tài chính để xuất hóa đơn.
                    </div>
                  </div>
                </div>
                <div class="step-actions">
                  <button mat-stroked-button (click)="exportExcel()" [disabled]="busy()">
                    <mat-icon>download</mat-icon> Tải lại Excel
                  </button>
                  <button mat-stroked-button (click)="resetToDraft()" color="warn">
                    <mat-icon>undo</mat-icon> Hủy xác nhận (quay về Nháp)
                  </button>
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- ─── HISTORY TIMELINE ─────────────────────────────────────── -->
        <mat-card style="margin-top:18px;">
          <mat-card-content style="padding:20px!important;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
              <div style="font-weight:700;font-size:14px;">Lịch sử thay đổi trạng thái</div>
              <button mat-icon-button (click)="loadHistory()" matTooltip="Tải lại">
                <mat-icon>refresh</mat-icon>
              </button>
            </div>
            @if (historyLoading()) {
              <mat-spinner diameter="24" style="margin:0 auto;"></mat-spinner>
            } @else if (history().length === 0) {
              <div style="color:#9ca3af;font-size:13px;text-align:center;padding:16px;">
                Chưa có lịch sử thay đổi
              </div>
            } @else {
              <div class="timeline">
                @for (h of history(); track h.id) {
                  <div class="tl-row">
                    <div class="tl-dot" [class]="'dot-' + h.toStatus.toLowerCase()"></div>
                    <div style="flex:1;">
                      <div style="font-size:13px;font-weight:600;">
                        {{ h.fromStatus ? svc.statusLabel(h.fromStatus) + ' → ' : '' }}{{ svc.statusLabel(h.toStatus) }}
                      </div>
                      <div style="font-size:11px;color:#6b7280;">
                        {{ h.changedAt | date:'dd/MM/yyyy HH:mm' }}
                      </div>
                      @if (h.changeReason) {
                        <div style="font-size:12px;color:#9ca3af;margin-top:2px;">{{ h.changeReason }}</div>
                      }
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      } @else {
        <div class="empty-state">
          <mat-icon>error_outline</mat-icon>
          <p>Không tìm thấy biên bản</p>
        </div>
      }
    </div>
  `,
  styles: [`
    .status-chip {
      display:inline-block;padding:3px 12px;border-radius:14px;font-size:12px;font-weight:600;margin-top:6px;
      &.draft    { background:#F3F4F6;color:#6B7280; }
      &.exported { background:#FEF3C7;color:#92400E; }
      &.sent     { background:#DBEAFE;color:#1D4ED8; }
      &.confirmed{ background:#DCFCE7;color:#16A34A; }
      &.stale    { background:#FEE2E2;color:#991B1B; }
    }

    /* ── Stepper ───────────────────────────────────────────────────── */
    .stepper {
      display:flex; align-items:flex-start; justify-content:space-between;
      background:#fff; padding:24px 20px; border-radius:12px;
      border:1px solid #e5e7eb;
      position:relative;
    }
    .step {
      flex:1; display:flex; flex-direction:column; align-items:center;
      position:relative; min-width:0;
    }
    .step-node {
      width:44px; height:44px; border-radius:50%;
      background:#f3f4f6; color:#9ca3af;
      display:flex;align-items:center;justify-content:center;
      font-weight:700; font-size:16px;
      border:2px solid #e5e7eb; z-index:2; background-color:#fff;
      transition:all .2s;
    }
    .step-num { font-size:15px; }
    .step.current .step-node {
      background:#eef2ff; color:#4f46e5; border-color:#6366f1;
      box-shadow:0 0 0 4px rgba(99,102,241,0.15);
    }
    .step.done .step-node {
      background:#16a34a; color:#fff; border-color:#16a34a;
      mat-icon { font-size:20px; width:20px; height:20px; }
    }
    .step-label { margin-top:8px; text-align:center; padding:0 6px; }
    .step-title { font-size:13px; font-weight:600; color:#374151; }
    .step.current .step-title { color:#4f46e5; }
    .step.done .step-title { color:#16a34a; }
    .step-caption { font-size:11px; color:#9ca3af; margin-top:2px; }
    .step-connector {
      position:absolute; top:22px; left:calc(50% + 24px); right:calc(-50% + 24px);
      height:2px; background:#e5e7eb; z-index:1;
      &.done { background:#16a34a; }
    }

    /* ── Step detail block ─────────────────────────────────────────── */
    .step-detail { }
    .step-detail.done { opacity:.95; }
    .step-detail-header {
      display:flex; gap:14px; align-items:flex-start;
    }
    .step-icon {
      font-size:32px; width:32px; height:32px; flex-shrink:0;
      padding:8px; border-radius:10px;
    }
    .step-icon-export  { background:#FEF3C7; color:#B45309; }
    .step-icon-send    { background:#DBEAFE; color:#1D4ED8; }
    .step-icon-wait    { background:#F3E8FF; color:#7E22CE; }
    .step-icon-confirm { background:#DCFCE7; color:#16A34A; }
    .sd-title { font-size:15px; font-weight:700; color:#111827; }
    .sd-sub   { font-size:13px; color:#6b7280; margin-top:4px; line-height:1.5; }
    .done-note {
      margin-top:12px; padding:8px 12px;
      background:#ECFDF5; border:1px solid #6EE7B7; border-radius:8px;
      color:#065F46; font-size:12.5px;
      display:flex; align-items:center; gap:6px;
      mat-icon { font-size:18px; width:18px; height:18px; color:#10B981; }
    }
    .step-actions {
      margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;
    }

    /* ── Timeline ──────────────────────────────────────────────────── */
    .timeline { display:flex; flex-direction:column; gap:10px; }
    .tl-row { display:flex; gap:10px; padding:8px 0; border-bottom:1px dashed #f3f4f6; }
    .tl-row:last-child { border-bottom:none; }
    .tl-dot {
      width:10px; height:10px; border-radius:50%; margin-top:5px; flex-shrink:0;
      &.dot-draft    { background:#9CA3AF; }
      &.dot-exported { background:#F59E0B; }
      &.dot-sent     { background:#3B82F6; }
      &.dot-confirmed{ background:#22C55E; }
      &.dot-stale    { background:#EF4444; }
    }

    /* ── Misc ──────────────────────────────────────────────────────── */
    .stale-banner {
      display:flex;align-items:center;gap:12px;
      background:#DC2626;color:#fff;padding:12px 16px;border-radius:10px;margin-bottom:12px;
      mat-icon { color:#fff; }
    }
    .empty-state {
      text-align:center; padding:60px; color:#9CA3AF;
      mat-icon { font-size:48px; width:48px; height:48px; }
    }
  `]
})
export class StatementExportComponent implements OnInit {
  protected readonly svc = inject(StatementService);
  private readonly snack = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly STEPS: StepMeta[] = [
    { key: 'DRAFT',     label: 'Nháp',              icon: 'edit_note',     caption: 'Đang chuẩn bị' },
    { key: 'EXPORTED',  label: 'Xuất Excel',        icon: 'file_download', caption: 'Đã có file' },
    { key: 'SENT',      label: 'Gửi khách hàng',    icon: 'send',          caption: 'Chờ KH xác nhận' },
    { key: 'CONFIRMED', label: 'KH xác nhận',       icon: 'verified',      caption: 'Hoàn tất' },
  ];

  readonly customerId = signal<number>(0);
  readonly yearMonth  = signal<string>('');
  readonly loading    = signal(false);
  readonly busy       = signal(false);
  readonly statement  = signal<Statement | null>(null);
  readonly history    = signal<StatementHistory[]>([]);
  readonly historyLoading = signal(false);

  readonly currentStep = computed<Step>(() => {
    const st = this.statement();
    if (!st) return 'DRAFT';
    if (st.status === 'STALE') return 'DRAFT';
    return st.status as Step;
  });

  ngOnInit(): void {
    const cid = Number(this.route.snapshot.paramMap.get('customerId'));
    const ym  = this.route.snapshot.paramMap.get('yearMonth') ?? '';
    this.customerId.set(cid);
    this.yearMonth.set(ym);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.svc.getCustomerStatement(this.customerId(), this.yearMonth()).subscribe({
      next: s => {
        this.statement.set(s);
        this.loading.set(false);
        this.loadHistory();
      },
      error: err => {
        this.loading.set(false);
        this.snack.open(err?.error?.message ?? 'Không tải được biên bản', 'Đóng', { duration: 4000 });
      }
    });
  }

  loadHistory(): void {
    this.historyLoading.set(true);
    this.svc.getCustomerHistory(this.customerId(), this.yearMonth()).subscribe({
      next: list => { this.history.set(list); this.historyLoading.set(false); },
      error: () => this.historyLoading.set(false)
    });
  }

  isStepDone(step: Step): boolean {
    const order: Step[] = ['DRAFT', 'EXPORTED', 'SENT', 'CONFIRMED'];
    const cur = this.statement()?.status;
    if (!cur || cur === 'STALE') return false;
    return order.indexOf(cur as Step) > order.indexOf(step);
  }

  isStepCurrent(step: Step): boolean {
    return this.currentStep() === step;
  }

  /** Step 2 panel chỉ hiện khi đã EXPORTED */
  showStep2(): boolean {
    return this.statement()?.status === 'EXPORTED';
  }

  goNextStep(): void {
    // Chỉ cần cuộn xuống/hoặc reload; trong template step 2 tự hiện
    // khi currentStep = EXPORTED.
    const el = document.querySelector('.step-detail:nth-of-type(2)');
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  exportExcel(): void {
    this.busy.set(true);
    this.svc.exportCustomerExcel(this.customerId(), this.yearMonth()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bienban_kh_${this.customerId()}_${this.yearMonth()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.busy.set(false);
        this.snack.open('Đã xuất file Excel', 'Đóng', { duration: 3000 });
        this.load();
      },
      error: err => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Không xuất được Excel', 'Đóng', { duration: 4000 });
      }
    });
  }

  markSent(): void {
    if (!confirm('Xác nhận đã gửi biên bản cho khách hàng?')) return;
    this.busy.set(true);
    this.svc.markCustomerSent(this.customerId(), this.yearMonth()).subscribe({
      next: s => {
        this.statement.set(s);
        this.busy.set(false);
        this.snack.open('Đã ghi nhận gửi KH', 'Đóng', { duration: 3000 });
        this.loadHistory();
      },
      error: err => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 4000 });
      }
    });
  }

  markConfirmed(): void {
    if (!confirm('Khách hàng đã xác nhận biên bản? Sau khi xác nhận, biên bản sẽ được chốt.')) return;
    this.busy.set(true);
    this.svc.markCustomerConfirmed(this.customerId(), this.yearMonth()).subscribe({
      next: s => {
        this.statement.set(s);
        this.busy.set(false);
        this.snack.open('Biên bản đã được xác nhận', 'Đóng', { duration: 3000 });
        this.loadHistory();
      },
      error: err => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 4000 });
      }
    });
  }

  resetToDraft(): void {
    const reason = prompt('Lý do reset về nháp? (tối thiểu 10 ký tự)');
    if (!reason || reason.trim().length < 10) {
      this.snack.open('Cần nhập lý do hợp lệ', 'Đóng', { duration: 3000 });
      return;
    }
    this.busy.set(true);
    this.svc.resetCustomerDraft(this.customerId(), this.yearMonth()).subscribe({
      next: s => {
        this.statement.set(s);
        this.busy.set(false);
        this.snack.open('Đã reset về Nháp', 'Đóng', { duration: 3000 });
        this.loadHistory();
      },
      error: err => {
        this.busy.set(false);
        this.snack.open(err?.error?.message ?? 'Lỗi', 'Đóng', { duration: 4000 });
      }
    });
  }
}
