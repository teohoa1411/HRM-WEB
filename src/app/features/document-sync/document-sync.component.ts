import {
  Component, inject, OnInit, OnDestroy, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DocumentSyncService } from '../../core/services/document-sync.service';
import { SyncSession, SyncLog } from '../../core/models/document-sync.models';
import { PageResponse } from '../../core/models/api.models';
import { interval, Subscription, of } from 'rxjs';
import { switchMap, startWith, catchError } from 'rxjs/operators';

@Component({
  selector: 'app-document-sync',
  standalone: true,
  imports: [
    CommonModule, MatCardModule, MatButtonModule, MatIconModule,
    MatProgressBarModule, MatTableModule, MatChipsModule,
    MatDialogModule, MatPaginatorModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Đồng bộ Tài liệu</div>
          <div class="page-subtitle">Sao lưu tài liệu nhân sự từ S3 ra thư mục đích</div>
        </div>
        <button mat-flat-button color="primary"
                [disabled]="syncing()"
                (click)="confirmAndSync()">
          <mat-icon>cloud_sync</mat-icon>
          {{ syncing() ? 'Đang đồng bộ...' : 'Đồng bộ ngay' }}
        </button>
      </div>

      <!-- Running session card -->
      @if (runningSession()) {
        <mat-card style="margin-bottom:20px; border-left:4px solid #1d4ed8;">
          <mat-card-content style="padding:16px 20px!important;">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:10px;">
              <mat-icon style="color:#1d4ed8;">sync</mat-icon>
              <strong>Đang chạy — Session #{{ runningSession()!.id }}</strong>
            </div>
            <mat-progress-bar mode="indeterminate" color="primary"></mat-progress-bar>
            <div style="font-size:12px; color:#6b7280; margin-top:8px;">
              Bắt đầu: {{ runningSession()!.startedAt | date:'dd/MM/yyyy HH:mm:ss' }}
              &nbsp;|&nbsp; Đích: {{ runningSession()!.targetBasePath }}
            </div>
          </mat-card-content>
        </mat-card>
      }

      <!-- Session message -->
      @if (syncMsg()) {
        <div style="padding:10px 14px; border-radius:6px; margin-bottom:16px;"
             [style.background]="syncMsgType() === 'error' ? '#fef2f2' : '#f0fdf4'"
             [style.color]="syncMsgType() === 'error' ? '#dc2626' : '#16a34a'">
          {{ syncMsg() }}
        </div>
      }

      <!-- History table -->
      <mat-card>
        <mat-card-header>
          <mat-card-title>Lịch sử đồng bộ</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          @if (loadingHistory()) {
            <div style="text-align:center; padding:32px;">
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            </div>
          } @else if (historyPage()?.content?.length === 0) {
            <div style="text-align:center; padding:32px; color:#9ca3af;">
              Chưa có lần đồng bộ nào
            </div>
          } @else {
            <table mat-table [dataSource]="historyPage()?.content ?? []" style="width:100%;">

              <ng-container matColumnDef="id">
                <th mat-header-cell *matHeaderCellDef>#</th>
                <td mat-cell *matCellDef="let s">{{ s.id }}</td>
              </ng-container>

              <ng-container matColumnDef="startedAt">
                <th mat-header-cell *matHeaderCellDef>Thời gian</th>
                <td mat-cell *matCellDef="let s">
                  {{ s.startedAt | date:'dd/MM/yyyy HH:mm' }}<br>
                  <span style="font-size:11px; color:#9ca3af;">
                    {{ s.completedAt ? ('→ ' + (s.completedAt | date:'HH:mm:ss')) : 'Đang chạy...' }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
                <td mat-cell *matCellDef="let s">
                  <mat-chip [style.background]="statusColor(s.status)"
                            [style.color]="statusTextColor(s.status)"
                            style="font-size:12px; min-height:24px;">
                    {{ statusLabel(s.status) }}
                  </mat-chip>
                </td>
              </ng-container>

              <ng-container matColumnDef="counts">
                <th mat-header-cell *matHeaderCellDef>Tổng / Sync / Bỏ qua / Lỗi</th>
                <td mat-cell *matCellDef="let s">
                  {{ s.totalDocuments }} /
                  <span style="color:#16a34a;">{{ s.syncedCount }}</span> /
                  <span style="color:#6b7280;">{{ s.skippedCount }}</span> /
                  <span style="color:#dc2626;">{{ s.failedCount }}</span>
                </td>
              </ng-container>

              <ng-container matColumnDef="target">
                <th mat-header-cell *matHeaderCellDef>Đích</th>
                <td mat-cell *matCellDef="let s"
                    [matTooltip]="s.targetBasePath" style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                  <mat-icon style="font-size:14px; vertical-align:middle;">{{ s.targetType === 'S3_BUCKET' ? 'cloud' : 'folder' }}</mat-icon>
                  {{ s.targetType }}
                </td>
              </ng-container>

              <ng-container matColumnDef="actions">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let s">
                  <button mat-icon-button (click)="openLogs(s)"
                          matTooltip="Xem chi tiết">
                    <mat-icon>list_alt</mat-icon>
                  </button>
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>

            <mat-paginator
              [length]="historyPage()?.totalElements ?? 0"
              [pageSize]="historyPageSize"
              [pageSizeOptions]="[10, 20, 50]"
              (page)="onHistoryPage($event)">
            </mat-paginator>
          }
        </mat-card-content>
      </mat-card>

      <!-- Log detail panel (inline) -->
      @if (selectedSession()) {
        <mat-card style="margin-top:20px;">
          <mat-card-header>
            <mat-card-title>Chi tiết Session #{{ selectedSession()!.id }}</mat-card-title>
            <div style="margin-left:auto;">
              <button mat-icon-button (click)="selectedSession.set(null)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </mat-card-header>
          <mat-card-content>
            @if (loadingLogs()) {
              <mat-progress-bar mode="indeterminate"></mat-progress-bar>
            } @else {
              <table mat-table [dataSource]="logsPage()?.content ?? []" style="width:100%; font-size:13px;">

                <ng-container matColumnDef="empCode">
                  <th mat-header-cell *matHeaderCellDef>Nhân sự</th>
                  <td mat-cell *matCellDef="let l">{{ l.employeeCode }}</td>
                </ng-container>

                <ng-container matColumnDef="s3Key">
                  <th mat-header-cell *matHeaderCellDef>S3 Key</th>
                  <td mat-cell *matCellDef="let l"
                      [matTooltip]="l.s3Key" style="max-width:220px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    {{ l.s3Key }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="syncStatus">
                  <th mat-header-cell *matHeaderCellDef>Kết quả</th>
                  <td mat-cell *matCellDef="let l">
                    <mat-chip [style.background]="logStatusColor(l.syncStatus)"
                              style="font-size:11px; min-height:22px;">
                      {{ l.syncStatus }}
                    </mat-chip>
                  </td>
                </ng-container>

                <ng-container matColumnDef="targetPath">
                  <th mat-header-cell *matHeaderCellDef>Đích</th>
                  <td mat-cell *matCellDef="let l"
                      [matTooltip]="l.targetPath" style="max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                    {{ l.targetPath ?? '-' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="error">
                  <th mat-header-cell *matHeaderCellDef>Lỗi</th>
                  <td mat-cell *matCellDef="let l" style="color:#dc2626; max-width:200px;">
                    {{ l.errorMessage ?? '' }}
                  </td>
                </ng-container>

                <ng-container matColumnDef="syncedAt">
                  <th mat-header-cell *matHeaderCellDef>Thời gian</th>
                  <td mat-cell *matCellDef="let l">{{ l.syncedAt | date:'HH:mm:ss' }}</td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="logColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: logColumns;"></tr>
              </table>

              <mat-paginator
                [length]="logsPage()?.totalElements ?? 0"
                [pageSize]="logsPageSize"
                [pageSizeOptions]="[20, 50, 100]"
                (page)="onLogsPage($event)">
              </mat-paginator>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-size: 22px; font-weight: 700; color: #1e3a5f; }
    .page-subtitle { font-size: 13px; color: #6b7280; margin-top: 2px; }
  `]
})
export class DocumentSyncComponent implements OnInit, OnDestroy {
  private syncSvc = inject(DocumentSyncService);

  readonly syncing         = signal(false);
  readonly syncMsg         = signal<string | null>(null);
  readonly syncMsgType     = signal<'success' | 'error'>('success');
  readonly loadingHistory  = signal(false);
  readonly loadingLogs     = signal(false);
  readonly historyPage     = signal<PageResponse<SyncSession> | null>(null);
  readonly logsPage        = signal<PageResponse<SyncLog> | null>(null);
  readonly runningSession  = signal<SyncSession | null>(null);
  readonly selectedSession = signal<SyncSession | null>(null);

  displayedColumns = ['id', 'startedAt', 'status', 'counts', 'target', 'actions'];
  logColumns       = ['empCode', 's3Key', 'syncStatus', 'targetPath', 'error', 'syncedAt'];
  historyPageSize  = 20;
  logsPageSize     = 50;
  private historyPageIndex = 0;
  private logsPageIndex    = 0;

  private pollSub?: Subscription;

  ngOnInit() {
    this.loadHistory();
    this.startPolling();
  }

  ngOnDestroy() {
    this.pollSub?.unsubscribe();
  }

  confirmAndSync() {
    if (!confirm('Bắt đầu đồng bộ tài liệu về máy chủ?\nQuá trình có thể mất vài phút.')) return;
    this.syncing.set(true);
    this.syncMsg.set(null);
    this.syncSvc.triggerSync().subscribe({
      next: res => {
        this.syncing.set(res.status === 'RUNNING' && res.sessionId > 0);
        this.syncMsg.set(res.message);
        this.syncMsgType.set('success');
        this.loadHistory();
      },
      error: err => {
        this.syncing.set(false);
        this.syncMsg.set(err?.error?.message ?? 'Có lỗi xảy ra khi bắt đầu đồng bộ');
        this.syncMsgType.set('error');
      }
    });
  }

  openLogs(session: SyncSession) {
    this.selectedSession.set(session);
    this.logsPageIndex = 0;
    this.loadLogs(session.id);
  }

  onHistoryPage(e: PageEvent) {
    this.historyPageIndex = e.pageIndex;
    this.historyPageSize  = e.pageSize;
    this.loadHistory();
  }

  onLogsPage(e: PageEvent) {
    this.logsPageIndex = e.pageIndex;
    this.logsPageSize  = e.pageSize;
    if (this.selectedSession()) this.loadLogs(this.selectedSession()!.id);
  }

  private loadHistory() {
    this.loadingHistory.set(true);
    this.syncSvc.getHistory(this.historyPageIndex, this.historyPageSize).subscribe({
      next: page => { this.historyPage.set(page); this.loadingHistory.set(false); },
      error: ()   => this.loadingHistory.set(false)
    });
  }

  private loadLogs(sessionId: number) {
    this.loadingLogs.set(true);
    this.syncSvc.getSessionLogs(sessionId, this.logsPageIndex, this.logsPageSize).subscribe({
      next: page => { this.logsPage.set(page); this.loadingLogs.set(false); },
      error: ()   => this.loadingLogs.set(false)
    });
  }

  /** Poll trạng thái mỗi 5 giây.
   *  - catchError giữ stream sống nếu API lỗi tạm thời.
   *  - Chỉ gọi loadHistory() khi transition RUNNING → null (tránh spam reload).
   */
  private startPolling() {
    this.pollSub = interval(5000).pipe(
      startWith(0),
      switchMap(() =>
        this.syncSvc.getRunningStatus().pipe(
          catchError(() => of(null))   // lỗi mạng → giả sử null, interval tiếp tục
        )
      )
    ).subscribe(session => {
      const wasRunning = !!this.runningSession();
      this.runningSession.set(session);

      if (wasRunning && !session) {
        // Vừa chuyển từ RUNNING → hoàn tất — refresh lịch sử 1 lần
        this.syncing.set(false);
        this.loadHistory();
      }
    });
  }

  statusColor(status: string): string {
    return status === 'COMPLETED' ? '#dcfce7' : status === 'RUNNING' ? '#dbeafe' : '#fef2f2';
  }
  statusTextColor(status: string): string {
    return status === 'COMPLETED' ? '#16a34a' : status === 'RUNNING' ? '#1d4ed8' : '#dc2626';
  }
  statusLabel(status: string): string {
    return status === 'COMPLETED' ? 'Hoàn tất' : status === 'RUNNING' ? 'Đang chạy' : 'Thất bại';
  }
  logStatusColor(status: string): string {
    return status === 'SUCCESS' ? '#dcfce7' : status === 'SKIPPED' ? '#f3f4f6' : '#fef2f2';
  }
}
