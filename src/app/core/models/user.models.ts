export type UserRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'VENDOR_USER' | 'EMPLOYEE';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  companyId: number;
  referenceId: number | null;
  active: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  role: UserRole;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  COMPANY_ADMIN: 'Admin',
  MANAGER: 'Quản lý',
  ACCOUNTANT: 'Kế toán',
  VENDOR_USER: 'Vendor',
  EMPLOYEE: 'Nhân viên',
};
