import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { debounceTime, distinctUntilChanged, startWith, switchMap, finalize } from 'rxjs/operators';
import { map, Observable, of } from 'rxjs';
import { AssetService } from '../../../core/services/asset.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Asset, AssetCondition } from '../../../core/models/asset.models';
import { Employee } from '../../../core/models/employee.models';
import { ViDateAdapter, VI_DATE_FORMATS } from '../../../shared/adapters/vi-date.adapter';
import { MoneyDirective } from '../../../shared/directives/money.directive';

@Component({
  selector: 'app-asset-assign-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatDatepickerModule, MatAutocompleteModule, MatIconModule, MatProgressSpinnerModule,
    MoneyDirective
  ],
  providers: [
    { provide: DateAdapter, useClass: ViDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: VI_DATE_FORMATS },
    { provide: MAT_DATE_LOCALE, useValue: 'vi-VN' }
  ],
  template: `
    <div mat-dialog-title style="color:#3b82f6; font-weight:700;">
      <mat-icon style="margin-right:8px;">person_add</mat-icon>
      C\u1EA5p ph\u00E1t thi\u1EBFt b\u1ECB
    </div>

    <mat-dialog-content style="padding:20px;">
      <div style="margin-bottom:16px; padding:12px 16px; background:#eff6ff; border-radius:10px; border-left:3px solid #3b82f6;">
        <div style="font-size:12px; color:#64748b; font-weight:600;">THI\u1EBET B\u1ECA</div>
        <div style="font-size:15px; font-weight:700; color:#1e293b; margin-top:4px;">{{ data.asset.name }}</div>
        <div style="font-size:12px; color:#94a3b8; margin-top:2px;">{{ data.asset.assetCode }}</div>
      </div>

      <form [formGroup]="form">
        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Nh\u00E2n vi\u00EAn *</mat-label>
          <input matInput formControlName="employeeSearch"
            [matAutocomplete]="employeeAuto"
            placeholder="T\u00ECm theo t\u00EAn ho\u1EB7c m\u00E3...">
          <mat-autocomplete #employeeAuto="matAutocomplete"
            (optionSelected)="onEmployeeSelected($event)">
            @for (emp of filteredEmployees(); track emp.id) {
              <mat-option [value]="emp.fullName" [id]="'emp-' + emp.id">
                <strong>{{ emp.fullName }}</strong>
                <span style="color:#94a3b8; font-size:12px; margin-left:8px;">{{ emp.employeeCode }}</span>
                @if (emp.sourceType === 'VENDOR') {
                  <span style="background:#fef3c7; color:#92400e; padding:1px 6px; border-radius:8px; font-size:10px; font-weight:600; margin-left:6px;">VENDOR</span>
                }
              </mat-option>
            }
          </mat-autocomplete>
          <mat-error>B\u1EAFt bu\u1ED9c</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>Ng\u00E0y c\u1EA5p ph\u00E1t *</mat-label>
          <input matInput [matDatepicker]="assignedDatePicker" formControlName="assignedDate"
            placeholder="DD/MM/YYYY">
          <mat-datepicker-toggle matSuffix [for]="assignedDatePicker"></mat-datepicker-toggle>
          <mat-datepicker #assignedDatePicker></mat-datepicker>
          <mat-error>B\u1EAFt bu\u1ED9c</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
          <mat-label>T\u00ECnh tr\u1EA1ng c\u1EA5p ph\u00E1t *</mat-label>
          <mat-select formControlName="conditionOnAssign">
            <mat-option value="NEW">M\u1EDBi</mat-option>
            <mat-option value="GOOD">T\u1ED1t</mat-option>
            <mat-option value="FAIR">B\u00ECnh th\u01B0\u1EDDng</mat-option>
            <mat-option value="POOR">K\u00E9m</mat-option>
          </mat-select>
          <mat-error>B\u1EAFt bu\u1ED9c</mat-error>
        </mat-form-field>

        @if (isVendorEmployee()) {
          <div style="margin-bottom:16px; padding:12px 16px; background:#fffbeb; border-radius:10px; border-left:3px solid #f59e0b;">
            <div style="font-size:12px; color:#92400e; font-weight:600;">NH\u00C2N S\u1EF0 VENDOR</div>
            <div style="font-size:11px; color:#b45309; margin-top:2px;">Nh\u00E2n s\u1EF1 t\u1EEB vendor \u2014 c\u00F3 th\u1EC3 nh\u1EADp ph\u00ED thu\u00EA thi\u1EBFt b\u1ECB</div>
          </div>
          <mat-form-field appearance="outline" class="full-width" style="margin-bottom:16px;">
            <mat-label>Ti\u1EC1n thu\u00EA thi\u1EBFt b\u1ECB / th\u00E1ng (VN\u0110)</mat-label>
            <input matInput formControlName="monthlyRentalPrice" type="text" inputmode="numeric" appMoney placeholder="VD: 500,000">
            <span matSuffix style="padding-right:12px; color:#94a3b8;">VN\u0110</span>
            <mat-hint>T\u1EF1 \u0111\u1ED9ng format d\u1EA5u ph\u1EA9y ph\u00E2n t\u00E1ch ngh\u00ECn</mat-hint>
          </mat-form-field>
        }

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Ghi ch\u00FA</mat-label>
          <textarea matInput formControlName="notes" rows="3"
            placeholder="Ghi ch\u00FA b\u1ED5 sung..."></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" style="padding:16px 20px;">
      <button mat-button (click)="dialogRef.close()">H\u1EE7y</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!form.valid || !selectedEmployeeId || submitting()">
        {{ submitting() ? '\u0110ang x\u1EED l\u00FD...' : 'C\u1EA5p ph\u00E1t' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; }`]
})
export class AssetAssignDialogComponent implements OnInit {
  private fb = inject(FormBuilder);
  private assetService = inject(AssetService);
  private employeeService = inject(EmployeeService);
  readonly dialogRef = inject(MatDialogRef<AssetAssignDialogComponent>);
  readonly data = inject(MAT_DIALOG_DATA) as { asset: Asset };

