import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContractService } from '../../../core/services/contract.service';
import { EmployeeContract } from '../../../core/models/contract.models';
import { ContractExtendDialogComponent } from '../contract-extend-dialog/contract-extend-dialog.component';

@Component({
  selector: 'app-contract-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, RouterLink],
  template: `
    @if (contract()) {
      <div class="detail-container">

        <!-- Header -->
        <div class="detail-header">
          <div>
            <div class="detail-title">{{ contract()!.employeeName }}</div>
            <div class="detail-code">{{ contract()!.employeeCode }}</div>
            @if (contract()!.contractNumber) {
              <div class="detail-contract-number">
                <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;margin-right:4px;">confirmation_number</mat-icon>
                {{ contract()!.contractNumber }}
              </div>
            }
          </div>
          <div class="header-badges">
            <span [ngClass]="'badge badge--type--' + contract()!.contractTypeCategory.toLowerCase()">
              {{ contract()!.contractTypeName }}
            </span>
            <span [ngClass]="getStatusBadgeClass(contract()!.status)">
              {{ getStatusLabel(contract()!.status) }}
            </span>
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          <button mat-raised-button [routerLink]="['/contracts', contract()!.publicId, 'edit']">
            <mat-icon>edit</mat-icon> Sửa
          </button>
          <button mat-raised-button color="accent" (click)="openExtendDialog()">
            <mat-icon>extension</mat-icon> Gia hạn
          </button>
          <button mat-stroked-button style="color:#c62828;" (click)="terminate()">
            <mat-icon>stop_circle</mat-icon> Chấm dứt
          </button>
          <button mat-stroked-button style="color:#c62828;" (click)="delete()">
            <mat-icon color="warn">delete</mat-icon> Xóa
          </button>
          <button mat-stroked-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Quay lại
          </button>
        </div>

        <!-- Info Grid -->
        <div class="info-grid-2">
          <!-- Card 1: Thông tin hợp đồng -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Thông tin hợp đồng</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Số hợp đồng</span>
                  <span class="info-value">{{ contract()!.contractNumber || '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Loại hợp đồng</span>
                  <span class="info-value">{{ contract()!.contractTypeName }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Loại</span>
                  <span class="info-value">
                    {{ contract()!.contractTypeCategory === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản cam kết' }}
                  </span>
                </div>
                <div class="info-item">
                  <span class="info-label">Ngày ký</span>
                  <span class="info-value">{{ contract()!.signedDate ? formatDate(contract()!.signedDate!) : '—' }}</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <!-- Card 2: Thời hạn -->
          <mat-card>
            <mat-card-header>
              <mat-card-title>Thời hạn</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Hiệu lực từ</span>
                  <span class="info-value">{{ formatDate(contract()!.effectiveFrom) }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Hết hạn ngày</span>
                  <span class="info-value">{{ contract()!.effectiveTo ? formatDate(contract()!.effectiveTo!) : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Thời hạn</span>
                  <span class="info-value">{{ contract()!.durationMonths ? contract()!.durationMonths + ' tháng' : '—' }}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Trạng thái</span>
                  <span [ngClass]="getStatusBadgeClass(contract()!.status)">
                    {{ getStatusLabel(contract()!.status) }}
                  </span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Card 3: Ghi chú -->
        @if (contract()!.notes) {
          <mat-card style="margin-top:16px;">
            <mat-card-header>
              <mat-card-title>Ghi chú</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p style="margin:0; color:#1e293b; line-height:1.6; white-space:pre-line;">{{ contract()!.notes }}</p>
            </mat-card-content>
          </mat-card>
        }

        <!-- Card 4: File đính kèm -->
        <mat-card style="margin-top:16px;">
          <mat-card-header>
            <mat-card-title>File đính kèm</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (contract()!.documentId) {
              <div class="document-link">
                <mat-icon>description</mat-icon>
                <a [href]="'#'" target="_blank">Xem file hợp đồng</a>
              </div>
            } @else {
              <div style="text-align:center; color:#94a3b8; padding:24px;">
                <mat-icon style="font-size:48px; width:48px; height:48px; opacity:0.3;">insert_drive_file</mat-icon>
                <div style="margin-top:12px;">Chưa có file đính kèm</div>
              </div>
            }
          </mat-card-content>
        </mat-card>

      </div>
    }
  `,
  styles: [`
    .detail-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .detail-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 2px solid #e5e7eb;
    }

    .detail-title {
      font-size: 28px;
      font-weight: 800;
      color: #0f172a;
    }

    .detail-code {
      font-size: 14px;
      font-weight: 600;
      color: #6366f1;
      margin-top: 4px;
      font-family: monospace;
    }

    .detail-contract-number {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .header-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge--type--contract {
      background: #dbeafe;
      color: #1e40af;
    }

    .badge--type--commitment {
      background: #fbdfe8;
      color: #be185d;
    }

    .status-chip {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-chip.active { background: #dcfce7; color: #166534; }
    .status-chip.expiring_soon { background: #fef3c7; color: #92400e; }
    .status-chip.expired { background: #fee2e2; color: #991b1b; }
    .status-chip.terminated { background: #f3f4f6; color: #4b5563; }

    .action-buttons {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }

    button[mat-raised-button],
    button[mat-stroked-button] {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Info Grid 2 Columns */
    .info-grid-2 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
      margin-top: 24px;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .info-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 14px;
      font-weight: 500;
      color: #1e293b;
    }

    /* Document Link */
    .document-link {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: #f0f9ff;
      border-radius: 10px;
      border: 1px solid #bae6fd;
    }

    .document-link mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: #0284c7;
    }

    .document-link a {
      color: #0284c7;
      text-decoration: none;
      font-weight: 600;
      &:hover { text-decoration: underline; }
    }

    /* Responsive */
    @media (max-width: 640px) {
      .detail-header {
        flex-direction: column;
      }
      .action-buttons {
        flex-direction: column;
      }
      button {
        width: 100%;
      }
      .info-grid-2 {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ContractDetailComponent implements OnInit {
  private contractService = inject(ContractService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly contract = signal<EmployeeContract | null>(null);

  ngOnInit() {
    const publicId = this.route.snapshot.paramMap.get('id');
    if (publicId) {
      this.loadContract(publicId);
    }
  }

  private loadContract(publicId: string) {
    this.contractService.getByPublicId(publicId).subscribe(contract => {
      this.contract.set(contract);
    });
  }

  openExtendDialog() {
    const contract = this.contract();
    if (!contract) return;

    this.dialog.open(ContractExtendDialogComponent, {
      width: '600px',
      data: { contract }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadContract(contract.publicId);
        this.snackBar.open('Hợp đồng được cập nhật', 'OK', { duration: 2000 });
      }
    });
  }

  terminate() {
    const contract = this.contract();
    if (!contract) return;

    const reason = prompt('Nhập lý do chấm dứt:');
    if (reason) {
      this.contractService.terminate(contract.publicId, reason).subscribe({
        next: () => {
          this.snackBar.open('Hợp đồng được chấm dứt', 'OK', { duration: 2000 });
          this.router.navigate(['/contracts']);
        },
        error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }

  delete() {
    const contract = this.contract();
    if (!contract) return;

    if (confirm(`Xóa hợp đồng của ${contract.employeeName}?`)) {
      this.contractService.delete(contract.publicId).subscribe({
        next: () => {
          this.snackBar.open('Hợp đồng được xóa', 'OK', { duration: 2000 });
          this.router.navigate(['/contracts']);
        },
        error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'ACTIVE': 'Đang hiệu lực',
      'EXPIRING_SOON': 'Sắp hết hạn',
      'EXPIRED': 'Đã hết hạn',
      'TERMINATED': 'Chấm dứt'
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    return `status-chip ${status.toLowerCase().replace(/_/g, '_')}`;
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('vi-VN');
  }

  goBack() {
    this.router.navigate(['/contracts']);
  }
}
