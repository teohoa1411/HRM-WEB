import { Component, inject, OnInit, signal, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRippleModule } from '@angular/material/core';
import { LeaveService } from '../../../core/services/leave.service';
import { LeaveRequest, LeaveType, CreateLeaveRequest, HalfDayPeriod } from '../../../core/models/leave.models';

@Component({
  selector: 'app-leave-employee',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatSnackBarModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatRippleModule
  ],
  template: `
    <!-- ══════════════════════════════════════════
         HEADER BANNER
    ══════════════════════════════════════════ -->
    <div class="hero">
      <div class="hero-bg"></div>
      <div class="hero-content">
        <div class="hero-icon"><mat-icon>beach_access</mat-icon></div>
        <div>
          <div class="hero-title">Đơn Xin Nghỉ Phép</div>
          <div class="hero-sub">Gửi và theo dõi đơn nghỉ phép của bạn</div>
        </div>
      </div>
    </div>

    <div class="page-wrap">

      <!-- ══════════════════════════════════════════
           LEAVE TYPE CHIPS  (horizontal scroll)
      ══════════════════════════════════════════ -->
      <div class="section-label">Loại nghỉ phép</div>
      <div class="type-scroll">
        @for (t of leaveTypes(); track t.id) {
          <div class="type-pill">
            <span class="type-pill-icon"><mat-icon>{{ typeIcon(t.code) }}</mat-icon></span>
            <div>
              <div class="type-pill-name">{{ t.name }}</div>
              <div class="type-pill-meta">{{ t.maxDays }}ngày/năm · {{ t.paid ? 'Có lương' : 'Không lương' }}</div>
            </div>
          </div>
        }
        @if (leaveTypes().length === 0 && !loadingTypes()) {
          <div class="type-empty">Chưa có loại nghỉ phép nào</div>
        }
      </div>

      <!-- ══════════════════════════════════════════
           FILTER TABS
      ══════════════════════════════════════════ -->
      <div class="section-label" style="margin-top:20px;">
        Đơn của tôi
        <span class="req-count">{{ requests().length }}</span>
      </div>
      <div class="filter-scroll">
        @for (f of statusFilters; track f.value) {
          <button class="filter-tab"
            [class.active]="filterStatus() === f.value"
            (click)="setFilter(f.value)">
            <mat-icon class="tab-icon">{{ f.icon }}</mat-icon>
            {{ f.label }}
          </button>
        }
      </div>

      <!-- ══════════════════════════════════════════
           REQUEST CARDS LIST
      ══════════════════════════════════════════ -->
      <div class="req-list">

        @if (loading()) {
          @for (i of [1,2,3]; track i) {
            <div class="req-card skeleton">
              <div class="sk-line sk-title"></div>
              <div class="sk-line sk-meta"></div>
              <div class="sk-line sk-short"></div>
            </div>
          }
        }

        @if (!loading() && requests().length === 0) {
          <div class="empty-state">
            <div class="empty-illustration">
              <mat-icon>event_available</mat-icon>
            </div>
            <div class="empty-title">Chưa có đơn xin nghỉ</div>
            <div class="empty-sub">Nhấn nút <strong>+</strong> để gửi đơn mới</div>
          </div>
        }

        @for (r of requests(); track r.id) {
          <div class="req-card" [class]="'border-' + r.status.toLowerCase()">
            <!-- Top row: type + status -->
            <div class="req-top">
              <div class="req-type">
                <span class="req-type-icon">
                  <mat-icon>{{ typeIcon(r.leaveTypeName || '') }}</mat-icon>
                </span>
                <span class="req-type-name">{{ r.leaveTypeName || '—' }}</span>
              </div>
              <span class="status-pill" [class]="'sp-' + r.status.toLowerCase()">
                <mat-icon>{{ statusIcon(r.status) }}</mat-icon>
                {{ statusLabel(r.status) }}
              </span>
            </div>

            <!-- Date row -->
            <div class="req-dates">
              <mat-icon class="req-date-icon">calendar_today</mat-icon>
              <span class="req-date-text">
                {{ formatDate(r.startDate) }}
                @if (r.startDate !== r.endDate) { <span> — {{ formatDate(r.endDate) }}</span> }
              </span>
              <span class="req-days-badge">{{ r.totalDays }} ngày</span>
              @if (r.halfDay && r.halfDayPeriod) {
                <span class="half-day-badge">{{ r.halfDayPeriod === 'MORNING' ? 'Sáng' : 'Chiều' }}</span>
              }
            </div>

            <!-- Reason -->
            @if (r.reason) {
              <div class="req-reason">
                <mat-icon>notes</mat-icon>
                <span>{{ r.reason }}</span>
              </div>
            }

            <!-- Reject reason -->
            @if (r.rejectReason) {
              <div class="req-reject">
                <mat-icon>info_outline</mat-icon>
                <span>{{ r.rejectReason }}</span>
              </div>
            }

            <!-- Cancel action -->
            @if (r.status === 'PENDING') {
              <div class="req-actions">
                <button class="btn-cancel-req" (click)="cancelRequest(r)" matRipple>
                  <mat-icon>close</mat-icon>
                  Hủy đơn
                </button>
              </div>
            }
          </div>
        }
      </div>

    </div><!-- /page-wrap -->

    <!-- ══════════════════════════════════════════
         FAB BUTTON
    ══════════════════════════════════════════ -->
    <button class="fab" (click)="openForm()" matRipple>
      <mat-icon>add</mat-icon>
      <span class="fab-label">Gửi đơn mới</span>
    </button>

    <!-- ══════════════════════════════════════════
         FORM OVERLAY (bottom-sheet style)
    ══════════════════════════════════════════ -->
    @if (showForm()) {
      <div class="overlay" (click)="closeForm()"></div>
      <div class="sheet" [class.sheet-open]="sheetVisible()">

        <div class="sheet-drag-handle"></div>

        <div class="sheet-header">
          <div class="sheet-title">
            <mat-icon>edit_note</mat-icon>
            Gửi đơn xin nghỉ
          </div>
          <button class="sheet-close" (click)="closeForm()">
            <mat-icon>close</mat-icon>
          </button>
        </div>

        <div class="sheet-body">

          <!-- Loại nghỉ -->
          <div class="field-group">
            <label class="field-label">Loại nghỉ phép <span class="req-star">*</span></label>
            <div class="type-select-grid">
              @for (t of leaveTypes(); track t.id) {
                <button class="type-opt"
                  [class.type-opt-selected]="form.leaveTypeId === t.id"
                  (click)="form.leaveTypeId = t.id" matRipple>
                  <mat-icon>{{ typeIcon(t.code) }}</mat-icon>
                  <span>{{ t.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Ngày -->
          <div class="field-group">
            <label class="field-label">Thời gian nghỉ <span class="req-star">*</span></label>
            <div class="date-inputs">
              <div class="date-field">
                <label class="date-sub-label">Từ ngày</label>
                <input class="native-date" type="date" [(ngModel)]="form.startDate"
                  (ngModelChange)="onDateChange()">
              </div>
              <div class="date-arrow"><mat-icon>arrow_forward</mat-icon></div>
              <div class="date-field">
                <label class="date-sub-label">Đến ngày</label>
                <input class="native-date" type="date" [(ngModel)]="form.endDate"
                  (ngModelChange)="onDateChange()">
              </div>
            </div>
          </div>

          <!-- Loại nghỉ: cả ngày / nửa ngày -->
          <div class="field-group">
            <label class="field-label">Thời lượng nghỉ <span class="req-star">*</span></label>
            <div class="duration-toggle">
              <button class="dur-opt" [class.dur-selected]="!form.halfDay"
                (click)="setHalfDay(false)" matRipple>
                <mat-icon>wb_sunny</mat-icon>
                <div>
                  <div class="dur-title">Cả ngày</div>
                  <div class="dur-sub">8 giờ / ngày</div>
                </div>
              </button>
              <button class="dur-opt" [class.dur-selected]="form.halfDay"
                (click)="setHalfDay(true)" matRipple>
                <mat-icon>wb_twilight</mat-icon>
                <div>
                  <div class="dur-title">Nửa ngày</div>
                  <div class="dur-sub">4 giờ / ngày</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Buổi sáng / chiều (chỉ khi nửa ngày) -->
          @if (form.halfDay) {
            <div class="field-group">
              <label class="field-label">Nghỉ buổi <span class="req-star">*</span></label>
              <div class="duration-toggle">
                <button class="dur-opt" [class.dur-selected]="form.halfDayPeriod === 'MORNING'"
                  (click)="form.halfDayPeriod = 'MORNING'" matRipple>
                  <mat-icon>wb_sunny</mat-icon>
                  <div>
                    <div class="dur-title">Buổi sáng</div>
                    <div class="dur-sub">Ca sáng (MORNING)</div>
                  </div>
                </button>
                <button class="dur-opt" [class.dur-selected]="form.halfDayPeriod === 'AFTERNOON'"
                  (click)="form.halfDayPeriod = 'AFTERNOON'" matRipple>
                  <mat-icon>nights_stay</mat-icon>
                  <div>
                    <div class="dur-title">Buổi chiều</div>
                    <div class="dur-sub">Ca chiều (AFTERNOON)</div>
                  </div>
                </button>
              </div>
            </div>
          }

          <!-- Số ngày (hiển thị, tự tính server-side) -->
          <div class="field-group">
            <label class="field-label">Tổng số ngày nghỉ (ước tính)</label>
            <div class="days-summary">
              <div class="days-summary-num">{{ estimatedDays() }}</div>
              <div class="days-summary-detail">
                {{ calendarDays() }} ngày lịch × {{ form.halfDay ? '0.5' : '1' }} ({{ form.halfDay ? 'nửa ngày' : 'cả ngày' }})
              </div>
            </div>
          </div>

          <!-- Lý do -->
          <div class="field-group">
            <label class="field-label">Lý do <span class="field-optional">(không bắt buộc)</span></label>
            <textarea class="reason-input" [(ngModel)]="form.reason"
              placeholder="Mô tả lý do xin nghỉ..." maxlength="500" rows="3"></textarea>
            <div class="char-count">{{ (form.reason || '').length }}/500</div>
          </div>

        </div>

        <!-- Sheet Footer -->
        <div class="sheet-footer">
          <button class="btn-secondary" (click)="resetForm()" matRipple>
            <mat-icon>refresh</mat-icon> Nhập lại
          </button>
          <button class="btn-primary" (click)="submitRequest()"
            [disabled]="!canSubmit() || submitting()" matRipple>
            @if (submitting()) {
              <mat-icon class="spin-icon">autorenew</mat-icon> Đang gửi...
            } @else {
              <mat-icon>send</mat-icon> Gửi đơn
            }
          </button>
        </div>

      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    /* ═══════════════════════════════
       HERO BANNER
    ═══════════════════════════════ */
    .hero {
      position: relative; overflow: hidden;
      padding: 28px 20px 24px;
      background: linear-gradient(135deg, #5B5BD6 0%, #7C3AED 100%);
      color: #fff;
    }
    .hero-bg {
      position: absolute; inset: 0;
      background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.04'%3E%3Ccircle cx='30' cy='30' r='20'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
    }
    .hero-content {
      position: relative; display: flex; align-items: center; gap: 14px;
    }
    .hero-icon {
      width: 48px; height: 48px;
      background: rgba(255,255,255,0.15);
      border-radius: 14px; backdrop-filter: blur(4px);
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 26px; width: 26px; height: 26px; color: #fff; }
    }
    .hero-title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
    .hero-sub { font-size: 13px; opacity: 0.8; margin-top: 2px; }

    /* ═══════════════════════════════
       PAGE WRAP
    ═══════════════════════════════ */
    .page-wrap {
      padding: 20px 16px 100px;
      max-width: 680px; margin: 0 auto;
    }

    /* ═══════════════════════════════
       SECTION LABELS
    ═══════════════════════════════ */
    .section-label {
      font-size: 11px; font-weight: 800;
      text-transform: uppercase; letter-spacing: 1px;
      color: #98A2B3; margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .req-count {
      background: #5B5BD6; color: #fff;
      font-size: 10px; font-weight: 700;
      padding: 1px 7px; border-radius: 20px;
      text-transform: none; letter-spacing: 0;
    }

    /* ═══════════════════════════════
       TYPE CHIPS (horizontal scroll)
    ═══════════════════════════════ */
    .type-scroll {
      display: flex; gap: 10px;
      overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }
    .type-pill {
      display: flex; align-items: center; gap: 10px;
      background: #fff; border: 1px solid #EAECF0;
      border-radius: 12px; padding: 10px 14px;
      min-width: 170px; flex-shrink: 0;
      box-shadow: 0 1px 4px rgba(16,24,40,0.06);
    }
    .type-pill-icon {
      width: 36px; height: 36px; flex-shrink: 0;
      background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
      border-radius: 9px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #5B5BD6; }
    }
    .type-pill-name { font-size: 13px; font-weight: 700; color: #101828; }
    .type-pill-meta { font-size: 11px; color: #98A2B3; margin-top: 1px; }
    .type-empty { font-size: 13px; color: #9CA3AF; padding: 8px 0; }

    /* ═══════════════════════════════
       FILTER TABS
    ═══════════════════════════════ */
    .filter-scroll {
      display: flex; gap: 6px;
      overflow-x: auto; padding-bottom: 4px; margin-bottom: 14px;
      scrollbar-width: none;
      &::-webkit-scrollbar { display: none; }
    }
    .filter-tab {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 7px 14px; border-radius: 20px;
      font-size: 12.5px; font-weight: 600;
      border: 1.5px solid #EAECF0; background: #fff;
      color: #667085; cursor: pointer; white-space: nowrap;
      transition: all 0.15s;
      .tab-icon { font-size: 14px; width: 14px; height: 14px; }
      &:hover { border-color: #C7D7FD; color: #5B5BD6; }
      &.active {
        background: linear-gradient(135deg, #5B5BD6, #7C3AED);
        color: #fff; border-color: transparent;
        box-shadow: 0 2px 8px rgba(91,91,214,0.3);
      }
    }

    /* ═══════════════════════════════
       REQUEST CARDS
    ═══════════════════════════════ */
    .req-list { display: flex; flex-direction: column; gap: 10px; }

    .req-card {
      background: #fff; border-radius: 14px;
      border: 1px solid #EAECF0;
      border-left: 4px solid #EAECF0;
      padding: 14px 14px 12px;
      box-shadow: 0 1px 4px rgba(16,24,40,0.05);
      transition: box-shadow 0.15s;
      &:active { box-shadow: 0 4px 16px rgba(16,24,40,0.1); }
    }
    .border-pending   { border-left-color: #F59E0B; }
    .border-approved  { border-left-color: #10B981; }
    .border-rejected  { border-left-color: #EF4444; }
    .border-cancelled { border-left-color: #9CA3AF; }

    .req-top {
      display: flex; align-items: center;
      justify-content: space-between; gap: 8px;
      margin-bottom: 10px;
    }
    .req-type {
      display: flex; align-items: center; gap: 8px;
    }
    .req-type-icon {
      width: 30px; height: 30px;
      background: #F5F6FF; border-radius: 8px;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 16px; width: 16px; height: 16px; color: #5B5BD6; }
    }
    .req-type-name { font-size: 14px; font-weight: 700; color: #101828; }

    .status-pill {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 20px;
      font-size: 11.5px; font-weight: 700; white-space: nowrap;
      mat-icon { font-size: 12px; width: 12px; height: 12px; }
    }
    .sp-pending   { background: #FFFBEB; color: #92400E; border: 1px solid #FDE68A; }
    .sp-approved  { background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; }
    .sp-rejected  { background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; }
    .sp-cancelled { background: #F9FAFB; color: #6B7280; border: 1px solid #E5E7EB; }

    .req-dates {
      display: flex; align-items: center; gap: 6px;
      margin-bottom: 6px;
    }
    .req-date-icon { font-size: 14px; width: 14px; height: 14px; color: #9CA3AF; }
    .req-date-text { font-size: 13.5px; color: #374151; font-weight: 500; flex: 1; }
    .req-days-badge {
      font-size: 11.5px; font-weight: 700;
      background: #EFF6FF; color: #1D4ED8;
      padding: 2px 8px; border-radius: 20px;
    }

    .req-reason {
      display: flex; align-items: flex-start; gap: 5px;
      font-size: 12.5px; color: #6B7280; margin-bottom: 4px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-top: 1px; flex-shrink: 0; }
      span { overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
    }
    .req-reject {
      display: flex; align-items: flex-start; gap: 5px;
      font-size: 12px; color: #DC2626; margin-bottom: 4px;
      background: #FFF1F2; padding: 6px 8px; border-radius: 8px; margin-top: 6px;
      mat-icon { font-size: 14px; width: 14px; height: 14px; margin-top: 1px; flex-shrink: 0; }
    }

    .req-actions { margin-top: 10px; padding-top: 10px; border-top: 1px solid #F3F4F6; }
    .btn-cancel-req {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 6px 14px; border-radius: 8px;
      font-size: 13px; font-weight: 600;
      border: 1.5px solid #FECACA; background: #FEF2F2;
      color: #DC2626; cursor: pointer;
      transition: all 0.15s;
      mat-icon { font-size: 16px; width: 16px; height: 16px; }
      &:hover { background: #FEE2E2; }
    }

    /* ═══════════════════════════════
       SKELETON LOADING
    ═══════════════════════════════ */
    .skeleton { pointer-events: none; }
    .sk-line {
      background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%);
      background-size: 200% 100%;
      animation: shimmer 1.4s infinite;
      border-radius: 6px; height: 14px; margin-bottom: 10px;
    }
    .sk-title { width: 60%; height: 16px; }
    .sk-meta  { width: 80%; }
    .sk-short { width: 40%; }
    @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

    /* ═══════════════════════════════
       EMPTY STATE
    ═══════════════════════════════ */
    .empty-state {
      padding: 52px 16px; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 10px;
    }
    .empty-illustration {
      width: 72px; height: 72px;
      background: linear-gradient(135deg, #EEF2FF, #E0E7FF);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      mat-icon { font-size: 36px; width: 36px; height: 36px; color: #818CF8; }
    }
    .empty-title { font-size: 16px; font-weight: 700; color: #374151; }
    .empty-sub { font-size: 13px; color: #9CA3AF; }

    /* ═══════════════════════════════
       FAB
    ═══════════════════════════════ */
    .fab {
      position: fixed; bottom: 24px; right: 20px; z-index: 100;
      display: flex; align-items: center; gap: 8px;
      padding: 14px 20px; border-radius: 50px;
      background: linear-gradient(135deg, #5B5BD6, #7C3AED);
      color: #fff; border: none; cursor: pointer;
      font-size: 14px; font-weight: 700;
      box-shadow: 0 4px 20px rgba(91,91,214,0.45);
      transition: all 0.2s; letter-spacing: 0.1px;
      mat-icon { font-size: 20px; width: 20px; height: 20px; }
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 28px rgba(91,91,214,0.5);
      }
      &:active { transform: translateY(0); }
    }
    /* Mobile: icon-only FAB */
    @media (max-width: 480px) {
      .fab {
        bottom: 20px; right: 16px;
        width: 56px; height: 56px; padding: 0;
        border-radius: 50%; justify-content: center;
        mat-icon { font-size: 24px; width: 24px; height: 24px; }
      }
      .fab-label { display: none; }
    }

    /* ═══════════════════════════════
       OVERLAY
    ═══════════════════════════════ */
    .overlay {
      position: fixed; inset: 0; z-index: 200;
      background: rgba(17,24,39,0.45);
      backdrop-filter: blur(2px);
      animation: fadeIn 0.2s ease;
    }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    /* ═══════════════════════════════
       BOTTOM SHEET
    ═══════════════════════════════ */
    .sheet {
      position: fixed; bottom: 0; left: 0; right: 0; z-index: 300;
      background: #fff;
      border-radius: 20px 20px 0 0;
      box-shadow: 0 -8px 40px rgba(16,24,40,0.18);
      transform: translateY(100%);
      transition: transform 0.32s cubic-bezier(0.32,0.72,0,1);
      max-height: 92vh; display: flex; flex-direction: column;
    }
    .sheet-open { transform: translateY(0); }

    /* On tablet/desktop, center as a floating card */
    @media (min-width: 600px) {
      .sheet {
        left: 50%; right: auto;
        transform: translateX(-50%) translateY(100%);
        width: 520px; bottom: 40px;
        border-radius: 20px;
        max-height: 85vh;
      }
      .sheet-open {
        transform: translateX(-50%) translateY(0);
      }
      .sheet-drag-handle { display: none; }
    }

    .sheet-drag-handle {
      width: 40px; height: 4px; border-radius: 2px;
      background: #E5E7EB; margin: 10px auto 4px;
    }
    .sheet-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 18px 12px; border-bottom: 1px solid #F3F4F6;
    }
    .sheet-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 16px; font-weight: 800; color: #101828;
      mat-icon { color: #5B5BD6; font-size: 20px; width: 20px; height: 20px; }
    }
    .sheet-close {
      width: 32px; height: 32px; border-radius: 50%;
      background: #F3F4F6; border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.12s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #6B7280; }
      &:hover { background: #E5E7EB; }
    }
    .sheet-body {
      padding: 16px 18px; overflow-y: auto; flex: 1;
      display: flex; flex-direction: column; gap: 20px;
    }
    .sheet-footer {
      display: flex; gap: 10px; padding: 14px 18px;
      border-top: 1px solid #F3F4F6;
      padding-bottom: max(14px, env(safe-area-inset-bottom));
    }

    /* ═══════════════════════════════
       FORM FIELDS (inside sheet)
    ═══════════════════════════════ */
    .field-group { display: flex; flex-direction: column; gap: 8px; }
    .field-label {
      font-size: 13px; font-weight: 700; color: #374151;
    }
    .req-star { color: #EF4444; margin-left: 2px; }
    .field-optional { font-size: 11px; font-weight: 500; color: #9CA3AF; margin-left: 4px; }

    /* Type select grid */
    .type-select-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 8px;
    }
    .type-opt {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 12px; border-radius: 10px;
      border: 1.5px solid #E5E7EB; background: #F9FAFB;
      color: #374151; cursor: pointer; font-size: 13px; font-weight: 600;
      transition: all 0.15s; text-align: left;
      mat-icon { font-size: 18px; width: 18px; height: 18px; color: #9CA3AF; flex-shrink: 0; }
      &:hover { border-color: #C7D7FD; background: #EEF2FF; }
    }
    .type-opt-selected {
      border-color: #5B5BD6 !important;
      background: linear-gradient(135deg, #EEF2FF, #E0E7FF) !important;
      color: #4338CA !important;
      mat-icon { color: #5B5BD6 !important; }
    }

    /* Date inputs */
    .date-inputs {
      display: flex; align-items: center; gap: 8px;
    }
    .date-field { flex: 1; display: flex; flex-direction: column; gap: 4px; }
    .date-sub-label { font-size: 11px; font-weight: 600; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px; }
    .native-date {
      width: 100%; padding: 10px 12px;
      border: 1.5px solid #E5E7EB; border-radius: 10px;
      font-size: 14px; color: #101828; background: #F9FAFB;
      outline: none; transition: border-color 0.15s; box-sizing: border-box;
      &:focus { border-color: #5B5BD6; background: #fff; }
    }
    .date-arrow {
      flex-shrink: 0; color: #9CA3AF; margin-top: 16px;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
    }

    /* Days stepper */
    .days-stepper {
      display: flex; align-items: center; gap: 12px;
    }
    .stepper-btn {
      width: 44px; height: 44px; border-radius: 50%;
      border: 1.5px solid #E5E7EB; background: #F9FAFB;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s;
      mat-icon { font-size: 20px; width: 20px; height: 20px; color: #374151; }
      &:hover:not(:disabled) { border-color: #5B5BD6; background: #EEF2FF; mat-icon { color: #5B5BD6; } }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
    .days-display {
      display: flex; align-items: baseline; gap: 4px;
      min-width: 80px; justify-content: center;
    }
    .days-num { font-size: 32px; font-weight: 800; color: #101828; line-height: 1; }
    .days-unit { font-size: 14px; font-weight: 600; color: #6B7280; }
    .days-hint { font-size: 11.5px; color: #9CA3AF; }

    /* Reason textarea */
    .reason-input {
      width: 100%; padding: 12px;
      border: 1.5px solid #E5E7EB; border-radius: 10px;
      font-size: 14px; color: #101828; background: #F9FAFB;
      outline: none; resize: none; font-family: inherit;
      transition: border-color 0.15s; box-sizing: border-box;
      &:focus { border-color: #5B5BD6; background: #fff; }
    }
    .char-count { font-size: 11px; color: #9CA3AF; text-align: right; margin-top: 4px; }

    /* Sheet buttons */
    .btn-secondary {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 13px; border-radius: 12px;
      border: 1.5px solid #E5E7EB; background: #F9FAFB;
      font-size: 14px; font-weight: 700; color: #374151;
      cursor: pointer; transition: all 0.15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover { background: #F3F4F6; }
    }
    .btn-primary {
      flex: 2; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 13px; border-radius: 12px;
      border: none; background: linear-gradient(135deg, #5B5BD6, #7C3AED);
      font-size: 14px; font-weight: 700; color: #fff;
      cursor: pointer; transition: all 0.2s;
      box-shadow: 0 2px 10px rgba(91,91,214,0.35);
      mat-icon { font-size: 18px; width: 18px; height: 18px; }
      &:hover:not(:disabled) { box-shadow: 0 4px 16px rgba(91,91,214,0.45); transform: translateY(-1px); }
      &:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
    }
    .spin-icon { animation: spin 1s linear infinite; }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

    .half-day-badge {
      background: #E0F2FE; color: #0369A1;
      font-size: 10px; font-weight: 700;
      padding: 1px 7px; border-radius: 20px;
      flex-shrink: 0;
    }

    /* ═══════════════════════════════
       DURATION TOGGLE
    ═══════════════════════════════ */
    .duration-toggle {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
    }
    .dur-opt {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 14px; border-radius: 12px;
      border: 1.5px solid #E5E7EB; background: #F9FAFB;
      cursor: pointer; transition: all 0.15s; text-align: left;
      mat-icon { font-size: 22px; width: 22px; height: 22px; color: #9CA3AF; flex-shrink: 0; }
      &:hover { border-color: #C7D7FD; background: #EEF2FF; }
    }
    .dur-title { font-size: 14px; font-weight: 700; color: #374151; }
    .dur-sub { font-size: 11px; color: #9CA3AF; margin-top: 1px; }
    .dur-selected {
      border-color: #5B5BD6 !important;
      background: linear-gradient(135deg, #EEF2FF, #E0E7FF) !important;
      .dur-title { color: #4338CA; }
      mat-icon { color: #5B5BD6 !important; }
    }

    /* ═══════════════════════════════
       DAYS SUMMARY
    ═══════════════════════════════ */
    .days-summary {
      display: flex; align-items: center; gap: 14px;
      background: #F5F6FF; border-radius: 12px; padding: 12px 16px;
      border: 1.5px solid #E0E7FF;
    }
    .days-summary-num {
      font-size: 28px; font-weight: 900; color: #5B5BD6;
      min-width: 44px; text-align: center; line-height: 1;
    }
    .days-summary-detail {
      font-size: 12.5px; color: #6B7280; line-height: 1.6;
    }
  `]
})
export class LeaveEmployeeComponent implements OnInit {
  private leaveService = inject(LeaveService);
  private snackBar = inject(MatSnackBar);

