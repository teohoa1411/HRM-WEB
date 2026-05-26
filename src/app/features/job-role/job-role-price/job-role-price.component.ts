import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { JobRoleService } from '../../../core/services/job-role.service';
import { JobRole, JobRolePrice } from '../../../core/models/job-role.models';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-job-role-price',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule,
    MatCardModule, MatTableModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatDatepickerModule, MatNativeDateModule,
    MoneyDirective],
  template: `
    <div class="page-container" style="max-width:900px;">
      <div class="card-header">
        <div>
          <h2 style="margin:0;">{{ jobRole()?.name ?? 'Job Role' }} — Pricing</h2>
          <p style="margin:4px 0 0; color:#666;">Manage cost and sell prices for this role</p>
        </div>
        <button mat-stroked-button routerLink="/job-roles"><mat-icon>arrow_back</mat-icon> Back</button>
      </div>

      <!-- Set New Price -->
      <mat-card style="margin-bottom:16px;">
        <mat-card-header><mat-card-title>Set New Price</mat-card-title></mat-card-header>
        <mat-card-content style="padding:16px;">
          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            <div class="form-row">
              <mat-form-field appearance="outline">
                <mat-label>Cost Price (VND/month) *</mat-label>
                <input matInput type="text" inputmode="numeric" formControlName="costPrice" appMoney>
                <mat-hint>Amount you pay to vendor</mat-hint>
                <mat-error>Required, must be positive</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Sell Price (VND/month) *</mat-label>
                <input matInput type="text" inputmode="numeric" formControlName="sellPrice" appMoney>
                <mat-hint>Amount you charge client</mat-hint>
                <mat-error>Required, must be positive</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Effective From *</mat-label>
                <input matInput [matDatepicker]="dp" formControlName="effectiveFrom">
                <mat-datepicker-toggle matSuffix [for]="dp"></mat-datepicker-toggle>
                <mat-datepicker #dp></mat-datepicker>
                <mat-error>Required</mat-error>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Notes</mat-label>
                <input matInput formControlName="notes" placeholder="Reason for price change">
              </mat-form-field>
            </div>

            <!-- Margin Preview -->
            @if (form.get('costPrice')?.value && form.get('sellPrice')?.value) {
              <div style="margin:8px 0; padding:12px; background:#f9fbe7; border-radius:8px; border-left:3px solid #cddc39;">
                <strong>Margin: </strong>
                {{ ((+(form.get('sellPrice')?.value ?? 0) - +(form.get('costPrice')?.value ?? 0)) | number:'1.0-0') }} VND/month
                ({{ (((+(form.get('sellPrice')?.value ?? 0) / +(form.get('costPrice')?.value ?? 1)) - 1) * 100 | number:'1.1-1') }}%)
              </div>
            }

            <div style="margin-top:12px; text-align:right;">
              <button mat-raised-button color="primary" type="submit" [disabled]="submitting()">
                {{ submitting() ? 'Saving...' : 'Set Price' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>

      <!-- Price History -->
      <mat-card>
        <mat-card-header><mat-card-title>Price History</mat-card-title></mat-card-header>
        <mat-card-content style="padding:0;">
          <table mat-table [dataSource]="priceHistory()">
            <ng-container matColumnDef="effectiveFrom">
              <th mat-header-cell *matHeaderCellDef>From</th>
              <td mat-cell *matCellDef="let p">{{ p.effectiveFrom | date:'dd/MM/yyyy' }}</td>
            </ng-container>
            <ng-container matColumnDef="effectiveTo">
              <th mat-header-cell *matHeaderCellDef>To</th>
              <td mat-cell *matCellDef="let p">
                @if (!p.effectiveTo) { <span style="color:#2e7d32; font-weight:500;">Current</span> }
                @else { {{ p.effectiveTo | date:'dd/MM/yyyy' }} }
              </td>
            </ng-container>
            <ng-container matColumnDef="costPrice">
              <th mat-header-cell *matHeaderCellDef>Cost Price</th>
              <td mat-cell *matCellDef="let p" style="font-weight:500; color:#c62828;">
                {{ p.costPrice | number:'1.0-0' }} {{ p.currency }}
              </td>
            </ng-container>
            <ng-container matColumnDef="sellPrice">
              <th mat-header-cell *matHeaderCellDef>Sell Price</th>
              <td mat-cell *matCellDef="let p" style="font-weight:500; color:#2e7d32;">
                {{ p.sellPrice | number:'1.0-0' }} {{ p.currency }}
              </td>
            </ng-container>
            <ng-container matColumnDef="margin">
              <th mat-header-cell *matHeaderCellDef>Margin</th>
              <td mat-cell *matCellDef="let p">
                {{ ((p.sellPrice - p.costPrice) | number:'1.0-0') }} VND
              </td>
            </ng-container>
            <ng-container matColumnDef="notes">
              <th mat-header-cell *matHeaderCellDef>Notes</th>
              <td mat-cell *matCellDef="let p">{{ p.notes || '—' }}</td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="priceColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: priceColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class JobRolePriceComponent implements OnInit {
  private fb = inject(FormBuilder);
  private jobRoleService = inject(JobRoleService);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  readonly priceColumns = ['effectiveFrom', 'effectiveTo', 'costPrice', 'sellPrice', 'margin', 'notes'];
  readonly jobRole = signal<JobRole | null>(null);
  readonly priceHistory = signal<JobRolePrice[]>([]);
  readonly submitting = signal(false);

  readonly form = this.fb.group({
    costPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    sellPrice: [null as number | null, [Validators.required, Validators.min(0)]],
    effectiveFrom: ['', Validators.required],
    notes: ['']
  });

  private jobRoleId = 0;

  ngOnInit() {
    this.jobRoleId = +this.route.snapshot.paramMap.get('id')!;
    this.jobRoleService.getById(this.jobRoleId).subscribe(jr => this.jobRole.set(jr));
    this.loadHistory();
  }

  loadHistory() {
    this.jobRoleService.getPriceHistory(this.jobRoleId).subscribe(h => this.priceHistory.set(h));
  }

  onSubmit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.submitting.set(true);
    const val = this.form.getRawValue() as any;
    this.jobRoleService.setPrice(this.jobRoleId, val).subscribe({
      next: () => {
        this.snackBar.open('Price updated', 'OK', { duration: 3000 });
        this.form.reset();
        this.loadHistory();
        this.submitting.set(false);
      },
      error: (err) => {
        this.submitting.set(false);
        this.snackBar.open(err?.error?.message ?? 'Failed', 'Close', { duration: 4000, panelClass: 'error-snack' });
      }
    });
  }
}
