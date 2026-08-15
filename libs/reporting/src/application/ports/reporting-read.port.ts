import {
  BusinessDashboardRequest,
  BusinessDashboardSnapshot,
} from '../reporting.models';

// menjadi kontrak baca projection yang digunakan insight tanpa akses persistence.
export abstract class ReportingReadPort {
  // mengembalikan snapshot metrik terverifikasi untuk satu merchant dan periode.
  abstract getBusinessSnapshot(
    request: BusinessDashboardRequest,
  ): Promise<BusinessDashboardSnapshot>;
}
