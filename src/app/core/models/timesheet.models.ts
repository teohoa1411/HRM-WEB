export interface TimesheetEntry {
  id: number;
  projectKey: string;
  projectId?: string;
  projectName?: string;
  workDate: string;
  hours: number;
  otHours: number;
  note?: string;
  lockedByLeave: boolean;
}

export interface TimesheetEntryRequest {
  projectKey: string;
  projectId?: string;
  projectName?: string;
  workDate: string;
  hours: number;
  otHours?: number;
  note?: string;
}

export interface TimesheetBulkRequest {
  entries: TimesheetEntryRequest[];
}

export interface TimesheetMonthlyMeta {
  id?: number;
  yearMonth: string;
  description?: string;
  additions?: string;  // JSON string
  locked?: boolean;
  lockedBy?: number;
  lockedAt?: string;
}

export interface TimesheetLock {
  id?: number;
  companyId: number;
  yearMonth: string;
  locked: boolean;
  lockedBy?: number;
  lockedAt?: string;
  /** Kế toán đã xác nhận (bước 2). Khi true: không ai sửa được timesheet. */
  accountantConfirmed?: boolean;
  accountantConfirmedBy?: number;
  accountantConfirmedAt?: string;
}

export interface TimesheetAttachment {
  id: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  yearMonth: string;
  createdAt: string;
}

export interface CompanyTimesheetField {
  id: number;
  fieldName: string;
  fieldKey: string;
  fieldType: 'text' | 'number' | 'checkbox';
  required: boolean;
  sortOrder: number;
  active: boolean;
}

export interface EmployeeTimesheetSummary {
  userId: number;
  username: string;
  displayName: string;
  totalHours: number;
  totalOtHours: number;
  description?: string;
  additions?: string;   // JSON string from timesheet_monthly.additions (custom fields)
}

/** Cell state per (projectKey, date) */
export interface DayEntry {
  id?: number;
  hours: number;
  otHours: number;
  note: string;
  lockedByLeave?: boolean;
}
