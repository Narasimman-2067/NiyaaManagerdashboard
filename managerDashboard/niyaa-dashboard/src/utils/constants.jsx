// ============================================================
// FILE: src/utils/constants.js
// ============================================================

/**
 * ============================================================================
 * Niyaa Dashboard - Application Constants
 * ----------------------------------------------------------------------------
 * IMPORTANT:
 * This project is currently frontend-only.
 *
 * That means:
 * - Values read from Vite env (import.meta.env) are PUBLIC after build.
 * - Do NOT store real passwords, tokens, secret keys, or DB credentials here.
 * - Use env variables only for public configuration such as URLs, timings,
 *   feature flags, labels, and storage keys.
 *
 * If real security is needed later, add a backend / proxy / protected admin
 * route instead of storing secrets in the frontend.
 * ============================================================================
 */

/* -------------------------------------------------------------------------- */
/* Internal helpers                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Safely parse boolean-like Vite env values.
 * Accepts "true" / "false" strings and falls back to the provided default.
 *
 * @param {string | undefined} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function parseEnvBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  return String(value).trim().toLowerCase() === 'true';
}

/**
 * Safely parse number-like Vite env values.
 *
 * @param {string | undefined} value
 * @param {number} fallback
 * @returns {number}
 */
function parseEnvNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/* -------------------------------------------------------------------------- */
/* App Meta                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * General app labels.
 * Safe to expose in frontend build.
 */
export const APP_NAME = import.meta.env.VITE_APP_NAME || 'Niyaa Dashboard';
export const APP_ENV = import.meta.env.VITE_APP_ENV || 'development';
export const DASHBOARD_TITLE =
  import.meta.env.VITE_DASHBOARD_TITLE || 'Niyaa Admin Dashboard';
export const ADMIN_BRAND_NAME =
  import.meta.env.VITE_ADMIN_BRAND_NAME || 'Niyaa';

/* -------------------------------------------------------------------------- */
/* API / Storage                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Public JSON endpoint used by the dashboard.
 * NOTE:
 * This is NOT a secret in a frontend-only app.
 *
 * Keep this value in `.env`.
 * If it is empty, remote sync/fetch should be treated as disabled by dataService.
 */
export const JSON_URL = import.meta.env.VITE_JSON_URL?.trim() || '';

/**
 * Local storage keys.
 * Keep these configurable so dev/prod environments do not clash if needed.
 */
export const STORAGE_KEY =
  import.meta.env.VITE_STORAGE_KEY_PRODUCTS || 'niyaa_products';

export const ENQUIRY_STORAGE_KEY =
  import.meta.env.VITE_STORAGE_KEY_ENQUIRIES || 'niyaa_enquiries';

export const DASHBOARD_VIEW_KEY =
  import.meta.env.VITE_STORAGE_KEY_DASHBOARD_VIEW || 'dashboardView';

/* -------------------------------------------------------------------------- */
/* Sync / Performance Settings                                                */
/* -------------------------------------------------------------------------- */

/**
 * Debounce delay used when batching saves.
 */
export const SAVE_DEBOUNCE_MS = parseEnvNumber(
  import.meta.env.VITE_SAVE_DEBOUNCE_MS,
  900
);

/**
 * Poll interval for optional remote refresh / sync.
 */
export const POLL_INTERVAL_MS = parseEnvNumber(
  import.meta.env.VITE_POLL_INTERVAL_MS,
  20000
);

/**
 * Max allowed upload image size in MB for product images.
 */
export const MAX_IMAGE_SIZE_MB = parseEnvNumber(
  import.meta.env.VITE_MAX_IMAGE_SIZE_MB,
  5
);

/* -------------------------------------------------------------------------- */
/* Feature Flags                                                              */
/* -------------------------------------------------------------------------- */

/**
 * These flags allow you to control optional behavior without touching code.
 * All values are public and intended only for app configuration.
 */
