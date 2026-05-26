import { PriceUnit } from './customer.models';

export type SourceType = 'INTERNAL' | 'VENDOR';

export interface BillingRecord {
  id: number;
  companyId: number;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  jobRoleId: number;
  jobRoleName: string;
  billingMonth: string;
  sourceType: SourceType;
  vendorId: number | null;
  vendorName: string | null;
  customerId: number | null;
  customerName: string | null;
  daysWorked: number;
  daysOff: number;
  totalWorkdays: number;
  priceUnit: PriceUnit;
  unitCostPrice: number;
  unitSellPrice: number;
  costAmount: number;
  sellAmount: number;
  currency: string;
  calcStatus: string;
}

export interface CostReportSummary {
  fromDate: string;
  toDate: string;
  totalCost: number;
  totalRevenue: number;
  profit: number;
  employeeCount: number;
  currency: string;
}

export interface RevenueReportItem {
  jobRoleId: number;
  jobRoleName: string;
  headcount: number;
  cost: number;
  revenue: number;
  margin: number;
}
