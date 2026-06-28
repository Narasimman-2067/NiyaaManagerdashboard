import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import AlertModal from './components/AlertModal';
import { fetchDashboardData, saveDashboardData, replaceDashboardData } from './utils/dataService';
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

function normalizeEnquiries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_ENQUIRIES };
  }
  return {
    day: Number(value.day) || 0,
    week: Number(value.week) || 0,
    month: Number(value.month) || 0,
  };
}

function normalizeProducts(value) {
  return Array.isArray(value) ? value : [];
}

function AppContent() {
  const [products, setProducts] = useState([]);
  const [enquiries, setEnquiries] = useState({ ...DEFAULT_ENQUIRIES });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Alert modal state
  const [alert, setAlert] = useState({
    show: false,
    title: '',
    message: '',
    variant: 'info',
    confirmText: 'OK',
    onConfirm: null,
    showCancel: false,
    cancelText: 'Cancel',
    onCancel: null,
  });

  const hasLoadedInitialDataRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // ---------- Show custom alert ----------
  const showAlert = (title, message, variant = 'info', confirmText = 'OK', onConfirm = null, showCancel = false, cancelText = 'Cancel', onCancel = null) => {
    setAlert({
      show: true,
      title,
      message,
      variant,
      confirmText,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, show: false }))),
      showCancel,
      cancelText,
      onCancel: onCancel || (() => setAlert(prev => ({ ...prev, show: false }))),
    });
  };

  // ---------- Load Data ----------
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const result = await fetchDashboardData();
      if (!isMountedRef.current) return;
      setProducts(normalizeProducts(result.products));
      setEnquiries(normalizeEnquiries(result.enquiries));
      if (result?.error && result?.source === 'remote') setError(result.error);
      else setError(null);
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

  // ---------- Initial Load ----------
  useEffect(() => {
    let hasCache = false;
    try {
      const cachedProductsRaw = localStorage.getItem(STORAGE_KEY);
      const cachedEnquiriesRaw = localStorage.getItem(ENQUIRY_STORAGE_KEY);
      if (cachedProductsRaw) {
        const cachedProducts = JSON.parse(cachedProductsRaw);
        const cachedEnquiries = cachedEnquiriesRaw ? JSON.parse(cachedEnquiriesRaw) : null;
        setProducts(normalizeProducts(cachedProducts));
        setEnquiries(normalizeEnquiries(cachedEnquiries));
        hasCache = true;
        setLoading(false);
      }
    } catch (err) {
      console.warn('Failed to read cached data:', err);
    }
    loadData(!hasCache);
  }, [loadData]);

  // ---------- Polling ----------
  useEffect(() => {
    if (!ENABLE_AUTO_POLL || !ENABLE_REMOTE_SYNC || POLL_INTERVAL_MS <= 0) return;
    const intervalId = setInterval(() => {
      if (document.visibilityState === 'visible' && hasLoadedInitialDataRef.current) {
        loadData(false);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [loadData]);

  // ---------- Save ----------
  const debouncedSave = useRef(
    debounce(async (nextProducts, nextEnquiries) => {
      if (!ENABLE_REMOTE_SYNC) return;
      setIsSaving(true);
      try {
        await saveDashboardData({
          products: nextProducts,
          enquiries: nextEnquiries,
        });
        if (isMountedRef.current) setError(null);
      } catch (err) {
        console.error('Failed to sync store data:', err);
        if (isMountedRef.current) setError('Failed to sync changes to remote storage.');
      } finally {
        if (isMountedRef.current) setIsSaving(false);
      }
    }, SAVE_DEBOUNCE_MS)
  ).current;

  useEffect(() => {
    if (!hasLoadedInitialDataRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(enquiries));
    } catch (e) {}
    debouncedSave(products, enquiries);
  }, [products, enquiries, debouncedSave]);

  // ---------- CRUD handlers (using rowid as primary key) ----------
  const handleAdd = useCallback((product) => {
    // product already has rowid from ProductsManager
    const newProduct = {
      ...product,
      id: product?.id || product?.rowid || generateId(),
      rowid: product?.rowid || generateId(),
      last_updated: new Date().toISOString(),
    };
    setProducts((prev) => [...prev, newProduct]);
  }, []);

  const handleUpdate = useCallback((rowid, updates) => {
    setProducts((prev) =>
      prev.map((item) => {
        // Match by rowid (or fallback to id for compatibility)
        const itemId = item.rowid || item.id;
        if (itemId !== rowid) return item;
        return {
          ...item,
          ...updates,
          rowid: item.rowid || item.id,  // preserve rowid
          id: item.id || item.rowid,     // preserve id
          last_updated: new Date().toISOString(),
        };
      })
    );
  }, []);

  const handleDelete = useCallback((rowid) => {
    showAlert(
      'Confirm Delete',
      'Are you sure you want to delete this product?',
      'danger',
      'Delete',
      () => {
        setProducts((prev) => prev.filter((item) => {
          const itemId = item.rowid || item.id;
          return itemId !== rowid;
        }));
        setAlert(prev => ({ ...prev, show: false }));
      },
      true,
      'Cancel',
      () => setAlert(prev => ({ ...prev, show: false }))
    );
  }, []);

  const handleToggleStatus = useCallback((rowid) => {
    setProducts((prev) =>
      prev.map((item) => {
        const itemId = item.rowid || item.id;
        if (itemId !== rowid) return item;
        return {
          ...item,
          status: item.status === 'in_stock' ? 'no_stock' : 'in_stock',
          last_updated: new Date().toISOString(),
        };
      })
    );
  }, []);

  // ---------- Reset ----------
  const handleReset = useCallback(() => {
    showAlert(
      'Confirm Reset',
      'Reset local data and reload from source?',
      'warning',
      'Reset',
      () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(ENQUIRY_STORAGE_KEY);
          localStorage.removeItem(DASHBOARD_VIEW_KEY);
        } catch (e) {}
        hasLoadedInitialDataRef.current = false;
        loadData(true);
        setAlert(prev => ({ ...prev, show: false }));
      },
      true,
      'Cancel',
      () => setAlert(prev => ({ ...prev, show: false }))
    );
  }, [loadData]);

  // ---------- Export ----------
  const handleExport = useCallback(() => {
    const payload = { products, enquiries, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `niyaa_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [products, enquiries]);

  // ---------- Import (with validation & replace) ----------
  const handleImport = useCallback((file) => {
    if (!file) {
      showAlert('Error', 'No file selected.', 'danger');
      return;
    }
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    if (fileType !== 'application/json' && !fileName.endsWith('.json')) {
      showAlert('Error', 'Please upload a valid .json file.', 'danger');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        let importedProducts = parsed?.products;
        const importedEnquiries = normalizeEnquiries(parsed?.enquiries);

        if (!Array.isArray(importedProducts) || importedProducts.length === 0) {
          showAlert('Error', 'No products found in the JSON file.', 'danger');
          return;
        }

        showAlert(
          'Confirm Import',
          `This will replace ALL existing products with ${importedProducts.length} products from the file. Continue?`,
          'warning',
          'Replace',
          async () => {
            setAlert(prev => ({ ...prev, show: false }));
            setIsSaving(true);
            try {
              const result = await replaceDashboardData({
                products: importedProducts,
                enquiries: importedEnquiries,
              });
              if (result.success) {
                setProducts(normalizeProducts(result.products));
                setEnquiries(normalizeEnquiries(importedEnquiries));
                showAlert('Success', 'Data replaced successfully!', 'success');
              } else {
                showAlert('Error', 'Failed to replace data: ' + (result.warning || 'Unknown error'), 'danger');
              }
            } catch (err) {
              console.error('Import replace error:', err);
              showAlert('Error', 'Failed to replace data. Please try again.', 'danger');
            } finally {
              setIsSaving(false);
            }
          },
          true,
          'Cancel',
          () => setAlert(prev => ({ ...prev, show: false }))
        );
      } catch (err) {
        console.error('Import parse error:', err);
        showAlert('Error', 'Invalid JSON file. Please check the format.', 'danger');
      }
    };
    reader.onerror = () => {
      showAlert('Error', 'Failed to read file.', 'danger');
    };
    reader.readAsText(file);
  }, []);

  // ---------- Render ----------
  if (loading && products.length === 0) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <>
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
      <AlertModal
        show={alert.show}
        onHide={() => setAlert(prev => ({ ...prev, show: false }))}
        title={alert.title}
        message={alert.message}
        variant={alert.variant}
        confirmText={alert.confirmText}
        onConfirm={alert.onConfirm}
        showCancel={alert.showCancel}
        cancelText={alert.cancelText}
        onCancel={alert.onCancel}
      />
    </>
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