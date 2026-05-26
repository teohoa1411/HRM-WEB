import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { CompanyService } from '../../../core/services/company.service';
import { Company } from '../../../core/models/company.models';
import { PageResponse } from '../../../core/models/api.models';

@Component({
  selector: 'app-company-list',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatChipsModule, MatDividerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Công ty</div>
          <div class="page-subtitle">{{ page()?.totalElements ?? 0 }} tenant đã đăng ký</div>
        </div>
        <button mat-raised-button color="primary" routerLink="new">
          <mat-icon>add_business</mat-icon> Thêm Công ty
        </button>
      </div>

      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="companies()">

            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Code</th>
              <td mat-cell *matCellDef="let c">
                <code style="background:#f5f5f5; padding:2px 8px; border-radius:4px;">{{ c.code }}</code>
              </td>
            </ng-container>

            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Company Name</th>
              <td mat-cell *matCellDef="let c">
                <div style="font-weight:500;">{{ c.name }}</div>
                @if (c.shortName) { <div style="font-size:12px; color:#888;">{{ c.shortName }}</div> }
              </td>
            </ng-container>

            <ng-container matColumnDef="taxCode">
              <th mat-header-cell *matHeaderCellDef>Tax Code</th>
              <td mat-cell *matCellDef="let c">{{ c.taxCode || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let c">{{ c.email || '—' }}</td>
            </ng-container>

            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let c">
                <span [class]="c.active ? 'status-chip active' : 'status-chip inactive'">
                  {{ c.active ? 'Active' : 'Disabled' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Created</th>
              <td mat-cell *matCellDef="let c">{{ c.createdAt | date:'dd/MM/yyyy' }}</td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let c">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item [routerLink]="[c.id, 'edit']">
                    <mat-icon>edit</mat-icon> Edit
                  </button>
                  <button mat-menu-item (click)="toggleStatus(c)">
                    <mat-icon>{{ c.active ? 'block' : 'check_circle' }}</mat-icon>
                    {{ c.active ? 'Disable' : 'Enable' }}
                  </button>
                  <mat-divider></mat-divider>
                  <button mat-menu-item style="color:#c62828;" (click)="deleteCompany(c)">
                    <mat-icon color="warn">delete</mat-icon> Delete
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
export class CompanyListComponent implements OnInit {
  private companyService = inject(CompanyService);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['code', 'name', 'taxCode', 'email', 'active', 'createdAt', 'actions'];
  readonly companies = signal<Company[]>([]);
  readonly page = signal<PageResponse<Company> | null>(null);
  private currentPage = 0;

  ngOnInit() { this.load(); }

  load() {
    this.companyService.list({ page: this.currentPage }).subscribe(p => {
      this.page.set(p);
      this.companies.set(p.content);
    });
  }

  onPage(e: PageEvent) { this.currentPage = e.pageIndex; this.load(); }

  toggleStatus(c: Company) {
    this.companyService.toggleStatus(c.id).subscribe({
      next: () => { this.snackBar.open('Status updated', 'OK', { duration: 2000 }); this.load(); },
      error: () => this.snackBar.open('Failed', 'Close', { duration: 3000, panelClass: 'error-snack' })
    });
  }

  deleteCompany(c: Company) {
    if (confirm(`Delete company "${c.name}"?`)) {
      this.companyService.delete(c.id).subscribe({
        next: () => { this.snackBar.open('Company deleted', 'OK', { duration: 2000 }); this.load(); },
        error: () => this.snackBar.open('Failed to delete', 'Close', { duration: 3000, panelClass: 'error-snack' })
      });
    }
  }
}
