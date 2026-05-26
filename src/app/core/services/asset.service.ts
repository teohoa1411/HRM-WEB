import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '@environments/environment';
import { ApiResponse, PageResponse, PageParams } from '../models/api.models';
import {
  Asset,
  AssetCategory,
  CreateAssetRequest,
  CreateAssetCategoryRequest,
  AssignAssetRequest,
  ReturnAssetRequest,
  AssetAssignment,
  AssetStats
} from '../models/asset.models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AssetService {
  private readonly base = `${environment.apiUrl}/assets`;
  private readonly catBase = `${environment.apiUrl}/asset-categories`;

  constructor(private http: HttpClient) {}

  // ══════ Categories ══════
  listCategories(params: PageParams = {}): Observable<PageResponse<AssetCategory>> {
    const p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    return this.http.get<ApiResponse<PageResponse<AssetCategory>>>(this.catBase, { params: p })
      .pipe(map(r => r.data));
  }

  listActiveCategories(): Observable<AssetCategory[]> {
    const p = new HttpParams().set('active', 'true');
    return this.http.get<ApiResponse<AssetCategory[]>>(`${this.catBase}/active`, { params: p })
      .pipe(map(r => r.data));
  }

  getCategoryById(id: number): Observable<AssetCategory> {
    return this.http.get<ApiResponse<AssetCategory>>(`${this.catBase}/${id}`)
      .pipe(map(r => r.data));
  }

  createCategory(dto: CreateAssetCategoryRequest): Observable<AssetCategory> {
    return this.http.post<ApiResponse<AssetCategory>>(this.catBase, dto)
      .pipe(map(r => r.data));
  }

  updateCategory(id: number, dto: CreateAssetCategoryRequest): Observable<AssetCategory> {
    return this.http.put<ApiResponse<AssetCategory>>(`${this.catBase}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.catBase}/${id}`)
      .pipe(map(() => undefined));
  }

  // ══════ Assets ══════
  list(params: PageParams & { status?: string; categoryId?: number; ownershipType?: string; usedBy?: string } = {}): Observable<PageResponse<Asset>> {
    let p = new HttpParams()
      .set('page', params.page ?? 0)
      .set('size', params.size ?? 20);
    if (params.status) p = p.set('status', params.status);
    if (params.categoryId) p = p.set('categoryId', params.categoryId.toString());
    if (params.ownershipType) p = p.set('ownershipType', params.ownershipType);
    if (params.usedBy) p = p.set('usedBy', params.usedBy);
    return this.http.get<ApiResponse<PageResponse<Asset>>>(this.base, { params: p })
      .pipe(map(r => r.data));
  }

  getById(id: number): Observable<Asset> {
    return this.http.get<ApiResponse<Asset>>(`${this.base}/${id}`)
      .pipe(map(r => r.data));
  }

  create(dto: CreateAssetRequest): Observable<Asset> {
    return this.http.post<ApiResponse<Asset>>(this.base, dto)
      .pipe(map(r => r.data));
  }

  update(id: number, dto: CreateAssetRequest): Observable<Asset> {
    return this.http.put<ApiResponse<Asset>>(`${this.base}/${id}`, dto)
      .pipe(map(r => r.data));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<ApiResponse<void>>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }

  getNextCode(): Observable<string> {
    return this.http.get<ApiResponse<string>>(`${this.base}/next-code`)
      .pipe(map(r => r.data));
  }

  getStats(): Observable<AssetStats> {
    return this.http.get<ApiResponse<AssetStats>>(`${this.base}/stats`)
      .pipe(map(r => r.data));
  }

  getWarrantyAlerts(): Observable<Asset[]> {
    return this.http.get<ApiResponse<Asset[]>>(`${this.base}/warranty-alerts`)
      .pipe(map(r => r.data));
  }

  // ══════ Assignments ══════
  assign(assetId: number, dto: AssignAssetRequest): Observable<AssetAssignment> {
    return this.http.post<ApiResponse<AssetAssignment>>(`${this.base}/${assetId}/assign`, dto)
      .pipe(map(r => r.data));
  }

  returnAsset(assetId: number, dto: ReturnAssetRequest): Observable<void> {
    return this.http.post<ApiResponse<void>>(`${this.base}/${assetId}/return`, dto)
      .pipe(map(() => undefined));
  }

  getAssignmentHistory(assetId: number): Observable<AssetAssignment[]> {
    return this.http.get<ApiResponse<AssetAssignment[]>>(`${this.base}/${assetId}/assignments`)
      .pipe(map(r => r.data));
  }

  getEmployeeAssets(employeePublicId: string): Observable<AssetAssignment[]> {
    return this.http.get<ApiResponse<AssetAssignment[]>>(`${this.base}/employee/${employeePublicId}/assignments`)
      .pipe(map(r => r.data));
  }
}
