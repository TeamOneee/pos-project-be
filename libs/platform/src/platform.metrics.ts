import { Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

export const posCheckoutTotal = new Counter({
  name: 'pos_checkout_total',
  help: 'Total checkout attempts',
  labelNames: ['payment_method', 'status'],
});

export const posRevenueTotal = new Counter({
  name: 'pos_revenue_total',
  help: 'Total revenue from completed checkouts',
  labelNames: ['payment_method'],
});

export const posItemsSoldTotal = new Counter({
  name: 'pos_items_sold_total',
  help: 'Total items sold',
});

export const posStockMovementsTotal = new Counter({
  name: 'pos_stock_movements_total',
  help: 'Total stock movements',
  labelNames: ['type'],
});

export const posUserLoginsTotal = new Counter({
  name: 'pos_user_logins_total',
  help: 'Total successful user logins',
  labelNames: ['role'],
});

export const posAiJobsTotal = new Counter({
  name: 'pos_ai_jobs_total',
  help: 'Total AI analysis jobs by state',
  labelNames: ['state'],
});

export const posCacheOperationsTotal = new Counter({
  name: 'pos_cache_operations_total',
  help: 'Total cache operations',
  labelNames: ['operation'],
});