export const ENABLE_DEBUG = parseEnvBoolean(
  import.meta.env.VITE_ENABLE_DEBUG,
  false
);

export const ENABLE_REMOTE_SYNC = parseEnvBoolean(
  import.meta.env.VITE_ENABLE_REMOTE_SYNC,
  false
);

export const ENABLE_AUTO_POLL = parseEnvBoolean(
  import.meta.env.VITE_ENABLE_AUTO_POLL,
  false
);

export const ENABLE_IMPORT_EXPORT = parseEnvBoolean(
  import.meta.env.VITE_ENABLE_IMPORT_EXPORT,
  true
);

export const ENABLE_FALLBACK_PRODUCTS = parseEnvBoolean(
  import.meta.env.VITE_ENABLE_FALLBACK_PRODUCTS,
  true
);

/* -------------------------------------------------------------------------- */
/* Display / Branding                                                         */
/* -------------------------------------------------------------------------- */

export const DEFAULT_CURRENCY =
  import.meta.env.VITE_DEFAULT_CURRENCY || 'INR';

export const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL || '';

/* -------------------------------------------------------------------------- */
/* IMPORTANT SECURITY NOTE                                                    */
/* -------------------------------------------------------------------------- */

/**
 * DO NOT store admin credentials in frontend constants.
 *
 * REMOVE these kinds of values permanently:
 *   export const ADMIN_USERNAME = 'admin';
 *   export const ADMIN_PASSWORD = 'niyaa@2026';
 *
 * In a frontend-only app they are visible to anyone in the built JS bundle.
 *
 * If the client does not need login/logout now, do not fake auth in frontend.
 * Just remove it completely from the project.
 */

/* -------------------------------------------------------------------------- */
/* Fallback Data                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Used when:
 * - remote data is unavailable
 * - local cache is empty
 * - app needs a guaranteed minimum working state
 */
export const FALLBACK_PRODUCTS = [
  {
    id: '7-cm-bobby-gold-sparklers',
    sku: 'NCW00001',
    category: 'SPARKLERS',
    name: '7 CM Bobby Gold Sparklers',
    contents: '10 Pcs',
    price: 210,
    discount_percent: 90,
    discount_amount: 21,
    amount: 21,
    currency: 'INR',
    tax_rate: 0,
    image:
      'https://gp7rixo.xyz/wp-content/tenants/ncw-uudarti583498fdjkdg90kfd/images/7-cm-bobby-gold-sparklers.jpg',
    status: 'in_stock',
    active: true,
    stock_quantity: null,
    min_order_qty: 1,
    max_order_qty: null,
    backorder_allowed: false,
    ui_flags: {
      featured: false,
      hidden: false,
    },
  },
];

/**
 * Default enquiry counters used when no saved values are available.
 * IMPORTANT:
 * Your app currently treats enquiries as an OBJECT:
 * { day, week, month }
 *
 * Keep that consistent across:
 * - constants.js
 * - dataService.js
 * - EnquiryStats.jsx
 */
export const DEFAULT_ENQUIRIES = {
  day: 0,
  week: 0,
  month: 0,
};

/* -------------------------------------------------------------------------- */
/* UI Options                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Stock status options for product forms / filters / badges.
 */
export const STATUS_OPTIONS = [
  { value: 'in_stock', label: 'In Stock', variant: 'success' },
  { value: 'no_stock', label: 'Out of Stock', variant: 'danger' },
  { value: 'low_stock', label: 'Low Stock', variant: 'warning' },
];

/**
 * Default categories shown in the product module.
 * These can be extended dynamically by user-created categories.
 */
export const CATEGORIES = [
  'SPARKLERS',
  'ROCKETS',
  'FOUNTAINS',
  'CRACKERS',
  'ONE SOUND / TWO SOUND CRACKERS',
  'GROUND SPINNERS',
  'SKY SHOTS',
  'OTHERS',
];