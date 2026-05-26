import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import { Vendor, CreateVendorRequest } from '../models/vendor.models';
import { PriceUnit } from '../models/customer.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly base = `${environment.apiUrl}/vendors`;

  constructor(private http: HttpClient) {}

  list(params: PageParams = {}): Observable<PageResponse<Vendor>> {
    const p = new HttpParams().set('page', params.page ?? 0).set('size', params.size ?? 20);
    return this.http.get<ApiResponse<PageResponse<Vendor>>>(this.base, { params: p }).pipe(map(r => r.data));
  }

  getById(id: number): Observable<Vendor> {
    return this.http.get<ApiResponse<Vendor>>(`${this.base}/${id}`).pipe(map(r => r.data));
  }

  create(dto: CreateVendorRequest): Observable<Vendor> {
    return this.http.post<ApiResponse<Vendor>>(this.base, dto).pipe(map(r => r.data));
  }

  update(id: number, dto: CreateVendorRequest): Observable<Vendor> {
    return this.http.put<ApiResponse<Vendor>>(`${this.base}/${id}`, dto).pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`).pipe(map(() => undefined));
  }

  // VendorPrice
  getPriceHistory(vendorId: number): Observable<VendorPriceItem[]> {
    return this.http.get<ApiResponse<VendorPriceItem[]>>(`${this.base}/${vendorId}/prices`).pipe(map(r => r.data));
  }

  setPrice(vendorId: number, dto: SetVendorPriceRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${vendorId}/prices`, dto).pipe(map(() => undefined));
  }
}

export interface VendorPriceItem {
  id: number;
  vendorId: number;
  jobRoleId: number;
  jobRoleName: string;
  price: number;
  priceUnit: PriceUnit;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
}

export interface SetVendorPriceRequest {
  jobRoleId: number;
  price: number;
  priceUnit?: PriceUnit;
  currency?: string;
  effectiveFrom: string;
  notes?: string;
}
