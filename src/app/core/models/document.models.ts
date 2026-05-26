export type DocumentType =
  | 'ID_CARD'
  | 'PASSPORT'
  | 'RESUME'
  | 'DEGREE'
  | 'CERTIFICATE'
  | 'CONTRACT'
  | 'OTHER';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  ID_CARD: 'CMND / CCCD',
  PASSPORT: 'Hộ chiếu',
  RESUME: 'CV / Hồ sơ',
  DEGREE: 'Bằng cấp',
  CERTIFICATE: 'Chứng chỉ',
  CONTRACT: 'Hợp đồng',
  OTHER: 'Khác',
};

export interface DocumentFile {
  id: number;
  employeeId: number;
  documentType: DocumentType;
  fileName: string;
  s3Key: string;
  fileSize: number;
  mimeType: string;
  version: number;
  uploadedBy: number;
  createdAt: string;
}
