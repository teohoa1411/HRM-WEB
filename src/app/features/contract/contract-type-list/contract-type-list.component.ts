import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ContractService } from '../../../core/services/contract.service';
import { ContractType, ContractTypeRequest } from '../../../core/models/contract.models';

@Component({
  selector: 'app-contract-type-list',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatTableModule, MatPaginatorModule,
    MatButtonModule, MatIconModule, MatMenuModule, MatSlideToggleModule, MatTabsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">Danh mục loại hợp đồng & biên bản</div>
          <div class="page-subtitle">{{ filteredTypes().length }} loại</div>
        </div>
        <button mat-raised-button color="primary" (click)="openCreateDialog()">
          <mat-icon>add</mat-icon> Thêm loại
        </button>
      </div>

      <!-- Tab Filter -->
      <mat-tab-group [selectedIndex]="selectedTab()" class="filter-tabs" (selectedIndexChange)="onTabChange($event)">
        <mat-tab label="Tất cả">
          <div class="tab-filler"></div>
        </mat-tab>
        <mat-tab label="Hợp đồng">
          <div class="tab-filler"></div>
        </mat-tab>
        <mat-tab label="Biên bản cam kết">
          <div class="tab-filler"></div>
        </mat-tab>
      </mat-tab-group>

      <!-- Table -->
      <mat-card>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="filteredTypes()">
            <!-- code -->
            <ng-container matColumnDef="code">
              <th mat-header-cell *matHeaderCellDef>Mã loại</th>
              <td mat-cell *matCellDef="let t">
                <code style="background:#f5f5f5; padding:2px 6px; border-radius:4px; font-size:12px;">{{ t.code }}</code>
              </td>
            </ng-container>

            <!-- name -->
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Tên loại</th>
              <td mat-cell *matCellDef="let t">
                <div style="font-weight:500;">{{ t.name }}</div>
                @if (t.description) {
                  <div style="font-size:12px; color:#888;">{{ t.description }}</div>
                }
              </td>
            </ng-container>

            <!-- category -->
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Loại</th>
              <td mat-cell *matCellDef="let t">
                <span [ngClass]="getCategoryBadgeClass(t.category)">
                  {{ getCategoryLabel(t.category) }}
                </span>
              </td>
            </ng-container>

            <!-- hasExpiry -->
            <ng-container matColumnDef="hasExpiry">
              <th mat-header-cell *matHeaderCellDef>Có hạn</th>
              <td mat-cell *matCellDef="let t">
                @if (t.hasExpiry) {
                  <span style="background:#dcfce7; color:#166534; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">
                    {{ t.defaultDurationMonths ?? '—' }} tháng
                  </span>
                } @else {
                  <span style="color:#888; font-size:12px;">Vô hạn</span>
                }
              </td>
            </ng-container>

            <!-- reminderDaysBefore -->
            <ng-container matColumnDef="reminderDaysBefore">
              <th mat-header-cell *matHeaderCellDef>Nhắc trước (ngày)</th>
              <td mat-cell *matCellDef="let t">
                <span style="background:#fef3c7; color:#92400e; padding:4px 10px; border-radius:12px; font-size:12px; font-weight:600;">
                  {{ t.reminderDaysBefore }}
                </span>
              </td>
            </ng-container>

            <!-- active -->
            <ng-container matColumnDef="active">
              <th mat-header-cell *matHeaderCellDef>Hoạt động</th>
              <td mat-cell *matCellDef="let t">
                <mat-slide-toggle [checked]="t.active" (change)="toggleActive(t)"></mat-slide-toggle>
              </td>
            </ng-container>

            <!-- actions -->
            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef></th>
              <td mat-cell *matCellDef="let t">
                <button mat-icon-button [matMenuTriggerFor]="menu" (click)="$event.stopPropagation()">
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  <button mat-menu-item (click)="openEditDialog(t)">
                    <mat-icon>edit</mat-icon> Chỉnh sửa
                  </button>
                  <button mat-menu-item style="color:#c62828;" (click)="delete(t)">
                    <mat-icon color="warn">delete</mat-icon> Xóa
                  </button>
                </mat-menu>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns;"></tr>
          </table>
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

    .filter-tabs {
      margin-bottom: 20px;
    }

    .tab-filler {
      height: 0;
    }

    table {
      width: 100%;
    }

    .badge-contract {
      background: #dbeafe;
      color: #1e40af;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
    }

    .badge-commitment {
      background: #fbdfe8;
      color: #be185d;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
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
export class ContractTypeListComponent implements OnInit {
  private contractService = inject(ContractService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly columns = ['code', 'name', 'category', 'hasExpiry', 'reminderDaysBefore', 'active', 'actions'];
  readonly types = signal<ContractType[]>([]);
  readonly selectedTab = signal(0);

  readonly filteredTypes = signal<ContractType[]>([]);

  ngOnInit() {
    this.load();
  }

  load() {
    this.contractService.listAllTypes().subscribe(types => {
      this.types.set(types);
      this.applyFilter();
    });
  }

  onTabChange(tabIndex: number) {
    this.selectedTab.set(tabIndex);
    this.applyFilter();
  }

  private applyFilter() {
    const tab = this.selectedTab();
    const allTypes = this.types();

    if (tab === 0) {
      this.filteredTypes.set(allTypes);
    } else if (tab === 1) {
      this.filteredTypes.set(allTypes.filter(t => t.category === 'CONTRACT'));
    } else if (tab === 2) {
      this.filteredTypes.set(allTypes.filter(t => t.category === 'COMMITMENT'));
    }
  }

  openCreateDialog() {
    this.dialog.open(ContractTypeDialogComponent, { width: '600px' })
      .afterClosed()
      .subscribe(result => {
        if (result) {
          this.load();
          this.snackBar.open('Loại hợp đồng được tạo', 'OK', { duration: 2000 });
        }
      });
  }

  openEditDialog(type: ContractType) {
    this.dialog.open(ContractTypeDialogComponent, {
      width: '600px',
      data: { type }
    }).afterClosed().subscribe(result => {
      if (result) {
        this.load();
        this.snackBar.open('Loại hợp đồng được cập nhật', 'OK', { duration: 2000 });
      }
    });
  }

  toggleActive(type: ContractType) {
    this.contractService.toggleType(type.id).subscribe({
      next: () => {
        this.load();
        this.snackBar.open('Loại hợp đồng được cập nhật', 'OK', { duration: 2000 });
      },
      error: () => this.snackBar.open('Lỗi', 'Đóng', { duration: 3000, panelClass: 'error-snack' })
    });
  }

  delete(type: ContractType) {
    if (confirm(`Xóa loại hợp đồng "${type.name}"?`)) {
      // TODO: Call delete service when available
      this.snackBar.open('Chức năng chưa được triển khai', 'OK', { duration: 2000 });
    }
  }

  getCategoryLabel(category: string): string {
    return category === 'CONTRACT' ? 'Hợp đồng' : 'Biên bản cam kết';
  }

  getCategoryBadgeClass(category: string): string {
    return category === 'CONTRACT' ? 'badge-contract' : 'badge-commitment';
  }
}

// Dialog Component
@Component({
  selector: 'app-contract-type-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatCheckboxModule, MatButtonModule, MatIconModule
  ],
  template: `
    <div class="dialog-container">
      <h2 mat-dialog-title>{{ isEdit() ? 'Chỉnh sửa loại hợp đồng' : 'Thêm loại hợp đồng' }}</h2>

      <form [formGroup]="form">
        <mat-dialog-content>
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Mã loại *</mat-label>
              <input matInput formControlName="code" placeholder="VD: HD-FXCY">
              <mat-icon matPrefix>code</mat-icon>
              <mat-error>Bắt buộc</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tên loại *</mat-label>
              <input matInput formControlName="name" placeholder="VD: Hợp đồng lao động xác định thời hạn">
              <mat-error>Bắt buộc</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Loại *</mat-label>
              <mat-select formControlName="category">
                <mat-option value="CONTRACT">Hợp đồng</mat-option>
                <mat-option value="COMMITMENT">Biên bản cam kết</mat-option>
              </mat-select>
              <mat-error>Bắt buộc</mat-error>
            </mat-form-field>

            <div class="checkbox-field">
              <mat-checkbox formControlName="hasExpiry" (change)="onExpiryChange()">
                Hợp đồng có hạn
              </mat-checkbox>
            </div>

            @if (form.get('hasExpiry')?.value) {
              <mat-form-field appearance="outline">
                <mat-label>Thời hạn mặc định (tháng)</mat-label>
                <input matInput formControlName="defaultDurationMonths" type="number" placeholder="VD: 36">
                <mat-icon matPrefix>schedule</mat-icon>
              </mat-form-field>
            }

            <mat-form-field appearance="outline">
              <mat-label>Nhắc trước (ngày) *</mat-label>
              <input matInput formControlName="reminderDaysBefore" type="number" placeholder="VD: 30">
              <mat-icon matPrefix>notifications</mat-icon>
              <mat-error>Bắt buộc</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Mô tả</mat-label>
              <textarea matInput formControlName="description" rows="2" placeholder="Ghi chú về loại hợp đồng này..."></textarea>
            </mat-form-field>
          </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
          <button mat-button (click)="dialogRef.close()">Hủy</button>
          <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="form.invalid">
            {{ isEdit() ? 'Cập nhật' : 'Tạo' }}
          </button>
        </mat-dialog-actions>
      </form>
    </div>
  `,
  styles: [`
    .dialog-container {
      width: 100%;
      min-width: 300px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
      margin: 20px 0;
    }

    mat-form-field {
      width: 100%;
    }

    .checkbox-field {
      padding: 12px 0;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    mat-dialog-actions {
      padding: 16px 0 0;
    }
  `]
})
export class ContractTypeDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private contractService = inject(ContractService);
  dialogRef = inject(MatDialogRef<ContractTypeDialogComponent>);
  private data: any = inject(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly isEdit = signal(false);

  readonly form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    category: ['CONTRACT', Validators.required],
    hasExpiry: [false],
    defaultDurationMonths: [null as number | null],
    reminderDaysBefore: [30, Validators.required],
    description: ['']
  });

  ngOnInit() {
    if (this.data?.type) {
      this.isEdit.set(true);
      this.form.patchValue(this.data.type);
    }
  }

  onExpiryChange() {
    const hasExpiry = this.form.get('hasExpiry')?.value;
    const durationField = this.form.get('defaultDurationMonths');
    if (!hasExpiry) {
      durationField?.setValue(null);
    }
  }

  onSubmit() {
    if (this.form.invalid) return;

    const raw = this.form.getRawValue();
    const payload: ContractTypeRequest = {
      code: raw.code!,
      name: raw.name!,
      category: raw.category as 'CONTRACT' | 'COMMITMENT',
      hasExpiry: raw.hasExpiry!,
      defaultDurationMonths: raw.defaultDurationMonths || undefined,
      reminderDaysBefore: raw.reminderDaysBefore!,
      description: raw.description || undefined
    };

    const obs = this.isEdit()
      ? this.contractService.updateType((this.data?.type?.id), payload)
      : this.contractService.createType(payload);

    obs.subscribe({
      next: () => this.dialogRef.close(true),
      error: (err) => console.error('Error:', err)
    });
  }
}
