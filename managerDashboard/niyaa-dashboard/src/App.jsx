import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import { fetchStore, pushStore } from './utils/dataService';
import {
  POLL_INTERVAL_MS,
  SAVE_DEBOUNCE_MS,
  STORAGE_KEY,
  ENQUIRY_STORAGE_KEY,
  DASHBOARD_VIEW_KEY,
  DEFAULT_ENQUIRIES,
  ENABLE_AUTO_POLL,
  ENABLE_REMOTE_SYNC,
} from './utils/constants';
import { debounce, generateId } from './utils/utils';

/**
 * Validate enquiries payload shape.
 * Expected shape:
 * { day: number, week: number, month: number }
 */
function isValidEnquiries(value) {
  return (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value)
  );
}

/**
 * Normalize enquiries object to a safe shape.
 */
function normalizeEnquiries(value) {
  if (!isValidEnquiries(value)) {
    return { ...DEFAULT_ENQUIRIES };
  }

  return {
    day: Number(value.day) || 0,
    week: Number(value.week) || 0,
    month: Number(value.month) || 0,
  };
}

/**
 * Normalize products array to a safe shape.
 */
function normalizeProducts(value) {
  return Array.isArray(value) ? value : [];
}

function AppContent() {
  const [products, setProducts] = useState([]);
  const [enquiries, setEnquiries] = useState({ ...DEFAULT_ENQUIRIES });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Prevent save-on-first-render before initial data is loaded.
   */
  const hasLoadedInitialDataRef = useRef(false);

  /**
   * Track mount state to avoid setting state after unmount.
   */
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ============================================================
  // Load Data
  // ============================================================
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await fetchStore();

      if (!isMountedRef.current) return;

      setProducts(normalizeProducts(result.products));
      setEnquiries(normalizeEnquiries(result.enquiries));

      /**
       * Show remote error only when the service explicitly reports one.
       * Cache/fallback paths should not show noisy warning banners.
       */
      if (result?.error && result?.source === 'remote') {
        setError(result.error);
      } else {
        setError(null);
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to load store data:', err);
      setError('Failed to load dashboard data.');
    } finally {
      if (!isMountedRef.current) return;
      setLoading(false);
      hasLoadedInitialDataRef.current = true;
    }
  }, []);

  // ============================================================
  // Initial Load
  // ============================================================
  useEffect(() => {
    let hasUsableCache = false;

    /**
     * Show cached products immediately for faster perceived loading,
     * then refresh from remote/background source.
     */
    try {
      const cachedProductsRaw = localStorage.getItem(STORAGE_KEY);
      const cachedEnquiriesRaw = localStorage.getItem(ENQUIRY_STORAGE_KEY);

      const cachedProducts = cachedProductsRaw
        ? JSON.parse(cachedProductsRaw)
        : null;

      const cachedEnquiries = cachedEnquiriesRaw
        ? JSON.parse(cachedEnquiriesRaw)
        : null;

      if (Array.isArray(cachedProducts)) {
        setProducts(cachedProducts);
        setEnquiries(normalizeEnquiries(cachedEnquiries));
        hasUsableCache = true;
        setLoading(false);
      }
    } catch (err) {
      console.warn('Failed to read cached dashboard data:', err);
    }

    loadData(!hasUsableCache);
  }, [loadData]);

  // ============================================================
  // Polling
  // ============================================================
  useEffect(() => {
    /**
     * Poll only when enabled.
     * Useful if another admin/device can update the same data source.
     * For your current single-admin use case, this can stay OFF in env.
     */
    if (!ENABLE_AUTO_POLL) return;
    if (!ENABLE_REMOTE_SYNC) return;
    if (POLL_INTERVAL_MS <= 0) return;

    const intervalId = window.setInterval(() => {
      if (
        document.visibilityState === 'visible' &&
        hasLoadedInitialDataRef.current
      ) {
        loadData(false);
      }
    }, POLL_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  // ============================================================
  // Debounced Save
  // ============================================================
  const debouncedSave = useRef(
    debounce(async (nextProducts, nextEnquiries) => {
      if (!ENABLE_REMOTE_SYNC) return;

      setIsSaving(true);

      try {
        await pushStore({
          products: nextProducts,
          enquiries: nextEnquiries,
        });

        if (isMountedRef.current) {
          setError(null);
        }
      } catch (err) {
        console.error('Failed to sync store data:', err);
        if (isMountedRef.current) {
          setError('Failed to sync changes to remote storage.');
        }
      } finally {
        if (isMountedRef.current) {
          setIsSaving(false);
        }
      }
    }, SAVE_DEBOUNCE_MS)
  ).current;

  /**
   * Save whenever products or enquiries change AFTER the initial load.
   *
   * IMPORTANT:
   * Do NOT block saving when products.length === 0.
   * An empty product list may be a legitimate admin action.
   */
  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return;

    debouncedSave(products, enquiries);
  }, [products, enquiries, debouncedSave]);

  // ============================================================
  // Product Handlers
  // ============================================================
  const handleAdd = useCallback((product) => {
    const newProduct = {
      ...product,
      id: product?.id || generateId(),
    };

    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const handleUpdate = useCallback((id, updates) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const nextPrice = Number(updates.price ?? item.price) || 0;
        const nextAmount = Number(updates.amount ?? nextPrice) || 0;
        const nextDiscountPercent =
          Number(updates.discount_percent ?? item.discount_percent) || 0;

        return {
          ...item,
          ...updates,
          price: nextPrice,
          amount: nextAmount,
          discount_percent: nextDiscountPercent,
        };
      })
    );
  }, []);

  const handleDelete = useCallback((id) => {
    const confirmed = window.confirm('Delete this product?');
    if (!confirmed) return;

    setProducts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleToggleStatus = useCallback((id) => {
    setProducts((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: item.status === 'in_stock' ? 'no_stock' : 'in_stock',
            }
          : item
      )
    );
  }, []);

  // ============================================================
  // Reset
  // ============================================================
  const handleReset = useCallback(() => {
    const confirmed = window.confirm(
      'Reset local dashboard data and reload from source?'
    );
    if (!confirmed) return;

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ENQUIRY_STORAGE_KEY);
      localStorage.removeItem(DASHBOARD_VIEW_KEY);
    } catch (err) {
      console.warn('Failed to clear dashboard cache:', err);
    }

    loadData(true);
  }, [loadData]);

  // ============================================================
  // Export
  // ============================================================
  const handleExport = useCallback(() => {
    const payload = {
      products,
      enquiries,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `niyaa_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();

    URL.revokeObjectURL(url);
  }, [products, enquiries]);

  // ============================================================
  // Import
  // ============================================================
  const handleImport = useCallback((file) => {
    if (!(file instanceof File)) {
      window.alert('Please choose a valid JSON file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const raw = event?.target?.result;
        const parsed = JSON.parse(raw);

        const nextProducts = normalizeProducts(parsed?.products);
        const nextEnquiries = normalizeEnquiries(parsed?.enquiries);

        /**
         * Prevent accidental import of completely invalid JSON shape.
         */
        const hasProducts = Array.isArray(parsed?.products);
        const hasEnquiries = isValidEnquiries(parsed?.enquiries);

        if (!hasProducts && !hasEnquiries) {
          window.alert('Invalid backup file format.');
          return;
        }

        setProducts(nextProducts);
        setEnquiries(nextEnquiries);
        setError(null);

        window.alert('Import successful.');
      } catch (err) {
        console.error('Import failed:', err);
        window.alert('Invalid backup file.');
      }
    };

    reader.onerror = () => {
      window.alert('Failed to read the selected file.');
    };

    reader.readAsText(file);
  }, []);

  // ============================================================
  // Render
  // ============================================================
  if (loading && products.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading Niyaa Dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <Dashboard
      products={products}
      enquiries={enquiries}
      onAdd={handleAdd}
      onUpdate={handleUpdate}
      onDelete={handleDelete}
      onToggleStatus={handleToggleStatus}
      error={error}
      onReset={handleReset}
      onExport={handleExport}
      onImport={handleImport}
      isSaving={isSaving}
    />
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppContent />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;