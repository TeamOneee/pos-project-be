import { Outlet } from '@prisma/client';

export type OutletStatus = 'ACTIVE' | 'INACTIVE';

export interface CreateOutletData {
  name: string;
  address: string;
  status?: OutletStatus;
}

export interface UpdateOutletData {
  name?: string;
  address?: string;
  status?: OutletStatus;
}

/**
 * Public contract yang disediakan Outlet Module untuk module lain.
 */
export interface OutletPort {
  findById(outletId: string): Promise<Outlet | null>;

  ensureExists(outletId: string): Promise<Outlet>;

  listByMerchant(merchantId: string, status?: OutletStatus): Promise<Outlet[]>;

  createOutlet(merchantId: string, data: CreateOutletData): Promise<Outlet>;

  updateOutlet(outletId: string, data: UpdateOutletData): Promise<Outlet>;

  deactivate(outletId: string): Promise<void>;
}
