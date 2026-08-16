import { PASSWORD_PATTERN, PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes dan verify round-trip (NFR-SEC-001)', async () => {
    const hash = await service.hash('P4ssw0rd!');
    expect(hash).not.toContain('P4ssw0rd!');
    expect(await service.verify(hash, 'P4ssw0rd!')).toBe(true);
    expect(await service.verify(hash, 'wrong-pass')).toBe(false);
  });

  it('kebijakan password: min 8 + huruf + angka (FR-AUTH-003/012)', () => {
    expect(PASSWORD_PATTERN.test('P4ssw0rd!')).toBe(true);
    expect(PASSWORD_PATTERN.test('InitPass1!')).toBe(true);
    expect(PASSWORD_PATTERN.test('short1')).toBe(false); // < 8
    expect(PASSWORD_PATTERN.test('abcdefgh')).toBe(false); // tanpa angka
    expect(PASSWORD_PATTERN.test('12345678')).toBe(false); // tanpa huruf
    expect(PASSWORD_PATTERN.test('')).toBe(false);
  });
});
