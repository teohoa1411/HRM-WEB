import {
  Component, OnInit, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { TimesheetService } from '../../core/services/timesheet.service';
import { CompanyTimesheetField } from '../../core/models/timesheet.models';

type FieldType = 'text' | 'number' | 'checkbox';

interface FieldForm {
  fieldName: string;
  fieldKey: string;
  fieldType: FieldType;
  required: boolean;
  sortOrder: number;
}

@Component({
  selector: 'app-timesheet-fields',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatIconModule, MatButtonModule, MatProgressBarModule, MatTooltipModule, MatCheckboxModule
  ],
  template: `
    <div class="page-wrapper">

      <!-- Header -->
      <div class="page-header">
        <div class="header-left">
          <mat-icon class="header-icon">tune</mat-icon>
          <div>
            <h1 class="page-title">Cấu hình trường Timesheet</h1>
            <p class="page-sub">Thêm các trường nhân sự cần điền khi nộp timesheet hàng tháng</p>
          </div>
        </div>
        <button mat-flat-button class="add-btn" (click)="openForm()">
          <mat-icon>add</mat-icon>
          Thêm trường mới
        </button>
      </div>

      @if (loading()) {
        <mat-progress-bar mode="indeterminate"></mat-progress-bar>
      }

      <!-- Fields list -->
      <div class="table-card">
        @if (!loading() && fields().length === 0) {
          <div class="empty-state">
            <mat-icon>playlist_add</mat-icon>
            <p>Chưa có trường nào. Nhấn "Thêm trường mới" để bắt đầu.</p>
          </div>
        } @else {
          <table class="fields-table">
            <thead>
              <tr>
                <th style="width:40px">#</th>
                <th>Tên trường</th>
                <th>Field Key</th>
                <th>Loại</th>
                <th class="center">Bắt buộc</th>
                <th class="center">Trạng thái</th>
                <th class="right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              @for (f of fields(); track f.id) {
                <tr [class.inactive]="!f.active">
                  <td class="sort-num">{{ f.sortOrder }}</td>
                  <td>
                    <span class="field-name">{{ f.fieldName }}</span>
                  </td>
                  <td>
                    <code class="key-chip">{{ f.fieldKey }}</code>
                  </td>
                  <td>
                    <span class="type-badge type-{{ f.fieldType }}">
                      {{ typeLabel(f.fieldType) }}
                    </span>
                  </td>
                  <td class="center">
                    @if (f.required) {
                      <mat-icon class="req-icon">check_circle</mat-icon>
                    } @else {
                      <span class="no-req">—</span>
                    }
                  </td>
                  <td class="center">
                    <button class="status-btn" [class.active]="f.active"
                            (click)="toggle(f)" matTooltip="Nhấn để bật/tắt">
                      <mat-icon>{{ f.active ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                      {{ f.active ? 'Đang dùng' : 'Tắt' }}
                    </button>
                  </td>
                  <td class="right">
                    <button mat-icon-button matTooltip="Sửa" (click)="openForm(f)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button matTooltip="Xóa" class="del-btn" (click)="confirmDelete(f)">
                      <mat-icon>delete_outline</mat-icon>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>

      <div class="hint-box">
        <mat-icon>info_outline</mat-icon>
        <p>
          Các trường này sẽ hiện trong màn hình Timesheet của nhân sự (phần "Thông tin bổ sung").
          Giá trị nhân sự nhập được lưu dưới dạng JSON theo tháng.
          <strong>Field Key</strong> phải là chữ thường, không dấu, không khoảng trắng (ví dụ: <code>project_code</code>).
        </p>
      </div>

    </div>

    <!-- Add/Edit popup -->
    @if (formOpen()) {
      <div class="overlay" (click)="closeForm()">
        <div class="form-panel" (click)="$event.stopPropagation()">

          <div class="form-header">
            <span>{{ editId() ? 'Sửa trường' : 'Thêm trường mới' }}</span>
            <button mat-icon-button (click)="closeForm()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="form-body">

            <label class="field-label">Tên trường <span class="req">*</span></label>
            <input class="text-input" [(ngModel)]="form.fieldName" placeholder="VD: Mã dự án">

            <label class="field-label">
              Field Key <span class="req">*</span>
              <span class="hint-inline">Chữ thường, không dấu, dùng _ thay khoảng trắng</span>
            </label>
            <input class="text-input" [(ngModel)]="form.fieldKey"
                   placeholder="VD: project_code"
                   (input)="sanitizeKey()">

            <label class="field-label">Loại dữ liệu <span class="req">*</span></label>
            <div class="type-options">
              @for (t of typeOptions; track t.value) {
                <label class="type-radio" [class.selected]="form.fieldType === t.value">
                  <input type="radio" [value]="t.value" [(ngModel)]="form.fieldType" hidden>
                  <mat-icon>{{ t.icon }}</mat-icon>
                  {{ t.label }}
                </label>
              }
            </div>

            <div class="row-fields">
              <div class="col-half">
                <label class="field-label">Thứ tự hiển thị</label>
                <input class="text-input" type="number" [(ngModel)]="form.sortOrder" min="1">
              </div>
              <div class="col-half check-col">
                <mat-checkbox [(ngModel)]="form.required" color="primary">
                  Bắt buộc nhập
                </mat-checkbox>
              </div>
            </div>

            @if (formError()) {
              <div class="form-error">{{ formError() }}</div>
            }
          </div>

          <div class="form-footer">
            <button mat-stroked-button (click)="closeForm()">Hủy</button>
            <button mat-flat-button class="save-btn" (click)="save()" [disabled]="saving()">
              @if (saving()) { <mat-icon class="spin">refresh</mat-icon> }
              {{ saving() ? 'Đang lưu...' : 'Lưu' }}
            </button>
          </div>

        </div>
      </div>
    }

    <!-- Delete confirm -->
    @if (deleteTarget()) {
      <div class="overlay" (click)="cancelDelete()">
        <div class="confirm-panel" (click)="$event.stopPropagation()">
          <mat-icon class="confirm-icon">warning_amber</mat-icon>
          <h3>Xác nhận xóa</h3>
          <p>Bạn chắc chắn muốn xóa trường <strong>"{{ deleteTarget()!.fieldName }}"</strong>?
          Dữ liệu đã nhập theo trường này sẽ không bị mất nhưng trường sẽ không còn hiển thị nữa.</p>
          <div class="confirm-actions">
            <button mat-stroked-button (click)="cancelDelete()">Hủy</button>
            <button mat-flat-button class="del-confirm-btn" (click)="doDelete()">Xóa</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .page-wrapper {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
      font-family: 'Inter', sans-serif;
    }

    /* Header */
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .header-icon { font-size: 36px; width: 36px; height: 36px; color: #1565C0; }
    .page-title  { margin: 0; font-size: 22px; font-weight: 700; color: #111827; }
    .page-sub    { margin: 2px 0 0; font-size: 13px; color: #6b7280; }

    .add-btn {
      background: #1565C0 !important;
      color: #fff !important;
      border-radius: 8px !important;
      gap: 4px;
    }

    /* Table */
    .table-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,.1);
      overflow: hidden;
      margin-bottom: 20px;
    }
    .fields-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;

      th {
        background: #f9fafb;
        color: #6b7280;
        font-size: 11px; font-weight: 700;
        text-transform: uppercase; letter-spacing: .5px;
        padding: 12px 14px;
        border-bottom: 1px solid #e5e7eb;
        white-space: nowrap;
      }
      td {
        padding: 13px 14px;
        border-bottom: 1px solid #f3f4f6;
        vertical-align: middle;
      }
      tr:last-child td { border-bottom: none; }
      tr:hover td { background: #f9fafb; }

      tr.inactive td { opacity: .5; }
    }
    .center { text-align: center; }
    .right  { text-align: right; }

    .sort-num { color: #9ca3af; font-size: 13px; }
    .field-name { font-weight: 600; color: #111827; }

    .key-chip {
      background: #f3f4f6;
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 12px;
      color: #374151;
      font-family: monospace;
    }

    .type-badge {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 12px; font-weight: 600;
    }
    .type-text     { background: #eff6ff; color: #1d4ed8; }
    .type-number   { background: #fefce8; color: #92400e; }
    .type-checkbox { background: #f0fdf4; color: #166534; }

    .req-icon { font-size: 18px; width: 18px; height: 18px; color: #16a34a; }
    .no-req   { color: #d1d5db; }

    .status-btn {
      display: inline-flex; align-items: center; gap: 4px;
      border: 1px solid #e5e7eb;
      border-radius: 9999px;
      padding: 3px 10px;
      font-size: 12px; cursor: pointer;
      background: #f9fafb; color: #6b7280;
      transition: all .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &.active {
        background: #f0fdf4; color: #16a34a; border-color: #bbf7d0;
        mat-icon { color: #16a34a; }
      }
      &:hover { border-color: #9ca3af; }
    }

    .del-btn { color: #ef4444 !important; }

    /* Empty */
    .empty-state {
      padding: 60px 20px; text-align: center; color: #9ca3af;
      mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 12px; display: block; }
      p { margin: 0; font-size: 15px; }
    }

    /* Hint */
    .hint-box {
      display: flex; align-items: flex-start; gap: 8px;
      background: #eff6ff; border-radius: 10px; padding: 14px 16px;
      color: #1e40af; font-size: 13px; line-height: 1.6;
      mat-icon { font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; margin-top: 1px; }
      p { margin: 0; }
      code { background: rgba(0,0,0,.08); border-radius: 3px; padding: 1px 5px; font-size: 12px; }
    }

    /* ── Overlay & panels ── */
    .overlay {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.55);
      z-index: 1000;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
    }

    /* Form panel */
    .form-panel {
      background: #fff;
      border-radius: 16px;
      width: 100%; max-width: 480px;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
      animation: slideUp .2s ease;
      overflow: hidden;
    }
    .form-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 16px; font-weight: 700; color: #111827;
    }
    .form-body {
      padding: 20px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .form-footer {
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 14px 20px;
      border-top: 1px solid #f3f4f6;
    }
    .save-btn {
      background: #1565C0 !important; color: #fff !important;
      border-radius: 8px !important;
    }

    .field-label {
      display: block;
      font-size: 13px; font-weight: 600; color: #374151;
      margin-bottom: 4px;
    }
    .req { color: #ef4444; }
    .hint-inline {
      font-weight: 400; font-size: 11px; color: #6b7280; margin-left: 6px;
    }

    .text-input {
      width: 100%; box-sizing: border-box;
      border: 1px solid #d1d5db; border-radius: 8px;
      padding: 9px 12px; font-size: 14px; font-family: 'Inter', sans-serif;
      color: #111827; outline: none;
      transition: border-color .15s;
      &:focus { border-color: #1565C0; }
    }

    .type-options {
      display: flex; gap: 8px; flex-wrap: wrap;
    }
    .type-radio {
      display: flex; align-items: center; gap: 6px;
      padding: 8px 14px;
      border: 2px solid #e5e7eb;
      border-radius: 9px;
      font-size: 13px; font-weight: 500; color: #374151;
      cursor: pointer; transition: all .15s;
      mat-icon { font-size: 18px; width: 18px; height: 18px; }

      &.selected {
        border-color: #1565C0;
        background: #eff6ff;
        color: #1565C0;
        mat-icon { color: #1565C0; }
      }
      &:hover:not(.selected) { border-color: #9ca3af; }
    }

    .row-fields { display: flex; gap: 12px; }
    .col-half { flex: 1; }
    .check-col { display: flex; align-items: flex-end; padding-bottom: 4px; }

    .form-error {
      background: #fef2f2; border-radius: 6px;
      padding: 8px 12px; font-size: 13px; color: #dc2626;
    }

    .spin { animation: spin .8s linear infinite; display: inline-block; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Confirm panel */
    .confirm-panel {
      background: #fff; border-radius: 16px;
      max-width: 380px; width: 100%;
      padding: 28px 24px; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,.3);
      animation: slideUp .2s ease;

      h3 { margin: 8px 0 10px; font-size: 18px; color: #111827; }
      p  { margin: 0 0 20px; font-size: 14px; color: #374151; line-height: 1.6; }
    }
    .confirm-icon { font-size: 40px; width: 40px; height: 40px; color: #f59e0b; }
    .confirm-actions { display: flex; justify-content: center; gap: 10px; }
    .del-confirm-btn {
      background: #ef4444 !important; color: #fff !important; border-radius: 8px !important;
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @media (max-width: 600px) {
      .page-wrapper { padding: 16px; }
      .page-header { flex-direction: column; align-items: flex-start; }
    }
  `]
})
export class TimesheetFieldsComponent implements OnInit {
  private svc = inject(TimesheetService);

