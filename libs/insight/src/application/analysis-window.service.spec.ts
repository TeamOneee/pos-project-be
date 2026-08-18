import {
  analysisDateForMerchant,
  resolveAnalysisWindow,
} from './analysis-window.service';

// memverifikasi batas hari selalu mengikuti timezone merchant, bukan timezone server.
describe('analysis window', () => {
  it('BR-018: membuat analysis_date dari tanggal lokal merchant', () => {
    const date = analysisDateForMerchant(
      new Date('2026-08-18T17:30:00.000Z'),
      'Asia/Jakarta',
    );
    expect(date.toISOString()).toBe('2026-08-19T00:00:00.000Z');
  });

  it('FR-AI-002: menurunkan 30 hari lokal yang inklusif dari analysis_date', () => {
    const window = resolveAnalysisWindow(
      new Date('2026-08-19T00:00:00.000Z'),
      'Asia/Jakarta',
    );
    expect(window.periodStart.toISOString()).toBe('2026-07-20T17:00:00.000Z');
    expect(window.periodEnd.toISOString()).toBe('2026-08-19T16:59:59.999Z');
  });
});
