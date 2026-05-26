import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import { JobRole, JobRolePrice, SetJobRolePriceRequest } from '../models/job-role.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class JobRoleService {
  private readonly base = `${environment.apiUrl}/job-roles`;

  constructor(private http: HttpClient) {}

  list(params: PageParams = {}): Observable<PageResponse<JobRole>> {
    const p = new HttpParams().set('page', params.page ?? 0).set('size', params.size ?? 50);
    return this.http.get<ApiResponse<PageResponse<JobRole>>>(this.base, { params: p }).pipe(map(r => r.data));
  }

  listActive(): Observable<JobRole[]> {
    return this.http.get<ApiResponse<JobRole[]>>(`${this.base}/active`).pipe(map(r => r.data));
  }

  getById(id: number): Observable<JobRole> {
    return this.http.get<ApiResponse<JobRole>>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(dto: Partial<JobRole>): Observable<JobRole> {
    return this.http.post<ApiResponse<JobRole>>(this.base, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: Partial<JobRole>): Observable<JobRole> {
    return this.http.put<ApiResponse<JobRole>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  setPrice(id: number, dto: SetJobRolePriceRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${id}/prices`, dto).pipe(map(() => undefined));
  }

  getPriceHistory(id: number): Observable<JobRolePrice[]> {
    return this.http.get<ApiResponse<JobRolePrice[]>>(`${this.base}/${id}/prices`).pipe(map(r => r.data));
  }

  toggleActive(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/toggle-active`, {}).pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
