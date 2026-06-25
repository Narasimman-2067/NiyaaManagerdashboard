/**
 * ============================================================================
 * DATA SERVICE
 * ============================================================================
 *
 * Purpose
 * ----------------------------------------------------------------------------
 * Centralized storage layer for the dashboard.
 *
 * Responsibilities:
 *
 * 1. Fetch dashboard data.
 * 2. Save dashboard data.
 * 3. Maintain browser cache.
 * 4. Synchronize with remote storage through Vercel API.
 * 5. Provide fallback data when remote services are unavailable.
 *
 *
 * Architecture
 * ----------------------------------------------------------------------------
 *
 * React Components
 *        ↓
 * dataService.js
 *        ↓
 * /api/store (Vercel Serverless API)
 *        ↓
 * myjson.online
 *
 *
 * Why this service exists
 * ----------------------------------------------------------------------------
 *
 * Components should NEVER:
 *
 * - call fetch() directly
 * - access localStorage directly
 * - know API endpoints
 *
 * All storage concerns must remain isolated here.
 *
 * Benefits:
 *
 * ✓ Single source of truth
 * ✓ Easier maintenance
 * ✓ Easier migration to database later
 * ✓ Centralized error handling
 * ✓ Offline-friendly behavior
 *
 * ============================================================================
 */

import {
  JSON_URL,
  STORAGE_KEY,
  ENQUIRY_STORAGE_KEY,
  FALLBACK_PRODUCTS,
  DEFAULT_ENQUIRIES,
  ENABLE_REMOTE_SYNC,
} from '../utils/constants';

/* -------------------------------------------------------------------------- */
/* Configuration                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Determines whether remote synchronization should be attempted.
 */
const SHOULD_USE_REMOTE =
  ENABLE_REMOTE_SYNC &&
  Boolean(JSON_URL);

/* -------------------------------------------------------------------------- */
/* Utility Helpers                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Creates a deep clone of an object or array.
 *
 * Prevents accidental mutation of imported constants.
 *
 * @param {*} value
 * @returns {*}
 */
function clone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

/**
 * Determines whether browser localStorage can be used.
 *
 * Protects the application from runtime errors in:
 * - SSR environments
 * - Restricted browser sessions
 *
 * @returns {boolean}
 */
function canUseStorage() {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof localStorage !== 'undefined'
    );
  } catch {
    return false;
  }
}

/**
 * Safely parses JSON strings.
 *
 * Returns fallback value when parsing fails.
 *
 * @param {string|null} raw
 * @param {*} fallback
 *
 * @returns {*}
 */
function safeParse(raw, fallback) {
  if (!raw) return clone(fallback);

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn(
      '[DataService] Failed to parse JSON:',
      error
    );

    return clone(fallback);
  }
}

/**
 * Checks whether a value is a plain object.
 *
 * Excludes:
 * - arrays
 * - null
 *
 * @param {*} value
 *
 * @returns {boolean}
 */
function isObject(value) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/* -------------------------------------------------------------------------- */
/* Local Storage                                                              */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves products from browser cache.
 *
 * @returns {Array|null}
 */
function readLocalProducts() {
  if (!canUseStorage()) return null;

  return safeParse(
    localStorage.getItem(STORAGE_KEY),
    null
  );
}

/**
 * Persists products into browser cache.
 *
 * Local persistence always happens before
 * remote synchronization.
 *
 * @param {Array} products
 */
function writeLocalProducts(products) {
  if (!canUseStorage()) return;
  if (!Array.isArray(products)) return;

  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(products)
    );
  } catch (error) {
    console.warn(
      '[DataService] Failed to save products:',
      error
    );
  }
}

/**
 * Retrieves enquiry statistics from browser cache.
 *
 * @returns {Object}
 */
function readLocalEnquiries() {
  if (!canUseStorage()) {
    return clone(DEFAULT_ENQUIRIES);
  }

  return safeParse(
    localStorage.getItem(ENQUIRY_STORAGE_KEY),
    DEFAULT_ENQUIRIES
  );
}

/**
 * Persists enquiry statistics into browser cache.
 *
 * @param {Object} enquiries
 */
function writeLocalEnquiries(enquiries) {
  if (!canUseStorage()) return;

  try {
    localStorage.setItem(
      ENQUIRY_STORAGE_KEY,
      JSON.stringify(enquiries)
    );
  } catch (error) {
    console.warn(
      '[DataService] Failed to save enquiries:',
      error
    );
  }
}

/* -------------------------------------------------------------------------- */
/* Data Normalization                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Normalizes remote payloads into a consistent structure.
 *
 * Supported formats:
 *
 * Format 1:
 * {
 *   products: [],
 *   enquiries: {}
 * }
 *
 * Format 2:
 * []
 *
 * @param {*} payload
 *
 * @returns {{
 *   products:Array,
 *   enquiries:Object
 * }}
 */
