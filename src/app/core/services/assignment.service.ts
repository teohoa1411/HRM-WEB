import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { Assignment, CreateAssignmentRequest } from '../models/assignment.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private readonly base = `${environment.apiUrl}/assignments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<Assignment[]> {
    return this.http.get<ApiResponse<Assignment[]>>(this.base).pipe(map(r => r.data));
  }

  getByEmployee(publicId: string): Observable<Assignment[]> {
    return this.http.get<ApiResponse<Assignment[]>>(`${this.base}/employee/${publicId}`).pipe(map(r => r.data));
  }

  create(publicId: string, dto: CreateAssignmentRequest): Observable<Assignment> {
    return this.http.post<ApiResponse<Assignment>>(`${this.base}/employee/${publicId}`, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: CreateAssignmentRequest): Observable<Assignment> {
    return this.http.put<ApiResponse<Assignment>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }
}
