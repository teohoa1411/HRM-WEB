import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';

// ==================== INTERFACES ====================

export interface InsuranceConfig {
  id: number;
  insuranceType: 'BHXH' | 'BHYT' | 'BHTN';
  employeeRate: number;
  employerRate: number;
  minSalary: number;
  maxSalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

export interface InsurancePolicy {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  insuranceSalary: number;
  socialInsuranceNumber: string;
  startDate: string;
  endDate: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  notes: string;
  createdAt: string;
}

export interface InsuranceDeclaration {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  declarationType: 'INCREASE' | 'DECREASE' | 'ADJUSTMENT';
  effectiveMonth: string;
  deadline: string;
  status: 'PENDING' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  oldSalary: number | null;
  newSalary: number | null;
  reason: string;
  createdAt: string;
}

export interface InsuranceCalculation {
  insuranceSalary: number;
  employeeAmount: number;
  employerAmount: number;
}

// ==================== SERVICE ====================

@Injectable({ providedIn: 'root' })
export class InsuranceService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/insurance`;

  // ── Config ──
  getConfigs(): Observable<InsuranceConfig[]> {
    return this.http.get<any>(`${this.api}/config`).pipe(map(r => r.data));
  }

  getActiveConfigs(): Observable<InsuranceConfig[]> {
    return this.http.get<any>(`${this.api}/config/active`).pipe(map(r => r.data));
  }

  createConfig(data: Partial<InsuranceConfig>): Observable<InsuranceConfig> {
    return this.http.post<any>(`${this.api}/config`, data).pipe(map(r => r.data));
  }

  updateConfig(id: number, data: Partial<InsuranceConfig>): Observable<InsuranceConfig> {
    return this.http.put<any>(`${this.api}/config/${id}`, data).pipe(map(r => r.data));
  }

  seedDefaultConfig(): Observable<string> {
    return this.http.post<any>(`${this.api}/config/seed`, {}).pipe(map(r => r.data));
  }

  // ── Policy ──
  getPolicies(): Observable<InsurancePolicy[]> {
    return this.http.get<any>(`${this.api}/policies`).pipe(map(r => r.data));
  }

  getActivePolicies(): Observable<InsurancePolicy[]> {
    return this.http.get<any>(`${this.api}/policies/active`).pipe(map(r => r.data));
  }

  getByEmployee(employeeId: number): Observable<InsurancePolicy[]> {
    return this.http.get<any>(`${this.api}/policies/employee/${employeeId}`).pipe(map(r => r.data));
  }

  createPolicy(data: any): Observable<InsurancePolicy> {
    return this.http.post<any>(`${this.api}/policies`, data).pipe(map(r => r.data));
  }

  updatePolicy(id: number, data: any): Observable<InsurancePolicy> {
    return this.http.put<any>(`${this.api}/policies/${id}`, data).pipe(map(r => r.data));
  }

  // ── Calculate ──
  calculate(employeeId: number): Observable<InsuranceCalculation> {
    return this.http.get<any>(`${this.api}/calculate/${employeeId}`).pipe(map(r => r.data));
  }

  // ── Declarations ──
  getDeclarations(): Observable<InsuranceDeclaration[]> {
    return this.http.get<any>(`${this.api}/declarations`).pipe(map(r => r.data));
  }

  getByMonth(month: string): Observable<InsuranceDeclaration[]> {
    return this.http.get<any>(`${this.api}/declarations/month/${month}`).pipe(map(r => r.data));
  }

  getPending(): Observable<InsuranceDeclaration[]> {
    return this.http.get<any>(`${this.api}/declarations/pending`).pipe(map(r => r.data));
  }

  getUpcoming(days: number = 15): Observable<InsuranceDeclaration[]> {
    return this.http.get<any>(`${this.api}/declarations/upcoming?days=${days}`).pipe(map(r => r.data));
  }

  getOverdue(): Observable<InsuranceDeclaration[]> {
    return this.http.get<any>(`${this.api}/declarations/overdue`).pipe(map(r => r.data));
  }

  createDeclaration(data: any): Observable<InsuranceDeclaration> {
    return this.http.post<any>(`${this.api}/declarations`, data).pipe(map(r => r.data));
  }

  updateDeclarationStatus(id: number, status: string): Observable<InsuranceDeclaration> {
    return this.http.patch<any>(`${this.api}/declarations/${id}/status?status=${status}`, {}).pipe(map(r => r.data));
  }
}
