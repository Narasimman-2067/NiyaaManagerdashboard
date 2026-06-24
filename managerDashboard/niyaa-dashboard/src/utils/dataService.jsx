/**
 * ============================================================================
 * Data Service
 * ----------------------------------------------------------------------------
 * Purpose:
 * - Manages store data (products + enquiries)
 * - Uses localStorage as the guaranteed working data source
 * - Optionally syncs to remote JSON endpoint in environments where it is allowed
 *
 * Why this version?
 * - Your current remote endpoint is blocked by CORS when called directly
 *   from the browser (localhost / frontend origin).
 * - To keep the dashboard production-safe and error-free, this service:
 *    1) works fully with localStorage
 *    2) only attempts remote sync when explicitly enabled
 *    3) suppresses noisy CORS failures during local development
 *
 * Recommended production architecture:
 *   Frontend -> your backend/proxy -> remote JSON provider
 * ============================================================================
 */

import {
  JSON_URL,
  STORAGE_KEY,
  ENQUIRY_STORAGE_KEY,
  FALLBACK_PRODUCTS,
  DEFAULT_ENQUIRIES,
} from '../utils/constants';

/* -------------------------------------------------------------------------- */
/* Environment Configuration                                                  */
/* -------------------------------------------------------------------------- */

/**
 * Detect whether the app is running in local development.
 * Vite exposes import.meta.env.DEV during development.
 */
const IS_DEV =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  Boolean(import.meta.env.DEV);

/**
 * IMPORTANT:
 * Direct browser requests to your current myjson.online endpoint are being
 * blocked by CORS. Because of that, remote sync should be OFF by default.
 *
 * If later you move to:
 * - a backend proxy, or
 * - a remote endpoint that supports browser CORS
 *
 * then you can enable remote sync by setting:
 * VITE_ENABLE_REMOTE_SYNC=true
 */
const ENABLE_REMOTE_SYNC =
  typeof import.meta !== 'undefined' &&
  import.meta.env &&
  import.meta.env.VITE_ENABLE_REMOTE_SYNC === 'true';

/**
 * Final flag used by fetch/save methods.
 * We keep remote sync disabled by default unless explicitly enabled.
 */
const SHOULD_USE_REMOTE = Boolean(JSON_URL) && ENABLE_REMOTE_SYNC;

/* -------------------------------------------------------------------------- */
/* Utility Helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Returns true if localStorage is available and usable.
 */
function canUseStorage() {
  try {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Deep clone helper to prevent accidental mutation of imported constants.
 */
function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/**
 * Safe JSON.parse wrapper.
 * Returns fallback if parsing fails.
 */
function safeParse(raw, fallback) {
  if (!raw) return clone(fallback);

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('[DataService] Failed to parse cached JSON:', error);
    return clone(fallback);
  }
}

/**
 * Returns true if the value is a plain object.
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/* -------------------------------------------------------------------------- */
/* Local Storage Access                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Read cached products from localStorage.
 * Returns:
 * - array of products if valid
 * - null if missing / invalid
 */
function readLocalProducts() {
  if (!canUseStorage()) return null;
  return safeParse(localStorage.getItem(STORAGE_KEY), null);
}

/**
 * Persist products to localStorage.
 */
function writeLocalProducts(products) {
  if (!canUseStorage()) return;
  if (!Array.isArray(products)) return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (error) {
    console.warn('[DataService] Failed to write products to localStorage:', error);
  }
}

/**
 * Read cached enquiries from localStorage.
 */
function readLocalEnquiries() {
  if (!canUseStorage()) return clone(DEFAULT_ENQUIRIES);
  return safeParse(localStorage.getItem(ENQUIRY_STORAGE_KEY), DEFAULT_ENQUIRIES);
}

/**
 * Persist enquiries to localStorage.
 */
function writeLocalEnquiries(enquiries) {
  if (!canUseStorage()) return;

  try {
    const safeValue = Array.isArray(enquiries)
      ? enquiries
      : clone(DEFAULT_ENQUIRIES);

    localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(safeValue));
  } catch (error) {
    console.warn('[DataService] Failed to write enquiries to localStorage:', error);
  }
}

/* -------------------------------------------------------------------------- */
/* Data Normalization                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes remote/local payload into a consistent store shape.
 *
 * Supported payload formats:
 * 1) { products: [...], enquiries: [...] }
 * 2) [...]  // product-only legacy format
 */
