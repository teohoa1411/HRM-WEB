import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { EmployeeService } from '../../../core/services/employee.service';
import { DocumentService } from '../../../core/services/document.service';
import { SalaryService } from '../../../core/services/salary.service';
import { AssetService } from '../../../core/services/asset.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Employee } from '../../../core/models/employee.models';
import { DocumentFile, DocumentType, DOCUMENT_TYPE_LABELS } from '../../../core/models/document.models';
import { InternalSalary } from '../../../core/models/salary.models';
import { Asset, AssetAssignment } from '../../../core/models/asset.models';
import { AssignmentDialogComponent } from '../assignment-dialog/assignment-dialog.component';
import { AssetReturnDialogComponent } from '../../asset/asset-return-dialog/asset-return-dialog.component';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-employee-profile',
  standalone: true,
  imports: [
    CommonModule, RouterLink, FormsModule, ReactiveFormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatChipsModule, MatTabsModule,
    MatSelectModule, MatFormFieldModule, MatProgressBarModule,
    MatTooltipModule, MatInputModule, MatDialogModule,
    MoneyDirective,
  ],
  template: `
    <div class="page-container" style="max-width:900px;">
      @if (loading()) {
        <div style="text-align:center; padding:64px;">
          <mat-icon style="font-size:40px; width:40px; height:40px;">hourglass_empty</mat-icon>
          <p>Loading profile...</p>
        </div>
      }

      @if (employee(); as emp) {
        <!-- Header Card -->
        <mat-card style="margin-bottom:16px;">
          <mat-card-content style="padding:24px;">
            <div class="flex-row gap-24">
              <div class="big-avatar">{{ emp.fullName.charAt(0) }}</div>
              <div style="flex:1;">
                <h2 style="margin:0; font-size:24px;">{{ emp.fullName }}</h2>
                <p style="margin:4px 0; color:#666;">{{ emp.jobRoleName || 'No Job Role' }}</p>
                <div class="flex-row gap-8" style="margin-top:8px; flex-wrap:wrap;">
                  <span [class]="'status-chip ' + emp.status.toLowerCase().replace('_','-')">{{ emp.status }}</span>
                  <span class="source-badge {{ emp.sourceType.toLowerCase() }}">{{ emp.sourceType }}</span>
                  <span style="color:#666; font-size:13px;">
                    <mat-icon style="font-size:14px; width:14px; height:14px; vertical-align:middle;">work</mat-icon>
                    {{ emp.employmentType }}
                  </span>
                </div>
              </div>
              @if (canEdit()) {
                <div style="display:flex;gap:8px;">
                  <button mat-stroked-button (click)="openAssignmentDialog(emp.publicId)">
                    <mat-icon>assignment_ind</mat-icon> Phân công dự án
                  </button>
                  <button mat-stroked-button style="border-color:#EA580C;color:#EA580C;" (click)="resetEmployeePassword(emp)">
                    <mat-icon>lock_reset</mat-icon> Reset MK
                  </button>
                  <button mat-raised-button color="primary" [routerLink]="['/employees', emp.publicId, 'edit']">
                    <mat-icon>edit</mat-icon> Edit
                  </button>
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Details Tabs -->
        <mat-card>
          <mat-tab-group>
            <!-- Tab Thông tin công việc -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px;">work</mat-icon>
                Thông tin
              </ng-template>
              <div style="padding:28px 24px;font-family:'Inter','Be Vietnam Pro','Segoe UI',sans-serif;">
                <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">

                  <div style="padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Mã nhân viên</div>
                    <div style="font-size:15px;font-weight:700;color:#1e293b;font-family:'JetBrains Mono',monospace;">{{ emp.employeeCode }}</div>
                  </div>

                  <div style="padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Phòng ban</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b;">{{ emp.departmentName || '—' }}</div>
                  </div>

                  <div style="padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Email công việc</div>
                    <div style="font-size:14px;font-weight:500;color:#1d4ed8;">{{ emp.emailWork || '—' }}</div>
                  </div>

                  <div style="padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Số điện thoại</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b;">{{ emp.phoneWork || '—' }}</div>
                  </div>

                  <div style="padding:14px 18px;background:#f8fafc;border-radius:12px;border:1px solid #e5e7eb;">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Ngày bắt đầu</div>
                    <div style="font-size:15px;font-weight:600;color:#1e293b;">{{ emp.startDate | date:'dd/MM/yyyy' }}</div>
                  </div>

                  <div style="padding:14px 18px;border-radius:12px;border:1px solid;"
                    [style.background]="emp.endDate ? '#fef2f2' : '#f0fdf4'"
                    [style.border-color]="emp.endDate ? '#fecaca' : '#bbf7d0'">
                    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Ngày kết thúc</div>
                    <div style="font-size:15px;font-weight:600;"
                      [style.color]="emp.endDate ? '#dc2626' : '#16a34a'">
                      {{ emp.endDate ? (emp.endDate | date:'dd/MM/yyyy') : 'Đang làm việc' }}
                    </div>
                  </div>

                  @if (emp.probationEndDate) {
                    <div style="padding:14px 18px;background:#fffbeb;border-radius:12px;border:1px solid #fde68a;">
                      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Kết thúc thử việc</div>
                      <div style="font-size:15px;font-weight:600;color:#d97706;">{{ emp.probationEndDate | date:'dd/MM/yyyy' }}</div>
                    </div>
                  }

                  @if (emp.vendorId) {
                    <div style="padding:14px 18px;background:#faf5ff;border-radius:12px;border:1px solid #e9d5ff;">
                      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:6px;">Đối tác (Vendor)</div>
                      <div style="font-size:15px;font-weight:600;color:#7c3aed;">{{ emp.vendorName || '#' + emp.vendorId }}</div>
                    </div>
                  }
                </div>
              </div>
            </mat-tab>

            <!-- Salary Tab (INTERNAL only, admin only) -->
            @if (canEdit() && emp.sourceType === 'INTERNAL') {
              <mat-tab>
                <ng-template mat-tab-label>
                  <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px;">payments</mat-icon>
                  Lương
                </ng-template>
                <div style="padding:28px 24px;font-family:'Inter','Be Vietnam Pro','Segoe UI',sans-serif;">

                  <!-- Current salary highlight -->
                  @if (salaryHistory().length > 0 && !salaryHistory()[0].effectiveTo) {
                    <div style="display:flex;align-items:center;gap:16px;padding:20px 24px;
                      background:linear-gradient(135deg,#eff6ff 0%,#f0fdf4 100%);
                      border:1px solid #bfdbfe;border-radius:14px;margin-bottom:24px;">
                      <div style="width:48px;height:48px;border-radius:12px;background:#1d4ed8;
                        display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <mat-icon style="color:#fff;font-size:24px;width:24px;height:24px;">account_balance_wallet</mat-icon>
                      </div>
                      <div>
                        <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;color:#6b7280;">
                          Mức lương hiện tại
                        </div>
                        <div style="font-size:26px;font-weight:800;color:#1d4ed8;line-height:1.2;margin-top:2px;">
                          {{ salaryHistory()[0].monthlySalary | number:'1.0-0' }}
                          <span style="font-size:14px;font-weight:500;color:#64748b;">VNĐ/tháng</span>
                        </div>
                        <div style="font-size:12px;color:#16a34a;font-weight:500;margin-top:2px;">
                          <mat-icon style="font-size:14px;width:14px;height:14px;vertical-align:middle;">check_circle</mat-icon>
                          Áp dụng từ {{ salaryHistory()[0].effectiveFrom }}
                        </div>
                      </div>
                    </div>
                  }

                  <!-- Form cấu hình lương mới -->
                  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;margin-bottom:24px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:#f1f5f9;
                        display:flex;align-items:center;justify-content:center;">
                        <mat-icon style="font-size:18px;width:18px;height:18px;color:#475569;">edit_note</mat-icon>
                      </div>
                      <div>
                        <div style="font-size:15px;font-weight:700;color:#1e293b;">Cấu hình lương mới</div>
                        <div style="font-size:12px;color:#94a3b8;">Lương cũ sẽ tự động đóng khi lương mới được áp dụng</div>
                      </div>
                    </div>

                    <form [formGroup]="salaryForm" (ngSubmit)="addSalary(emp.publicId)"
                      style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
                      <mat-form-field appearance="outline">
                        <mat-label>Mức lương (VNĐ/tháng)</mat-label>
                        <mat-icon matPrefix style="color:#6366f1;margin-right:8px;">payments</mat-icon>
                        <input matInput formControlName="monthlySalary" type="text" inputmode="numeric" appMoney
                          placeholder="VD: 15,000,000">
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Ngày áp dụng</mat-label>
                        <mat-icon matPrefix style="color:#6366f1;margin-right:8px;">event</mat-icon>
                        <input matInput formControlName="effectiveFrom" type="date">
                      </mat-form-field>
                      <mat-form-field appearance="outline" style="grid-column:1/-1;">
                        <mat-label>Ghi chú (lý do điều chỉnh)</mat-label>
                        <mat-icon matPrefix style="color:#94a3b8;margin-right:8px;">notes</mat-icon>
                        <input matInput formControlName="notes" placeholder="VD: Tăng lương định kỳ Q2/2026">
                      </mat-form-field>
                      <div style="grid-column:1/-1;display:flex;justify-content:flex-end;">
                        <button mat-flat-button type="submit" [disabled]="salaryForm.invalid"
                          style="background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border-radius:10px;
                          padding:0 24px;height:42px;font-weight:600;font-size:14px;">
                          <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">save</mat-icon>
                          Lưu mức lương mới
                        </button>
                      </div>
                    </form>
                  </div>

                  <!-- Lịch sử lương -->
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
                    <mat-icon style="font-size:20px;width:20px;height:20px;color:#6366f1;">history</mat-icon>
                    <span style="font-size:15px;font-weight:700;color:#1e293b;">Lịch sử điều chỉnh lương</span>
                    @if (salaryHistory().length > 0) {
                      <span style="background:#eef2ff;color:#4f46e5;font-size:11px;font-weight:700;
                        padding:2px 8px;border-radius:20px;">{{ salaryHistory().length }}</span>
                    }
                  </div>

                  @if (salaryHistory().length === 0) {
                    <div style="text-align:center;padding:40px 24px;color:#94a3b8;">
                      <mat-icon style="font-size:40px;width:40px;height:40px;color:#d1d5db;">payments</mat-icon>
                      <div style="margin-top:12px;font-size:14px;font-weight:500;">Chưa có lương nào được cấu hình</div>
                      <div style="font-size:12px;color:#c7c7c7;margin-top:4px;">Nhập mức lương ở form bên trên để bắt đầu</div>
                    </div>
                  } @else {
                    <div style="display:flex;flex-direction:column;gap:8px;">
                      @for (s of salaryHistory(); track s.id; let i = $index) {
                        <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;
                          border:1px solid;transition:box-shadow .15s;"
                          [style.border-color]="!s.effectiveTo ? '#86efac' : '#e5e7eb'"
                          [style.background]="!s.effectiveTo ? '#f0fdf4' : '#fafafa'">
                          <div style="width:36px;height:36px;border-radius:10px;display:flex;align-items:center;
                            justify-content:center;flex-shrink:0;"
                            [style.background]="!s.effectiveTo ? '#dcfce7' : '#f1f5f9'">
                            <mat-icon [style.color]="!s.effectiveTo ? '#16a34a' : '#94a3b8'" style="font-size:20px;width:20px;height:20px;">
                              {{ !s.effectiveTo ? 'verified' : 'schedule' }}
                            </mat-icon>
                          </div>
                          <div style="flex:1;min-width:0;">
                            <div style="display:flex;align-items:baseline;gap:8px;">
                              <span style="font-size:20px;font-weight:800;letter-spacing:-0.5px;"
                                [style.color]="!s.effectiveTo ? '#1d4ed8' : '#64748b'">
                                {{ s.monthlySalary | number:'1.0-0' }}
                              </span>
                              <span style="font-size:12px;color:#94a3b8;font-weight:500;">VNĐ/tháng</span>
                              @if (!s.effectiveTo) {
                                <span style="background:#16a34a;color:#fff;font-size:10px;font-weight:700;
                                  padding:2px 8px;border-radius:10px;">ĐANG ÁP DỤNG</span>
                              }
                            </div>
                            <div style="font-size:12px;color:#6b7280;margin-top:3px;">
                              Từ {{ s.effectiveFrom }}{{ s.effectiveTo ? ' → ' + s.effectiveTo : '' }}
                            </div>
                            @if (s.notes) {
                              <div style="font-size:12px;color:#94a3b8;font-style:italic;margin-top:2px;">
                                <mat-icon style="font-size:12px;width:12px;height:12px;vertical-align:middle;">notes</mat-icon>
                                {{ s.notes }}
                              </div>
                            }
                          </div>
                        </div>
                      }
                    </div>
                  }
                </div>
              </mat-tab>
            }

            <!-- Tab Tài liệu -->
            @if (canEdit()) {
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px;">folder</mat-icon>
                Tài liệu ({{ documents().length }})
              </ng-template>
              <div style="padding:28px 24px;font-family:'Inter','Be Vietnam Pro','Segoe UI',sans-serif;">

                <!-- Khu vực tải lên -->
                @if (canEdit()) {
                  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:20px 24px;margin-bottom:24px;">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
                      <div style="width:36px;height:36px;border-radius:10px;background:#eff6ff;
                        display:flex;align-items:center;justify-content:center;">
                        <mat-icon style="font-size:18px;width:18px;height:18px;color:#1d4ed8;">cloud_upload</mat-icon>
                      </div>
                      <div>
                        <div style="font-size:15px;font-weight:700;color:#1e293b;">Tải lên tài liệu</div>
                        <div style="font-size:12px;color:#94a3b8;">PDF, ảnh, Word, Excel — tối đa 50MB</div>
                      </div>
                    </div>

                    <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
                      <mat-form-field appearance="outline" style="width:220px;">
                        <mat-label>Loại tài liệu</mat-label>
                        <mat-select [(ngModel)]="selectedDocType">
                          @for (type of docTypes; track type) {
                            <mat-option [value]="type">{{ docTypeLabels[type] }}</mat-option>
                          }
                        </mat-select>
                      </mat-form-field>

                      <input #fileInput type="file" hidden
                        accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx"
                        (change)="onFileSelected($event, emp.publicId)" />
                      <button mat-flat-button [disabled]="!selectedDocType || uploading()"
                        (click)="fileInput.click()"
                        style="background:linear-gradient(135deg,#6366f1,#7c3aed);color:#fff;border-radius:10px;
                        height:56px;padding:0 24px;font-weight:600;font-size:14px;">
                        <mat-icon style="font-size:18px;width:18px;height:18px;margin-right:6px;">cloud_upload</mat-icon>
                        {{ uploading() ? 'Đang tải lên...' : 'Chọn file tải lên' }}
                      </button>
                    </div>

                    @if (uploading()) {
                      <mat-progress-bar mode="indeterminate" style="margin-top:10px;border-radius:4px;"></mat-progress-bar>
                    }
                    @if (uploadError()) {
                      <div style="display:flex;align-items:center;gap:6px;margin-top:10px;padding:8px 12px;
                        background:#fef2f2;border-radius:8px;border:1px solid #fecaca;font-size:13px;color:#dc2626;">
                        <mat-icon style="font-size:16px;width:16px;height:16px;">error_outline</mat-icon>
                        {{ uploadError() }}
                      </div>
                    }
                  </div>
                }

                <!-- Danh sách tài liệu -->
                @if (docsLoading()) {
                  <div style="text-align:center;padding:40px;color:#94a3b8;">
                    <mat-icon style="font-size:36px;width:36px;height:36px;color:#d1d5db;">hourglass_empty</mat-icon>
                    <div style="margin-top:8px;font-size:14px;">Đang tải...</div>
                  </div>
                } @else if (documents().length === 0) {
                  <div style="text-align:center;padding:48px 24px;">
                    <mat-icon style="font-size:48px;width:48px;height:48px;color:#d1d5db;">folder_open</mat-icon>
                    <div style="margin-top:12px;font-size:14px;font-weight:500;color:#94a3b8;">Chưa có tài liệu nào</div>
                    <div style="font-size:12px;color:#c7c7c7;margin-top:4px;">Tải lên tài liệu ở form bên trên</div>
                  </div>
                } @else {
                  <div class="doc-list">
                    @for (doc of documents(); track doc.id) {
                      <div class="doc-row">
                        <div class="doc-icon">
                          <mat-icon>{{ getMimeIcon(doc.mimeType) }}</mat-icon>
                        </div>
                        <div style="flex:1; min-width:0;">
                          <div class="doc-name" [matTooltip]="doc.fileName">{{ doc.fileName }}</div>
                          <div class="doc-meta">
                            <span class="doc-type-badge">{{ docTypeLabels[doc.documentType] }}</span>
                            <span>{{ formatSize(doc.fileSize) }}</span>
                            <span>{{ doc.createdAt | date:'dd/MM/yyyy HH:mm' }}</span>
                          </div>
                        </div>
                        <div class="doc-actions">
                          @if (isViewable(doc.mimeType)) {
                            <button mat-icon-button matTooltip="Xem trước"
                              (click)="viewDoc(emp.publicId, doc)">
                              <mat-icon style="color:#6366f1;">visibility</mat-icon>
                            </button>
                          }
                          <button mat-icon-button matTooltip="Tải xuống"
                            (click)="download(emp.publicId, doc)">
                            <mat-icon style="color:#1d4ed8;">download</mat-icon>
                          </button>
                          @if (canEdit()) {
                            <button mat-icon-button matTooltip="Xoá tài liệu"
                              (click)="deleteDoc(emp.publicId, doc.id)">
                              <mat-icon style="color:#dc2626;">delete_outline</mat-icon>
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                }

              </div>
            </mat-tab>
            }

            <!-- Assets Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon style="margin-right:6px;font-size:18px;width:18px;height:18px;">inventory_2</mat-icon>
                Tài sản ({{ employeeAssets().length }})
              </ng-template>
              <div style="padding:24px;">

                @if (assetsLoading()) {
                  <div style="text-align:center; padding:32px; color:#999;">
                    <mat-icon style="font-size:32px; width:32px; height:32px;">hourglass_empty</mat-icon>
                    <p>Đang tải...</p>
                  </div>
                } @else if (employeeAssets().length === 0) {
                  <div style="text-align:center; padding:40px; color:#bbb;">
                    <mat-icon style="font-size:48px; width:48px; height:48px; color:#cbd5e1;">inventory_2</mat-icon>
                    <p style="margin:8px 0 0; color:#94a3b8;">Nhân viên chưa được cấp thiết bị nào</p>
                  </div>
                } @else {
                  <div style="font-weight:700; margin-bottom:16px; color:#1e293b; font-size:15px;">
                    Thiết bị đang giữ
                    <span style="background:#dbeafe; color:#1e40af; padding:2px 10px; border-radius:12px; font-size:12px; margin-left:8px;">
                      {{ employeeAssets().length }}
                    </span>
                  </div>

                  @for (a of employeeAssets(); track a.id) {
                    <div class="asset-row">
                      <div class="asset-icon-box">
                        <mat-icon>{{ getAssetIcon(a.assetName) }}</mat-icon>
                      </div>
                      <div style="flex:1; min-width:0;">
                        <div style="font-size:14px; font-weight:600; color:#1e293b;">{{ a.assetName }}</div>
                        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">
                          {{ a.assetCode }}
                          @if (a.serialNumber) { · SN: {{ a.serialNumber }} }
                          · Nhận từ {{ a.assignedDate }}
                        </div>
                      </div>
                      <div style="display:flex; align-items:center; gap:8px;">
                        <span style="background:#dcfce7; color:#166534; padding:2px 10px; border-radius:12px; font-size:11px; font-weight:600;">
                          {{ a.conditionOnAssign }}
                        </span>
                        @if (canEdit()) {
                          <button mat-stroked-button style="font-size:12px; padding:4px 12px; border-color:#fcd34d; color:#92400e; background:#fffbeb;"
                            (click)="openReturnFromProfile(a)">
                            <mat-icon style="font-size:14px; width:14px; height:14px;">assignment_return</mat-icon>
                            Thu hồi
                          </button>
                        }
                      </div>
                    </div>
                  }
                }

                <!-- Lịch sử đã trả -->
                @if (returnedAssets().length > 0) {
                  <div style="margin-top:24px; padding-top:16px; border-top:1px solid #e2e8f0;">
                    <div style="font-weight:600; margin-bottom:12px; color:#64748b; font-size:13px;">
                      Đã trả ({{ returnedAssets().length }})
                    </div>
                    @for (a of returnedAssets(); track a.id) {
                      <div class="asset-row" style="opacity:0.6;">
                        <div class="asset-icon-box" style="background:#f1f5f9;">
                          <mat-icon style="color:#94a3b8;">{{ getAssetIcon(a.assetName) }}</mat-icon>
                        </div>
                        <div style="flex:1;">
                          <div style="font-size:13px; color:#64748b;">{{ a.assetName }} ({{ a.assetCode }})</div>
                          <div style="font-size:11px; color:#94a3b8;">
                            {{ a.assignedDate }} → {{ a.returnedDate }}
                          </div>
                        </div>
                      </div>
                    }
                  </div>
                }

              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card>
      }
    </div>

    <!-- Document Viewer Popup -->
    @if (viewerOpen()) {
      <div class="viewer-backdrop" (click)="closeViewer()">
        <div class="viewer-panel" (click)="$event.stopPropagation()">
          <div class="viewer-header">
            <div class="viewer-title">
              <mat-icon>{{ viewerMime().includes('pdf') ? 'picture_as_pdf' : 'image' }}</mat-icon>
              <span [matTooltip]="viewerName()">{{ viewerName() }}</span>
            </div>
            <div style="display:flex; gap:4px;">
              <a mat-icon-button [href]="viewerRawUrl()" target="_blank" matTooltip="Mở tab mới">
                <mat-icon>open_in_new</mat-icon>
              </a>
              <button mat-icon-button (click)="closeViewer()" matTooltip="Đóng">
                <mat-icon>close</mat-icon>
              </button>
            </div>
          </div>
          <div class="viewer-body">
            @if (viewerLoading()) {
              <div class="viewer-loading">
                <mat-icon style="font-size:40px; width:40px; height:40px; animation: spin 1s linear infinite;">refresh</mat-icon>
                <p>Đang tải...</p>
              </div>
            }
            @if (!viewerLoading() && viewerMime().includes('image')) {
              <img [src]="viewerRawUrl()" [alt]="viewerName()" class="viewer-img" />
            }
            @if (!viewerLoading() && viewerMime().includes('pdf')) {
              <iframe [src]="viewerSafeUrl()" class="viewer-iframe" frameborder="0"></iframe>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .big-avatar {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, #3f51b5, #7986cb);
      color: white; display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 32px; flex-shrink: 0;
    }
    .source-badge {
      padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;
      &.internal { background:#e3f2fd; color:#1565c0; }
      &.vendor    { background:#f3e5f5; color:#6a1b9a; }
    }
    .info-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 20px;
    }
    .info-label { font-size: 12px; color: #888; font-weight: 500; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-size: 15px; color: #212121; }

    .doc-list { display: flex; flex-direction: column; gap: 8px; }
    .doc-row {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; border-radius: 8px; background: #fafafa;
      border: 1px solid #e0e0e0;
      &:hover { background: #f0f4ff; border-color: #c5cae9; }
    }
    .doc-icon { color: #5c6bc0; flex-shrink: 0; }
    .doc-name {
      font-size: 14px; font-weight: 500; color: #212121;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 350px;
    }
    .doc-meta {
      display: flex; gap: 12px; margin-top: 2px;
      font-size: 12px; color: #888; align-items: center;
    }
    .doc-type-badge {
      background: #e8eaf6; color: #3949ab; padding: 1px 8px;
      border-radius: 10px; font-weight: 500; font-size: 11px;
    }
    .doc-actions { display: flex; gap: 4px; flex-shrink: 0; }

    /* Viewer popup */
    .viewer-backdrop {
      position: fixed; inset: 0; background: rgba(0,0,0,0.65);
      z-index: 1000; display: flex; align-items: center; justify-content: center;
      padding: 16px; animation: fadeIn 0.15s ease;
    }
    .viewer-panel {
      background: #fff; border-radius: 12px; width: 90vw; max-width: 960px;
      height: 88vh; display: flex; flex-direction: column;
      box-shadow: 0 24px 80px rgba(0,0,0,0.4); overflow: hidden;
      animation: slideUp 0.2s ease;
    }
    .viewer-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 12px 10px 16px; border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5; flex-shrink: 0;
    }
    .viewer-title {
      display: flex; align-items: center; gap: 8px;
      font-weight: 500; font-size: 14px; color: #333;
      overflow: hidden;
      span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 500px; }
      mat-icon { color: #5c6bc0; flex-shrink: 0; }
    }
    .viewer-body {
      flex: 1; overflow: hidden; position: relative; background: #424242;
    }
    .viewer-loading {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; color: #fff;
    }
    .viewer-iframe {
      width: 100%; height: 100%; border: none; display: block;
    }
    .viewer-img {
      width: 100%; height: 100%; object-fit: contain; display: block;
    }
    /* Asset tab */
    .asset-row {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px; margin-bottom: 8px;
      background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px;
      transition: border-color 0.15s;
      &:hover { border-color: #6366f1; }
    }
    .asset-icon-box {
      width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;
      background: #dbeafe; display: flex; align-items: center; justify-content: center;
      mat-icon { color: #2563eb; font-size: 22px; width: 22px; height: 22px; }
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes slideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `]
})
export class EmployeeProfileComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private documentService = inject(DocumentService);
  private salaryService = inject(SalaryService);
  private assetService = inject(AssetService);
  private authService = inject(AuthService);
  private sanitizer = inject(DomSanitizer);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly employee = signal<Employee | null>(null);
  readonly canEdit = signal(false);

  readonly salaryHistory = signal<InternalSalary[]>([]);
  readonly salaryForm = this.fb.group({
    monthlySalary: [null as number | null, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['', Validators.required],
    notes: ['']
  });

  readonly employeeAssets = signal<AssetAssignment[]>([]);
  readonly returnedAssets = signal<AssetAssignment[]>([]);
  readonly assetsLoading = signal(false);

  readonly documents = signal<DocumentFile[]>([]);
  readonly docsLoading = signal(false);
  readonly uploading = signal(false);
  readonly uploadError = signal('');

  // Viewer state
  readonly viewerOpen = signal(false);
  readonly viewerLoading = signal(false);
  readonly viewerRawUrl = signal('');
  readonly viewerMime = signal('');
  readonly viewerName = signal('');
  viewerSafeUrl = signal<SafeResourceUrl>('');

  selectedDocType: DocumentType | null = null;

  readonly docTypes: DocumentType[] = ['ID_CARD', 'PASSPORT', 'RESUME', 'DEGREE', 'CERTIFICATE', 'CONTRACT', 'OTHER'];
  readonly docTypeLabels = DOCUMENT_TYPE_LABELS;

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    const obs = id === 'me' || !id
      ? this.employeeService.getMyProfile()
      : this.employeeService.getById(id!);

    obs.subscribe({
      next: emp => {
        this.employee.set(emp);
        this.canEdit.set(this.authService.isAdminOrManager());
        this.loading.set(false);
        this.loadDocuments(emp.publicId);
        this.loadEmployeeAssets(emp.publicId);
        if (this.authService.isAdminOrManager() && emp.sourceType === 'INTERNAL') {
          this.salaryService.getHistory(emp.publicId).subscribe(list => this.salaryHistory.set(list));
        }
      },
      error: () => this.loading.set(false)
    });
  }

  addSalary(publicId: string) {
    if (this.salaryForm.invalid) return;
    const val = this.salaryForm.getRawValue() as any;
    this.salaryService.setSalary(publicId, val).subscribe({
      next: () => {
        this.snackBar.open('Đã lưu lương', 'OK', { duration: 2000 });
        this.salaryForm.reset();
        this.salaryService.getHistory(publicId).subscribe(list => this.salaryHistory.set(list));
      },
      error: (e) => this.snackBar.open(e.error?.message || 'Lỗi', 'Close', { duration: 3000, panelClass: 'error-snack' })
    });
  }

  openAssignmentDialog(employeePublicId: string) {
    const emp = this.employee();
    this.dialog.open(AssignmentDialogComponent, {
      data: { employeePublicId, employeeName: emp?.fullName },
      width: '90vw', maxWidth: '1200px',
      panelClass: 'assignment-dialog-panel'
    });
  }

  loadEmployeeAssets(employeePublicId: string) {
    this.assetsLoading.set(true);
    this.assetService.getEmployeeAssets(employeePublicId).subscribe({
      next: assignments => {
        this.employeeAssets.set(assignments.filter(a => !a.returnedDate));
        this.returnedAssets.set(assignments.filter(a => a.returnedDate));
        this.assetsLoading.set(false);
      },
      error: () => this.assetsLoading.set(false)
    });
  }

  getAssetIcon(name: string): string {
    const n = name?.toLowerCase() || '';
    if (n.includes('laptop') || n.includes('macbook') || n.includes('thinkpad')) return 'laptop';
    if (n.includes('monitor') || n.includes('màn')) return 'desktop_windows';
    if (n.includes('phone') || n.includes('điện thoại')) return 'phone_android';
    if (n.includes('keyboard') || n.includes('bàn phím')) return 'keyboard';
    if (n.includes('mouse') || n.includes('chuột')) return 'mouse';
    if (n.includes('adapter') || n.includes('hub') || n.includes('cổng')) return 'usb';
    return 'devices';
  }

  resetEmployeePassword(emp: any) {
    if (confirm(`Reset mật khẩu của "${emp.fullName}" về Admin@123?\n\nNhân viên sẽ phải đổi mật khẩu khi đăng nhập lần tiếp.`)) {
      this.employeeService.resetPassword(emp.publicId).subscribe({
        next: () => this.snackBar.open('Đã reset mật khẩu về Admin@123. Nhân viên cần đổi MK khi login.', 'OK', { duration: 4000 }),
        error: (err: any) => this.snackBar.open(err?.error?.message || 'Lỗi khi reset mật khẩu', 'Đóng', { duration: 4000 })
      });
    }
  }

  openReturnFromProfile(assignment: AssetAssignment) {
    // Build a minimal Asset object for the dialog
    const asset = { id: assignment.assetId, assetCode: assignment.assetCode, name: assignment.assetName } as Asset;
    const dialogRef = this.dialog.open(AssetReturnDialogComponent, {
      data: { asset, assignment },
      width: '480px'
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const emp = this.employee();
        if (emp) this.loadEmployeeAssets(emp.publicId);
        this.snackBar.open('Đã thu hồi thiết bị', 'OK', { duration: 3000 });
      }
    });
  }

  loadDocuments(employeePublicId: string) {
    this.docsLoading.set(true);
    this.documentService.list(employeePublicId).subscribe({
      next: docs => { this.documents.set(docs); this.docsLoading.set(false); },
      error: () => this.docsLoading.set(false)
    });
  }

  onFileSelected(event: Event, employeePublicId: string) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file || !this.selectedDocType) return;

    this.uploading.set(true);
    this.uploadError.set('');

    this.documentService.upload(employeePublicId, file, this.selectedDocType).subscribe({
      next: doc => {
        this.documents.update(list => [doc, ...list]);
        this.uploading.set(false);
        input.value = '';
      },
      error: (err) => {
        this.uploadError.set(err?.error?.message || 'Tải lên thất bại. Vui lòng thử lại.');
        this.uploading.set(false);
        input.value = '';
      }
    });
  }

  download(employeePublicId: string, doc: DocumentFile) {
    this.documentService.getDownloadUrl(employeePublicId, doc.id).subscribe({
      next: url => window.open(url, '_blank'),
      error: () => alert('Không thể lấy link tải xuống.')
    });
  }

  deleteDoc(employeePublicId: string, docId: number) {
    if (!confirm('Xoá tài liệu này?')) return;
    this.documentService.delete(employeePublicId, docId).subscribe({
      next: () => this.documents.update(list => list.filter(d => d.id !== docId)),
      error: () => alert('Xoá thất bại.')
    });
  }

  isViewable(mimeType: string): boolean {
    return mimeType?.includes('pdf') || mimeType?.includes('image/');
  }

  viewDoc(employeePublicId: string, doc: DocumentFile) {
    this.viewerOpen.set(true);
    this.viewerLoading.set(true);
    this.viewerMime.set(doc.mimeType);
    this.viewerName.set(doc.fileName);
    this.viewerRawUrl.set('');
    this.viewerSafeUrl.set('');

    this.documentService.getDownloadUrl(employeePublicId, doc.id).subscribe({
      next: url => {
        this.viewerRawUrl.set(url);
        if (doc.mimeType.includes('pdf')) {
          this.viewerSafeUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        }
        this.viewerLoading.set(false);
      },
      error: () => {
        this.viewerLoading.set(false);
        this.closeViewer();
        alert('Không thể tải file xem trước.');
      }
    });
  }

  closeViewer() {
    this.viewerOpen.set(false);
    this.viewerRawUrl.set('');
    this.viewerSafeUrl.set('');
  }

  getMimeIcon(mimeType: string): string {
    if (mimeType?.includes('pdf')) return 'picture_as_pdf';
    if (mimeType?.includes('image')) return 'image';
    if (mimeType?.includes('word') || mimeType?.includes('document')) return 'description';
    if (mimeType?.includes('excel') || mimeType?.includes('sheet')) return 'table_chart';
    return 'insert_drive_file';
  }

  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
