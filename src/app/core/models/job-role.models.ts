export type SeniorityLevel = 'INTERN' | 'JUNIOR' | 'MIDDLE' | 'SENIOR' | 'LEAD' | 'PRINCIPAL';
export type JobRoleCategory = 'DEVELOPMENT' | 'QA' | 'DEVOPS' | 'MANAGEMENT' | 'DESIGN' | 'OTHER';

export interface JobRole {
  id: number;
  code: string;
  name: string;
  category: JobRoleCategory;
  seniorityLevel: SeniorityLevel;
  description: string;
  skillsRequired: string;
  active: boolean;
}

export interface JobRolePrice {
  id: number;
  companyId: number;
  jobRoleId: number;
  costPrice: number;
  sellPrice: number;
  currency: string;
  billingUnit: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
  createdAt: string;
}

export interface SetJobRolePriceRequest {
  costPrice: number;
  sellPrice: number;
  currency?: string;
  billingUnit?: string;
  effectiveFrom: string;
  notes?: string;
}
