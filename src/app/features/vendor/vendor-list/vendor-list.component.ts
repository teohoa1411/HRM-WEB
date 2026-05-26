import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorService } from '../../../core/services/vendor.service';
import { Vendor } from '../../../core/models/vendor.models';
import { PageResponse } from '../../../core/models/api.models';
import { VendorPriceDialogComponent } from '../vendor-price-dialog/vendor-price-dialog.component';

@Component({
  selector: 'app-vendor-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Vendors</div>
          <div class="page-subtitle">{{ page()?.totalElements ?? 0 }} nhà cung cấp</div>
        </div>
        <button mat-raised-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Thêm Vendor
        </button>
      </div>

      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="vendors()">
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Code</th>
              <td mat-cell *matCellDef="let v"><code style="background:#f5f5f5; padding:2px 6px; border-radius:4px; font-size:12px;">{{ v.code }}</code></td>
            </ng-container>
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Vendor Name</th>
              <td mat-cell *matCellDef="let v"><div style="font-weight:500;">{{ v.name }}</div></td>
            </ng-container>
            <ng-container matColumnDef="vendorType">
              <th mat-header-cell *matHeaderCellDef>Type</th>
              <td mat-cell *matCellDef="let v">
                <span style="background:#e8f5e9; color:#2e7d32; padding:2px 8px; border-radius:12px; font-size:12px;">{{ v.vendorType }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="contactPerson">
              <th mat-header-cell *matHeaderCellDef>Contact</th>
              <td mat-cell *matCellDef="let v">
                <div>{{ v.contactPerson || '—' }}</div>
                <div style="font-size:12px; color:#888;">{{ v.contactEmail || '' }}</div>
              </td>
            </ng-container>
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let v">
                <span [class]="v.active ? 'status-chip active' : 'status-chip inactive'">{{ v.active ? 'Active' : 'Inactive' }}</span>
              </td>
            </ng-container>
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let v">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openPriceDialog(v)"><mat-icon>attach_money</mat-icon> Cấu hình giá bán</button>
                  <button mat-menu-item [routerLink]="[v.id, 'edit']"><mat-icon>edit</mat-icon> Edit</button>
                  <button mat-menu-item style="color:#c62828;" (click)="delete(v)"><mat-icon color="warn">delete</mat-icon> Delete</button>
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
  `
})
export class VendorListComponent implements OnInit {
  private vendorService = inject(VendorService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly columns = ['code', 'name', 'vendorType', 'contactPerson', 'active', 'actions'];
  readonly vendors = signal<Vendor[]>([]);
  readonly page = signal<PageResponse<Vendor> | null>(null);
  private currentPage = 0;

  ngOnInit() { this.load(); }

  load() {
    this.vendorService.list({ page: this.currentPage }).subscribe(p => {
      this.page.set(p); this.vendors.set(p.content);
    });
  }

  onPage(e: PageEvent) { this.currentPage = e.pageIndex; this.load(); }

  openPriceDialog(vendor: Vendor) {
    this.dialog.open(VendorPriceDialogComponent, { width: '90vw', maxWidth: '1100px', data: { vendor } });
  }

  delete(v: Vendor) {
    if (confirm(`Delete vendor "${v.name}"?`)) {
      this.vendorService.delete(v.id).subscribe({
        next: () => { this.snackBar.open('Vendor deleted', 'OK', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('Failed', 'Close', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }
}
