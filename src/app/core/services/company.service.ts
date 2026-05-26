import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import { Company, CreateCompanyRequest, Department, Position } from '../models/company.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CompanyService {
  private readonly base = `${environment.apiUrl}/companies`;

  constructor(private http: HttpClient) {}

  list(params: PageParams = {}): Observable<PageResponse<Company>> {
    const p = new HttpParams().set('page', params.page ?? 0).set('size', params.size ?? 20);
    return this.http.get<ApiResponse<PageResponse<Company>>>(this.base, { params: p }).pipe(map(r => r.data));
  }

  getById(id: number): Observable<Company> {
    return this.http.get<ApiResponse<Company>>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(dto: CreateCompanyRequest): Observable<Company> {
    return this.http.post<ApiResponse<Company>>(this.base, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: CreateCompanyRequest): Observable<Company> {
    return this.http.put<ApiResponse<Company>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  toggleStatus(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/toggle-status`, null).pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  // Departments
  listDepartments(): Observable<Department[]> {
    return this.http.get<ApiResponse<Department[]>>(`${environment.apiUrl}/departments`).pipe(map(r => r.data));
  }

  createDepartment(dto: Partial<Department>): Observable<Department> {
    return this.http.post<ApiResponse<Department>>(`${environment.apiUrl}/departments`, dto).pipe(map(r => r.data));
  }

  deleteDepartment(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${environment.apiUrl}/departments/${id}`).pipe(map(() => undefined));
  }

  updateDepartment(id: number, dto: Partial<Department>): Observable<Department> {
    return this.http.put<ApiResponse<Department>>(`${environment.apiUrl}/departments/${id}`, dto).pipe(map(r => r.data));
  }

  toggleDepartment(id: number): Observable<void> {
    // Toggle active status - use update with opposite active value
    // For now just delete and recreate or use a custom endpoint
    return this.http.patch<ApiResponse<void>>(`${environment.apiUrl}/departments/${id}/toggle`, null).pipe(map(() => undefined));
  }

  // Positions
  listPositions(): Observable<Position[]> {
    return this.http.get<ApiResponse<Position[]>>(`${environment.apiUrl}/positions`).pipe(map(r => r.data));
  }
}
