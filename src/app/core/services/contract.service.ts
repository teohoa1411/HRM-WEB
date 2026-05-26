import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import {
  ContractType, ContractTypeRequest,
  EmployeeContract, EmployeeContractRequest, EmployeeContractGroup,
  ExtendContractRequest, RenewContractRequest
} from '../models/contract.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class ContractService {
  private readonly typeBase = `${environment.apiUrl}/contract-types`;
  private readonly base = `${environment.apiUrl}/contracts`;

  constructor(private http: HttpClient) {}

  // ══════ Contract Types ══════

  listActiveTypes(category?: string): Observable<ContractType[]> {
    let p = new HttpParams();
    if (category) p = p.set('category', category);
    return this.http.get<ApiResponse<ContractType[]>>(this.typeBase, { params: p })
      .pipe(map(r => r.data));
  }

  listAllTypes(): Observable<ContractType[]> {
    return this.http.get<ApiResponse<ContractType[]>>(`${this.typeBase}/all`)
      .pipe(map(r => r.data));
  }

  createType(dto: ContractTypeRequest): Observable<ContractType> {
    return this.http.post<ApiResponse<ContractType>>(this.typeBase, dto)
      .pipe(map(r => r.data));
  }

  updateType(id: number, dto: ContractTypeRequest): Observable<ContractType> {
    return this.http.put<ApiResponse<ContractType>>(`${this.typeBase}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  toggleType(id: number): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.typeBase}/${id}/toggle`, {})
      .pipe(map(() => undefined));
  }

  // ══════ Group by Employee ══════

  getGroupedByEmployee(): Observable<EmployeeContractGroup[]> {
    return this.http.get<ApiResponse<EmployeeContractGroup[]>>(`${this.base}/by-employee`)
      .pipe(map(r => r.data));
  }

  // ══════ Contracts ══════

  list(params: PageParams & { contractTypeId?: number } = {}): Observable<PageResponse<EmployeeContract>> {
    let p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    if (params.contractTypeId) p = p.set('contractTypeId', params.contractTypeId.toString());
    return this.http.get<ApiResponse<PageResponse<EmployeeContract>>>(this.base, { params: p })
      .pipe(map(r => r.data));
  }

  getByPublicId(publicId: string): Observable<EmployeeContract> {
    return this.http.get<ApiResponse<EmployeeContract>>(`${this.base}/${publicId}`)
      .pipe(map(r => r.data));
  }

  getByEmployee(employeePublicId: string): Observable<EmployeeContract[]> {
    return this.http.get<ApiResponse<EmployeeContract[]>>(`${this.base}/employee/${employeePublicId}`)
      .pipe(map(r => r.data));
  }

  getExpiring(withinDays: number = 30): Observable<EmployeeContract[]> {
    const p = new HttpParams().set('withinDays', withinDays.toString());
    return this.http.get<ApiResponse<EmployeeContract[]>>(`${this.base}/expiring`, { params: p })
      .pipe(map(r => r.data));
  }

  create(dto: EmployeeContractRequest): Observable<EmployeeContract> {
    return this.http.post<ApiResponse<EmployeeContract>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  update(publicId: string, dto: EmployeeContractRequest): Observable<EmployeeContract> {
    return this.http.put<ApiResponse<EmployeeContract>>(`${this.base}/${publicId}`, dto)
      .pipe(map(r => r.data));
  }

  extend(publicId: string, dto: ExtendContractRequest): Observable<EmployeeContract> {
    return this.http.patch<ApiResponse<EmployeeContract>>(`${this.base}/${publicId}/extend`, dto)
      .pipe(map(r => r.data));
  }

  renew(publicId: string, dto: RenewContractRequest): Observable<EmployeeContract> {
    return this.http.post<ApiResponse<EmployeeContract>>(`${this.base}/${publicId}/renew`, dto)
      .pipe(map(r => r.data));
  }

  terminate(publicId: string, reason: string): Observable<void> {
    return this.http.patch<ApiResponse<void>>(`${this.base}/${publicId}/terminate`, { reason })
      .pipe(map(() => undefined));
  }

  delete(publicId: string): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${publicId}`)
      .pipe(map(() => undefined));
  }

  refreshStatuses(): Observable<string> {
    return this.http.post<ApiResponse<string>>(`${this.base}/refresh-statuses`, {})
      .pipe(map(r => r.data));
  }
}
