// memverifikasi konversi bucket waktu lokal merchant sesuai br-018 independen dari timezone mesin.
import {
  getBucketRange,
  getLocalBucketKey,
  getLocalHour,
} from './reporting-time';

describe('reporting time', () => {
  const occurredAt = new Date('2026-08-15T03:15:00.000Z');

  it('BR-018: membentuk hour dan day dalam timezone merchant', () => {
    expect(getBucketRange(occurredAt, 'Asia/Jakarta', 'HOUR')).toEqual({
      start: new Date('2026-08-15T03:00:00.000Z'),
      end: new Date('2026-08-15T04:00:00.000Z'),
    });
    expect(getBucketRange(occurredAt, 'Asia/Jakarta', 'DAY')).toEqual({
      start: new Date('2026-08-14T17:00:00.000Z'),
      end: new Date('2026-08-15T17:00:00.000Z'),
    });
  });

  it('menghasilkan key dan jam lokal yang konsisten', () => {
    expect(getLocalBucketKey(occurredAt, 'Asia/Jakarta', 'DAY')).toBe(
      '2026-08-15',
    );
    expect(getLocalBucketKey(occurredAt, 'Asia/Jakarta', 'HOUR')).toBe(
      '2026-08-15T10:00',
    );
    expect(getLocalHour(occurredAt, 'Asia/Jakarta')).toBe(10);
  });
});
