export type AssetStatus = 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DISPOSED' | 'LOST';
export type AssetOwnershipType = 'COMPANY_OWNED' | 'VENDOR_OWNED';
export type AssetCondition = 'NEW' | 'GOOD' | 'FAIR' | 'POOR';

export interface AssetCategory {
  id: number;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  assetCount: number;
}

export interface CreateAssetCategoryRequest {
  code: string;
  name: string;
  description?: string;
  active?: boolean;
}

export interface Asset {
  id: number;
  assetCode: string;
  name: string;
  serialNumber: string | null;
  labelCode: string | null;
  description: string | null;
  categoryId: number;
  categoryName: string;
  ownershipType: AssetOwnershipType;
  ownerVendorId: number | null;
  ownerVendorName: string | null;
  supplierVendorId: number | null;
  supplierVendorName: string | null;
  isRented: boolean;
  rentalNotes: string | null;
  purchasePrice: number | null;
  purchaseDate: string | null;
  warrantyMonths: number | null;
  status: AssetStatus;
  assetCondition: AssetCondition;
  notes: string | null;
  currentHolderName: string | null;
  currentHolderId: number | null;
  createdAt: string;
}

export interface CreateAssetRequest {
  name: string;
  serialNumber?: string;
  labelCode?: string;
  description?: string;
  categoryId: number;
  ownershipType: AssetOwnershipType;
  ownerVendorId?: number;
  supplierVendorId?: number;
  isRented: boolean;
  rentalNotes?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyMonths?: number;
  assetCondition?: AssetCondition;
  notes?: string;
}

export interface AssignAssetRequest {
  employeeId: number;
  assignedDate: string;
  conditionOnAssign: AssetCondition;
  monthlyRentalPrice?: number;
  notes?: string;
}

export interface ReturnAssetRequest {
  returnedDate: string;
  conditionOnReturn: AssetCondition;
  notes?: string;
}

export interface AssetAssignment {
  id: number;
  assetId: number;
  assetCode: string;
  assetName: string;
  serialNumber: string | null;
  employeeId: number;
  employeeName: string;
  employeeCode: string;
  assignedDate: string;
  returnedDate: string | null;
  assignedBy: number;
  assignedByName: string;
  conditionOnAssign: AssetCondition;
  conditionOnReturn: AssetCondition | null;
  monthlyRentalPrice: number | null;
  notes: string | null;
}

export interface AssetStats {
  total: number;
  inUse: number;
  available: number;
  rented: number;
  maintenance: number;
}
