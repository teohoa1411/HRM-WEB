export interface InternalSalary {
  id: number;
  employeeId: number;
  monthlySalary: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string;
  createdAt: string;
}

export interface SetSalaryRequest {
  monthlySalary: number;
  effectiveFrom: string;
  notes?: string;
}
