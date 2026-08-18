// mengubah tanggal lokal merchant menjadi batas utc tanpa bergantung pada timezone server.
export interface AnalysisWindow {
  periodStart: Date;
  periodEnd: Date;
}

interface LocalDateParts {
  year: number;
  month: number;
  day: number;
}

function readFormattedPart(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
  timezone: string,
): number {
  const part = parts.find((item) => item.type === type)?.value;
  if (!part) throw new Error(`Timezone ${timezone} tidak valid.`);
  return Number(part);
}

function localParts(value: Date, timezone: string): LocalDateParts {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(value);
  return {
    year: readFormattedPart(parts, 'year', timezone),
    month: readFormattedPart(parts, 'month', timezone),
    day: readFormattedPart(parts, 'day', timezone),
  };
}

function toDateOnly({ year, month, day }: LocalDateParts): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

function dateOnlyParts(value: Date): LocalDateParts {
  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate(),
  };
}

function addDays(value: Date, days: number): Date {
  const result = new Date(value);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function offsetAt(value: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(value);
  const localAsUtc = Date.UTC(
    readFormattedPart(parts, 'year', timezone),
    readFormattedPart(parts, 'month', timezone) - 1,
    readFormattedPart(parts, 'day', timezone),
    readFormattedPart(parts, 'hour', timezone),
    readFormattedPart(parts, 'minute', timezone),
    readFormattedPart(parts, 'second', timezone),
  );
  // format parts tidak membawa milidetik; tambahkan kembali agar offset tidak
  // menggeser batas akhir hari sebesar 999 ms.
  return localAsUtc - value.getTime() + value.getUTCMilliseconds();
}

function zonedDateTime(
  parts: LocalDateParts,
  timezone: string,
  hour: number,
  minute: number,
  second: number,
  millisecond: number,
): Date {
  const base = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    second,
    millisecond,
  );
  let result = new Date(base - offsetAt(new Date(base), timezone));
  result = new Date(base - offsetAt(result, timezone));
  return result;
}

// menghitung key dedupe tanggal lokal merchant untuk trigger insight harian.
export function analysisDateForMerchant(now: Date, timezone: string): Date {
  return toDateOnly(localParts(now, timezone));
}

// menurunkan rentang 30 hari lokal yang inklusif dari analysis_date job.
export function resolveAnalysisWindow(
  analysisDate: Date,
  timezone: string,
): AnalysisWindow {
  const endDate = toDateOnly(dateOnlyParts(analysisDate));
  const startDate = addDays(endDate, -29);
  return {
    periodStart: zonedDateTime(dateOnlyParts(startDate), timezone, 0, 0, 0, 0),
    periodEnd: zonedDateTime(dateOnlyParts(endDate), timezone, 23, 59, 59, 999),
  };
}
