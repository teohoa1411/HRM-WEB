import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import { Customer, CreateCustomerRequest, CustomerPrice, SetCustomerPriceRequest } from '../models/customer.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class CustomerService {
  private readonly base = `${environment.apiUrl}/customers`;

  constructor(private http: HttpClient) {}

  list(params: PageParams = {}): Observable<PageResponse<Customer>> {
    const p = new HttpParams().set('page', params.page ?? 0).set('size', params.size ?? 20);
    return this.http.get<ApiResponse<PageResponse<Customer>>>(this.base, { params: p }).pipe(map(r => r.data));
  }

  listActive(): Observable<Customer[]> {
    return this.http.get<ApiResponse<Customer[]>>(`${this.base}/active`).pipe(map(r => r.data));
  }

  getById(id: number): Observable<Customer> {
    return this.http.get<ApiResponse<Customer>>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(dto: CreateCustomerRequest): Observable<Customer> {
    return this.http.post<ApiResponse<Customer>>(this.base, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: CreateCustomerRequest): Observable<Customer> {
    return this.http.put<ApiResponse<Customer>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  // Price management
  getPriceHistory(customerId: number): Observable<CustomerPrice[]> {
    return this.http.get<ApiResponse<CustomerPrice[]>>(`${this.base}/${customerId}/prices`).pipe(map(r => r.data));
  }

  setPrice(customerId: number, dto: SetCustomerPriceRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${customerId}/prices`, dto).pipe(map(() => undefined));
  }
}
