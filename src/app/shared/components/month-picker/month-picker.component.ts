import { Component, input, output, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-month-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  template: `
    <!-- Trigger button -->
    <div class="mp-wrap" [class.mp-wrap-open]="pickerOpen()" (click)="toggle($event)">
      <mat-icon class="mp-icon">calendar_month</mat-icon>
      <span class="mp-label">Tháng {{ selectedMonthNum() }}, {{ selectedYearNum() }}</span>
      <mat-icon class="mp-chevron" [class.mp-chevron-open]="pickerOpen()">expand_more</mat-icon>
    </div>

    <!-- Dropdown -->
    @if (pickerOpen()) {
      <div class="mp-dropdown" (click)="$event.stopPropagation()">
        <div class="mp-year-row">
          <button class="mp-year-btn" (click)="prevYear()"><mat-icon>chevron_left</mat-icon></button>
          <span class="mp-year-label">{{ browseYear() }}</span>
          <button class="mp-year-btn" (click)="nextYear()"><mat-icon>chevron_right</mat-icon></button>
        </div>
        <div class="mp-month-grid">
          @for (m of months; track m.value) {
            <button class="mp-month-cell"
              [class.mp-month-active]="m.value === selectedMonthNum() && browseYear() === selectedYearNum()"
              [class.mp-month-today]="m.value === todayMonth && browseYear() === todayYear"
              (click)="selectMonth(m.value)">
              {{ m.short }}
            </button>
          }
        </div>
        <div class="mp-footer">
          <button class="mp-footer-btn" (click)="goToday()">Tháng này</button>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { position: relative; display: inline-block; }

    .mp-wrap {
      display: flex; align-items: center; gap: 8px;
      background: #fff;
      border: 1.5px solid #e2e8f0;
      border-radius: 12px;
      padding: 0 14px;
      height: 42px;
      cursor: pointer;
      box-shadow: 0 1px 3px rgba(0,0,0,.06);
      transition: all .2s;
      user-select: none;
    }
    .mp-wrap:hover, .mp-wrap-open {
      border-color: #6366f1;
      box-shadow: 0 2px 8px rgba(99,102,241,.12);
    }
    .mp-icon { font-size: 19px; width: 19px; height: 19px; color: #6366f1; }
    .mp-label { font-size: 14px; font-weight: 600; color: #1e293b; white-space: nowrap; }
    .mp-chevron {
      font-size: 18px; width: 18px; height: 18px; color: #94a3b8;
      transition: transform .25s;
    }
    .mp-chevron-open { transform: rotate(180deg); }

    .mp-dropdown {
      position: absolute; top: 50px; right: 0;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      padding: 16px;
      width: 280px;
      box-shadow: 0 12px 40px rgba(0,0,0,.12), 0 4px 12px rgba(0,0,0,.06);
      z-index: 1000;
      animation: mp-slide 0.2s ease-out;
    }
    @keyframes mp-slide {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    .mp-year-row {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .mp-year-btn {
      width: 32px; height: 32px; border-radius: 8px;
      border: none; background: #f1f5f9;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      color: #475569; transition: all .15s;
    }
    .mp-year-btn:hover { background: #6366f1; color: #fff; }
    .mp-year-btn mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .mp-year-label { font-size: 16px; font-weight: 700; color: #1e293b; }

    .mp-month-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px;
    }
    .mp-month-cell {
      padding: 10px 4px;
      border: none; border-radius: 10px;
      background: transparent;
      font-family: inherit; font-size: 13px; font-weight: 500;
      color: #475569; cursor: pointer;
      transition: all .15s;
    }
    .mp-month-cell:hover { background: #f0f0ff; color: #6366f1; }
    .mp-month-today {
      border: 1.5px solid #c7d2fe !important;
      color: #6366f1; font-weight: 600;
    }
    .mp-month-active {
      background: linear-gradient(135deg, #6366f1 0%, #7c3aed 100%) !important;
      color: #fff !important; font-weight: 700;
      box-shadow: 0 3px 10px rgba(99,102,241,.3);
    }

    .mp-footer {
      display: flex; justify-content: center;
      margin-top: 12px; padding-top: 12px;
      border-top: 1px solid #f1f5f9;
    }
    .mp-footer-btn {
      border: none; background: none; cursor: pointer;
      font-family: inherit; font-size: 12.5px; font-weight: 600;
      color: #6366f1; padding: 4px 12px; border-radius: 8px;
      transition: background .15s;
    }
    .mp-footer-btn:hover { background: #eef2ff; }
  `]
})
export class MonthPickerComponent {
  /** Two-way binding: value is "YYYY-MM" string */
  readonly value = input.required<string>();
  readonly valueChange = output<string>();

  readonly pickerOpen = signal(false);
  readonly browseYear = signal(new Date().getFullYear());

  readonly todayMonth = new Date().getMonth() + 1;
  readonly todayYear = new Date().getFullYear();

  readonly months = [
    { value: 1,  short: 'Th1' },  { value: 2,  short: 'Th2' },
    { value: 3,  short: 'Th3' },  { value: 4,  short: 'Th4' },
    { value: 5,  short: 'Th5' },  { value: 6,  short: 'Th6' },
    { value: 7,  short: 'Th7' },  { value: 8,  short: 'Th8' },
    { value: 9,  short: 'Th9' },  { value: 10, short: 'Th10' },
    { value: 11, short: 'Th11' }, { value: 12, short: 'Th12' },
  ];

  readonly selectedYearNum = computed(() => parseInt(this.value().split('-')[0]));
  readonly selectedMonthNum = computed(() => parseInt(this.value().split('-')[1]));

  @HostListener('document:click')
  onDocClick() { this.pickerOpen.set(false); }

  toggle(e: Event) {
    e.stopPropagation();
    const willOpen = !this.pickerOpen();
    this.pickerOpen.set(willOpen);
    if (willOpen) this.browseYear.set(this.selectedYearNum());
  }

  prevYear() { this.browseYear.update(y => y - 1); }
  nextYear() { this.browseYear.update(y => y + 1); }

  selectMonth(month: number) {
    const val = `${this.browseYear()}-${String(month).padStart(2, '0')}`;
    this.pickerOpen.set(false);
    this.valueChange.emit(val);
  }

  goToday() {
    const now = new Date();
    this.browseYear.set(now.getFullYear());
    this.selectMonth(now.getMonth() + 1);
  }
}
