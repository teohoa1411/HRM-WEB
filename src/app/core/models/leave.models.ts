export type GrantRounding = 'FLOOR' | 'CEIL' | 'HALF_UP';

export interface LeaveType {
  id: number;
  companyId: number;
  code: string;
  name: string;
  maxDays: number;
  paid: boolean;
  active: boolean;
  autoGrantOnCreate: boolean;
  grantRounding: GrantRounding;
}

export interface CreateLeaveTypeRequest {
  code: string;
  name: string;
  maxDays: number;
  paid: boolean;
  autoGrantOnCreate: boolean;
  grantRounding?: GrantRounding;
}

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export type HalfDayPeriod = 'MORNING' | 'AFTERNOON';

export interface LeaveRequest {
  id: number;
  companyId: number;
  employeeId: number;
  employeeName?: string;
  leaveTypeId: number;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  halfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  reason: string;
  status: LeaveStatus;
  approvedBy?: number;
  approvedAt?: string;
  rejectReason?: string;
  createdAt?: string;
}

export interface CreateLeaveRequest {
  leaveTypeId: number;
  startDate: string;    // YYYY-MM-DD
  endDate: string;      // YYYY-MM-DD
  halfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  reason?: string;
}

/** One day with a leave request (APPROVED or PENDING) — used by timesheet icon display */
export interface LeaveBlock {
  date: string;              // YYYY-MM-DD
  halfDay: boolean;
  halfDayPeriod?: HalfDayPeriod;
  status: LeaveStatus;       // APPROVED = đã duyệt, PENDING = chờ duyệt
}

/** Quota nghỉ phép theo năm của nhân sự */
export interface LeaveBalance {
  id: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  leaveTypeId: number;
  leaveTypeName: string;
  leaveTypeCode: string;
  paid: boolean;
  year: number;
  totalQuota: number;
  usedDays: number;
  carriedOver: number;
  remainingDays: number;
}

export interface GrantLeaveBalanceRequest {
  employeeId: number;
  leaveTypeId: number;
  year: number;
  totalQuota: number;
}
