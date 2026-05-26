import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AssetService } from '../../../core/services/asset.service';
import { AssetCategory } from '../../../core/models/asset.models';
import { PageResponse } from '../../../core/models/api.models';
import { AssetCategoryDialogComponent } from '../asset-category-dialog/asset-category-dialog.component';

@Component({
  selector: 'app-asset-category-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatSlideToggleModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Loại tài sản</div>
          <div class="page-subtitle">{{ page()?.totalElements ?? 0 }} loại</div>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Thêm loại
        </button>
      </div>

      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="categories()">
            <!-- code -->
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Mã loại</th>
              <td mat-cell *matCellDef="let c">
                <code style="background:#f5f5f5; padding:2px 6px; border-radius:4px; font-size:12px;">{{ c.code }}</code>
              </td>
            </ng-container>

            <!-- name -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tên loại</th>
              <td mat-cell *matCellDef="let c">
                <div style="font-weight:500;">{{ c.name }}</div>
                @if (c.description) {
                  <div style="font-size:12px; color:#888;">{{ c.description }}</div>
                }
              </td>
            </ng-container>

            <!-- assetCount -->
            <ng-container matColumnDef="assetCount">
              <th mat-header-cell *matHeaderCellDef>Số tài sản</th>
              <td mat-cell *matCellDef="let c">
                <span style="background:#e8f5e9; color:#2e7d32; padding:4px 12px; border-radius:12px; font-size:12px; font-weight:600;">
                  {{ c.assetCount }}
                </span>
              </td>
            </ng-container>

            <!-- active -->
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Hoạt động</th>
              <td mat-cell *matCellDef="let c">
                <mat-slide-toggle [checked]="c.active" (change)="toggleActive(c)"></mat-slide-toggle>
              </td>
            </ng-container>

            <!-- actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openEditDialog(c)">
                    <mat-icon>edit</mat-icon> Chỉnh sửa
                  </button>
                  <button mat-menu-item style="color:#c62828;" (click)="delete(c)" [disabled]="c.assetCount > 0">
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
      max-width: 1200px;
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

    table {
      width: 100%;
    }

    @media (max-width: 768px) {
      .page-header {
        flex-direction: column;
        align-items: flex-start;
      }
      button[mat-raised-button] {
        width: 100%;
      }
    }
  `]
})
export class AssetCategoryListComponent implements OnInit {
  private assetService = inject(AssetService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['code', 'name', 'assetCount', 'active', 'actions'];
  readonly categories = signal<AssetCategory[]>([]);
  readonly page = signal<PageResponse<AssetCategory> | null>(null);

  private currentPage = 0;

  ngOnInit() {
    this.load();
  }

  load() {
    this.assetService.listCategories({ page: this.currentPage }).subscribe(p => {
      this.page.set(p);
      this.categories.set(p.content);
    });
  }

  onPage(e: PageEvent) {
    this.currentPage = e.pageIndex;
    this.load();
  }

  openCreateDialog() {
    this.dialog.open(AssetCategoryDialogComponent, { width: '600px' })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.currentPage = 0;
          this.load();
          this.snackBar.open('Loại tài sản được tạo', 'OK', { duration: 2000 });
        }
      });
  }

  openEditDialog(category: AssetCategory) {
    this.dialog.open(AssetCategoryDialogComponent, {
      width: '600px',
      data: { category }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.load();
        this.snackBar.open('Loại tài sản được cập nhật', 'OK', { duration: 2000 });
      }
    });
  }

  toggleActive(category: AssetCategory) {
    const updated = { ...category, active: !category.active, description: category.description ?? undefined };
    this.assetService.updateCategory(category.id, updated).subscribe({
      next: () => {
        this.load();
        this.snackBar.open('Loại tài sản được cập nhật', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
    });
  }

  delete(category: AssetCategory) {
    if (category.assetCount > 0) {
      this.snackBar.open('Không thể xóa loại đã có tài sản', 'OK', { duration: 3000 });
      return;
    }
    if (confirm(`Xóa loại tài sản "${category.name}"?`)) {
      this.assetService.deleteCategory(category.id).subscribe({
        next: () => {
          this.snackBar.open('Loại tài sản được xóa', 'OK', { duration: 2000 });
          this.load();
        },
        error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }
}