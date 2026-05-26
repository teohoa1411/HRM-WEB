import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { AssetService } from '../../../core/services/asset.service';
import { Asset, AssetAssignment, AssetCondition } from '../../../core/models/asset.models';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';

@Component({
  selector: 'app-asset-return-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDatepickerModule, MatIconModule
  ],
  providers: [
    { provide: DateAdapter, useClass: ViDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VI_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
    <div mat-dialog-title style="color:#f97316; font-weight:700;">
      <mat-icon style="margin-right:8px;">assignment_return</mat-icon>
      Thu h\u1ED3i thi\u1EBFt b\u1ECB
    </div>

    <mat-dialog-content style="padding:20px;">
      <div style="margin-bottom:16px; padding:12px 16px; background:#fff9f0; border-radius:10px; border-left:3px solid #f97316;">
        <div style="font-size:12px; color:#64748b; font-weight:600;">THI\u1EBET B\u1ECA</div>
        <div style="font-size:15px; font-weight:700; color:#1e293b; margin-top:4px;">{{ data.asset.name }}</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">{{ data.asset.assetCode }}</div>
      </div>

      <div style="margin-bottom:16px; padding:12px 16px; background:#eff6ff; border-radius:10px;">
        <div style="font-size:12px; color:#64748b; font-weight:600;">NG\u01AF\u1EDCI \u0110ANG GI\u1EEE</div>
        <div style="font-size:15px; font-weight:700; color:#1e293b; margin-top:4px;">{{ data.assignment.employeeName }}</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">Nh\u1EADn t\u1EEB: {{ data.assignment.assignedDate }}</div>
      </div>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Ng\u00E0y thu h\u1ED3i *</mat-label>
          <input matInput [matDatepicker]="returnPicker" formControlName="returnedDate" placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="returnPicker"></mat-datepicker-toggle>
          <mat-datepicker #returnPicker></mat-datepicker>
          <mat-error>B\u1EAFt bu\u1ED9c</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>T\u00ECnh tr\u1EA1ng thu h\u1ED3i *</mat-label>
          <mat-select formControlName="conditionOnReturn">
            <mat-option value="NEW">M\u1EDBi</mat-option>
            <mat-option value="GOOD">T\u1ED1t</mat-option>
            <mat-option value="FAIR">B\u00ECnh th\u01B0\u1EDDng</mat-option>
            <mat-option value="POOR">K\u00E9m</mat-option>
          </mat-select>
          <mat-error>B\u1EAFt bu\u1ED9c</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ghi ch\u00FA</mat-label>
          <textarea matInput formControlName="notes" rows="3" placeholder="T\u00ECnh tr\u1EA1ng l\u00FAc thu h\u1ED3i..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px 20px;">
      <button mat-button (click)="dialogRef.close()">H\u1EE7y</button>
      <button mat-raised-button color="accent" (click)="onSubmit()" [disabled]="!form.valid || submitting()">
        {{ submitting() ? '\u0110ang x\u1EED l\u00FD...' : 'Thu h\u1ED3i' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class AssetReturnDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private assetService = inject(AssetService);
  readonly dialogRef = inject(MatDialogRef<AssetReturnDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as { asset: Asset; assignment: AssetAssignment };

  readonly submitting = signal(false);

  readonly form = this.fb.group({
    returnedDate: [null as Date | null, Validators.required],
    conditionOnReturn: ['GOOD', Validators.required],
    notes: ['']
  });

  ngOnInit() {
    this.form.patchValue({ returnedDate: new Date() });
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      returnedDate: this.fmtDate(raw.returnedDate as Date),
      conditionOnReturn: raw.conditionOnReturn as AssetCondition,
      notes: raw.notes || undefined
    };

    this.assetService.returnAsset(this.data.asset.id, payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.submitting.set(false)
    });
  }

  private fmtDate(d: Date | null): string {
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}
