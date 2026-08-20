// utilitas waktu kalender lokal merchant sesuai br-018 tanpa terikat timezone host.
import { ReportingBucket } from './reporting.models';

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
}

// membaca bagian tanggal dan jam lokal merchant memakai intl date time format.
function getZonedParts(value: Date, timezone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(value);
  const read = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
  };
}

// mengubah komponen kalender lokal menjadi date utc:
// 1. hitung target timestamp epoch utc dari komponen kalender lokal
// 2. format ulang candidate untuk membaca pergeseran offset aktual
// 3. lakukan koreksi selisih waktu iteratif hingga offset stabil
function localPartsToUtc(parts: ZonedParts, timezone: string): Date {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour);
  let candidate = new Date(target);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const actual = getZonedParts(candidate, timezone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
    );
    candidate = new Date(candidate.getTime() + target - represented);
  }
  return candidate;
}

// menambahkan 1 interval jam atau hari pada kalender lokal.
function addLocalBucket(
  parts: ZonedParts,
  bucket: ReportingBucket,
): ZonedParts {
  const value = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour),
  );
  if (bucket === 'HOUR') value.setUTCHours(value.getUTCHours() + 1);
  else value.setUTCDate(value.getUTCDate() + 1);
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
    hour: value.getUTCHours(),
  };
}

// menghitung batas rentang utc awal dan akhir untuk satu bucket pelaporan:
// 1. ekstrak komponen kalender lokal merchant dari waktu transaksi
// 2. setel jam ke 0 jika granularitas adalah DAY
// 3. hitung batas awal dan akhir rentang dalam representasi date utc
export function getBucketRange(
  occurredAt: Date,
  timezone: string,
  bucket: ReportingBucket,
): { start: Date; end: Date } {
  const parts = getZonedParts(occurredAt, timezone);
  if (bucket === 'DAY') parts.hour = 0;
  const next = addLocalBucket(parts, bucket);
  return {
    start: localPartsToUtc(parts, timezone),
    end: localPartsToUtc(next, timezone),
  };
}

// menghasilkan key string lokal deterministik untuk grouping map tren.
export function getLocalBucketKey(
  value: Date,
  timezone: string,
  bucket: ReportingBucket,
): string {
  const parts = getZonedParts(value, timezone);
  const date = [parts.year, parts.month, parts.day]
    .map((part, index) => String(part).padStart(index === 0 ? 4 : 2, '0'))
    .join('-');
  return bucket === 'DAY'
    ? date
    : `${date}T${String(parts.hour).padStart(2, '0')}:00`;
}

// mengekstrak jam lokal 0..23 untuk analisis pola waktu transaksi.
export function getLocalHour(value: Date, timezone: string): number {
  return getZonedParts(value, timezone).hour;
}
