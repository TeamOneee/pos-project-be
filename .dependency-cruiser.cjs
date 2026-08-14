module.exports = {
  forbidden: [
    {
      name: 'no-cross-module-internal-import',
      comment: 'Modul lain hanya boleh import lewat barrel index.ts',
      severity: 'error',
      from: { path: '^libs/(?!platform)([^/]+)/src' },
      to: { path: '^libs/(?!platform)([^/]+)/src/(?!index\\.ts)', pathNot: '^libs/$1/src' },
    },
    {
      name: 'reporting-insight-no-direct-sales-table-access',
      comment: 'reporting & insight tidak boleh depend ke infrastructure sales/inventory/catalog langsung',
      severity: 'error',
      from: { path: '^libs/(reporting|insight)/src' },
      to: { path: '^libs/(sales|inventory|catalog)/src/infrastructure' },
    },
  ],
};
