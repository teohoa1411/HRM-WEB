export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'ON_LEAVE' | 'TERMINATED' | 'PROBATION';
export type EmployeeSourceType = 'INTERNAL' | 'VENDOR';
export type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN';

export interface Employee {
  id: number;
  publicId: string;
  companyId: number;
  employeeCode: string;
  userId: number;
  username: string | null;         // login account
  fullName: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  emailWork: string;
  phoneWork: string;
  emergencyPhone: string | null;
  avatarS3Key: string;
  sourceType: EmployeeSourceType;
  vendorId: number | null;
  vendorName: string | null;
  jobRoleId: number;
  jobRoleName: string;
  departmentId: number | null;
  departmentName: string;
  positionId: number | null;
  directManagerId: number | null;
  startDate: string;
  endDate: string | null;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  probationEndDate: string | null;
  currentSalary: number | null;    // current monthly salary
  notes: string | null;
  createdAt: string;
}

export interface CreateEmployeeRequest {
  fullName: string;
  dateOfBirth: string;             // YYYY-MM-DD
  emailWork?: string;
  phoneWork?: string;
  emergencyPhone?: string;
  sourceType: EmployeeSourceType;
  vendorId?: number;
  jobRoleId: number;
  departmentId?: number;
  positionId?: number;
  directManagerId?: number;
  startDate: string;
  status?: EmployeeStatus;
  employmentType?: EmploymentType;
  probationEndDate?: string;
  notes?: string;
}
