import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { InternalSalary, SetSalaryRequest } from '../models/salary.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private readonly base = `${environment.apiUrl}/employees`;

  constructor(private http: HttpClient) {}

  getHistory(publicId: string): Observable<InternalSalary[]> {
    return this.http.get<ApiResponse<InternalSalary[]>>(`${this.base}/${publicId}/salary`).pipe(map(r => r.data));
  }

  getCurrent(publicId: string): Observable<InternalSalary | null> {
    return this.http.get<ApiResponse<InternalSalary>>(`${this.base}/${publicId}/salary/current`).pipe(map(r => r.data));
  }

  setSalary(publicId: string, dto: SetSalaryRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${publicId}/salary`, dto).pipe(map(() => undefined));
  }
}
