export type Role = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'VENDOR_USER' | 'EMPLOYEE';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  email: string;
  role: Role;
  companyId: number | null;
  mustChangePassword: boolean;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  userId: number;
  username: string;
  email: string;
  role: Role;
  companyId: number | null;
  mustChangePassword: boolean;
}

export interface AuthState {
  accessToken: string | null;
  userId: number | null;
  username: string | null;
  email: string | null;
  role: Role | null;
  companyId: number | null;
  mustChangePassword: boolean;
  isAuthenticated: boolean;
}
