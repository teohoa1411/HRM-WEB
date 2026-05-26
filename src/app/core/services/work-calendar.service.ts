import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { WorkCalendar, CreateWorkCalendarRequest } from '../models/work-calendar.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class WorkCalendarService {
  private readonly base = `${environment.apiUrl}/work-calendars`;

  constructor(private http: HttpClient) {}

  list(): Observable<WorkCalendar[]> {
    return this.http.get<ApiResponse<WorkCalendar[]>>(this.base).pipe(map(r => r.data));
  }

  getByMonth(yearMonth: string): Observable<WorkCalendar> {
    return this.http.get<ApiResponse<WorkCalendar>>(`${this.base}/${yearMonth}`).pipe(map(r => r.data));
  }

  create(dto: CreateWorkCalendarRequest): Observable<WorkCalendar> {
    return this.http.post<ApiResponse<WorkCalendar>>(this.base, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: CreateWorkCalendarRequest): Observable<WorkCalendar> {
    return this.http.put<ApiResponse<WorkCalendar>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  applyDefault(targetYearMonth: string): Observable<WorkCalendar> {
    return this.http.post<ApiResponse<WorkCalendar>>(`${this.base}/apply-default/${targetYearMonth}`, {}).pipe(map(r => r.data));
  }
}
