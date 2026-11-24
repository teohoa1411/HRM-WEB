import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { JobRoleService } from '../../../core/services/job-role.service';
import { JobRole, JobRoleCategory, SeniorityLevel } from '../../../core/models/job-role.models';
import { AuthService } from '../../../core/auth/auth.service';

interface JobRoleForm {
  code: string;
  name: string;
  category: JobRoleCategory | '';
  seniorityLevel: SeniorityLevel;
  description: string;
  skillsRequired: string;
}

@Component({
  selector: 'app-job-role-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule, MatChipsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <!-- Header -->
      <div class="page-header">
        <div>
          <div class="page-title">Job Roles</div>
          <div class="page-subtitle">{{ jobRoles().length }} vị trí công việc</div>
        </div>
        @if (isAdmin()) {
          <button mat-raised-button color="primary" (click)="openCreateModal()">
            <mat-icon>add</mat-icon> Thêm Job Role
          </button>
        }
      </div>

      <!-- Category filter chips -->
      <div style="margin-bottom:16px; display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
        <button mat-stroked-button
          [color]="selectedCategory() === '' ? 'primary' : undefined"
          (click)="selectedCategory.set('')">
          Tất cả
        </button>
        @for (cat of categories; track cat) {
          <button mat-stroked-button
            [color]="selectedCategory() === cat ? 'primary' : undefined"
            (click)="selectedCategory.set(selectedCategory() === cat ? '' : cat)">
            <span class="cat-dot" [style.background]="categoryColor(cat)"></span>
            {{ cat }}
          </button>
        }
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div style="display:flex; justify-content:center; padding:48px;">
          <mat-spinner diameter="40"></mat-spinner>
        </div>
      }

      <!-- Grid -->
      @if (!loading()) {
        <div class="role-grid">
          @for (jr of filteredRoles(); track jr.id) {
            <mat-card class="role-card" [class.inactive-card]="!jr.active">
              <mat-card-content style="padding:20px;">
                <div class="flex-row gap-12" style="align-items:flex-start;">
                  <div class="role-icon" [style.background]="categoryColor(jr.category)">
                    <mat-icon>work</mat-icon>
                  </div>
                  <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; font-size:15px; display:flex; align-items:center; gap:6px;">
                      {{ jr.name }}
                      @if (!jr.active) {
                        <span style="font-size:11px; background:#f5f5f5; color:#999; padding:1px 6px; border-radius:8px; font-weight:400;">Inactive</span>
                      }
                    </div>
                    <code style="font-size:11px; color:#888;">{{ jr.code }}</code>
                    <div style="margin-top:6px; display:flex; gap:6px; flex-wrap:wrap;">
                      <span class="tag tag-blue">{{ jr.category }}</span>
                      <span class="tag tag-pink">{{ jr.seniorityLevel }}</span>
                    </div>
                  </div>

                  <!-- Admin action menu -->
                  @if (isAdmin()) {
                    <div style="display:flex; flex-direction:column; gap:4px; flex-shrink:0;">
                      <button mat-icon-button matTooltip="Chỉnh sửa" (click)="openEditModal(jr)">
                        <mat-icon style="font-size:18px;">edit</mat-icon>
                      </button>
                      <button mat-icon-button
                        [matTooltip]="jr.active ? 'Vô hiệu hóa' : 'Kích hoạt'"
                        (click)="onToggleActive(jr)">
                        <mat-icon style="font-size:18px;" [style.color]="jr.active ? '#f57c00' : '#4caf50'">
                          {{ jr.active ? 'toggle_on' : 'toggle_off' }}
                        </mat-icon>
                      </button>
                      <button mat-icon-button matTooltip="Xóa" (click)="confirmDelete(jr)">
                        <mat-icon style="font-size:18px; color:#e53935;">delete</mat-icon>
                      </button>
                    </div>
                  }
                </div>

                @if (jr.description) {
                  <p style="margin:12px 0 0; font-size:13px; color:#666; line-height:1.5;">{{ jr.description }}</p>
                }

                @if (jr.skillsRequired) {
                  <div style="margin-top:10px;">
                    <div style="font-size:11px; color:#aaa; margin-bottom:4px; text-transform:uppercase; letter-spacing:0.5px;">Skills</div>
                    <div style="font-size:12px; color:#555;">{{ jr.skillsRequired }}</div>
                  </div>
                }

                @if (isAdmin()) {
                  <div style="margin-top:16px; padding-top:12px; border-top:1px solid #f0f0f0;">
                    <button mat-stroked-button color="primary" [routerLink]="[jr.id, 'prices']" style="width:100%;">
                      <mat-icon>attach_money</mat-icon> Quản lý Giá
                    </button>
                  </div>
                }
              </mat-card-content>
            </mat-card>
          }

          @if (filteredRoles().length === 0 && !loading()) {
            <div style="grid-column:1/-1; text-align:center; padding:48px; color:#aaa;">
              <mat-icon style="font-size:48px; height:48px; width:48px; color:#ddd;">work_off</mat-icon>
              <div style="margin-top:8px;">Chưa có job role nào</div>
            </div>
          }
        </div>
      }
    </div>

    <!-- ══════════════════════════════════════════════ -->
    <!-- CREATE / EDIT MODAL                            -->
    <!-- ══════════════════════════════════════════════ -->
    @if (showModal()) {
      <div class="modal-overlay" (click)="closeModal()">
        <div class="modal-panel" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>{{ editingId() ? 'Chỉnh sửa Job Role' : 'Thêm Job Role mới' }}</h3>
            <button mat-icon-button (click)="closeModal()"><mat-icon>close</mat-icon></button>
          </div>

          <div class="modal-body">
            <!-- Code -->
            @if (!editingId()) {
              <mat-form-field appearance="outline" style="width:100%;">
                <mat-label>Mã (Code) *</mat-label>
                <input matInput [(ngModel)]="form.code" placeholder="VD: DEV_SENIOR_FE"
                  style="text-transform:uppercase;">
                <mat-hint>Tự động viết hoa. Không thể thay đổi sau khi tạo.</mat-hint>
              </mat-form-field>
            }

            <!-- Name -->
            <mat-form-field appearance="outline" style="width:100%; margin-top:12px;">
              <mat-label>Tên Job Role *</mat-label>
              <input matInput [(ngModel)]="form.name" placeholder="VD: Senior Frontend Developer">
            </mat-form-field>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:12px;">
              <!-- Category -->
              <mat-form-field appearance="outline">
                <mat-label>Category *</mat-label>
                <mat-select [(ngModel)]="form.category">
                  @for (cat of categories; track cat) {
                    <mat-option [value]="cat">{{ cat }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              <!-- Seniority -->
              <mat-form-field appearance="outline">
                <mat-label>Seniority Level</mat-label>
                <mat-select [(ngModel)]="form.seniorityLevel">
                  @for (s of seniorityLevels; track s) {
                    <mat-option [value]="s">{{ s }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>
            </div>

            <!-- Description -->
            <mat-form-field appearance="outline" style="width:100%; margin-top:12px;">
              <mat-label>Mô tả</mat-label>
              <textarea matInput [(ngModel)]="form.description" rows="3"
                placeholder="Mô tả ngắn về vị trí này..."></textarea>
            </mat-form-field>

            <!-- Skills -->
            <mat-form-field appearance="outline" style="width:100%; margin-top:12px;">
              <mat-label>Skills yêu cầu</mat-label>
              <textarea matInput [(ngModel)]="form.skillsRequired" rows="2"
                placeholder="Angular, Java, SQL, ..."></textarea>
            </mat-form-field>

            @if (modalError()) {
              <div style="color:#e53935; font-size:13px; margin-top:8px; padding:8px; background:#fce4ec; border-radius:6px;">
                {{ modalError() }}
              </div>
            }
          </div>

          <div class="modal-footer">
            <button mat-stroked-button (click)="closeModal()">Hủy</button>
            <button mat-raised-button color="primary" (click)="saveJobRole()" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="18" style="margin-right:8px;"></mat-spinner> }
              {{ editingId() ? 'Lưu thay đổi' : 'Tạo Job Role' }}
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ══════════════════════════════════════════════ -->
    <!-- DELETE CONFIRM MODAL                           -->
    <!-- ══════════════════════════════════════════════ -->
    @if (deleteTarget()) {
      <div class="modal-overlay" (click)="deleteTarget.set(null)">
        <div class="modal-panel" style="max-width:420px;" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3 style="color:#e53935;">Xóa Job Role</h3>
            <button mat-icon-button (click)="deleteTarget.set(null)"><mat-icon>close</mat-icon></button>
          </div>
          <div class="modal-body">
            <p>Bạn có chắc muốn xóa job role <strong>{{ deleteTarget()!.name }}</strong> (<code>{{ deleteTarget()!.code }}</code>)?</p>
            <p style="color:#f57c00; font-size:13px;">⚠ Hành động này không thể hoàn tác.</p>
          </div>
          <div class="modal-footer">
            <button mat-stroked-button (click)="deleteTarget.set(null)">Hủy</button>
            <button mat-raised-button color="warn" (click)="doDelete()" [disabled]="saving()">
              @if (saving()) { <mat-spinner diameter="18" style="margin-right:8px;"></mat-spinner> }
              Xác nhận Xóa
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .role-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    .role-card {
      transition: box-shadow 0.2s;
      &:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.12) !important; }
    }
    .inactive-card { opacity: 0.65; }
    .role-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
      mat-icon { color: white; }
    }
    .cat-dot {
      display: inline-block; width: 8px; height: 8px; border-radius: 50%;
      margin-right: 4px; vertical-align: middle;
    }
    .tag {
      padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 500;
    }
    .tag-blue { background: #e8eaf6; color: #3949ab; }
    .tag-pink { background: #fce4ec; color: #c2185b; }

    /* Modal */
    .modal-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.45);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; padding: 24px;
    }
    .modal-panel {
      background: white; border-radius: 12px;
      width: 100%; max-width: 560px; max-height: 90vh;
      overflow-y: auto; box-shadow: 0 8px 32px rgba(0,0,0,0.2);
    }
    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 20px 20px 0;
      h3 { margin: 0; font-size: 18px; font-weight: 600; }
    }
    .modal-body { padding: 20px; }
    .modal-footer {
      display: flex; justify-content: flex-end; gap: 10px;
      padding: 0 20px 20px;
    }
  `]
})
export class JobRoleListComponent implements OnInit {
  private jobRoleService = inject(JobRoleService);
  readonly authService = inject(AuthService);

  readonly categories: JobRoleCategory[] = ['DEVELOPMENT', 'QA', 'DEVOPS', 'MANAGEMENT', 'DESIGN', 'OTHER'];
  readonly seniorityLevels: SeniorityLevel[] = ['INTERN', 'JUNIOR', 'MIDDLE', 'SENIOR', 'LEAD', 'PRINCIPAL'];

  readonly jobRoles = signal<JobRole[]>([]);
  readonly selectedCategory = signal<JobRoleCategory | ''>('');
  readonly loading = signal(false);
  readonly saving = signal(false);

  // Modal state
  readonly showModal = signal(false);
  readonly editingId = signal<number | null>(null);
  readonly modalError = signal('');
  readonly deleteTarget = signal<JobRole | null>(null);

  form: JobRoleForm = this.emptyForm();

  readonly isAdmin = computed(() => this.authService.isStrictAdmin());

  readonly filteredRoles = computed(() => {
    const cat = this.selectedCategory();
    return cat ? this.jobRoles().filter(r => r.category === cat) : this.jobRoles();
  });

  ngOnInit() {
    this.loadAll();
  }

  loadAll() {
    this.loading.set(true);
    this.jobRoleService.list({ size: 200 }).subscribe({
      next: page => { this.jobRoles.set(page.content); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  categoryColor(cat: string): string {
    const colors: Record<string, string> = {
      DEVELOPMENT: '#3f51b5', QA: '#e91e63', DEVOPS: '#ff9800',
      MANAGEMENT: '#4caf50', DESIGN: '#9c27b0', OTHER: '#607d8b'
    };
    return colors[cat] ?? '#607d8b';
  }

  // ── Modal helpers ──

  emptyForm(): JobRoleForm {
    return { code: '', name: '', category: '', seniorityLevel: 'MIDDLE', description: '', skillsRequired: '' };
  }

  openCreateModal() {
    this.form = this.emptyForm();
    this.editingId.set(null);
    this.modalError.set('');
    this.showModal.set(true);
  }

  openEditModal(jr: JobRole) {
    this.form = {
      code: jr.code,
      name: jr.name,
      category: jr.category,
      seniorityLevel: jr.seniorityLevel,
      description: jr.description ?? '',
      skillsRequired: jr.skillsRequired ?? ''
    };
    this.editingId.set(jr.id);
    this.modalError.set('');
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
    this.editingId.set(null);
    this.modalError.set('');
  }

  saveJobRole() {
    if (!this.form.name.trim()) { this.modalError.set('Tên job role không được trống'); return; }
    if (!this.form.category) { this.modalError.set('Vui lòng chọn Category'); return; }
    if (!this.editingId() && !this.form.code.trim()) { this.modalError.set('Mã (Code) không được trống'); return; }

    this.saving.set(true);
    this.modalError.set('');

    const payload: Partial<JobRole> = {
      name: this.form.name.trim(),
      category: this.form.category as JobRoleCategory,
      seniorityLevel: this.form.seniorityLevel,
      description: this.form.description.trim(),
      skillsRequired: this.form.skillsRequired.trim()
    };

    const id = this.editingId();
    const req = id
      ? this.jobRoleService.update(id, payload)
      : this.jobRoleService.create({ ...payload, code: this.form.code.toUpperCase().trim() });

    req.subscribe({
      next: saved => {
        if (id) {
          this.jobRoles.update(list => list.map(r => r.id === id ? { ...r, ...saved } : r));
        } else {
          this.jobRoles.update(list => [saved, ...list]);
        }
        this.saving.set(false);
        this.closeModal();
      },
      error: err => {
        this.modalError.set(err?.error?.message ?? 'Có lỗi xảy ra, vui lòng thử lại');
        this.saving.set(false);
      }
    });
  }

  onToggleActive(jr: JobRole) {
    this.jobRoleService.toggleActive(jr.id).subscribe({
      next: () => {
        this.jobRoles.update(list => list.map(r => r.id === jr.id ? { ...r, active: !r.active } : r));
      },
      error: err => alert(err?.error?.message ?? 'Lỗi khi cập nhật trạng thái')
    });
  }

  confirmDelete(jr: JobRole) {
    this.deleteTarget.set(jr);
  }

  doDelete() {
    const target = this.deleteTarget();
    if (!target) return;
    this.saving.set(true);
    this.jobRoleService.delete(target.id).subscribe({
      next: () => {
        this.jobRoles.update(list => list.filter(r => r.id !== target.id));
        this.deleteTarget.set(null);
        this.saving.set(false);
      },
      error: err => {
        alert(err?.error?.message ?? 'Không thể xóa. Job role có thể đang được sử dụng.');
        this.saving.set(false);
      }
    });
  }
}
