import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { WorkCalendarService } from '../../../core/services/work-calendar.service';
import { WorkCalendar } from '../../../core/models/work-calendar.models';

@Component({
  selector: 'app-calendar-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule,
    MatButtonModule, MatIconModule, MatChipsModule, MatMenuModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Lịch làm việc</div>
          <div class="page-subtitle">Quản lý lịch làm việc theo tháng</div>
        </div>
        <div style="display:flex;gap:8px;">
          <button mat-stroked-button (click)="applyDefault()" [disabled]="applying()">
            <mat-icon>content_copy</mat-icon>
            {{ applying() ? 'Đang áp dụng...' : 'Áp dụng lịch mặc định' }}
          </button>
          <button mat-raised-button color="primary" routerLink="new">
            <mat-icon>add</mat-icon> Tạo lịch mới
          </button>
        </div>
      </div>

      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="calendars()">

            <ng-container matColumnDef="yearMonth">
              <th mat-header-cell *matHeaderCellDef>Tháng</th>
              <td mat-cell *matCellDef="let c">
                <div style="font-weight:600;font-size:15px;">{{ c.yearMonth }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="totalWorkdays">
              <th mat-header-cell *matHeaderCellDef>Số ngày công</th>
              <td mat-cell *matCellDef="let c">
                <span style="font-size:20px;font-weight:700;color:#1565c0;">{{ c.totalWorkdays }}</span>
                <span style="font-size:12px;color:#6b7280;margin-left:4px;">ngày</span>
              </td>
            </ng-container>

            <ng-container matColumnDef="details">
              <th mat-header-cell *matHeaderCellDef>Chi tiết ngày</th>
              <td mat-cell *matCellDef="let c">
                <span style="color:#16a34a;font-size:12px;">
                  {{ countDayType(c, 'WORKDAY') }} ngày làm
                </span>
                &nbsp;·&nbsp;
                <span style="color:#dc2626;font-size:12px;">
                  {{ countDayType(c, 'HOLIDAY') }} nghỉ lễ
                </span>
                &nbsp;·&nbsp;
                <span style="color:#9ca3af;font-size:12px;">
                  {{ countDayType(c, 'WEEKEND') }} cuối tuần
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="isDefault">
              <th mat-header-cell *matHeaderCellDef>Mặc định</th>
              <td mat-cell *matCellDef="let c">
                @if (c.isDefault) {
                  <span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:12px;font-size:12px;font-weight:500;">
                    Mặc định
                  </span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Mô tả</th>
              <td mat-cell *matCellDef="let c" style="color:#6b7280;font-size:13px;">{{ c.description || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="[c.id, 'edit']">
                    <mat-icon>edit</mat-icon> Chỉnh sửa
                  </button>
                  <button mat-menu-item style="color:#c62828;" (click)="delete(c)">
                    <mat-icon color="warn">delete</mat-icon> Xóa
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>

          @if (calendars().length === 0) {
            <div style="padding:48px;text-align:center;color:#9ca3af;">
              <mat-icon style="font-size:48px;width:48px;height:48px;margin-bottom:12px;">calendar_month</mat-icon>
              <div>Chưa có lịch làm việc nào. Hãy tạo lịch đầu tiên.</div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class CalendarListComponent implements OnInit {
  private calendarService = inject(WorkCalendarService);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['yearMonth', 'totalWorkdays', 'details', 'isDefault', 'description', 'actions'];
  readonly calendars = signal<WorkCalendar[]>([]);
  readonly applying = signal(false);

  ngOnInit() { this.load(); }

  load() {
    this.calendarService.list().subscribe(list => this.calendars.set(list));
  }

  countDayType(c: WorkCalendar, type: string): number {
    return c.details.filter(d => d.dayType === type).length;
  }

  delete(c: WorkCalendar) {
    if (confirm(`Xóa lịch tháng ${c.yearMonth}?`)) {
      this.calendarService.delete(c.id).subscribe({
        next: () => { this.snackBar.open('Đã xóa lịch', 'OK', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('Xóa thất bại', 'Close', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }

  applyDefault() {
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const target = prompt('Nhập tháng cần áp dụng lịch mặc định (định dạng YYYY-MM):', defaultMonth);
    if (!target || !/^\d{4}-\d{2}$/.test(target)) return;
    this.applying.set(true);
    this.calendarService.applyDefault(target).subscribe({
      next: () => {
        this.snackBar.open(`Đã áp dụng lịch mặc định cho tháng ${target}`, 'OK', { duration: 3000 });
        this.applying.set(false);
        this.load();
      },
      error: (err) => {
        const msg = err?.error?.message || 'Áp dụng thất bại';
        this.snackBar.open(msg, 'Close', { duration: 4000, panelClass: 'error-snack' });
        this.applying.set(false);
      }
    });
  }
}
