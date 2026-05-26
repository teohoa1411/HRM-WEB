// ══════ Contract Type (danh mục loại HĐ) ══════

export type ContractCategory = 'CONTRACT' | 'COMMITMENT';

export interface ContractType {
  id: number;
  code: string;
  name: string;
  category: ContractCategory;
  hasExpiry: boolean;
  defaultDurationMonths: number | null;
  reminderDaysBefore: number;
  description: string | null;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ContractTypeRequest {
  code: string;
  name: string;
  category: ContractCategory;
  hasExpiry: boolean;
  defaultDurationMonths?: number;
  reminderDaysBefore?: number;
  description?: string;
  sortOrder?: number;
}

// ══════ Employee Contract ══════

export type ContractStatus = 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED' | 'TERMINATED';

export interface EmployeeContract {
  id: number;
  publicId: string;
  employeeId: number;
  employeePublicId: string;
  employeeName: string;
  employeeCode: string;
  contractTypeId: number;
  contractTypeName: string;
  contractTypeCategory: string;
  contractNumber: string | null;
  signedDate: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  durationMonths: number | null;
  status: ContractStatus;
  documentId: number | null;
  notes: string | null;
  createdAt: string;
}

export interface EmployeeContractRequest {
  employeeId: number;
  contractTypeId: number;
  contractNumber?: string;
  signedDate?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  durationMonths?: number;
  documentId?: number;
  notes?: string;
}

// ══════ Employee Contract Group (group by employee) ══════

export interface EmployeeContractGroup {
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  contractCount: number;
  activeContractCount: number;
  contractTypeNames: string[];
  currentContractTypeName: string | null;
  currentContractStatus: ContractStatus | null;
  currentEffectiveTo: string | null;
  worstStatus: ContractStatus;
  daysUntilExpiry: number | null;
  contracts: EmployeeContract[];
}

export interface ExtendContractRequest {
  additionalMonths: number;
  notes?: string;
}

export interface RenewContractRequest {
  contractTypeId: number;
  contractNumber?: string;
  signedDate?: string;
  effectiveFrom: string;
  effectiveTo?: string;
  durationMonths?: number;
  documentId?: number;
  notes?: string;
}
