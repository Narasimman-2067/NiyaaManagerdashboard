// src/utils/dataService.js
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import {
  FALLBACK_PRODUCTS,
  DEFAULT_ENQUIRIES,
  STORAGE_KEY,
  ENQUIRY_STORAGE_KEY,
} from './constants';

// ------------------------------------------------------------------
// ID generation – primary key is 'rowid'
// ------------------------------------------------------------------
function generateRowId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `prod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Ensure every product has a unique `rowid`.
 * Also keeps any existing `id` for compatibility, but `rowid` is the
 * master key used for all CRUD operations.
 */
function ensureProductRowIds(products) {
  if (!Array.isArray(products)) return { products: [], mutated: true };

  const seen = new Set();
  let mutated = false;

  const result = products.map((item) => {
    const safe = item && typeof item === 'object' ? { ...item } : {};
    // Prefer existing rowid, then id, else generate new
    let rowid = safe.rowid || safe.id;

    if (!rowid || typeof rowid !== 'string' || seen.has(rowid)) {
      rowid = generateRowId();
      mutated = true;
    }
    seen.add(rowid);
    return {
      ...safe,
      rowid,               // primary key
      id: rowid,           // alias for backward compatibility
      last_updated: safe.last_updated || new Date().toISOString(),
    };
  });

  return { products: result, mutated };
}

// ------------------------------------------------------------------
// Local Storage helpers
// ------------------------------------------------------------------
const canUseStorage = () => {
  try {
    return typeof window !== 'undefined' && !!window.localStorage;
  } catch {
    return false;
  }
};

function safeJSONParse(str, fallback) {
  try {
    return str ? JSON.parse(str) : fallback;
  } catch {
    return fallback;
  }
}

function readLocalProducts() {
  if (!canUseStorage()) {
    const { products } = ensureProductRowIds([...FALLBACK_PRODUCTS]);
    return products;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  const parsed = safeJSONParse(raw, [...FALLBACK_PRODUCTS]);
  const { products, mutated } = ensureProductRowIds(parsed);
  if (mutated) writeLocalProducts(products);
  return products;
}

function writeLocalProducts(products) {
  if (!canUseStorage()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(products) ? products : []));
}

function readLocalEnquiries() {
  if (!canUseStorage()) return { ...DEFAULT_ENQUIRIES };
  const raw = localStorage.getItem(ENQUIRY_STORAGE_KEY);
  return safeJSONParse(raw, { ...DEFAULT_ENQUIRIES });
}

function writeLocalEnquiries(enquiries) {
  if (!canUseStorage()) return;
  localStorage.setItem(
    ENQUIRY_STORAGE_KEY,
    JSON.stringify(enquiries && typeof enquiries === 'object' ? enquiries : { ...DEFAULT_ENQUIRIES })
  );
}

// ------------------------------------------------------------------
// Firestore helpers
// ------------------------------------------------------------------
const getDataDoc = () => (isFirebaseConfigured && db ? doc(db, 'dashboard', 'data') : null);

function normalizeDocData(docData) {
  return {
    products: Array.isArray(docData?.products) ? docData.products : [],
    enquiries: docData?.enquiries && typeof docData.enquiries === 'object'
      ? docData.enquiries
      : { ...DEFAULT_ENQUIRIES },
  };
}

// ------------------------------------------------------------------
// Fetch data (remote + cache fallback)
// ------------------------------------------------------------------
export async function fetchDashboardData() {
  // If Firebase is not configured, use localStorage only
  if (!isFirebaseConfigured || !db) {
    console.warn('Firebase not configured → using localStorage');
    return {
      products: readLocalProducts(),
      enquiries: readLocalEnquiries(),
      source: 'local',
      error: null,
    };
  }

  const DATA_DOC = getDataDoc();
  try {
    const docSnap = await getDoc(DATA_DOC);

    if (docSnap.exists()) {
      let data = normalizeDocData(docSnap.data());
      // Ensure every product has a rowid
      const { products: safeProducts, mutated } = ensureProductRowIds(data.products);

      // If Firestore has no products, seed with fallback
      if (safeProducts.length === 0) {
        const fallback = ensureProductRowIds([...FALLBACK_PRODUCTS]);
        data.products = fallback.products;
        await setDoc(DATA_DOC, {
          products: data.products,
          enquiries: data.enquiries,
          updatedAt: new Date().toISOString(),
        });
      } else {
        data.products = safeProducts;
      }

      // Always update local cache with fresh data
      writeLocalProducts(data.products);
      writeLocalEnquiries(data.enquiries);

      // If we added/mutated rowids, push them back to Firestore
      if (mutated) {
        await setDoc(DATA_DOC, { products: data.products }, { merge: true });
      }

      return { ...data, source: 'firestore', error: null };
    }

    // First‑time setup: seed with fallback products
    const { products: seeded } = ensureProductRowIds([...FALLBACK_PRODUCTS]);
    const seedData = { products: seeded, enquiries: { ...DEFAULT_ENQUIRIES } };

    await setDoc(DATA_DOC, { ...seedData, updatedAt: new Date().toISOString() });

    writeLocalProducts(seedData.products);
    writeLocalEnquiries(seedData.enquiries);

    return { ...seedData, source: 'seed', error: null };
  } catch (error) {
    console.error('Firestore fetch error:', error);
    // Fallback to local cache
    return {
      products: readLocalProducts(),
      enquiries: readLocalEnquiries(),
      source: 'cache',
      error: 'Remote unavailable. Using local cache.',
    };
  }
}

// ------------------------------------------------------------------
// Save data (local + Firestore, merge)
// ------------------------------------------------------------------
export async function saveDashboardData({ products = [], enquiries = DEFAULT_ENQUIRIES } = {}) {
  // Ensure every product has a rowid
  const { products: safeProducts } = ensureProductRowIds(Array.isArray(products) ? products : []);
  const safeEnquiries = enquiries && typeof enquiries === 'object' ? enquiries : { ...DEFAULT_ENQUIRIES };

  // Always save locally first (for immediate persistence)
  writeLocalProducts(safeProducts);
  writeLocalEnquiries(safeEnquiries);

  if (!isFirebaseConfigured || !db) {
    console.log('Firebase disabled → saved only to localStorage');
    return { success: true, source: 'local', products: safeProducts };
  }

  const DATA_DOC = getDataDoc();
  try {
    console.log('Saving to Firestore... Products count:', safeProducts.length);

    await setDoc(
      DATA_DOC,
      {
        products: safeProducts,
        enquiries: safeEnquiries,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    console.log('✅ Successfully saved to Firestore');
    return { success: true, source: 'firestore', products: safeProducts };
  } catch (error) {
    console.error('❌ Firestore save failed:', error);
    return {
      success: true,
      source: 'cache',
      warning: 'Saved locally. Firestore sync failed.',
      products: safeProducts,
    };
  }
}

// ------------------------------------------------------------------
// Replace data (overwrite entire Firestore doc + local storage)
// ------------------------------------------------------------------
export async function replaceDashboardData({ products = [], enquiries = DEFAULT_ENQUIRIES } = {}) {
  // Ensure every product has a rowid
  const { products: safeProducts } = ensureProductRowIds(Array.isArray(products) ? products : []);
  const safeEnquiries = enquiries && typeof enquiries === 'object' ? enquiries : { ...DEFAULT_ENQUIRIES };

  // Update local storage
  writeLocalProducts(safeProducts);
  writeLocalEnquiries(safeEnquiries);

  if (!isFirebaseConfigured || !db) {
    console.log('Firebase disabled → saved only to localStorage');
    return { success: true, source: 'local', products: safeProducts };
  }

  const DATA_DOC = getDataDoc();
  try {
    console.log('Replacing Firestore data... Products count:', safeProducts.length);

    // Overwrite the entire document (no merge)
    await setDoc(DATA_DOC, {
      products: safeProducts,
      enquiries: safeEnquiries,
      updatedAt: new Date().toISOString(),
    });

    console.log('✅ Successfully replaced Firestore data');
    return { success: true, source: 'firestore', products: safeProducts };
  } catch (error) {
    console.error('❌ Firestore replace failed:', error);
    return {
      success: false,
      source: 'cache',
      warning: 'Failed to replace data in Firestore.',
      products: safeProducts,
    };
  }
}

// ------------------------------------------------------------------
// Reset – delete Firestore doc and clear localStorage, then reload
// ------------------------------------------------------------------
export async function resetDashboardData() {
  try {
    if (isFirebaseConfigured && db) {
      const DATA_DOC = getDataDoc();
      if (DATA_DOC) await deleteDoc(DATA_DOC);
    }
  } catch (e) {
    console.warn('Reset warning:', e);
  }

  if (canUseStorage()) {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ENQUIRY_STORAGE_KEY);
  }

  window.location.reload();
}