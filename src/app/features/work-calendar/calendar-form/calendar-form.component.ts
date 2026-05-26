import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormArray, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkCalendarService } from '../../../core/services/work-calendar.service';
import { DayType, DAY_TYPE_WORKDAYS, DAY_TYPE_LABELS } from '../../../core/models/work-calendar.models';

@Component({
  selector: 'app-calendar-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatCheckboxModule, MatButtonModule, MatIconModule,
    MatTableModule, MatTooltipModule],
  template: `
    <div class="page-container" style="max-width:900px;">
      <div class="page-header">
        <div class="page-title">{{ isEdit() ? 'Cập nhật lịch' : 'Tạo lịch làm việc' }}</div>
      </div>

      <form [formGroup]="form" (ngSubmit)="save()">

        <!-- Thông tin chung -->
        <mat-card style="margin-bottom:16px;">
          <mat-card-header><mat-card-title>Thông tin tháng</mat-card-title></mat-card-header>
          <mat-card-content style="padding-top:16px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">

            <mat-form-field>
              <mat-label>Tháng (YYYY-MM) *</mat-label>
              <input matInput formControlName="yearMonth" placeholder="2026-04" [readonly]="isEdit()">
              @if (form.get('yearMonth')?.hasError('pattern')) {
                <mat-error>Định dạng YYYY-MM</mat-error>
              }
            </mat-form-field>

            <mat-form-field>
              <mat-label>Tổng số ngày công</mat-label>
              <input matInput formControlName="totalWorkdays" type="number" readonly
                style="cursor:default;color:#1565c0;font-weight:600;">
              <mat-hint>Tự động tính từ chi tiết ngày</mat-hint>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Mô tả</mat-label>
              <input matInput formControlName="description">
            </mat-form-field>

            <div style="display:flex;align-items:center;gap:8px;">
              <mat-checkbox formControlName="isDefault">Đặt làm lịch mặc định</mat-checkbox>
            </div>

          </mat-card-content>
        </mat-card>

        <!-- Tạo nhanh từ tháng -->
        @if (!isEdit()) {
          <mat-card style="margin-bottom:16px;">
            <mat-card-header><mat-card-title>Tạo nhanh chi tiết ngày</mat-card-title></mat-card-header>
            <mat-card-content style="padding-top:16px;">
              <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
                <button mat-stroked-button type="button" (click)="autoGenerate()" [disabled]="!form.get('yearMonth')?.valid">
                  <mat-icon>auto_fix_high</mat-icon> Tự động tạo (T2-T6 = làm việc)
                </button>
                <span style="color:#6b7280;font-size:13px;">Tự động đánh dấu T7/CN là cuối tuần, các ngày còn lại là ngày làm việc</span>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Chi tiết từng ngày -->
        <mat-card style="margin-bottom:16px;">
          <mat-card-header>
            <mat-card-title>Chi tiết ngày ({{ detailsArray.length }} ngày)</mat-card-title>
            <div style="flex:1;"></div>
            <button mat-icon-button type="button" (click)="addDetail()" matTooltip="Thêm ngày">
              <mat-icon>add</mat-icon>
            </button>
          </mat-card-header>
          <mat-card-content style="padding-top:8px;">

            @if (detailsArray.length === 0) {
              <div style="padding:24px;text-align:center;color:#9ca3af;">
                Nhấn "Tự động tạo" hoặc thêm ngày thủ công
              </div>
            } @else {
              <div style="overflow-x:auto;">
                <table style="width:100%;border-collapse:collapse;" formArrayName="details">
                  <thead>
                    <tr style="background:#f8fafc;">
                      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Ngày</th>
                      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Loại ngày</th>
                      <th style="padding:8px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Ghi chú</th>
                      <th style="padding:8px 12px;width:48px;"></th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (detail of detailsArray.controls; track detail; let i = $index) {
                      <tr [formGroupName]="i" [style.background]="rowBg(detail.get('dayType')?.value)">
                        <td style="padding:6px 12px;">
                          <input type="date" formControlName="workDate"
                            style="border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;font-size:13px;">
                        </td>
                        <td style="padding:6px 12px;">
                          <select formControlName="dayType"
                            (change)="onDayTypeChange()"
                            style="border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;font-size:13px;">
                            <option value="FULL_DAY">Làm cả ngày (1.0 công)</option>
                            <option value="MORNING">Làm buổi sáng (0.5 công)</option>
                            <option value="AFTERNOON">Làm buổi chiều (0.5 công)</option>
                            <option value="WEEKEND">Nghỉ cuối tuần (0 công)</option>
                            <option value="HOLIDAY">Nghỉ lễ (0 công)</option>
                          </select>
                        </td>
                        <td style="padding:6px 12px;">
                          <input formControlName="note" placeholder="VD: Tết Nguyên Đán"
                            style="border:1px solid #d1d5db;border-radius:6px;padding:4px 8px;font-size:13px;width:100%;">
                        </td>
                        <td style="padding:6px 12px;">
                          <button mat-icon-button type="button" (click)="removeDetail(i)"
                            style="color:#dc2626;" matTooltip="Xóa ngày">
                            <mat-icon>close</mat-icon>
                          </button>
                        </td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Actions -->
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button mat-button type="button" (click)="cancel()">Hủy</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="form.invalid">
            <mat-icon>save</mat-icon> {{ isEdit() ? 'Cập nhật' : 'Tạo lịch' }}
          </button>
        </div>

      </form>
    </div>
  `
})
export class CalendarFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private calendarService = inject(WorkCalendarService);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  private editId: number | null = null;

  readonly form = this.fb.group({
    yearMonth: ['', [Validators.required, Validators.pattern(/^\d{4}-\d{2}$/)]],
    totalWorkdays: [{ value: 0, disabled: true }],
    description: [''],
    isDefault: [false],
    details: this.fb.array([])
  });

  get detailsArray(): FormArray { return this.form.get('details') as FormArray; }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.editId = +id;
      // Load existing calendar from list (we don't have getById, use yearMonth from route state)
      this.calendarService.list().subscribe(list => {
        const cal = list.find(c => c.id === this.editId);
        if (cal) {
          this.form.patchValue({
            yearMonth: cal.yearMonth,
            totalWorkdays: cal.totalWorkdays,
            description: cal.description,
            isDefault: cal.isDefault
          });
          this.form.get('yearMonth')?.disable();
          cal.details.forEach(d => this.detailsArray.push(this.createDetailGroup(d.workDate, d.dayType as DayType, d.note)));
          this.recalcTotal();
        }
      });
    }
  }

  createDetailGroup(workDate = '', dayType: DayType = 'FULL_DAY', note = ''): FormGroup {
    return this.fb.group({ workDate: [workDate, Validators.required], dayType: [dayType], note: [note] });
  }

  addDetail() { this.detailsArray.push(this.createDetailGroup()); this.recalcTotal(); }

  removeDetail(i: number) { this.detailsArray.removeAt(i); this.recalcTotal(); }

  autoGenerate() {
    const ym = this.form.get('yearMonth')?.value;
    if (!ym || !/^\d{4}-\d{2}$/.test(ym)) return;

    const [year, month] = ym.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();

    this.detailsArray.clear();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dow = date.getDay(); // 0=Sun, 6=Sat
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayType: DayType = (dow === 0 || dow === 6) ? 'WEEKEND' : 'FULL_DAY';
      this.detailsArray.push(this.createDetailGroup(dateStr, dayType, ''));
    }

    this.recalcTotal();
  }

  recalcTotal() {
    const total = this.detailsArray.controls.reduce((sum, ctrl) => {
      return sum + (DAY_TYPE_WORKDAYS[ctrl.get('dayType')?.value as DayType] ?? 0);
    }, 0);
    this.form.get('totalWorkdays')?.setValue(Math.round(total * 10) / 10);
  }

  onDayTypeChange() { this.recalcTotal(); }

  rowBg(dayType: string): string {
    if (dayType === 'HOLIDAY') return '#fef2f2';
    if (dayType === 'WEEKEND') return '#f8fafc';
    if (dayType === 'MORNING' || dayType === 'AFTERNOON') return '#fff8e1';
    return '';
  }

  save() {
    if (this.form.invalid) return;
    const val = this.form.getRawValue() as any;

    const obs = this.isEdit()
      ? this.calendarService.update(this.editId!, val)
      : this.calendarService.create(val);

    obs.subscribe({
      next: () => {
        this.snackBar.open(this.isEdit() ? 'Đã cập nhật lịch' : 'Đã tạo lịch', 'OK', { duration: 2000 });
        this.router.navigate(['/work-calendars']);
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Lỗi', 'Close', { duration: 4000, panelClass: 'error-snack' })
    });
  }

  cancel() { this.router.navigate(['/work-calendars']); }
}