  fields  = signal<CompanyTimesheetField[]>([]);
  loading = signal(false);

  formOpen = signal(false);
  saving   = signal(false);
  editId   = signal<number | null>(null);
  formError = signal('');

  deleteTarget = signal<CompanyTimesheetField | null>(null);

  form: FieldForm = this.blankForm();

  readonly typeOptions: { value: FieldType; label: string; icon: string }[] = [
    { value: 'text',     label: 'Văn bản',  icon: 'text_fields' },
    { value: 'number',   label: 'Số',       icon: 'pin' },
    { value: 'checkbox', label: 'Checkbox', icon: 'check_box' }
  ];

  ngOnInit() { this.loadFields(); }

  loadFields() {
    this.loading.set(true);
    this.svc.getAllFields().subscribe({
      next: data => { this.fields.set(data); this.loading.set(false); },
      error: ()   => this.loading.set(false)
    });
  }

  openForm(field?: CompanyTimesheetField) {
    this.formError.set('');
    if (field) {
      this.editId.set(field.id);
      this.form = {
        fieldName: field.fieldName,
        fieldKey:  field.fieldKey,
        fieldType: field.fieldType,
        required:  field.required,
        sortOrder: field.sortOrder
      };
    } else {
      this.editId.set(null);
      this.form = this.blankForm();
    }
    this.formOpen.set(true);
  }

