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
import { CustomerService } from '../../../core/services/customer.service';
import { Customer } from '../../../core/models/customer.models';
import { PageResponse } from '../../../core/models/api.models';
import { CustomerPriceDialogComponent } from '../customer-price-dialog/customer-price-dialog.component';

@Component({
  selector: 'app-customer-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatDialogModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Khách hàng</div>
          <div class="page-subtitle">{{ page()?.totalElements ?? 0 }} khách hàng</div>
        </div>
        <button mat-raised-button color="primary" routerLink="new">
          <mat-icon>add</mat-icon> Thêm khách hàng
        </button>
      </div>

      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="customers()">

            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Code</th>
              <td mat-cell *matCellDef="let c">
                <code style="background:#f5f5f5;padding:2px 6px;border-radius:4px;font-size:12px;">{{ c.code }}</code>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tên khách hàng</th>
              <td mat-cell *matCellDef="let c"><div style="font-weight:500;">{{ c.name }}</div></td>
            </ng-container>

            <ng-container matColumnDef="vendorCode">
              <th mat-header-cell *matHeaderCellDef>Vendor Code</th>
              <td mat-cell *matCellDef="let c">
                @if (c.vendorCode) {
                  <code style="background:#e3f2fd;padding:2px 6px;border-radius:4px;font-size:12px;">{{ c.vendorCode }}</code>
                } @else {
                  <span style="color:#bbb;">—</span>
                }
              </td>
            </ng-container>

            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>Liên hệ</th>
              <td mat-cell *matCellDef="let c">
                <div>{{ c.contactPerson || '—' }}</div>
                <div style="font-size:12px;color:#888;">{{ c.contactEmail || '' }}</div>
              </td>
            </ng-container>

            <ng-container matColumnDef="taxCode">
              <th mat-header-cell *matHeaderCellDef>Mã số thuế</th>
              <td mat-cell *matCellDef="let c">{{ c.taxCode || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Trạng thái</th>
              <td mat-cell *matCellDef="let c">
                <span [class]="c.active ? 'status-chip active' : 'status-chip inactive'">
                  {{ c.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openPriceDialog(c)">
                    <mat-icon>attach_money</mat-icon> Cấu hình giá bán
                  </button>
                  <button mat-menu-item [routerLink]="[c.id, 'edit']">
                    <mat-icon>edit</mat-icon> Sửa
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

          <mat-paginator [length]="page()?.totalElements ?? 0" [pageSize]="20"
            [pageSizeOptions]="[10,20,50]" (page)="onPage($event)" showFirstLastButtons>
          </mat-paginator>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class CustomerListComponent implements OnInit {
  private customerService = inject(CustomerService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly columns = ['code', 'name', 'vendorCode', 'contact', 'taxCode', 'active', 'actions'];
  readonly customers = signal<Customer[]>([]);
  readonly page = signal<PageResponse<Customer> | null>(null);
  private currentPage = 0;

  ngOnInit() { this.load(); }

  load() {
    this.customerService.list({ page: this.currentPage }).subscribe(p => {
      this.page.set(p); this.customers.set(p.content);
    });
  }

  onPage(e: PageEvent) { this.currentPage = e.pageIndex; this.load(); }

  openPriceDialog(customer: Customer) {
    const ref = this.dialog.open(CustomerPriceDialogComponent, {
      width: '820px', maxWidth: '95vw', data: { customer }, panelClass: 'no-padding-dialog'
    });
    ref.afterClosed().subscribe(() => this.load());
  }

  delete(c: Customer) {
    if (confirm(`Xóa khách hàng "${c.name}"?`)) {
      this.customerService.delete(c.id).subscribe({
        next: () => { this.snackBar.open('Đã xóa', 'OK', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('Xóa thất bại', 'Close', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }
}
