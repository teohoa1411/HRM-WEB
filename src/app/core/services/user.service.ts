import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse } from '../models/api.models';
import { User, CreateUserRequest } from '../models/user.models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private base = `${environment.apiUrl}/users`;
  constructor(private http: HttpClient) {}

  list(page = 0, size = 50): Observable<PageResponse<User>> {
    return this.http.get<ApiResponse<PageResponse<User>>>(`${this.base}?page=${page}&size=${size}`)
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<User> {
    return this.http.get<ApiResponse<User>>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(dto: CreateUserRequest): Observable<User> {
    return this.http.post<ApiResponse<User>>(this.base, dto).pipe(map(r => r.data));
  }

  toggleStatus(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/toggle-status`, {}).pipe(map(() => undefined));
  }

  unlock(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/unlock`, {}).pipe(map(() => undefined));
  }

  changeRole(id: number, role: string): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/role`, { role }).pipe(map(() => undefined));
  }

  resetPassword(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${id}/reset-password`, {}).pipe(map(() => undefined));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
