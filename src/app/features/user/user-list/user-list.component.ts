import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { UserService } from '../../../core/services/user.service';
import { User, UserRole, ROLE_LABELS, CreateUserRequest } from '../../../core/models/user.models';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="page-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="header-text">
            <h1 class="page-title">Quản lý Tài khoản</h1>
            <p class="page-subtitle">Quản lý người dùng hệ thống, quyền hạn và trạng thái tài khoản</p>
          </div>
          <button class="btn-create" (click)="openCreateDialog()">
            <span class="icon-plus">+</span>
            Tạo tài khoản
          </button>
        </div>
      </div>

      <!-- Search & Filter Section -->
      <div class="search-filter-section">
        <div class="search-box-wrapper">
          <input
            type="text"
            class="search-box"
            placeholder="Tìm kiếm theo tên đăng nhập hoặc email..."
            [(ngModel)]="searchText"
          />
          <span class="search-icon">
            <mat-icon>search</mat-icon>
          </span>
        </div>

        <div class="filter-pills">
          <button
            class="filter-pill"
            [class.active]="filterRole === ''"
            (click)="filterRole = ''"
          >
            Tất cả
          </button>
          <button
            class="filter-pill"
            [class.active]="filterRole === 'COMPANY_ADMIN'"
            (click)="filterRole = 'COMPANY_ADMIN'"
          >
            Admin
          </button>
          <button
            class="filter-pill"
            [class.active]="filterRole === 'MANAGER'"
            (click)="filterRole = 'MANAGER'"
          >
            Quản lý
          </button>
          <button
            class="filter-pill"
            [class.active]="filterRole === 'ACCOUNTANT'"
            (click)="filterRole = 'ACCOUNTANT'"
          >
            Kế toán
          </button>
          <button
            class="filter-pill"
            [class.active]="filterRole === 'EMPLOYEE'"
            (click)="filterRole = 'EMPLOYEE'"
          >
            Nhân viên
          </button>
          <button
            class="filter-pill"
            [class.active]="filterRole === 'VENDOR_USER'"
            (click)="filterRole = 'VENDOR_USER'"
          >
            Vendor
          </button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="isLoading()" class="loading-container">
        <mat-spinner diameter="40"></mat-spinner>
        <p>Đang tải dữ liệu...</p>
      </div>

      <!-- No Data State -->
      <div *ngIf="!isLoading() && filteredUsers().length === 0" class="no-data-container">
        <mat-icon class="no-data-icon">people_outline</mat-icon>
        <p>Không có tài khoản nào phù hợp với tiêu chí tìm kiếm</p>
      </div>

      <!-- Users Table -->
      <div *ngIf="!isLoading() && filteredUsers().length > 0" class="table-container">
        <table class="users-table">
          <thead>
            <tr class="table-header">
              <th>Tên đăng nhập</th>
              <th>Email</th>
              <th>Quyền hạn</th>
              <th>Trạng thái</th>
              <th>Đăng nhập cuối</th>
              <th class="actions-column">Hành động</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of filteredUsers()" class="table-row">
              <td class="username-cell">
                <code class="username-code">{{ user.username }}</code>
              </td>
              <td class="email-cell">{{ user.email }}</td>
              <td class="role-cell">
                <span [class]="'role-badge role-' + user.role">
                  {{ ROLE_LABELS[user.role] }}
                </span>
              </td>
              <td class="status-cell">
                <span [class]="'status-badge status-' + getStatusClass(user)">
                  {{ getStatusLabel(user) }}
                </span>
              </td>
              <td class="login-cell">
                {{ user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Chưa đăng nhập' }}
              </td>
              <td class="actions-cell">
                <button
                  [matMenuTriggerFor]="menu"
                  class="actions-button"
                  [attr.aria-label]="'Menu cho ' + user.username"
                >
                  <mat-icon>more_vert</mat-icon>
                </button>
                <mat-menu #menu="matMenu">
                  @if (isStrictAdmin()) {
                    <button
                      mat-menu-item
                      (click)="toggleStatus(user)"
                      class="menu-item"
                    >
                      <mat-icon>{{ user.active ? 'lock' : 'lock_open' }}</mat-icon>
                      <span>{{ user.active ? 'Tắt tài khoản' : 'Bật tài khoản' }}</span>
                    </button>
                    <button
                      mat-menu-item
                      (click)="changeRole(user)"
                      class="menu-item"
                    >
                      <mat-icon>security</mat-icon>
                      <span>Đổi quyền hạn</span>
                    </button>
                  }
                  <button
                    mat-menu-item
                    (click)="resetPassword(user)"
                    class="menu-item"
                  >
                    <mat-icon>vpn_key</mat-icon>
                    <span>Reset mật khẩu</span>
                  </button>
                  <button
                    *ngIf="user.mustChangePassword"
                    mat-menu-item
                    (click)="unlock(user)"
                    class="menu-item"
                  >
                    <mat-icon>lock_open</mat-icon>
                    <span>Unlock tài khoản</span>
                  </button>
                  @if (isStrictAdmin()) {
                    <mat-divider></mat-divider>
                    <button
                      mat-menu-item
                      (click)="deleteUser(user)"
                      class="menu-item menu-item-danger"
                    >
                      <mat-icon>delete</mat-icon>
                      <span>Xóa tài khoản</span>
                    </button>
                  }
                </mat-menu>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create User Dialog -->
      <div *ngIf="showCreateDialog()" class="dialog-overlay" (click)="closeCreateDialog()">
        <div class="dialog-content" (click)="$event.stopPropagation()">
          <div class="dialog-header">
            <h2>Tạo tài khoản mới</h2>
            <button class="dialog-close" (click)="closeCreateDialog()">
              <mat-icon>close</mat-icon>
            </button>
          </div>

          <div class="dialog-body">
            <div class="form-group">
              <label class="form-label">Tên đăng nhập</label>
              <input
                type="text"
                class="form-input"
                placeholder="Nhập tên đăng nhập"
                [(ngModel)]="newUser.username"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Email</label>
              <input
                type="email"
                class="form-input"
                placeholder="Nhập email"
                [(ngModel)]="newUser.email"
              />
            </div>

            <div class="form-group">
              <label class="form-label">Quyền hạn</label>
              <select class="form-select" [(ngModel)]="newUser.role">
                <option value="EMPLOYEE">Nhân viên</option>
                <option value="ACCOUNTANT">Kế toán</option>
                <option value="MANAGER">Quản lý</option>
                <option value="COMPANY_ADMIN">Admin</option>
                <option value="VENDOR_USER">Vendor</option>
              </select>
            </div>
          </div>

          <div class="dialog-footer">
            <button class="btn-cancel" (click)="closeCreateDialog()">
              Hủy
            </button>
            <button
              class="btn-submit"
              (click)="submitCreateUser()"
              [disabled]="isCreating()"
            >
              <span *ngIf="!isCreating()">Tạo tài khoản</span>
              <span *ngIf="isCreating()">
                <mat-icon class="spinner-icon">sync</mat-icon>
                Đang tạo...
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .page-container {
      padding: 24px;
      background-color: #f8fafc;
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
      gap: 24px;
    }

    .header-text {
      flex: 1;
    }

    .page-title {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .page-subtitle {
      margin: 8px 0 0 0;
      font-size: 15px;
      color: #64748b;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .btn-create {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(79, 70, 229, 0.3);
    }

    .btn-create:active {
      transform: translateY(0);
    }

    .icon-plus {
      font-size: 20px;
      font-weight: 700;
    }

    /* Search & Filter Section */
    .search-filter-section {
      margin-bottom: 32px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .search-box-wrapper {
      position: relative;
      width: 100%;
      max-width: 400px;
    }

    .search-box {
      width: 100%;
      padding: 12px 16px 12px 40px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: white;
      transition: all 0.2s ease;
    }

    .search-box:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #94a3b8;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .filter-pills {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .filter-pill {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      border-radius: 20px;
      background-color: white;
      color: #64748b;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .filter-pill:hover {
      border-color: #cbd5e1;
      background-color: #f1f5f9;
    }

    .filter-pill.active {
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: white;
      border-color: #4f46e5;
      box-shadow: 0 2px 8px rgba(79, 70, 229, 0.2);
    }

    /* Loading & No Data States */
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background-color: white;
      border-radius: 8px;
      gap: 16px;
    }

    .loading-container p {
      color: #64748b;
      font-size: 15px;
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    ::ng-deep .loading-container .mat-mdc-progress-spinner circle {
      stroke: #4f46e5 !important;
    }

    .no-data-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      background-color: white;
      border-radius: 8px;
      color: #94a3b8;
    }

    .no-data-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #cbd5e1;
      margin-bottom: 16px;
    }

    .no-data-container p {
      margin: 0;
      font-size: 15px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* Table Section */
    .table-container {
      background-color: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .table-header {
      background-color: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
    }

    .table-header th {
      padding: 16px;
      text-align: left;
      font-size: 13px;
      font-weight: 600;
      color: #475569;
      text-transform: none;
      letter-spacing: normal;
    }

    .table-row {
      border-bottom: 1px solid #f1f5f9;
      transition: background-color 0.2s ease;
    }

    .table-row:hover {
      background-color: #f8fafc;
    }

    .table-row td {
      padding: 16px;
      font-size: 14px;
      color: #334155;
      vertical-align: middle;
    }

    .username-cell {
      font-family: 'Fira Code', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 500;
    }

    .username-code {
      background-color: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      color: #334155;
      font-weight: 500;
    }

    .email-cell {
      color: #64748b;
    }

    .role-cell {
      font-weight: 500;
    }

    .role-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    .role-COMPANY_ADMIN {
      background-color: #dbeafe;
      color: #1d4ed8;
    }

    .role-MANAGER {
      background-color: #ffedd5;
      color: #c2410c;
    }

    .role-ACCOUNTANT {
      background-color: #dcfce7;
      color: #16a34a;
    }

    .role-EMPLOYEE {
      background-color: #ede9fe;
      color: #7c3aed;
    }

    .role-VENDOR_USER {
      background-color: #fef3c7;
      color: #d97706;
    }

    .role-SUPER_ADMIN {
      background-color: #f3e8ff;
      color: #a855f7;
    }

    .status-cell {
      font-weight: 500;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 600;
      white-space: nowrap;
    }

    .status-active {
      background-color: #dcfce7;
      color: #16a34a;
    }

    .status-inactive {
      background-color: #e2e8f0;
      color: #64748b;
    }

    .status-locked {
      background-color: #fee2e2;
      color: #dc2626;
    }

    .login-cell {
      color: #64748b;
      font-size: 13px;
    }

    .actions-column {
      text-align: center;
      width: 60px;
    }

    .actions-cell {
      text-align: center;
    }

    .actions-button {
      padding: 8px;
      min-width: 40px;
      height: 40px;
      border-radius: 6px;
      background-color: transparent;
      border: 1px solid #e2e8f0;
      color: #64748b;
      cursor: pointer;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .actions-button:hover {
      background-color: #f1f5f9;
      border-color: #cbd5e1;
      color: #334155;
    }

    ::ng-deep .mat-mdc-menu-content {
      max-width: 250px !important;
    }

    ::ng-deep .mat-mdc-menu-item {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif !important;
      font-size: 14px !important;
      height: auto !important;
      padding: 10px 16px !important;
    }

    ::ng-deep .mat-mdc-menu-item mat-icon {
      margin-right: 12px;
      color: #64748b;
    }

    .menu-item {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .menu-item-danger {
      color: #dc2626;
    }

    .menu-item-danger mat-icon {
      color: #dc2626 !important;
    }

    /* Dialog Styles */
    .dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(15, 23, 42, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .dialog-content {
      background-color: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);
      max-width: 500px;
      width: 90%;
      animation: slideUp 0.3s ease;
      overflow: hidden;
    }

    @keyframes slideUp {
      from {
        transform: translateY(20px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 24px;
      border-bottom: 1px solid #e2e8f0;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 20px;
      font-weight: 700;
      color: #0f172a;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .dialog-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #94a3b8;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    }

    .dialog-close:hover {
      color: #334155;
    }

    .dialog-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-label {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .form-input,
    .form-select {
      padding: 10px 12px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 14px;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: white;
      color: #0f172a;
      transition: all 0.2s ease;
    }

    .form-input:focus,
    .form-select:focus {
      outline: none;
      border-color: #4f46e5;
      box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }

    .form-select {
      cursor: pointer;
    }

    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e2e8f0;
      background-color: #f8fafc;
    }

    .btn-cancel {
      padding: 10px 20px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background-color: white;
      color: #334155;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    .btn-cancel:hover {
      background-color: #f1f5f9;
      border-color: #cbd5e1;
    }

    .btn-submit {
      padding: 10px 20px;
      background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%);
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
    }

    .btn-submit:disabled {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .spinner-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from {
        transform: rotate(0deg);
      }
      to {
        transform: rotate(360deg);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .page-container {
        padding: 16px;
      }

      .header-content {
        flex-direction: column;
        align-items: stretch;
      }

      .btn-create {
        width: 100%;
        justify-content: center;
      }

      .search-filter-section {
        flex-direction: column;
      }

      .search-box-wrapper {
        max-width: 100%;
      }

      .page-title {
        font-size: 24px;
      }

      .table-container {
        overflow-x: auto;
      }

      .users-table {
        min-width: 800px;
      }

      .dialog-content {
        width: 95%;
      }
    }
  `]
})
export class UserListComponent implements OnInit {
  private userService = inject(UserService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  readonly authService = inject(AuthService);
  readonly isStrictAdmin = computed(() => this.authService.isStrictAdmin());

  users = signal<User[]>([]);
  isLoading = signal(false);
  isCreating = signal(false);
  showCreateDialog = signal(false);
  filterRole = '';
  searchText = '';

  newUser: CreateUserRequest = {
    username: '',
    email: '',
    role: 'EMPLOYEE'
  };

  ROLE_LABELS = ROLE_LABELS;

  filteredUsers = computed(() => {
    let filtered = this.users();

    if (this.filterRole) {
      filtered = filtered.filter(u => u.role === this.filterRole);
    }

    if (this.searchText) {
      const search = this.searchText.toLowerCase();
      filtered = filtered.filter(u =>
        u.username.toLowerCase().includes(search) ||
        u.email.toLowerCase().includes(search)
      );
    }

    return filtered;
  });

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.isLoading.set(true);
    this.userService.list().subscribe({
      next: (response) => {
        this.users.set(response.content);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open('Lỗi khi tải danh sách tài khoản', 'Đóng', { duration: 5000 });
        console.error('Error loading users:', err);
      }
    });
  }

  openCreateDialog() {
    this.newUser = { username: '', email: '', role: 'EMPLOYEE' };
    this.showCreateDialog.set(true);
  }

  closeCreateDialog() {
    this.showCreateDialog.set(false);
  }

  submitCreateUser() {
    if (!this.newUser.username.trim() || !this.newUser.email.trim()) {
      this.snackBar.open('Vui lòng điền đầy đủ thông tin', 'Đóng', { duration: 3000 });
      return;
    }

    this.isCreating.set(true);
    this.userService.create(this.newUser).subscribe({
      next: (user) => {
        this.isCreating.set(false);
        this.users.set([user, ...this.users()]);
        this.closeCreateDialog();
        this.snackBar.open('Tạo tài khoản thành công', 'Đóng', { duration: 3000 });
      },
      error: (err) => {
        this.isCreating.set(false);
        this.snackBar.open('Lỗi khi tạo tài khoản', 'Đóng', { duration: 5000 });
        console.error('Error creating user:', err);
      }
    });
  }

  toggleStatus(user: User) {
    const action = user.active ? 'Tắt' : 'Bật';
    if (confirm(`Bạn có chắc muốn ${action.toLowerCase()} tài khoản ${user.username}?`)) {
      this.userService.toggleStatus(user.id).subscribe({
        next: () => {
          const updated = this.users().map(u =>
            u.id === user.id ? { ...u, active: !u.active } : u
          );
          this.users.set(updated);
          this.snackBar.open(`${action} tài khoản thành công`, 'Đóng', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open(`Lỗi khi ${action.toLowerCase()} tài khoản`, 'Đóng', { duration: 5000 });
          console.error('Error toggling status:', err);
        }
      });
    }
  }

  changeRole(user: User) {
    const roles = Object.keys(ROLE_LABELS) as UserRole[];
    const roleOptions = roles.map(r => `${r}: ${ROLE_LABELS[r]}`).join('\n');
    const newRole = prompt(`Chọn quyền hạn mới (nhập một trong các giá trị):\n${roleOptions}\n\nQuyền hạn hiện tại: ${user.role}`, '');

    if (newRole && roles.includes(newRole as UserRole)) {
      this.userService.changeRole(user.id, newRole).subscribe({
        next: () => {
          const updated = this.users().map(u =>
            u.id === user.id ? { ...u, role: newRole as UserRole } : u
          );
          this.users.set(updated);
          this.snackBar.open('Cập nhật quyền hạn thành công', 'Đóng', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Lỗi khi cập nhật quyền hạn', 'Đóng', { duration: 5000 });
          console.error('Error changing role:', err);
        }
      });
    } else if (newRole) {
      this.snackBar.open('Quyền hạn không hợp lệ', 'Đóng', { duration: 3000 });
    }
  }

  resetPassword(user: User) {
    if (confirm(`Bạn có chắc muốn reset mật khẩu cho ${user.username}?\n\nTài khoản sẽ được gửi mật khẩu mới qua email.`)) {
      this.userService.resetPassword(user.id).subscribe({
        next: () => {
          this.snackBar.open('Reset mật khẩu thành công. Email đã được gửi.', 'Đóng', { duration: 4000 });
        },
        error: (err) => {
          this.snackBar.open('Lỗi khi reset mật khẩu', 'Đóng', { duration: 5000 });
          console.error('Error resetting password:', err);
        }
      });
    }
  }

  unlock(user: User) {
    if (confirm(`Bạn có chắc muốn unlock tài khoản ${user.username}?`)) {
      this.userService.unlock(user.id).subscribe({
        next: () => {
          const updated = this.users().map(u =>
            u.id === user.id ? { ...u, mustChangePassword: false } : u
          );
          this.users.set(updated);
          this.snackBar.open('Unlock tài khoản thành công', 'Đóng', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Lỗi khi unlock tài khoản', 'Đóng', { duration: 5000 });
          console.error('Error unlocking user:', err);
        }
      });
    }
  }

  deleteUser(user: User) {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${user.username}?\n\nHành động này không thể hoàn tác!`)) {
      this.userService.delete(user.id).subscribe({
        next: () => {
          this.users.set(this.users().filter(u => u.id !== user.id));
          this.snackBar.open('Xóa tài khoản thành công', 'Đóng', { duration: 3000 });
        },
        error: (err) => {
          this.snackBar.open('Lỗi khi xóa tài khoản', 'Đóng', { duration: 5000 });
          console.error('Error deleting user:', err);
        }
      });
    }
  }

  getStatusClass(user: User): string {
    if (!user.active) return 'inactive';
    if (user.mustChangePassword) return 'pending';
    return 'active';
  }

  getStatusLabel(user: User): string {
    if (!user.active) return 'Không hoạt động';
    if (user.mustChangePassword) return 'Chờ đổi mật khẩu';
    return 'Hoạt động';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
