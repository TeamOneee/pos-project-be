// memverifikasi normalisasi email case-insensitive pada identity (FR-AUTH-002).
import { normalizeEmail } from './email.util';

describe('normalizeEmail', () => {
  it('menurunkan huruf besar ke huruf kecil', () => {
    expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
  });

  it('memotong spasi di awal dan akhir', () => {
    expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
  });

  it('menggabungkan trim + lowercase', () => {
    expect(normalizeEmail('  User@WarungKu.Id  ')).toBe('user@warungku.id');
  });

  it('email yang sudah valid tetap sama', () => {
    expect(normalizeEmail('user@example.com')).toBe('user@example.com');
  });

  it('menangani string kosong', () => {
    expect(normalizeEmail('')).toBe('');
  });
});