  closeForm() { this.formOpen.set(false); }

  sanitizeKey() {
    this.form.fieldKey = this.form.fieldKey
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  save() {
    if (!this.form.fieldName.trim()) { this.formError.set('Tên trường không được để trống'); return; }
    if (!this.form.fieldKey.trim())  { this.formError.set('Field key không được để trống'); return; }

    this.saving.set(true);
    const payload: Partial<CompanyTimesheetField> = {
      fieldName: this.form.fieldName.trim(),
      fieldKey:  this.form.fieldKey.trim(),
      fieldType: this.form.fieldType,
      required:  this.form.required,
      sortOrder: this.form.sortOrder
    };

    const id = this.editId();
    const obs = id ? this.svc.updateField(id, payload) : this.svc.createField(payload);

    obs.subscribe({
      next: () => { this.saving.set(false); this.closeForm(); this.loadFields(); },
      error: (err) => {
        this.saving.set(false);
        this.formError.set(err?.error?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
      }
    });
  }

  toggle(field: CompanyTimesheetField) {
    this.svc.toggleField(field.id).subscribe(() => this.loadFields());
  }

  confirmDelete(field: CompanyTimesheetField) { this.deleteTarget.set(field); }
  cancelDelete()  { this.deleteTarget.set(null); }

  doDelete() {
    const f = this.deleteTarget();
    if (!f) return;
    this.svc.deleteField(f.id).subscribe({
      next: () => { this.deleteTarget.set(null); this.loadFields(); },
      error: () => this.deleteTarget.set(null)
    });
  }

  typeLabel(t: FieldType): string {
    return { text: 'Văn bản', number: 'Số', checkbox: 'Checkbox' }[t];
  }

  private blankForm(): FieldForm {
    return { fieldName: '', fieldKey: '', fieldType: 'text', required: false, sortOrder: 1 };
  }
}
