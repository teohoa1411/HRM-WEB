import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '@environments/environment';
import { ApiResponse } from '../models/api.models';
import { DocumentFile, DocumentType } from '../models/document.models';

@Injectable({ providedIn: 'root' })
export class DocumentService {
  constructor(private http: HttpClient) {}

  private base(employeePublicId: string): string {
    return `${environment.apiUrl}/employees/${employeePublicId}/documents`;
  }

  list(employeePublicId: string): Observable<DocumentFile[]> {
    return this.http
      .get<ApiResponse<DocumentFile[]>>(this.base(employeePublicId))
      .pipe(map(r => r.data));
  }

  upload(employeePublicId: string, file: File, documentType: DocumentType): Observable<DocumentFile> {
    const form = new FormData();
    form.append('file', file);
    form.append('documentType', documentType);
    return this.http
      .post<ApiResponse<DocumentFile>>(this.base(employeePublicId), form)
      .pipe(map(r => r.data));
  }

  getDownloadUrl(employeePublicId: string, docId: number): Observable<string> {
    return this.http
      .get<ApiResponse<string>>(`${this.base(employeePublicId)}/${docId}/url`)
      .pipe(map(r => r.data));
  }

  delete(employeePublicId: string, docId: number): Observable<void> {
    return this.http
      .delete<ApiResponse<void>>(`${this.base(employeePublicId)}/${docId}`)
      .pipe(map(() => undefined));
  }
}
