export interface SyncTriggerResponse {
  sessionId: number;
  status: string;
  message: string;
}

export interface SyncSession {
  id: number;
  triggeredBy: number;
  startedAt: string;
  completedAt: string | null;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  totalDocuments: number;
  syncedCount: number;
  skippedCount: number;
  failedCount: number;
  targetType: 'LOCAL' | 'S3_BUCKET';
  targetBasePath: string;
}

export type SyncLogStatus = 'SUCCESS' | 'FAILED' | 'SKIPPED';

export interface SyncLog {
  id: number;
  documentId: number;
  employeeId: number;
  employeeCode: string;
  s3Key: string;
  targetPath: string | null;
  syncStatus: SyncLogStatus;
  syncedAt: string;
  errorMessage: string | null;
  fileSize: number | null;
  checksum: string | null;
}
