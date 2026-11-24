export type PriceUnit = 'HOURLY' | 'DAILY' | 'MONTHLY';

export interface Customer {
  id: number;
  companyId: number;
  code: string;
  name: string;
  vendorCode?: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  taxCode: string;
  notes: string;
  active: boolean;
  createdAt: string;
}

export interface CreateCustomerRequest {
  code: string;
  name: string;
  vendorCode?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  taxCode?: string;
  notes?: string;
}

export interface CustomerPrice {
  id: number;
  customerId: number;
  jobRoleId: number;
  jobRoleName: string;
  price: number;
  priceUnit: PriceUnit;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
  createdAt: string;
}

export interface SetCustomerPriceRequest {
  jobRoleId: number;
  price: number;
  priceUnit?: PriceUnit;
  currency?: string;
  effectiveFrom: string;
  notes?: string;
}
