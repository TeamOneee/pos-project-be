// memverifikasi otorisasi rbac endpoint dashboard (owner vs admin) sesuai fr-rep-003.
import { PATH_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '@app/platform';
import { DashboardController } from './dashboard.controller';

function methodRoles(propertyKey: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(
    DashboardController.prototype,
    propertyKey,
  );
  if (!descriptor || typeof descriptor.value !== 'function') {
    throw new Error(`Method ${propertyKey} tidak ditemukan.`);
  }
  return Reflect.getMetadata(ROLES_KEY, descriptor.value as object) as unknown;
}

describe('Dashboard controller authorization metadata', () => {
  it.each([
    'summary',
    'salesTrend',
    'aovTrend',
    'timePattern',
    'topProducts',
    'outletComparison',
  ])('FR-REP-003: %s hanya dapat diakses owner', (method) => {
    expect(methodRoles(method)).toEqual(['OWNER']);
  });

  it.each(['operations', 'lowStock'])(
    'FR-REP-003: %s hanya dapat diakses admin atau owner',
    (method) => {
      expect(methodRoles(method)).toEqual(['OWNER', 'ADMIN']);
    },
  );

  it('mengunci base path dashboard sesuai api contract 07 bagian 6', () => {
    expect(Reflect.getMetadata(PATH_METADATA, DashboardController)).toBe(
      'dashboard',
    );
  });
});
