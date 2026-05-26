export interface Assignment {
  id: number;
  companyId: number;
  employeeId: number;
  employeeName?: string;
  customerId: number;
  customerName?: string;
  projectName?: string;
  projectCode?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  clientUsername?: string;
  workLocation?: string;
  createdAt?: string;
}

export interface CreateAssignmentRequest {
  customerId: number;
  projectName?: string;
  projectCode?: string;
  startDate: string;
  endDate?: string;
  notes?: string;
  clientUsername?: string;
  workLocation?: string;
}
