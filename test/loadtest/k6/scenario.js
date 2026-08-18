// Skenario multi-aktor untuk membuktikan "workload isolation" (CASESTUDY.md):
// - 500 kasir checkout (~2x per kasir, jitter ~5 detik) selama 10 detik
// - detik ke-5: 250 owner melihat dashboard
// - detik ke-6: 500 admin update produk + melihat dashboard salah satu outlet
// Jalankan: BASE_URL=http://localhost:3001/api/v1 k6 run test/loadtest/scenario/scenario.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

// Counter kustom untuk jumlah request per beban kerja.
// (k6 tidak mengekspos sub-metric `http_reqs` di summary, jadi dihitung manual.)
const C_CHECKOUT = new Counter('checkout_requests');
const C_DASHBOARD = new Counter('dashboard_requests');
const C_ADMIN = new Counter('admin_update_requests');

const DATA = JSON.parse(open('./data.json'));
const BASE = __ENV.BASE_URL || DATA.base;
// 500 kasir x 2 checkout / 10 detik = 100/s. Diskala otomatis dari jumlah kasir.
const CHECKOUT_RATE = Math.max(1, Math.round((DATA.cashiers.length * 2) / 10));
const OWNER_BURST = Math.min(250, DATA.owners.length);

const PERIOD = (() => {
  const now = new Date();
  const from = new Date(now.getTime() - 30 * 86400000);
  return { from: from.toISOString(), to: now.toISOString() };
})();

