import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetService } from '../../../core/services/asset.service';
import { VendorService } from '../../../core/services/vendor.service';
import { Asset, AssetStats, AssetCategory } from '../../../core/models/asset.models';
import { Vendor } from '../../../core/models/vendor.models';
import { PageResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-asset-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatFormFieldModule, MatInputModule, MatSelectModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Quản lý tài sản</div>
          <div class="page-subtitle">{{ page()?.totalElements ?? 0 }} thiết bị</div>
        </div>
        <div class="page-actions">
          <button mat-raised-button color="primary" routerLink="new">
            <mat-icon>add</mat-icon> Thêm thiết bị
          </button>
          <button mat-stroked-button routerLink="categories">
            <mat-icon>category</mat-icon> Loại tài sản
          </button>
        </div>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon stat-icon--total"><mat-icon>inventory_2</mat-icon></div>
          <div class="stat-content">
            <div class="stat-label">Tổng cộng</div>
            <div class="stat-value">{{ stats()?.total ?? 0 }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--in-use"><mat-icon>check_circle</mat-icon></div>
          <div class="stat-content">
            <div class="stat-label">Đang sử dụng</div>
            <div class="stat-value">{{ stats()?.inUse ?? 0 }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--available"><mat-icon>done_all</mat-icon></div>
          <div class="stat-content">
            <div class="stat-label">Sẵn sàng</div>
            <div class="stat-value">{{ stats()?.available ?? 0 }}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon stat-icon--rented"><mat-icon>shopping_cart</mat-icon></div>
          <div class="stat-content">
            <div class="stat-label">Cho thuê</div>
            <div class="stat-value">{{ stats()?.rented ?? 0 }}</div>
          </div>
        </div>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar">
        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Tìm kiếm</mat-label>
          <input matInput placeholder="Mã hoặc tên thiết bị..."
            (keyup)="onSearchChange($event)">
          <mat-icon matPrefix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Loại tài sản</mat-label>
          <mat-select (selectionChange)="onCategoryChange($event)">
            <mat-option [value]="">Tất cả</mat-option>
            @for (cat of categories(); track cat.id) {
              <mat-option [value]="cat.id">{{ cat.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Trạng thái</mat-label>
          <mat-select (selectionChange)="onStatusChange($event)">
            <mat-option [value]="">Tất cả</mat-option>
            <mat-option value="AVAILABLE">Sẵn sàng</mat-option>
            <mat-option value="IN_USE">Đang sử dụng</mat-option>
            <mat-option value="MAINTENANCE">Bảo trì</mat-option>
            <mat-option value="DISPOSED">Đã thanh lý</mat-option>
            <mat-option value="LOST">Mất</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Loại sở hữu</mat-label>
          <mat-select (selectionChange)="onOwnershipChange($event)">
            <mat-option [value]="">Tất cả</mat-option>
            <mat-option value="COMPANY_OWNED">Công ty</mat-option>
            <mat-option value="VENDOR_OWNED">Đối tác</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="filter-field">
          <mat-label>Nhân sự sử dụng</mat-label>
          <mat-select (selectionChange)="onUsedByChange($event)">
            <mat-option [value]="">Tất cả</mat-option>
            <mat-option value="INTERNAL">Nội bộ (Internal)</mat-option>
            @for (v of vendors(); track v.id) {
              <mat-option [value]="'VENDOR:' + v.id">{{ v.name }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>

      <!-- Table -->
      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="assets()">
            <!-- assetCode -->
            <ng-container matColumnDef="assetCode">
              <th mat-header-cell *matHeaderCellDef>Mã thiết bị</th>
              <td mat-cell *matCellDef="let a">
                <code style="background:#f5f5f5; padding:2px 6px; border-radius:4px; font-size:12px;">{{ a.assetCode }}</code>
              </td>
            </ng-container>

            <!-- name + serial -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tên thiết bị</th>
              <td mat-cell *matCellDef="let a">
                <div style="font-weight:500;">{{ a.name }}</div>
                @if (a.serialNumber) {
                  <div style="font-size:12px; color:#888;">SN: {{ a.serialNumber }}</div>
                }
                @if (a.labelCode) {
                  <div style="font-size:11px; color:#6366f1;">Tem: {{ a.labelCode }}</div>
                }
              </td>
            </ng-container>

            <!-- categoryName -->
            <ng-container matColumnDef="categoryName">
              <th mat-header-cell *matHeaderCellDef>Loại tài sản</th>
              <td mat-cell *matCellDef="let a">{{ a.categoryName }}</td>
            </ng-container>

            <!-- status -->
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
              <td mat-cell *matCellDef="let a">
                <span [ngClass]="getStatusBadgeClass(a.status)">
                  {{ getStatusLabel(a.status) }}
                </span>
              </td>
            </ng-container>

            <!-- currentHolderName -->
            <ng-container matColumnDef="currentHolderName">
              <th mat-header-cell *matHeaderCellDef>Người quản lý</th>
              <td mat-cell *matCellDef="let a">{{ a.currentHolderName || '—' }}</td>
            </ng-container>

            <!-- ownership badges -->
            <ng-container matColumnDef="ownership">
              <th mat-header-cell *matHeaderCellDef>Sở hữu</th>
              <td mat-cell *matCellDef="let a">
                <div class="ownership-badges">
                  <span [ngClass]="'badge badge--' + a.ownershipType.toLowerCase()">
                    {{ a.ownershipType === 'COMPANY_OWNED' ? 'Cty' : 'Vendor' }}
                  </span>
                  @if (a.isRented) {
                    <span class="badge badge--rented">Thuê</span>
                  }
                </div>
              </td>
            </ng-container>

            <!-- warranty -->
            <ng-container matColumnDef="warranty">
              <th mat-header-cell *matHeaderCellDef>Bảo hành</th>
              <td mat-cell *matCellDef="let a">
                @if (a.purchaseDate && a.warrantyMonths) {
                  <span [ngClass]="getWarrantyClass(a)">
                    {{ getWarrantyRemaining(a) }} tháng
                  </span>
                } @else {
                  <span style="color:#ccc;">—</span>
                }
              </td>
            </ng-container>

            <!-- actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let a">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="[a.id]">
                    <mat-icon>visibility</mat-icon> Xem chi tiết
                  </button>
                  <button mat-menu-item [routerLink]="[a.id, 'edit']">
                    <mat-icon>edit</mat-icon> Chỉnh sửa
                  </button>
                  <button mat-menu-item style="color:#c62828;" (click)="delete(a)">
                    <mat-icon color="warn">delete</mat-icon> Xóa
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
          <mat-paginator [length]="page()?.totalElements ?? 0" [pageSize]="20"
            [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px 16px;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      gap: 16px;
    }

    .page-title {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
    }

    .page-subtitle {
      font-size: 13px;
      color: #64748b;
      margin-top: 4px;
    }

    .page-actions {
      display: flex;
      gap: 12px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      transition: box-shadow 0.15s;
      &:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      mat-icon { font-size: 24px; width: 24px; height: 24px; }
    }

    .stat-icon--total { background: #f3f4f6; }
    .stat-icon--in-use { background: #dbeafe; }
    .stat-icon--available { background: #dcfce7; }
    .stat-icon--rented { background: #fee2e2; }

    .stat-content {
      flex: 1;
    }

    .stat-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 4px;
    }

    /* Filter Bar */
    .filter-bar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .filter-field {
      flex: 1;
      min-width: 150px;
    }

    /* Badges */
    .status-chip {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-chip.available { background: #dcfce7; color: #166534; }
    .status-chip.in_use { background: #dbeafe; color: #1e40af; }
    .status-chip.maintenance { background: #fef3c7; color: #92400e; }
    .status-chip.disposed { background: #fee2e2; color: #991b1b; }
    .status-chip.lost { background: #f3f4f6; color: #4b5563; }

    .ownership-badges {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
    }

    .badge--company_owned { background: #dbeafe; color: #1e40af; }
    .badge--vendor_owned { background: #fef3c7; color: #92400e; }
    .badge--rented { background: #fee2e2; color: #991b1b; }

    /* Warranty */
    .warranty-good { color: #166534; font-weight: 600; }
    .warranty-alert { color: #c2410c; font-weight: 600; }

    /* Table */
    table {
      width: 100%;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      .page-actions {
        width: 100%;
        flex-direction: column;
      }
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .filter-bar {
        flex-direction: column;
      }
      .filter-field {
        width: 100%;
      }
    }
  `]
})
export class AssetListComponent implements OnInit {
  private assetService = inject(AssetService);
  private vendorService = inject(VendorService);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['assetCode', 'name', 'categoryName', 'status', 'currentHolderName', 'ownership', 'warranty', 'actions'];
  readonly assets = signal<Asset[]>([]);
  readonly page = signal<PageResponse<Asset> | null>(null);
  readonly stats = signal<AssetStats | null>(null);
  readonly categories = signal<AssetCategory[]>([]);
  readonly vendors = signal<Vendor[]>([]);

  private currentPage = 0;
  private searchTerm = '';
  private selectedStatus = '';
  private selectedCategory: number | string = '';
  private selectedOwnership = '';
  private selectedUsedBy = '';

  ngOnInit() {
    this.loadCategories();
    this.loadVendors();
    this.loadStats();
    this.load();
  }

  load() {
    const params: any = { page: this.currentPage };
    if (this.selectedStatus) params.status = this.selectedStatus;
    if (this.selectedCategory) params.categoryId = this.selectedCategory;
    if (this.selectedOwnership) params.ownershipType = this.selectedOwnership;
    if (this.selectedUsedBy) params.usedBy = this.selectedUsedBy;
    this.assetService.list(params).subscribe(p => {
      this.page.set(p);
      this.assets.set(p.content);
    });
  }

  loadStats() {
    this.assetService.getStats().subscribe(stats => this.stats.set(stats));
  }

  loadCategories() {
    this.assetService.listActiveCategories().subscribe(cats => this.categories.set(cats));
  }

  loadVendors() {
    this.vendorService.list({ size: 100 }).subscribe(p => this.vendors.set(p.content));
  }

  onPage(e: PageEvent) {
    this.currentPage = e.pageIndex;
    this.load();
  }

  onSearchChange(e: any) {
    this.searchTerm = e.target.value;
    // TODO: Implement search in backend
  }

  onCategoryChange(e: any) {
    this.selectedCategory = e.value;
    this.currentPage = 0;
    this.load();
  }

  onStatusChange(e: any) {
    this.selectedStatus = e.value;
    this.currentPage = 0;
    this.load();
  }

  onOwnershipChange(e: any) {
    this.selectedOwnership = e.value;
    this.currentPage = 0;
    this.load();
  }

  onUsedByChange(e: any) {
    this.selectedUsedBy = e.value;
    this.currentPage = 0;
    this.load();
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

  getWarrantyClass(asset: Asset): string {
    const remaining = this.getWarrantyRemaining(asset);
    return remaining < 2 ? 'warranty-alert' : 'warranty-good';
  }

  delete(asset: Asset) {
    if (confirm(`Xóa thiết bị "${asset.name}"?`)) {
      this.assetService.delete(asset.id).subscribe({
        next: () => {
          this.snackBar.open('Thiết bị đã xóa', 'OK', { duration: 2000 });
          this.load();
          this.loadStats();
        },
        error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }
}
