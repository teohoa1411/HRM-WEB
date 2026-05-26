import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import { Employee, CreateEmployeeRequest, EmployeeStatus } from '../models/employee.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class EmployeeService {
  private readonly base = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getNextCode(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.base}/next-code`).pipe(map(r => r.data));
  }

  list(params: PageParams = {}): Observable<PageResponse<Employee>> {
    const p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20)
      .set('sort', params.sort ?? 'fullName');
    return this.http.get<ApiResponse<PageResponse<Employee>>>(this.base, { params: p })
      .pipe(map(r => r.data));
  }

  getById(publicId: string): Observable<Employee> {
    return this.http.get<ApiResponse<Employee>>(`${this.base}/${publicId}`).pipe(map(r => r.data));
  }

  getMyProfile(): Observable<Employee> {
    return this.http.get<ApiResponse<Employee>>(`${this.base}/me`).pipe(map(r => r.data));
  }

  create(dto: CreateEmployeeRequest): Observable<Employee> {
    return this.http.post<ApiResponse<Employee>>(this.base, dto).pipe(map(r => r.data));
  }

  update(publicId: string, dto: Partial<CreateEmployeeRequest>): Observable<Employee> {
    return this.http.patch<ApiResponse<Employee>>(`${this.base}/${publicId}`, dto).pipe(map(r => r.data));
  }

  updateStatus(publicId: string, status: EmployeeStatus): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${publicId}/status`, null, {
      params: new HttpParams().set('status', status)
    }).pipe(map(() => undefined));
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${publicId}`).pipe(map(() => undefined));
  }

  resetPassword(publicId: string): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${publicId}/reset-password`, {}).pipe(map(() => undefined));
  }

  search(term: string): Observable<Employee[]> {
    const p = new HttpParams().set('q', term);
    return this.http.get<ApiResponse<Employee[]>>(`${this.base}/search`, { params: p })
      .pipe(map(r => r.data));
  }
}
