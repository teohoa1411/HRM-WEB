import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { AssetService } from '../../../core/services/asset.service';
import { AssetCategory } from '../../../core/models/asset.models';

@Component({
  selector: 'app-asset-category-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatCheckboxModule, MatIconModule
  ],
  template: `
    <div mat-dialog-title style="font-weight:700;">
      <mat-icon style="margin-right:8px;">category</mat-icon>
      {{ isEdit() ? 'Chỉnh sửa loại tài sản' : 'Thêm loại tài sản mới' }}
    </div>

    <mat-dialog-content style="padding:20px;">
      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Mã loại *</mat-label>
          <input matInput formControlName="code" placeholder="VD: LAPTOP">
          <mat-icon matPrefix>code</mat-icon>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Tên loại *</mat-label>
          <input matInput formControlName="name" placeholder="VD: Máy tính xách tay">
          <mat-icon matPrefix>label</mat-icon>
          <mat-error>Bắt buộc</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Mô tả</mat-label>
          <textarea matInput formControlName="description" rows="3"
            placeholder="Mô tả chi tiết về loại tài sản..."></textarea>
        </mat-form-field>

        <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <mat-checkbox formControlName="active"></mat-checkbox>
          <span style="font-weight:500; color:#1e293b;">Hoạt động</span>
        </label>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px 20px;">
      <button mat-button (click)="dialogRef.close()">Hủy</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!form.valid || submitting()">
        {{ submitting() ? 'Đang xử lý...' : (isEdit() ? 'Cập nhật' : 'Tạo') }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
    }
  `]
})
export class AssetCategoryDialogComponent implements OnInit {
  readonly fb = inject(FormBuilder);
  readonly assetService = inject(AssetService);
  readonly dialogRef = inject(MatDialogRef<AssetCategoryDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as { category?: AssetCategory } | undefined;

  readonly isEdit = signal(false);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
    active: [true]
  });

  ngOnInit() {
    if (this.data?.category) {
      this.isEdit.set(true);
      this.form.patchValue({
        code: this.data.category.code,
        name: this.data.category.name,
        description: this.data.category.description || '',
        active: this.data.category.active
      });
    }
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      code: raw.code!,
      name: raw.name!,
      description: raw.description || undefined,
      active: raw.active ?? true
    };

    const obs = this.isEdit()
      ? this.assetService.updateCategory(this.data!.category!.id, payload)
      : this.assetService.createCategory(payload);

    obs.subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.submitting.set(false);
      }
    });
  }
}
