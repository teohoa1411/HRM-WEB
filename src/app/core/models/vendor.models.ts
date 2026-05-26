export type VendorType = 'PERSONNEL' | 'EQUIPMENT' | 'BOTH';

export interface Vendor {
  id: number;
  companyId: number;
  code: string;
  name: string;
  vendorType: VendorType;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxCode: string;
  accountUserId: number;
  active: boolean;
  createdAt: string;
}

export interface CreateVendorRequest {
  code: string;
  name: string;
  vendorType: VendorType;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
  accountUsername: string;
  accountEmail: string;
}