  readonly submitting = signal(false);
  readonly filteredEmployees = signal<Employee[]>([]);
  readonly isVendorEmployee = signal(false);
  selectedEmployeeId: number | null = null;

  readonly form = this.fb.group({
    employeeSearch: ['', Validators.required],
    assignedDate: [null as Date | null, Validators.required],
    conditionOnAssign: ['GOOD', Validators.required],
    monthlyRentalPrice: [null as number | null],
    notes: ['']
  });

  ngOnInit() {
    this.form.patchValue({ assignedDate: new Date() });
    this.form.get('employeeSearch')!.valueChanges.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => {
      if (!term || term.length < 2) { this.filteredEmployees.set([]); return; }
      this.employeeService.search(term).subscribe(result => {
        this.filteredEmployees.set(result as Employee[]);
      });
    });
  }

  onEmployeeSelected(event: any) {
    const el = event.option._getHostElement() as HTMLElement;
    const idAttr = el.getAttribute('id') ?? '';
    const empId = parseInt(idAttr.replace('emp-', ''), 10);
    if (!isNaN(empId)) {
      this.selectedEmployeeId = empId;
      // Detect if selected employee is from vendor
      const emp = this.filteredEmployees().find(e => e.id === empId);
      this.isVendorEmployee.set(emp?.sourceType === 'VENDOR');
    }
  }

  onSubmit() {
    if (this.form.invalid || !this.selectedEmployeeId) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const payload = {
      employeeId: this.selectedEmployeeId,
      assignedDate: this.formatDate(raw.assignedDate as Date),
      conditionOnAssign: raw.conditionOnAssign as AssetCondition,
      monthlyRentalPrice: raw.monthlyRentalPrice || undefined,
      notes: raw.notes || undefined
    };

    this.assetService.assign(this.data.asset.id, payload).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.submitting.set(false)
    });
  }

  private formatDate(date: Date | null): string {
    if (!date) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}
