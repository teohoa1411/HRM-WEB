import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { VendorService } from '../../../core/services/vendor.service';

@Component({
  selector: 'app-vendor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <div class="page-title">{{ isEdit() ? 'Chỉnh sửa Vendor' : 'Thêm Vendor mới' }}</div>
          <div class="page-subtitle">{{ isEdit() ? 'Cập nhật thông tin nhà cung cấp' : 'Thêm nhà cung cấp nhân sự mới' }}</div>
        </div>
        <button mat-stroked-button (click)="goBack()"><mat-icon>arrow_back</mat-icon> Quay lại</button>
      </div>

      <form [formGroup]="form" (ngSubmit)="onSubmit()">
        <mat-card style="margin-bottom:16px;">
          <mat-card-header><mat-card-title>Vendor Details</mat-card-title></mat-card-header>
          <mat-card-content style="padding:16px;">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Vendor Code *</mat-label>
                <input matInput formControlName="code"><mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Vendor Name *</mat-label>
                <input matInput formControlName="name"><mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Vendor Type *</mat-label>
                <mat-select formControlName="vendorType">
                  <mat-option value="PERSONNEL">Personnel</mat-option>
                  <mat-option value="EQUIPMENT">Equipment</mat-option>
                  <mat-option value="BOTH">Both</mat-option>
                </mat-select><mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Contact Person</mat-label>
                <input matInput formControlName="contactPerson">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Contact Email</mat-label>
                <input matInput formControlName="contactEmail" type="email">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Contact Phone</mat-label>
                <input matInput formControlName="contactPhone">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tax Code</mat-label>
                <input matInput formControlName="taxCode">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Address</mat-label>
                <input matInput formControlName="address">
              </mat-form-field>
            </div>
            <mat-form-field appearance="outline" class="full-width" style="margin-top:8px;">
              <mat-label>Notes</mat-label>
              <textarea matInput formControlName="notes" rows="2"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        @if (!isEdit()) {
          <mat-card style="margin-bottom:16px;">
            <mat-card-header>
              <mat-card-title>Vendor Account</mat-card-title>
              <mat-card-subtitle>A VENDOR_USER account will be auto-created</mat-card-subtitle>
            </mat-card-header>
            <mat-card-content style="padding:16px;">
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Account Username *</mat-label>
                  <input matInput formControlName="accountUsername"><mat-error>Required</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Account Email *</mat-label>
                  <input matInput formControlName="accountEmail" type="email"><mat-error>Required</mat-error>
                </mat-form-field>
              </div>
            </mat-card-content>
          </mat-card>
        }

        <div class="flex-row gap-16" style="justify-content:flex-end;">
          <button mat-stroked-button type="button" (click)="goBack()">Cancel</button>
          <button mat-raised-button color="primary" type="submit" [disabled]="submitting()">
            {{ submitting() ? 'Saving...' : (isEdit() ? 'Save' : 'Create Vendor') }}
          </button>
        </div>
      </form>
    </div>
  `
})
export class VendorFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vendorService = inject(VendorService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly isEdit = signal(false);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    vendorType: ['PERSONNEL', Validators.required],
    contactPerson: [''],
    contactEmail: [''],
    contactPhone: [''],
    taxCode: [''],
    address: [''],
    notes: [''],
    accountUsername: [''],
    accountEmail: ['']
  });

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.vendorService.getById(+id).subscribe(v => this.form.patchValue(v as any));
    } else {
      this.form.get('accountUsername')?.setValidators(Validators.required);
      this.form.get('accountEmail')?.setValidators([Validators.required, Validators.email]);
    }
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const id = this.route.snapshot.paramMap.get('id');
    const val = this.form.getRawValue() as any;
    const obs = id ? this.vendorService.update(+id, val) : this.vendorService.create(val);

    obs.subscribe({
      next: () => {
        this.snackBar.open(id ? 'Vendor updated' : 'Vendor created', 'OK', { duration: 3000 });
        this.router.navigate(['/vendors']);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Failed', 'Close', { duration: 4000, panelClass: 'error-snack' });
      }
    });
  }

  goBack() { this.router.navigate(['/vendors']); }
}