  readonly requests    = signal<LeaveRequest[]>([]);
  readonly leaveTypes  = signal<LeaveType[]>([]);
  readonly showForm    = signal(false);
  readonly sheetVisible = signal(false);
  readonly submitting  = signal(false);
  readonly loading     = signal(false);
  readonly loadingTypes = signal(false);
  readonly filterStatus = signal('');

  readonly statusFilters = [
    { value: '',           label: 'Tất cả',    icon: 'list'          },
    { value: 'PENDING',    label: 'Chờ duyệt', icon: 'schedule'      },
    { value: 'APPROVED',   label: 'Đã duyệt',  icon: 'check_circle'  },
    { value: 'REJECTED',   label: 'Từ chối',   icon: 'cancel'        },
    { value: 'CANCELLED',  label: 'Đã hủy',    icon: 'block'         }
  ];

  form: { leaveTypeId: number | null; startDate: string; endDate: string; halfDay: boolean; halfDayPeriod: HalfDayPeriod | null; reason: string } = {
    leaveTypeId: null, startDate: '', endDate: '', halfDay: false, halfDayPeriod: null, reason: ''
  };

  canSubmit(): boolean {
    return !!this.form.leaveTypeId && !!this.form.startDate && !!this.form.endDate &&
      (!this.form.halfDay || !!this.form.halfDayPeriod);
  }

