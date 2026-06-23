import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './utils/useAuth';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import { fetchStore, pushStore } from './utils/dataService';
import { POLL_INTERVAL_MS, SAVE_DEBOUNCE_MS } from './utils/constants';
import { debounce } from './utils/utils';   // your utility file

function AppContent() {
    const { isLoggedIn, login, logout } = useAuth();
    
    const [products, setProducts] = useState([]);
    const [enquiries, setEnquiries] = useState({ day: 0, week: 0, month: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);

    const isInitialLoad = useRef(true);
    const saveTimeoutRef = useRef(null);

    // ==================== Load Data ====================
    const loadData = useCallback(async (showLoading = false) => {
        if (showLoading) setLoading(true);

        try {
            const result = await fetchStore();
            
            setProducts(result.products || []);
            setEnquiries(result.enquiries || { day: 0, week: 0, month: 0 });
            
            // Only show error if it's not a fallback/cache
            if (result.error && result.source === 'remote') {
                setError(result.error);
            } else {
                setError(null);
            }
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
            isInitialLoad.current = false;
        }
    }, []);

    // Initial Load + Cached Data First
    useEffect(() => {
        // Try to show cached data instantly
        const cachedProducts = localStorage.getItem('niyaa_products');
        if (cachedProducts) {
            try {
                const parsed = JSON.parse(cachedProducts);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    setProducts(parsed);
                    setLoading(false);           // Show UI immediately
                }
            } catch (_) {}
        }

        // Then fetch fresh data in background
        loadData(!cachedProducts); // Show spinner only if no cache
    }, [loadData]);

    // Polling (only after initial load)
    useEffect(() => {
        if (POLL_INTERVAL_MS <= 0) return;

        const interval = setInterval(() => {
            if (document.visibilityState === 'visible' && !isInitialLoad.current) {
                loadData(false); // silent refresh
            }
        }, POLL_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [loadData]);

    // ==================== Debounced Save ====================
    const debouncedSave = useCallback(
        debounce(async (newProducts, newEnquiries) => {
            setIsSaving(true);
            try {
                await pushStore({ products: newProducts, enquiries: newEnquiries });
                setError(null);
            } catch (err) {
                setError('Failed to save changes to cloud');
            } finally {
                setIsSaving(false);
            }
        }, SAVE_DEBOUNCE_MS),
        []
    );

    // Trigger save when products or enquiries change
    useEffect(() => {
        if (isInitialLoad.current || products.length === 0) return;

        debouncedSave(products, enquiries);
    }, [products, enquiries, debouncedSave]);

    // ==================== Handlers ====================
    const handleAdd = useCallback((product) => {
        const newProduct = {
            ...product,
            id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
        };
        setProducts(prev => [...prev, newProduct]);
    }, []);

    const handleUpdate = useCallback((id, updates) => {
        setProducts(prev =>
            prev.map(p =>
                p.id === id 
                    ? { ...p, ...updates, amount: Number(updates.amount ?? p.amount) || 0 }
                    : p
            )
        );
    }, []);

    const handleDelete = useCallback((id) => {
        if (window.confirm('Delete this product?')) {
            setProducts(prev => prev.filter(p => p.id !== id));
        }
    }, []);

    const handleToggleStatus = useCallback((id) => {
        setProducts(prev =>
            prev.map(p =>
                p.id === id
                    ? { ...p, status: p.status === 'in_stock' ? 'no_stock' : 'in_stock' }
                    : p
            )
        );
    }, []);

    const handleReset = useCallback(() => {
        if (window.confirm('Reset to fallback data?')) {
            localStorage.clear();
            loadData(true);
        }
    }, [loadData]);

    const handleExport = useCallback(() => {
        const data = { products, enquiries };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `niyaa_backup_${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }, [products, enquiries]);

    const handleImport = useCallback((file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.products) setProducts(data.products);
                if (data.enquiries) setEnquiries(data.enquiries);
                alert('Import successful!');
            } catch {
                alert('Invalid backup file');
            }
        };
        reader.readAsText(file);
    }, []);

    // ==================== Render ====================
    const requireLogin = false;

    if (requireLogin && !isLoggedIn) {
        return <Login onLogin={login} />;
    }

    if (loading && products.length === 0) {
        return (
            <div className="d-flex justify-content-center align-items-center vh-100">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading Niyaa...</span>
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
            onLogout={logout}
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
                <Route path="/login" element={<Login />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;