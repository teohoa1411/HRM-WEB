import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { EmployeeContract } from '../../../core/models/contract.models';
import { ContractService } from '../../../core/services/contract.service';
import { DocumentService } from '../../../core/services/document.service';
import { ContractExtendDialogComponent } from '../contract-extend-dialog/contract-extend-dialog.component';

@Component({
  selector: 'app-contract-detail-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    <!-- Header — avatar + NV info + badges -->
    <div class="dialog-header">
      <div class="header-row">
        <div class="avatar">{{ avatarText(data.employeeName) }}</div>
        <div class="header-info">
          <div class="header-name">{{ data.employeeName }}</div>
          <div class="header-code">{{ data.employeeCode }}</div>
        </div>
        <div class="header-badges">
          <span [class]="'badge badge-' + data.status.toLowerCase()">{{ statusLabel(data.status) }}</span>
          <span [class]="'badge badge-cat-' + data.contractTypeCategory.toLowerCase()">
            {{ data.contractTypeCategory === 'CONTRACT' ? 'Hợp đồng' : 'Cam kết' }}
          </span>
        </div>
      </div>
    </div>

    <mat-dialog-content class="dialog-body">
      <!-- Contract type name -->
      <div class="contract-title">{{ data.contractTypeName }}</div>

      <!-- Detail table — 2 columns, aligned -->
      <table class="detail-table">
        <tr>
          <td class="dt-label">Số hợp đồng</td>
          <td class="dt-value">{{ data.contractNumber || '—' }}</td>
        </tr>
        <tr>
          <td class="dt-label">Ngày ký</td>
          <td class="dt-value">{{ data.signedDate ? formatDate(data.signedDate) : '—' }}</td>
        </tr>
        <tr>
          <td class="dt-label">Hiệu lực từ</td>
          <td class="dt-value">{{ formatDate(data.effectiveFrom) }}</td>
        </tr>
        <tr>
          <td class="dt-label">Hiệu lực đến</td>
          <td class="dt-value">{{ data.effectiveTo ? formatDate(data.effectiveTo) : 'Vô thời hạn' }}</td>
        </tr>
        <tr>
          <td class="dt-label">Thời hạn</td>
          <td class="dt-value">{{ data.durationMonths ? data.durationMonths + ' tháng' : '—' }}</td>
        </tr>
        @if (data.effectiveTo) {
          <tr>
            <td class="dt-label">Còn lại</td>
            <td [class]="'dt-value ' + daysClass">{{ daysLabel }}</td>
          </tr>
        }
      </table>

      <!-- Notes -->
      @if (data.notes) {
        <div class="section-card">
          <div class="section-label">Ghi chú</div>
          <div class="section-text">{{ data.notes }}</div>
        </div>
      }

      <!-- Document -->
      @if (data.documentId) {
        <div class="file-card">
          <mat-icon class="file-icon">attach_file</mat-icon>
          <span class="file-name">Bản scan HĐ — {{ data.contractNumber || data.contractTypeName }}</span>
          <button mat-stroked-button class="file-btn" (click)="downloadDocument()" [disabled]="downloading">
            @if (downloading) {
              <span class="dl-spinner"></span>
            } @else {
              Tải xuống
            }
          </button>
        </div>
      } @else {
        <div class="file-card file-card--empty">
          <mat-icon class="file-icon file-icon--empty">description</mat-icon>
          <span class="file-name file-name--empty">Chưa có bản scan</span>
        </div>
      }
    </mat-dialog-content>

    <!-- Actions -->
    <mat-dialog-actions class="dialog-actions">
      @if (data.status === 'ACTIVE' || data.status === 'EXPIRING_SOON') {
        <button mat-stroked-button (click)="terminate()">
          <mat-icon>block</mat-icon> Chấm dứt
        </button>
        <button mat-stroked-button color="primary" (click)="openExtend()">
          <mat-icon>autorenew</mat-icon> Gia hạn
        </button>
      }
      <button mat-stroked-button [routerLink]="['/contracts', data.publicId, 'edit']" (click)="dialogRef.close()">
        <mat-icon>edit</mat-icon> Sửa
      </button>
      <button mat-flat-button color="basic" (click)="dialogRef.close()">Đóng</button>
    </mat-dialog-actions>
  `,
  styles: [`
    /* Header */
    .dialog-header {
      background: #EEEDFE;
      padding: 20px 24px;
    }
    .header-row {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .avatar {
      width: 44px; height: 44px; border-radius: 50%;
      background: #534AB7; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 15px; flex-shrink: 0;
    }
    .header-info { flex: 1; min-width: 0; }
    .header-name { font-weight: 600; font-size: 15px; color: #26215C; }
    .header-code { font-size: 12px; color: #534AB7; margin-top: 2px; }
    .header-badges { display: flex; gap: 6px; flex-shrink: 0; }

    /* Badges */
    .badge {
      padding: 3px 10px; border-radius: 10px;
      font-size: 11px; font-weight: 600;
    }
    .badge-active { background: #dcfce7; color: #166534; }
    .badge-expiring_soon { background: #fef3c7; color: #92400e; }
    .badge-expired { background: #fee2e2; color: #991b1b; }
    .badge-terminated { background: #f3f4f6; color: #4b5563; }
    .badge-cat-contract { background: #dbeafe; color: #1e40af; }
    .badge-cat-commitment { background: #fce7f3; color: #be185d; }

    /* Body */
    .dialog-body { padding: 20px 24px !important; overflow: visible !important; }
    .contract-title { font-size: 17px; font-weight: 700; color: #0f172a; margin-bottom: 16px; }

    /* Detail table */
    .detail-table {
      width: 100%; border-collapse: collapse;
    }
    .detail-table tr td {
      padding: 9px 0;
      border-bottom: 1px solid #f3f4f6;
      font-size: 13px;
    }
    .detail-table tr:last-child td { border-bottom: none; }
    .dt-label { color: #64748b; width: 140px; }
    .dt-value { font-weight: 500; text-align: right; color: #0f172a; }
    .dt-green { color: #16a34a !important; }
    .dt-amber { color: #d97706 !important; font-weight: 600 !important; }
    .dt-red { color: #dc2626 !important; font-weight: 700 !important; }

    /* Sections */
    .section-card {
      margin-top: 16px; padding: 12px 14px;
      background: #f9fafb; border-radius: 8px;
    }
    .section-label {
      font-size: 10px; font-weight: 700; color: #94a3b8;
      text-transform: uppercase; letter-spacing: 0.4px; margin-bottom: 4px;
    }
    .section-text {
      font-size: 13px; color: #334155; line-height: 1.6; white-space: pre-wrap;
    }

    /* File */
    .file-card {
      margin-top: 12px; display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; background: #eff6ff; border-radius: 8px;
    }
    .file-icon { color: #1d4ed8; font-size: 18px; width: 18px; height: 18px; flex-shrink: 0; }
    .file-name { font-size: 13px; color: #1d4ed8; font-weight: 500; flex: 1; }
    .file-btn { font-size: 12px !important; padding: 2px 10px !important; min-width: 0 !important; line-height: 24px !important; }
    .file-card--empty { background: #f9fafb; border: 1px dashed #d1d5db; }
    .file-icon--empty { color: #9ca3af !important; }
    .file-name--empty { color: #9ca3af !important; font-style: italic; }
    .dl-spinner {
      width: 14px; height: 14px;
      border: 2px solid rgba(0,0,0,0.15); border-top-color: #1d4ed8;
      border-radius: 50%; display: inline-block;
      animation: dl-spin 0.6s linear infinite;
    }
    @keyframes dl-spin { to { transform: rotate(360deg); } }

    /* Actions */
    .dialog-actions {
      padding: 12px 24px 20px !important;
      border-top: 1px solid #f3f4f6;
      display: flex; gap: 8px; justify-content: flex-end;
    }
    .dialog-actions button {
      font-size: 13px !important;
    }
    .dialog-actions button mat-icon {
      font-size: 16px; width: 16px; height: 16px; margin-right: 4px;
    }
  `]
})
export class ContractDetailDialogComponent {
  readonly dialogRef = inject(MatDialogRef<ContractDetailDialogComponent>);
  readonly data: EmployeeContract = inject(MAT_DIALOG_DATA);
  private dialog = inject(MatDialog);
  private contractService = inject(ContractService);
  private documentService = inject(DocumentService);
  private snackBar = inject(MatSnackBar);
  downloading = false;

  get daysLeft(): number {
    if (!this.data.effectiveTo) return 999;
    const diff = new Date(this.data.effectiveTo).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  get daysLabel(): string {
    const d = this.daysLeft;
    if (d < 0) return `Quá ${-d} ngày`;
    return `${d} ngày`;
  }

  get daysClass(): string {
    const d = this.daysLeft;
    if (d < 0) return 'dt-value dt-red';
    if (d <= 30) return 'dt-value dt-amber';
    return 'dt-value dt-green';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('vi-VN');
  }

  avatarText(name: string): string {
    const p = name.trim().split(' ');
    return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : p[0].substring(0, 2).toUpperCase();
  }

  statusLabel(s: string): string {
    const m: Record<string, string> = { ACTIVE: 'Đang hiệu lực', EXPIRING_SOON: 'Sắp hết hạn', EXPIRED: 'Đã hết hạn', TERMINATED: 'Chấm dứt' };
    return m[s] || s;
  }

  downloadDocument() {
    if (!this.data.documentId || this.downloading) return;
    this.downloading = true;
    this.documentService.getDownloadUrl(this.data.employeePublicId, this.data.documentId).subscribe({
      next: (url) => {
        this.downloading = false;
        window.open(url, '_blank');
      },
      error: () => {
        this.downloading = false;
        this.snackBar.open('Không thể tải file. Vui lòng thử lại.', 'Đóng', { duration: 3000 });
      }
    });
  }

  openExtend() {
    this.dialogRef.close();
    this.dialog.open(ContractExtendDialogComponent, { width: '600px', data: { contract: this.data } })
      .afterClosed().subscribe(result => { if (result) this.dialogRef.close('updated'); });
  }

  terminate() {
    const reason = prompt('Nhập lý do chấm dứt:');
    if (reason) {
      this.contractService.terminate(this.data.publicId, reason).subscribe({
        next: () => { this.snackBar.open('Đã chấm dứt HĐ', 'OK', { duration: 2000 }); this.dialogRef.close('updated'); },
        error: () => this.snackBar.open('Lỗi', 'X', { duration: 3000 })
      });
    }
  }
}
