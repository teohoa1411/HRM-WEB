import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { CompanyService } from '../../../core/services/company.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Department } from '../../../core/models/company.models';
import { Employee } from '../../../core/models/employee.models';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuthService } from '../../../core/auth/auth.service';

interface DepartmentRow extends Department {
  parentDeptName?: string;
  managerName?: string;
  employeeCount?: number;
}

interface DeptTreeNode {
  dept: DepartmentRow;
  level: number;
  hasChildren: boolean;
  isLast: boolean;
}

@Component({
  selector: 'app-department-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatAutocompleteModule,
    MatCardModule,
    MatTableModule,
    MatBadgeModule,
    MatDialogModule,
  ],
  template: `
    <div class="department-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div>
            <h1 class="page-title">Quản lý Phòng ban</h1>
            <p class="page-subtitle">Cơ cấu tổ chức và phân bổ nhân sự</p>
          </div>
          <button
            mat-raised-button
            color="primary"
            class="add-button"
            (click)="openCreateForm()"
            *ngIf="isStrictAdmin()"
          >
            <mat-icon>add</mat-icon>
            Thêm phòng ban
          </button>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon" [style.backgroundColor]="'rgba(79, 39, 245, 0.1)'">
            <mat-icon [style.color]="'#4f27f5'">domain</mat-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">Tổng phòng ban</p>
            <p class="stat-value">{{ totalDepartments() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" [style.backgroundColor]="'rgba(34, 197, 94, 0.1)'">
            <mat-icon [style.color]="'#22c55e'">check_circle</mat-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">Đang hoạt động</p>
            <p class="stat-value">{{ activeDepartments() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" [style.backgroundColor]="'rgba(59, 130, 246, 0.1)'">
            <mat-icon [style.color]="'#3b82f6'">people</mat-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">Tổng nhân sự</p>
            <p class="stat-value">{{ totalEmployees() }}</p>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon" [style.backgroundColor]="'rgba(239, 68, 68, 0.1)'">
            <mat-icon [style.color]="'#ef4444'">warning</mat-icon>
          </div>
          <div class="stat-content">
            <p class="stat-label">Chưa phân phòng</p>
            <p class="stat-value">{{ unassignedEmployees() }}</p>
          </div>
        </div>
      </div>

      <!-- Create/Edit Form -->
      @if (showForm()) {
        <div class="form-section">
          <div class="form-card">
            <div class="form-header">
              <h3>{{ editingDepartment() ? 'Cập nhật phòng ban' : 'Thêm phòng ban mới' }}</h3>
              <button
                mat-icon-button
                class="close-button"
                (click)="cancelForm()"
              >
                <mat-icon>close</mat-icon>
              </button>
            </div>

            <form class="form-grid" (ngSubmit)="saveForm()">
              <div class="form-group">
                <label>Mã phòng ban <span class="required">*</span></label>
                <input
                  matInput
                  [(ngModel)]="formData().code"
                  name="code"
                  placeholder="VD: IT"
                  required
                />
              </div>

              <div class="form-group">
                <label>Tên phòng ban <span class="required">*</span></label>
                <input
                  matInput
                  [(ngModel)]="formData().name"
                  name="name"
                  placeholder="VD: Phòng Công nghệ thông tin"
                  required
                />
              </div>

              <div class="form-group">
                <label>Phòng ban cha (tùy chọn)</label>
                <select
                  [(ngModel)]="formData().parentDeptId"
                  name="parentDeptId"
                  class="form-select"
                >
                  <option [value]="null">-- Không có --</option>
                  @for (dept of getAvailableParentDepartments(); track dept.id) {
                    <option [value]="dept.id">{{ dept.name }}</option>
                  }
                </select>
              </div>

              <div class="form-group">
                <label>Trưởng phòng (tùy chọn)</label>
                <select
                  [(ngModel)]="formData().managerEmployeeId"
                  name="managerEmployeeId"
                  class="form-select"
                >
                  <option [value]="null">-- Không có --</option>
                  @for (emp of employees(); track emp.id) {
                    <option [value]="emp.id">{{ emp.fullName }}</option>
                  }
                </select>
              </div>

              <div class="form-group full-width">
                <label>Mô tả (tùy chọn)</label>
                <textarea
                  [(ngModel)]="formData().description"
                  name="description"
                  class="form-textarea"
                  rows="3"
                  placeholder="Nhập mô tả phòng ban..."
                ></textarea>
              </div>

              <div class="form-group">
                <label>Thứ tự hiển thị</label>
                <input
                  matInput
                  type="number"
                  [(ngModel)]="formData().displayOrder"
                  name="displayOrder"
                  placeholder="0"
                />
              </div>

              <div class="form-actions">
                <button type="submit" mat-raised-button color="primary">
                  @if (isSaving()) {
                    <mat-spinner diameter="20" class="spinner"></mat-spinner>
                  } @else {
                    <mat-icon>save</mat-icon>
                    Lưu
                  }
                </button>
                <button
                  type="button"
                  mat-stroked-button
                  (click)="cancelForm()"
                  [disabled]="isSaving()"
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      }

      <!-- View Toggle Buttons -->
      <div class="view-toggle">
        <button
          class="toggle-button"
          [class.active]="viewMode() === 'list'"
          (click)="viewMode.set('list')"
        >
          <mat-icon>list</mat-icon>
          Danh sách
        </button>
        <button
          class="toggle-button"
          [class.active]="viewMode() === 'orgchart'"
          (click)="viewMode.set('orgchart')"
        >
          <mat-icon>account_tree</mat-icon>
          Sơ đồ tổ chức
        </button>
      </div>

      <!-- Department List View -->
      @if (viewMode() === 'list') {
        <div class="table-section">
          <div class="table-header">
            <h3>Danh sách phòng ban</h3>
          </div>

        @if (isLoading()) {
          <div class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Đang tải dữ liệu...</p>
          </div>
        } @else if (departments().length === 0) {
          <div class="empty-state">
            <mat-icon>inbox</mat-icon>
            <p>Không có phòng ban nào</p>
            @if (isStrictAdmin()) {
              <button mat-raised-button color="primary" (click)="openCreateForm()">
                <mat-icon>add</mat-icon>
                Thêm phòng ban
              </button>
            }
          </div>
        } @else {
          <div class="table-wrapper">
            <table class="department-table">
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên phòng ban</th>
                  <th>Phòng cha</th>
                  <th>Trưởng phòng</th>
                  <th>Số NV</th>
                  <th>Trạng thái</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                @for (dept of departments(); track dept.id) {
                  <tr>
                    <td>
                      <span class="code-badge">{{ dept.code }}</span>
                    </td>
                    <td>
                      <div class="dept-name">
                        <strong>{{ dept.name }}</strong>
                        @if (dept.description) {
                          <span class="dept-description">{{ dept.description }}</span>
                        }
                      </div>
                    </td>
                    <td>
                      {{ dept.parentDeptName || '—' }}
                    </td>
                    <td>
                      {{ dept.managerName || '—' }}
                    </td>
                    <td class="center">
                      <span class="employee-count">{{ dept.employeeCount || 0 }}</span>
                    </td>
                    <td>
                      <span
                        class="status-badge"
                        [ngClass]="dept.active ? 'active' : 'inactive'"
                      >
                        {{ dept.active ? 'Hoạt động' : 'Không hoạt động' }}
                      </span>
                    </td>
                    <td>
                      @if (isStrictAdmin()) {
                        <button
                          mat-icon-button
                          [matMenuTriggerFor]="menu"
                          class="action-menu"
                        >
                          <mat-icon>more_vert</mat-icon>
                        </button>
                        <mat-menu #menu="matMenu">
                          <button mat-menu-item (click)="editDepartment(dept)">
                            <mat-icon>edit</mat-icon>
                            <span>Sửa</span>
                          </button>
                          <button mat-menu-item (click)="toggleDepartmentStatus(dept)">
                            <mat-icon>
                              {{ dept.active ? 'block' : 'check_circle' }}
                            </mat-icon>
                            <span>{{ dept.active ? 'Tắt' : 'Bật' }}</span>
                          </button>
                          <button
                            mat-menu-item
                            class="delete-option"
                            (click)="deleteDepartment(dept)"
                          >
                            <mat-icon>delete</mat-icon>
                            <span>Xóa</span>
                          </button>
                        </mat-menu>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        </div>
      }

      <!-- Department Org Chart View -->
      @if (viewMode() === 'orgchart') {
        <div class="orgchart-section">
          <div class="table-header">
            <h3>Sơ đồ tổ chức</h3>
          </div>

          @if (isLoading()) {
            <div class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Đang tải dữ liệu...</p>
            </div>
          } @else if (orgChartNodes().length === 0) {
            <div class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>Không có phòng ban nào</p>
            </div>
          } @else {
            <div class="orgchart-container">
              <div class="orgchart-tree">
                @for (node of orgChartNodes(); track node.dept.id) {
                  <div class="org-node" [style.--level]="node.level">
                    <div class="node-card">
                      <div class="node-header">
                        <span class="dept-code">{{ node.dept.code }}</span>
                        <span class="dept-name">{{ node.dept.name }}</span>
                      </div>
                      <div class="node-details">
                        @if (node.dept.managerName) {
                          <div class="detail-row">
                            <mat-icon>person</mat-icon>
                            <span>{{ node.dept.managerName }}</span>
                          </div>
                        }
                        <div class="detail-row">
                          <mat-icon>people</mat-icon>
                          <span>{{ node.dept.employeeCount || 0 }} NV</span>
                        </div>
                      </div>
                      @if (node.dept.description) {
                        <div class="node-description">{{ node.dept.description }}</div>
                      }
                    </div>
                    @if (node.hasChildren) {
                      <div class="node-connector"></div>
                    }
                  </div>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .department-container {
      padding: 24px;
      background: #f5f5f5;
      min-height: 100vh;
    }

    /* Header Section */
    .header-section {
      margin-bottom: 32px;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }

    .page-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 8px 0;
    }

    .page-subtitle {
      font-size: 14px;
      color: #666;
      margin: 0;
    }

    .add-button {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .stat-icon {
      width: 56px;
      height: 56px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .stat-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .stat-content {
      flex: 1;
    }

    .stat-label {
      font-size: 12px;
      color: #666;
      margin: 0 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .stat-value {
      font-size: 32px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0;
    }

    /* Form Section */
    .form-section {
      margin-bottom: 32px;
      animation: slideDown 0.3s ease-out;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .form-card {
      background: white;
      border-radius: 12px;
      padding: 24px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .form-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .form-header h3 {
      font-size: 18px;
      font-weight: 600;
      margin: 0;
      color: #1a1a1a;
    }

    .close-button {
      color: #999;
    }

    .close-button:hover {
      color: #1a1a1a;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
    }

    .required {
      color: #ef4444;
    }

    .form-group input,
    .form-select,
    .form-textarea {
      padding: 10px 12px;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      font-size: 14px;
      font-family: inherit;
      transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #4f27f5;
      box-shadow: 0 0 0 3px rgba(79, 39, 245, 0.1);
    }

    .form-textarea {
      resize: vertical;
    }

    .form-actions {
      grid-column: 1 / -1;
      display: flex;
      gap: 12px;
      margin-top: 12px;
    }

    .form-actions button {
      min-width: 120px;
    }

    .spinner {
      display: inline-block !important;
      margin-right: 8px;
    }

    /* Table Section */
    .table-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .table-header {
      padding: 20px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    .table-header h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: #1a1a1a;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #999;
    }

    .loading-container p {
      margin-top: 12px;
      font-size: 14px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 12px;
      opacity: 0.5;
    }

    .empty-state p {
      font-size: 14px;
      margin-bottom: 20px;
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .department-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }

    .department-table thead {
      background: #f9f9f9;
      border-bottom: 2px solid #e0e0e0;
    }

    .department-table th {
      padding: 16px;
      text-align: left;
      font-weight: 600;
      color: #666;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .department-table tbody tr {
      border-bottom: 1px solid #f0f0f0;
      transition: background-color 0.2s ease;
    }

    .department-table tbody tr:hover {
      background-color: #fafafa;
    }

    .department-table td {
      padding: 16px;
      color: #333;
    }

    .code-badge {
      display: inline-block;
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      font-size: 12px;
      color: #4f27f5;
    }

    .dept-name {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .dept-name strong {
      color: #1a1a1a;
    }

    .dept-description {
      font-size: 12px;
      color: #999;
    }

    .center {
      text-align: center;
    }

    .employee-count {
      display: inline-block;
      background: #4f27f5;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-weight: 600;
      font-size: 12px;
      min-width: 32px;
      text-align: center;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
    }

    .status-badge.active {
      background: #dcfce7;
      color: #166534;
    }

    .status-badge.inactive {
      background: #f3f4f6;
      color: #6b7280;
    }

    .action-menu {
      color: #999;
    }

    .action-menu:hover {
      color: #4f27f5;
    }

    ::ng-deep .delete-option span {
      color: #ef4444 !important;
    }

    /* View Toggle */
    .view-toggle {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
    }

    .toggle-button {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      font-size: 14px;
      font-weight: 600;
      color: #666;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .toggle-button:hover {
      border-color: #4f27f5;
      color: #4f27f5;
    }

    .toggle-button.active {
      background: #4f27f5;
      color: white;
      border-color: #4f27f5;
    }

    .toggle-button mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Org Chart Section */
    .orgchart-section {
      background: white;
      border-radius: 12px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .orgchart-container {
      padding: 24px;
    }

    .orgchart-tree {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .org-node {
      margin-left: calc(var(--level, 0) * 32px);
      position: relative;
      margin-bottom: 16px;
    }

    .org-node:not(:last-child)::before {
      content: '';
      position: absolute;
      left: -16px;
      top: 40px;
      width: 1px;
      height: calc(100% - 40px);
      background: #d0d0d0;
    }

    .node-card {
      background: white;
      border: 2px solid #f0f0f0;
      border-radius: 10px;
      padding: 16px;
      transition: all 0.3s ease;
      position: relative;
      z-index: 1;
    }

    .node-card:hover {
      border-color: #4f27f5;
      box-shadow: 0 4px 12px rgba(79, 39, 245, 0.1);
    }

    .node-header {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 12px;
    }

    .dept-code {
      display: inline-block;
      background: #f0f0f0;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
      font-size: 12px;
      color: #4f27f5;
      flex-shrink: 0;
    }

    .dept-name {
      font-size: 14px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .node-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #666;
    }

    .detail-row mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .node-description {
      font-size: 12px;
      color: #999;
      padding-top: 8px;
      border-top: 1px solid #f0f0f0;
    }

    .node-connector {
      width: 2px;
      height: 16px;
      background: #d0d0d0;
      margin-left: -1px;
      margin-top: -8px;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .header-content {
        flex-direction: column;
        gap: 16px;
      }

      .add-button {
        width: 100%;
        justify-content: center;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .department-table {
        font-size: 12px;
      }

      .department-table th,
      .department-table td {
        padding: 12px;
      }

      .page-title {
        font-size: 24px;
      }
    }
  `,
})
export class DepartmentListComponent implements OnInit {
  private companyService = inject(CompanyService);
  private employeeService = inject(EmployeeService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  readonly isStrictAdmin = computed(() => this.authService.isStrictAdmin());

  // Signals
  departments = signal<DepartmentRow[]>([]);
  employees = signal<Employee[]>([]);
  isLoading = signal(true);
  isSaving = signal(false);
  showForm = signal(false);
  editingDepartment = signal<Department | null>(null);
  viewMode = signal<'list' | 'orgchart'>('list');
  orgChartNodes = signal<DeptTreeNode[]>([]);

  formData = signal<Partial<Department>>({
    code: '',
    name: '',
    parentDeptId: null,
    managerEmployeeId: null,
    description: '',
    displayOrder: 0,
    active: true,
  });

  // Computed values
  totalDepartments = computed(() => this.departments().length);
  activeDepartments = computed(
    () => this.departments().filter((d) => d.active).length
  );
  totalEmployees = computed(() => this.employees().length);
  unassignedEmployees = computed(
    () => this.employees().filter((e) => !e.departmentId).length
  );

  ngOnInit(): void {
    this.loadAll();
  }

  private loadAll(): void {
    this.isLoading.set(true);
    forkJoin({
      depts: this.companyService.listDepartments(),
      emps: this.employeeService.list({ size: 1000 })
    }).subscribe({
      next: ({ depts, emps }) => {
        // Set employees TRƯỚC để getEmployeeCountForDepartment() có data
        this.employees.set(emps.content);

        const enriched = depts.map((dept) => ({
          ...dept,
          parentDeptName: this.getParentDepartmentName(dept.parentDeptId, depts),
          managerName: this.getManagerName(dept.managerEmployeeId),
          employeeCount: this.getEmployeeCountForDepartment(dept.id),
        }));
        this.departments.set(enriched);
        this.buildTree();
        this.isLoading.set(false);
      },
      error: () => {
        this.snackBar.open('Lỗi khi tải dữ liệu phòng ban', 'Đóng', { duration: 3000 });
        this.isLoading.set(false);
      },
    });
  }

  private getParentDepartmentName(
    parentId: number | null,
    depts: Department[]
  ): string {
    if (!parentId) return '';
    return depts.find((d) => d.id === parentId)?.name || '';
  }

  private getManagerName(employeeId: number | null): string {
    if (!employeeId) return '';
    return this.employees().find((e) => e.id === employeeId)?.fullName || '';
  }

  private getEmployeeCountForDepartment(deptId: number): number {
    return this.employees().filter((e) => e.departmentId === deptId).length;
  }

  private buildTree(): void {
    const depts = this.departments();
    const nodes: DeptTreeNode[] = [];

    const getChildren = (parentId: number | null, level: number): DeptTreeNode[] => {
      const children = depts.filter((d) => d.parentDeptId === parentId);
      return children.map((dept, idx) => {
        const hasChildren = depts.some((d) => d.parentDeptId === dept.id);
        return {
          dept,
          level,
          hasChildren,
          isLast: idx === children.length - 1,
        };
      });
    };

    const processLevel = (parentId: number | null, level: number) => {
      const levelNodes = getChildren(parentId, level);
      levelNodes.forEach((node) => {
        nodes.push(node);
        if (node.hasChildren) {
          processLevel(node.dept.id, level + 1);
        }
      });
    };

    processLevel(null, 0);
    this.orgChartNodes.set(nodes);
  }

  getAvailableParentDepartments(): Department[] {
    const currentId = this.editingDepartment()?.id;
    return this.departments().filter((d) => d.id !== currentId);
  }

  openCreateForm(): void {
    this.editingDepartment.set(null);
    this.formData.set({
      code: '',
      name: '',
      parentDeptId: null,
      managerEmployeeId: null,
      description: '',
      displayOrder: 0,
      active: true,
    });
    this.showForm.set(true);
  }

  editDepartment(dept: DepartmentRow): void {
    this.editingDepartment.set(dept);
    this.formData.set({
      code: dept.code,
      name: dept.name,
      parentDeptId: dept.parentDeptId,
      managerEmployeeId: dept.managerEmployeeId,
      description: dept.description,
      displayOrder: dept.displayOrder,
      active: dept.active,
    });
    this.showForm.set(true);
  }

  cancelForm(): void {
    this.showForm.set(false);
    this.editingDepartment.set(null);
  }

  saveForm(): void {
    const data = this.formData();
    if (!data.code?.trim() || !data.name?.trim()) {
      this.snackBar.open('Vui lòng nhập mã và tên phòng ban', 'Đóng', {
        duration: 3000,
      });
      return;
    }

    this.isSaving.set(true);

    const dto = {
      code: data.code!,
      name: data.name!,
      parentDeptId: data.parentDeptId || null,
      managerEmployeeId: data.managerEmployeeId || null,
      description: data.description || '',
      displayOrder: data.displayOrder || 0,
      active: data.active !== false,
    };

    const editing = this.editingDepartment();
    const request$ = editing
      ? this.companyService.updateDepartment(editing.id, dto)
      : this.companyService.createDepartment(dto);

    request$.subscribe({
      next: () => {
        this.snackBar.open('Lưu phòng ban thành công', 'Đóng', {
          duration: 3000,
        });
        this.showForm.set(false);
        this.editingDepartment.set(null);
        this.isSaving.set(false);
        this.loadAll();
      },
      error: () => {
        this.snackBar.open('Lỗi khi lưu phòng ban', 'Đóng', {
          duration: 3000,
        });
        this.isSaving.set(false);
      },
    });
  }

  toggleDepartmentStatus(dept: DepartmentRow): void {
    this.companyService.toggleDepartment(dept.id).subscribe({
      next: () => {
        this.snackBar.open(
          dept.active
            ? 'Đã tắt phòng ban'
            : 'Đã bật phòng ban',
          'Đóng',
          { duration: 3000 }
        );
        this.loadAll();
      },
      error: () => {
        this.snackBar.open('Lỗi khi cập nhật trạng thái', 'Đóng', {
          duration: 3000,
        });
      },
    });
  }

  deleteDepartment(dept: DepartmentRow): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Xóa phòng ban',
        message: `Bạn có chắc chắn muốn xóa phòng ban "${dept.name}"? Hành động này không thể hoàn tác.`,
        confirmText: 'Xóa',
        cancelText: 'Hủy',
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.companyService.deleteDepartment(dept.id).subscribe({
          next: () => {
            this.snackBar.open('Xóa phòng ban thành công', 'Đóng', {
              duration: 3000,
            });
            this.loadAll();
          },
          error: () => {
            this.snackBar.open('Lỗi khi xóa phòng ban', 'Đóng', {
              duration: 3000,
            });
          },
        });
      }
    });
  }
}