function normalize(payload) {
  if (isObject(payload)) {
    return {
      products: Array.isArray(payload.products)
        ? payload.products
        : clone(FALLBACK_PRODUCTS),

      enquiries: isObject(payload.enquiries)
        ? payload.enquiries
        : clone(DEFAULT_ENQUIRIES),
    };
  }

  if (Array.isArray(payload)) {
    return {
      products: payload,
      enquiries: clone(DEFAULT_ENQUIRIES),
    };
  }

  return {
    products: clone(FALLBACK_PRODUCTS),
    enquiries: clone(DEFAULT_ENQUIRIES),
  };
}

/* -------------------------------------------------------------------------- */
/* Fallback Store                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Builds a guaranteed valid dashboard store.
 *
 * Resolution order:
 *
 * 1. Cached local data.
 * 2. Hardcoded fallback data.
 *
 * @returns {{
 *   products:Array,
 *   enquiries:Object,
 *   source:string,
 *   error:null
 * }}
 */
function buildFallbackStore() {
  const cachedProducts = readLocalProducts();
  const cachedEnquiries = readLocalEnquiries();

  if (
    Array.isArray(cachedProducts) &&
    cachedProducts.length > 0
  ) {
    return {
      products: cachedProducts,
      enquiries: cachedEnquiries,
      source: 'cache',
      error: null,
    };
  }

  writeLocalProducts(FALLBACK_PRODUCTS);
  writeLocalEnquiries(DEFAULT_ENQUIRIES);

  return {
    products: clone(FALLBACK_PRODUCTS),
    enquiries: clone(DEFAULT_ENQUIRIES),
    source: 'fallback',
    error: null,
  };
}

/* -------------------------------------------------------------------------- */
/* Public API - Fetch                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Retrieves dashboard data.
 *
 * Flow:
 *
 * 1. Attempt remote fetch.
 * 2. Normalize payload.
 * 3. Cache successful response locally.
 * 4. Return remote data.
 *
 * If remote fetch fails:
 *
 * -> use local cache
 * -> otherwise use fallback data
 *
 * @returns {Promise<Object>}
 */
export async function fetchStore() {
  if (!SHOULD_USE_REMOTE) {
    return buildFallbackStore();
  }

  try {
    const response = await fetch(JSON_URL, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const raw = await response.json();

    /**
     * myjson.online typically wraps payload inside:
     * {
     *   data: { ... }
     * }
     */
    const payload = raw.data || raw;

    const data = normalize(payload);

    writeLocalProducts(data.products);
    writeLocalEnquiries(data.enquiries);

    return {
      ...data,
      source: 'remote',
      error: null,
    };
  } catch (error) {
    console.warn(
      '[DataService] Remote fetch failed:',
      error
    );

    return buildFallbackStore();
  }
}

/* -------------------------------------------------------------------------- */
/* Public API - Save                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Persists dashboard data.
 *
 * Save strategy:
 *
 * 1. Save locally immediately.
 * 2. Attempt remote synchronization.
 * 3. Preserve local copy if remote fails.
 *
 * @param {{
 *   products:Array,
 *   enquiries:Object
 * }} payload
 *
 * @returns {Promise<Object>}
 */
export async function pushStore({
  products = [],
  enquiries = DEFAULT_ENQUIRIES,
} = {}) {
  const safeProducts = Array.isArray(products)
    ? products
    : [];

  const safeEnquiries = isObject(enquiries)
    ? enquiries
    : clone(DEFAULT_ENQUIRIES);

  /**
   * Always save locally first.
   */
  writeLocalProducts(safeProducts);
  writeLocalEnquiries(safeEnquiries);

  if (!SHOULD_USE_REMOTE) {
    return {
      success: true,
      source: 'local',
      warning: null,
    };
  }

  try {
    const payload = {
      products: safeProducts,
      enquiries: safeEnquiries,
    };

    const response = await fetch(JSON_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Save failed (${response.status})`
      );
    }

    return {
      success: true,
      source: 'remote',
      warning: null,
    };
  } catch (error) {
    console.warn(
      '[DataService] Remote sync failed:',
      error
    );

    return {
      success: true,
      source: 'local',
      warning:
        'Saved locally. Remote synchronization failed.',
    };
  }
}

/* -------------------------------------------------------------------------- */
/* Public API - Reset                                                         */
/* -------------------------------------------------------------------------- */

/**
 * Removes application-owned cached data.
 *
 * Only dashboard keys are removed.
 * localStorage.clear() is intentionally avoided.
 */
export function resetStore() {
  if (!canUseStorage()) {
    window.location.reload();
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENQUIRY_STORAGE_KEY);
  } catch (error) {
    console.warn(
      '[DataService] Failed to reset store:',
      error
    );
  }

  window.location.reload();
}