function normalize(payload) {
  if (isObject(payload)) {
    return {
      products: Array.isArray(payload.products)
        ? payload.products
        : clone(FALLBACK_PRODUCTS),

      enquiries: Array.isArray(payload.enquiries)
        ? payload.enquiries
        : readLocalEnquiries(),
    };
  }

  if (Array.isArray(payload)) {
    return {
      products: payload,
      enquiries: readLocalEnquiries(),
    };
  }

  return {
    products: clone(FALLBACK_PRODUCTS),
    enquiries: clone(DEFAULT_ENQUIRIES),
  };
}

/* -------------------------------------------------------------------------- */
/* Fallback Builders                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Returns a guaranteed valid store object using local cache or hardcoded
 * fallback defaults.
 */
function buildLocalOrFallbackStore() {
  const cachedProducts = readLocalProducts();
  const cachedEnquiries = readLocalEnquiries();

  if (Array.isArray(cachedProducts) && cachedProducts.length > 0) {
    return {
      products: cachedProducts,
      enquiries: Array.isArray(cachedEnquiries)
        ? cachedEnquiries
        : clone(DEFAULT_ENQUIRIES),
      source: 'cache',
      error: null,
    };
  }

  const fallbackProducts = clone(FALLBACK_PRODUCTS);
  const fallbackEnquiries = clone(DEFAULT_ENQUIRIES);

  writeLocalProducts(fallbackProducts);
  writeLocalEnquiries(fallbackEnquiries);

  return {
    products: fallbackProducts,
    enquiries: fallbackEnquiries,
    source: 'fallback',
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API - Fetch                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Fetch store data.
 *
 * Strategy:
 * 1) If remote sync is disabled -> use local/fallback immediately
 * 2) If remote sync is enabled -> try remote GET
 * 3) If remote GET fails -> use local/fallback
 *
 * This avoids CORS noise during local development and keeps the dashboard
 * fully usable offline.
 */
export async function fetchStore() {
  /**
   * If remote sync is not enabled, do not attempt browser fetch.
   * This is the key fix for your current console spam.
   */
  if (!SHOULD_USE_REMOTE) {
    if (IS_DEV) {
      console.info(
        '[DataService] Remote sync disabled. Using local cache/fallback store.'
      );
    }
    return buildLocalOrFallbackStore();
  }

  try {
    const res = await fetch(JSON_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const raw = await res.json();
    const data = normalize(raw);

    writeLocalProducts(data.products);
    writeLocalEnquiries(data.enquiries);

    return {
      ...data,
      source: 'remote',
      error: null,
    };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : 'Unknown fetch error';

    console.warn(
      '[DataService] Remote fetch failed. Falling back to local cache:',
      errorMsg
    );

    return buildLocalOrFallbackStore();
  }
}

/* -------------------------------------------------------------------------- */
/* Public API - Save                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Save store data.
 *
 * Behavior:
 * - Always writes to localStorage first (so UI remains fast/offline-safe)
 * - Only attempts remote PUT if remote sync is explicitly enabled
 *
 * Return values:
 * - { success: true, source: 'local' } when local-only mode is active
 * - { success: true, source: 'remote' } when remote sync succeeds
 * - { success: true, source: 'local', warning: ... } when remote sync fails
 */
export async function pushStore({ products = [], enquiries = [] } = {}) {
  const safeProducts = Array.isArray(products) ? products : [];
  const safeEnquiries = Array.isArray(enquiries)
    ? enquiries
    : clone(DEFAULT_ENQUIRIES);

  /* Always persist locally first */
  writeLocalProducts(safeProducts);
  writeLocalEnquiries(safeEnquiries);

  /**
   * If remote sync is disabled, treat local save as the successful result.
   * This removes the PUT CORS error you are currently seeing.
   */
  if (!SHOULD_USE_REMOTE) {
    if (IS_DEV) {
      console.info(
        '[DataService] Remote sync disabled. Data saved locally only.'
      );
    }

    return {
      success: true,
      source: 'local',
      warning: null,
    };
  }

  try {
    const payload = {
      _tenant: {
        id: 'tenant_slug',
        currency: 'INR',
      },
      products: safeProducts,
      enquiries: safeEnquiries,
    };

    const res = await fetch(JSON_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(`Save failed (${res.status})`);
    }

    return {
      success: true,
      source: 'remote',
      warning: null,
    };
  } catch (error) {
    console.warn(
      '[DataService] Remote sync failed. Data remains saved locally:',
      error
    );

    return {
      success: true,
      source: 'local',
      warning: 'Saved locally only. Remote sync failed.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Public API - Reset                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Clears only the app-owned local storage keys and reloads the page.
 * We do NOT call localStorage.clear() because that could wipe unrelated data.
 */
export function resetStore() {
  if (!canUseStorage()) {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENQUIRY_STORAGE_KEY);
  } catch (error) {
    console.warn('[DataService] Failed to reset local store:', error);
  }

  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}