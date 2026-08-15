export interface ReportingOutlet {
  // id menjadi filter projection dan kunci response outlet comparison.
  id: string;
  // nama current state ditampilkan bersama angka historis.
  name: string;
}

export interface TenantReportingContext {
  // timezone menentukan batas hour/day reporting sesuai br-018.
  timezone: string;
  // seluruh outlet termasuk nonaktif agar histori Owner tidak hilang.
  outlets: ReportingOutlet[];
}

/*
 * reporting hanya membutuhkan timezone, scope, dan label outlet dari tenant.
 * tidak ada outlet-changed event pada iterasi ini karena perubahan outlet jarang
 * dan current state dapat dibaca murah dari read replica.
 *
 * todo(scaling): gunakan outlet dimension event bila reporting dipisah menjadi
 * service mandiri atau read port ini menjadi bottleneck yang terukur.
 */
export abstract class TenantReportingReadPort {
  // membaca timezone dan outlet dalam scope merchant dari read replica.
  abstract getContext(
    merchantId: string,
    outletId?: string,
  ): Promise<TenantReportingContext>;
}