export const options = {
  scenarios: {
    checkout: {
      executor: 'constant-arrival-rate',
      rate: CHECKOUT_RATE,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: DATA.cashiers.length,
      maxVUs: DATA.cashiers.length,
      exec: 'cashierCheckout',
    },
    ownerDashboard: {
      executor: 'shared-iterations',
      vus: OWNER_BURST,
      iterations: OWNER_BURST,
      startTime: '5s',
      maxDuration: '20s',
      exec: 'ownerDashboard',
    },
    adminBurst: {
      executor: 'shared-iterations',
      vus: DATA.admins.length,
      iterations: DATA.admins.length,
      startTime: '6s',
      maxDuration: '20s',
      exec: 'adminUpdateAndDashboard',
    },
  },
  thresholds: {
    // Bukti utama: checkout tetap responsif SAAT dashboard+admin jalan serentak.
    'http_req_duration{workload:checkout}': ['p(95)<1500', 'p(99)<3000'],
    'http_req_duration{workload:dashboard}': ['p(95)<5000'],
    'http_req_duration{workload:admin_update}': ['p(95)<5000'],
    'http_req_failed{workload:checkout}': ['rate<0.01'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(50)', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function headers(token) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function emit(res, workload, label) {
  check(res, {
    [`${label} 2xx`]: (r) => r.status >= 200 && r.status < 300,
  });
  if (res.status >= 400) {
    console.error(`[${workload}] ${label} -> ${res.status}: ${res.body.slice(0, 200)}`);
  }
}

export function cashierCheckout() {
  const c = DATA.cashiers[(__VU - 1) % DATA.cashiers.length];
  const items = [
    { product_id: c.productIds[0], quantity: 1 + (__VU + __ITER) % 2 },
    { product_id: c.productIds[1], quantity: 1 + (__VU * 7 + __ITER) % 3 },
  ];
  const res = http.post(
    `${BASE}/checkout`,
    JSON.stringify({
      checkout_request_id: `scenario-${__VU}-${__ITER}-${Date.now()}`,
      outlet_id: c.outletId,
      items,
      payment_method: 'CASH',
    }),
    { headers: headers(c.token), tags: { workload: 'checkout' } },
  );
  C_CHECKOUT.add(1);
  emit(res, 'checkout', 'checkout');
  sleep(Math.random() * 0.5);
}

export function ownerDashboard() {
  const o = DATA.owners[(__VU - 1) % DATA.owners.length];
  const res = http.get(
    `${BASE}/dashboard/summary?date_from=${PERIOD.from}&date_to=${PERIOD.to}`,
    { headers: headers(o.token), tags: { workload: 'dashboard' } },
  );
  C_DASHBOARD.add(1);
  emit(res, 'dashboard', 'dashboard');
}

export function adminUpdateAndDashboard() {
  const a = DATA.admins[(__VU - 1) % DATA.admins.length];
  const upd = http.patch(
    `${BASE}/products/${a.productId}`,
    JSON.stringify({ price: '5500' }),
    { headers: headers(a.token), tags: { workload: 'admin_update' } },
  );
  C_ADMIN.add(1);
  emit(upd, 'admin_update', 'admin update');
  const ops = http.get(
    `${BASE}/dashboard/operations?outlet_id=${a.outletId}`,
    { headers: headers(a.token), tags: { workload: 'dashboard' } },
  );
  C_DASHBOARD.add(1);
  emit(ops, 'dashboard', 'admin ops dashboard');
}

// ============================================================
// Ringkasan akhir yang mudah dibaca: angka k6 mentah (avg/p50/p95/p99)
// disulap jadi konteks per beban kerja + kaitannya ke study case.
// ============================================================
const WORKLOADS = [
  {
    tag: '{workload:checkout}',
    counter: 'checkout_requests',
    title: 'CHECKOUT (kasir)',
    desc: 'transaksi latency-sensitive — yang harus tetap cepat',
    goals: 'p95 < 1500ms, p99 < 3000ms, gagal < 1%',
  },
  {
    tag: '{workload:dashboard}',
    counter: 'dashboard_requests',
    title: 'DASHBOARD (owner/admin)',
    desc: 'beban analytical/read serentak (250 owner t=5s + admin t=6s)',
    goals: 'p95 < 5000ms',
  },
  {
    tag: '{workload:admin_update}',
    counter: 'admin_update_requests',
    title: 'ADMIN UPDATE (500 admin t=6s)',
    desc: 'beban administrative/write — trade-off: menulis ke primary',
    goals: 'p95 < 5000ms',
  },
];

export function handleSummary(data) {
  const metric = (name) => data.metrics[name];
  const dur = (ms) =>
    ms === undefined || ms === null
      ? '—'
      : ms >= 1000
        ? `${(ms / 1000).toFixed(2)}s`
        : `${Math.round(ms)}ms`;
  const pct = (fraction) => `${(fraction * 100).toFixed(2)}%`;

  const L = [];
  const line = (s = '') => L.push(s);

  line('='.repeat(74));
  line(' LOAD TEST MULTI-AKTOR — POS Platform (Study Case: Scaling Without Overspending)');
  line('='.repeat(74));
  line(` skala       : ${DATA.cashiers.length} merchant (kasir) / ${DATA.owners.length} owner / ${DATA.admins.length} admin`);
  line(` skenario    : kasir checkout ~100/dtk 10 detik + 250 owner dashboard t=5s + 500 admin t=6s`);
  line(` pool DB     : connection_limit=10 (sebesar Neon free-tier) — tanpa upgrade infra`);
  line(` durasi test : ${(data.state.testRunDurationMs / 1000).toFixed(1)}s`);
  line('');

  let allPass = true;
  for (const w of WORKLOADS) {
    const durMetric = metric(`http_req_duration${w.tag}`);
    const failMetric = metric(`http_req_failed${w.tag}`);
    const v = durMetric?.values ?? {};
    const count = metric(w.counter)?.values.count ?? 0;
    const fails = (failMetric?.values.rate ?? 0) * count;
    const ok = durMetric?.thresholds
      ? Object.values(durMetric.thresholds).every(Boolean)
      : true;
    const okFails = failMetric?.thresholds
      ? Object.values(failMetric.thresholds).every(Boolean)
      : true;
    const pass = ok && okFails;
    if (!pass) allPass = false;

    line('-'.repeat(74));
    line(` ${w.title}  —  ${w.desc}`);
    line(`   request : ${count}   gagal: ${fails.toFixed(0)} (${pct(failMetric?.values.rate ?? 0)})`);
    line(`   latensi : p50=${dur(v['p(50)'])}  p90=${dur(v['p(90)'])}  p95=${dur(v['p(95)'])}  p99=${dur(v['p(99)'])}  max=${dur(v.max)}`);
    line(`   target  : ${w.goals}`);
    line(`   hasil   : ${pass ? '✓ PASS' : '✗ FAIL'} — ${pass ? 'memenuhi budget study case' : 'melanggar budget, lihat detail di atas'}`);
    line(`             (p95 = 95% request selesai di bawah angka ini)`);
  }

  line('-'.repeat(74));
  line(` KESIMPULAN: ${allPass ? '✓ SEMUA THRESHOLD LULUS' : '✗ ADA THRESHOLD GAGAL'}`);
  if (allPass) {
    line(' Checkout kasir tetap < 1.5s (p95) SAAT dashboard + admin update jalan serentak,');
    line(' di skala 500 merchant dengan pool 10 koneksi. Konsistensi DB diverifikasi di langkah [6/6].');
  } else {
    line(' Lihat detail di atas; konsistensi DB tetap dicek di langkah [6/6] run.sh.');
  }
  line('='.repeat(74));

  return { stdout: L.join('\n') + '\n' };
}
