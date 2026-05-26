import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetService } from '../../../core/services/asset.service';
import { Asset, AssetAssignment } from '../../../core/models/asset.models';
import { AssetAssignDialogComponent } from '../asset-assign-dialog/asset-assign-dialog.component';
import { AssetReturnDialogComponent } from '../asset-return-dialog/asset-return-dialog.component';

@Component({
  selector: 'app-asset-detail',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, RouterLink],
  template: `
    @if (asset()) {
      <div class="detail-container">

        <!-- Header -->
        <div class="detail-header">
          <div>
            <div class="detail-title">{{ asset()!.name }}</div>
            <div class="detail-code">{{ asset()!.assetCode }}</div>
            @if (asset()!.serialNumber) {
              <div class="detail-serial">SN: {{ asset()!.serialNumber }}</div>
            }
            @if (asset()!.labelCode) {
              <div class="detail-serial" style="color:#6366f1;">
                <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;margin-right:4px;">label</mat-icon>
                {{ asset()!.labelCode }}
              </div>
            }
            @if (asset()!.description) {
              <div style="font-size:13px; color:#64748b; margin-top:6px; line-height:1.5; max-width:500px; white-space:pre-line;">
                {{ asset()!.description }}
              </div>
            }
          </div>
          <div class="header-badges">
            <span [ngClass]="getStatusBadgeClass(asset()!.status)">
              {{ getStatusLabel(asset()!.status) }}
            </span>
            <span [ngClass]="'badge badge--' + asset()!.ownershipType.toLowerCase()">
              {{ asset()!.ownershipType === 'COMPANY_OWNED' ? 'Cty' : 'Vendor' }}
            </span>
            @if (asset()!.isRented) {
              <span class="badge badge--rented">Thuê</span>
            }
          </div>
        </div>

        <!-- Action Buttons -->
        <div class="action-buttons">
          @if (asset()!.status !== 'DISPOSED' && asset()!.status !== 'LOST') {
            @if (asset()!.currentHolderId) {
              <button mat-raised-button color="accent" (click)="openReturnDialog()">
                <mat-icon>assignment_return</mat-icon> Thu hồi
              </button>
            } @else {
              <button mat-raised-button color="primary" (click)="openAssignDialog()">
                <mat-icon>person_add</mat-icon> Cấp phát
              </button>
            }
          }
          <button mat-stroked-button [routerLink]="['/assets', asset()!.id, 'edit']">
            <mat-icon>edit</mat-icon> Chỉnh sửa
          </button>
          <button mat-stroked-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon> Quay lại
          </button>
        </div>

        <!-- Info Grid -->
        <mat-card style="margin-top:24px;">
          <mat-card-header>
            <mat-card-title>Thông tin cơ bản</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Loại tài sản</span>
                <span class="info-value">{{ asset()!.categoryName }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Tình trạng</span>
                <span class="info-value">{{ getConditionLabel(asset()!.assetCondition) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Chủ sở hữu</span>
                <span class="info-value">
                  {{ asset()!.ownerVendorName || 'Công ty' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Nhà cung cấp</span>
                <span class="info-value">
                  {{ asset()!.supplierVendorName || '—' }}
                </span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Warranty -->
        @if (asset()!.purchaseDate && asset()!.warrantyMonths) {
          <mat-card style="margin-top:16px;">
            <mat-card-header>
              <mat-card-title>Bảo hành</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="warranty-container">
                <div class="warranty-info">
                  <div>Ngày mua: <strong>{{ formatDate(asset()!.purchaseDate!) }}</strong></div>
                  <div>Thời hạn: <strong>{{ asset()!.warrantyMonths }} tháng</strong></div>
                  <div>Hết hạn: <strong>{{ getWarrantyEndDate(asset()!) }}</strong></div>
                </div>
                <mat-progress-bar
                  mode="determinate"
                  [value]="getWarrantyProgress(asset()!)"
                  [ngClass]="getWarrantyColor(asset()!)">
                </mat-progress-bar>
                <div style="margin-top:8px; font-size:12px; color:#64748b;">
                  Còn lại: {{ getWarrantyRemaining(asset()!) }} tháng
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Purchase Info -->
        <mat-card style="margin-top:16px;">
          <mat-card-header>
            <mat-card-title>Thông tin mua hàng</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Giá mua</span>
                <span class="info-value">
                  {{ asset()!.purchasePrice ? (asset()!.purchasePrice | number:'1.0-0') + ' VNĐ' : '—' }}
                </span>
              </div>
              <div class="info-item">
                <span class="info-label">Ngày mua</span>
                <span class="info-value">{{ asset()!.purchaseDate ? formatDate(asset()!.purchaseDate!) : '—' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Ngày tạo bản ghi</span>
                <span class="info-value">{{ formatDate(asset()!.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Loại thuê</span>
                <span class="info-value">{{ asset()!.isRented ? 'Có' : 'Không' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Current Holder -->
        @if (asset()!.currentHolderId) {
          <mat-card style="margin-top:16px; border-left:4px solid #3b82f6;">
            <mat-card-header>
              <mat-card-title>Người quản lý hiện tại</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="holder-card">
                <mat-icon class="holder-icon">person</mat-icon>
                <div>
                  <div class="holder-name">{{ asset()!.currentHolderName }}</div>
                  <div class="holder-code">ID: {{ asset()!.currentHolderId }}</div>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <!-- Assignment History -->
        <mat-card style="margin-top:16px;">
          <mat-card-header>
            <mat-card-title>Lịch sử cấp phát</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            @if (assignments().length > 0) {
              <div class="timeline">
                @for (assign of assignments(); track assign.id; let idx = $index) {
                  <div class="timeline-item">
                    <div class="timeline-dot" [ngClass]="assign.returnedDate ? 'returned' : 'current'"></div>
                    <div class="timeline-content">
                      <div class="timeline-header">
                        <span class="timeline-name">{{ assign.employeeName }}</span>
                        @if (assign.returnedDate) {
                          <span class="timeline-status">Thu hồi</span>
                        } @else {
                          <span class="timeline-status active">Đang sử dụng</span>
                        }
                      </div>
                      <div class="timeline-dates">
                        <span>Cấp: {{ formatDate(assign.assignedDate) }}</span>
                        @if (assign.returnedDate) {
                          <span>Thu: {{ formatDate(assign.returnedDate) }}</span>
                        }
                      </div>
                      <div class="timeline-condition">
                        Cấp: {{ getConditionLabel(assign.conditionOnAssign) }}
                        @if (assign.conditionOnReturn) {
                          | Thu: {{ getConditionLabel(assign.conditionOnReturn) }}
                        }
                      </div>
                      @if (assign.notes) {
                        <div class="timeline-notes">{{ assign.notes }}</div>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div style="text-align:center; color:#94a3b8; padding:24px;">
                <mat-icon style="font-size:48px; width:48px; height:48px; opacity:0.3;">history</mat-icon>
                <div style="margin-top:12px;">Chưa có lịch sử cấp phát</div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Notes -->
        @if (asset()!.notes) {
          <mat-card style="margin-top:16px;">
            <mat-card-header>
              <mat-card-title>Ghi chú</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <p style="margin:0; color:#1e293b; line-height:1.6;">{{ asset()!.notes }}</p>
            </mat-card-content>
          </mat-card>
        }

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

    .detail-serial {
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;
    }

    .header-badges {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .status-chip {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-chip.available { background: #dcfce7; color: #166534; }
    .status-chip.in_use { background: #dbeafe; color: #1e40af; }
    .status-chip.maintenance { background: #fef3c7; color: #92400e; }
    .status-chip.disposed { background: #fee2e2; color: #991b1b; }
    .status-chip.lost { background: #f3f4f6; color: #4b5563; }

    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge--company_owned { background: #dbeafe; color: #1e40af; }
    .badge--vendor_owned { background: #fef3c7; color: #92400e; }
    .badge--rented { background: #fee2e2; color: #991b1b; }

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

    /* Warranty */
    .warranty-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .warranty-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
      font-size: 13px;
      color: #475569;
    }

    .warranty-info div {
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    mat-progress-bar {
      height: 8px;
      border-radius: 4px;
    }

    ::ng-deep .warranty-good .mat-progress-fill::after {
      background-color: #22c55e;
    }

    ::ng-deep .warranty-alert .mat-progress-fill::after {
      background-color: #f97316;
    }

    /* Holder Card */
    .holder-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: #eff6ff;
      border-radius: 10px;
    }

    .holder-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #3b82f6;
    }

    .holder-name {
      font-size: 15px;
      font-weight: 600;
      color: #1e293b;
    }

    .holder-code {
      font-size: 12px;
      color: #64748b;
      margin-top: 2px;
    }

    /* Timeline */
    .timeline {
      position: relative;
      padding-left: 0;
    }

    .timeline-item {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 10px;
      top: 40px;
      width: 2px;
      height: calc(100% + 10px);
      background: #e5e7eb;
    }

    .timeline-dot {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #e5e7eb;
      border: 3px solid #fff;
      flex-shrink: 0;
      position: relative;
      z-index: 1;
      margin-top: 2px;
    }

    .timeline-dot.current {
      background: #3b82f6;
      border-color: #dbeafe;
    }

    .timeline-dot.returned {
      background: #84cc16;
      border-color: #ecfdf5;
    }

    .timeline-content {
      flex: 1;
      padding: 12px;
      background: #f8fafc;
      border-radius: 10px;
      border: 1px solid #e2e8f0;
    }

    .timeline-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .timeline-name {
      font-weight: 600;
      color: #1e293b;
    }

    .timeline-status {
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      background: #e5e7eb;
      color: #4b5563;
    }

    .timeline-status.active {
      background: #dbeafe;
      color: #1e40af;
    }

    .timeline-dates {
      font-size: 12px;
      color: #64748b;
      display: flex;
      gap: 16px;
      margin-bottom: 6px;
    }

    .timeline-condition {
      font-size: 12px;
      color: #475569;
      margin-bottom: 6px;
    }

    .timeline-notes {
      font-size: 12px;
      color: #64748b;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-style: italic;
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
    }
  `]
})
export class AssetDetailComponent implements OnInit {
  private assetService = inject(AssetService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly asset = signal<Asset | null>(null);
  readonly assignments = signal<AssetAssignment[]>([]);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadAsset(+id);
      this.loadAssignments(+id);
    }
  }

  private loadAsset(id: number) {
    this.assetService.getById(id).subscribe(asset => this.asset.set(asset));
  }

  private loadAssignments(assetId: number) {
    this.assetService.getAssignmentHistory(assetId).subscribe(assigns => {
      this.assignments.set(assigns);
    });
  }

  openAssignDialog() {
    const asset = this.asset();
    if (!asset) return;
    this.dialog.open(AssetAssignDialogComponent, {
      width: '600px',
      data: { asset }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadAsset(asset.id);
        this.loadAssignments(asset.id);
        this.snackBar.open('Thiết bị được cấp phát', 'OK', { duration: 2000 });
      }
    });
  }

  openReturnDialog() {
    const asset = this.asset();
    if (!asset) return;
    const currentAssignment = this.assignments().find(a => !a.returnedDate);
    if (!currentAssignment) return;
    this.dialog.open(AssetReturnDialogComponent, {
      width: '600px',
      data: { asset, assignment: currentAssignment }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.loadAsset(asset.id);
        this.loadAssignments(asset.id);
        this.snackBar.open('Thiết bị được thu hồi', 'OK', { duration: 2000 });
      }
    });
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      'AVAILABLE': 'Sẵn sàng',
      'IN_USE': 'Đang sử dụng',
      'MAINTENANCE': 'Bảo trì',
      'DISPOSED': 'Đã thanh lý',
      'LOST': 'Mất'
    };
    return labels[status] || status;
  }

  getStatusBadgeClass(status: string): string {
    return `status-chip ${status.toLowerCase().replace(/_/g, '_')}`;
  }

  getConditionLabel(condition: string): string {
    const labels: Record<string, string> = {
      'NEW': 'Mới',
      'GOOD': 'Tốt',
      'FAIR': 'Bình thường',
      'POOR': 'Kém'
    };
    return labels[condition] || condition;
  }

  formatDate(date: string): string {
    const d = new Date(date);
    return d.toLocaleDateString('vi-VN');
  }

  getWarrantyEndDate(asset: Asset): string {
    if (!asset.purchaseDate || !asset.warrantyMonths) return '—';
    const purchaseDate = new Date(asset.purchaseDate);
    const warrantyEnd = new Date(purchaseDate);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + asset.warrantyMonths);
    return warrantyEnd.toLocaleDateString('vi-VN');
  }

  getWarrantyRemaining(asset: Asset): number {
    if (!asset.purchaseDate || !asset.warrantyMonths) return 0;
    const purchaseDate = new Date(asset.purchaseDate);
    const warrantyEnd = new Date(purchaseDate);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + asset.warrantyMonths);
    const now = new Date();
    const monthsLeft = (warrantyEnd.getFullYear() - now.getFullYear()) * 12
      + (warrantyEnd.getMonth() - now.getMonth());
    return Math.max(0, monthsLeft);
  }

  getWarrantyProgress(asset: Asset): number {
    if (!asset.purchaseDate || !asset.warrantyMonths) return 0;
    const purchaseDate = new Date(asset.purchaseDate);
    const warrantyEnd = new Date(purchaseDate);
    warrantyEnd.setMonth(warrantyEnd.getMonth() + asset.warrantyMonths);
    const now = new Date();
    const monthsLeft = (warrantyEnd.getFullYear() - now.getFullYear()) * 12
      + (warrantyEnd.getMonth() - now.getMonth());
    const totalMonths = asset.warrantyMonths;
    return Math.max(0, (monthsLeft / totalMonths) * 100);
  }

  getWarrantyColor(asset: Asset): string {
    const remaining = this.getWarrantyRemaining(asset);
    return remaining < 2 ? 'warranty-alert' : 'warranty-good';
  }

  goBack() {
    this.router.navigate(['/assets']);
  }
}