  calendarDays(): number {
    if (!this.form.startDate || !this.form.endDate) return 0;
    const diff = (new Date(this.form.endDate).getTime() - new Date(this.form.startDate).getTime()) / 86400000;
    return diff < 0 ? 0 : Math.round(diff) + 1;
  }

  estimatedDays(): number {
    return this.form.halfDay ? this.calendarDays() * 0.5 : this.calendarDays();
  }

  ngOnInit() {
    this.loadTypes();
    this.loadRequests();
  }

  @HostListener('document:keydown.escape')
  onEscape() { this.closeForm(); }

  loadTypes() {
    this.loadingTypes.set(true);
    this.leaveService.getLeaveTypes().subscribe({
      next: list => { this.leaveTypes.set(list); this.loadingTypes.set(false); },
      error: () => this.loadingTypes.set(false)
    });
  }

  loadRequests() {
    this.loading.set(true);
    this.leaveService.getMyRequests(this.filterStatus() || undefined).subscribe({
      next: page => { this.requests.set(page.content ?? []); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  openForm() {
    this.showForm.set(true);
    // Delay sheet animation so DOM renders first
    setTimeout(() => this.sheetVisible.set(true), 20);
  }

  closeForm() {
    this.sheetVisible.set(false);
    setTimeout(() => this.showForm.set(false), 320);
  }

  resetForm() {
    this.form = { leaveTypeId: null, startDate: '', endDate: '', halfDay: false, halfDayPeriod: null, reason: '' };
  }

  setHalfDay(half: boolean) {
    this.form.halfDay = half;
    if (!half) this.form.halfDayPeriod = null;
  }

  setFilter(status: string) {
    this.filterStatus.set(status);
    this.loadRequests();
  }

  onDateChange() {
    // If half-day selected and end date differs from start date, auto-reset halfDay
    if (this.form.halfDay && this.form.startDate && this.form.endDate && this.form.startDate !== this.form.endDate) {
      this.form.halfDay = false;
      this.form.halfDayPeriod = null;
    }
  }

  submitRequest() {
    if (!this.canSubmit() || this.submitting()) return;
    this.submitting.set(true);
    const dto: CreateLeaveRequest = {
      leaveTypeId:   this.form.leaveTypeId!,
      startDate:     this.form.startDate,
      endDate:       this.form.endDate,
      halfDay:       this.form.halfDay,
      halfDayPeriod: this.form.halfDayPeriod ?? undefined,
      reason:        this.form.reason || undefined
    };
    this.leaveService.submitMyRequest(dto).subscribe({
      next: () => {
        this.snackBar.open('Gửi đơn thành công!', 'OK', {
          duration: 3000,
          panelClass: ['snack-success']
        });
        this.submitting.set(false);
        this.closeForm();
        this.resetForm();
        this.loadRequests();
      },
      error: err => {
        this.snackBar.open(err?.error?.message || 'Lỗi khi gửi đơn', 'Đóng', { duration: 4000 });
        this.submitting.set(false);
      }
    });
  }

  cancelRequest(r: LeaveRequest) {
    if (!confirm(`Hủy đơn xin nghỉ từ ${this.formatDate(r.startDate)} đến ${this.formatDate(r.endDate)}?`)) return;
    this.leaveService.cancel(r.id).subscribe({
      next: () => {
        this.snackBar.open('Đã hủy đơn', 'OK', { duration: 2500 });
        this.loadRequests();
      },
      error: err => this.snackBar.open(err?.error?.message || 'Lỗi', 'Đóng', { duration: 3000 })
    });
  }

  formatDate(d: string): string {
    if (!d) return '—';
    const [, m, day] = d.split('-');
    return `${day}/${m}`;
  }

  statusLabel(s: string): string {
    return { PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã hủy' }[s] ?? s;
  }

  statusIcon(s: string): string {
    return { PENDING: 'schedule', APPROVED: 'check_circle', REJECTED: 'cancel', CANCELLED: 'block' }[s] ?? 'help';
  }

  typeIcon(nameOrCode: string): string {
    const c = (nameOrCode || '').toUpperCase();
    if (c.includes('SICK') || c.includes('ỐM') || c.includes('BENH') || c.includes('BỆNH')) return 'local_hospital';
    if (c.includes('ANNUAL') || c.includes('PHEP') || c.includes('PHÉP') || c.includes('NĂM')) return 'beach_access';
    if (c.includes('MATERNITY') || c.includes('THAI') || c.includes('SAN')) return 'child_care';
    if (c.includes('UNPAID') || c.includes('KHONG') || c.includes('KHÔNG')) return 'money_off';
    if (c.includes('WEDDING') || c.includes('CUOI') || c.includes('CƯỚI')) return 'favorite';
    if (c.includes('FUNERAL') || c.includes('TANG')) return 'sentiment_very_dissatisfied';
    return 'event_note';
  }
}
