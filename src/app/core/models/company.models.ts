export interface Company {
  id: number;
  code: string;
  name: string;
  shortName: string;
  taxCode: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  adminUserId: number;
  active: boolean;
  createdAt: string;
}

export interface CreateCompanyRequest {
  code: string;
  name: string;
  shortName?: string;
  taxCode?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  adminUsername: string;
  adminEmail: string;
}

export interface Department {
  id: number;
  companyId: number;
  code: string;
  name: string;
  parentDeptId: number | null;
  managerEmployeeId: number | null;
  description: string;
  displayOrder: number;
  active: boolean;
}

export interface Position {
  id: number;
  companyId: number;
  code: string;
  name: string;
  level: number;
  description: string;
  active: boolean;
}
