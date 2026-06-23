/**
 * Data Service - MyJSON.online + LocalStorage
 */
import {
    JSON_URL,
    STORAGE_KEY,
    ENQUIRY_STORAGE_KEY,
    FALLBACK_PRODUCTS,
    DEFAULT_ENQUIRIES,
} from '../utils/constants';

function safeParse(raw, fallback) {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw);
    } catch {
        return fallback;
    }
}

function readLocalProducts() {
    return safeParse(localStorage.getItem(STORAGE_KEY), null);
}

function writeLocalProducts(products) {
    if (Array.isArray(products)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    }
}

function readLocalEnquiries() {
    return safeParse(localStorage.getItem(ENQUIRY_STORAGE_KEY), DEFAULT_ENQUIRIES);
}

function writeLocalEnquiries(enquiries) {
    localStorage.setItem(ENQUIRY_STORAGE_KEY, JSON.stringify(enquiries));
}

function normalize(payload) {
    if (payload && typeof payload === 'object') {
        return {
            products: Array.isArray(payload.products) ? payload.products : [],
            enquiries: payload.enquiries || readLocalEnquiries(),
        };
    }
    if (Array.isArray(payload)) {
        return { products: payload, enquiries: readLocalEnquiries() };
    }
    return { products: FALLBACK_PRODUCTS, enquiries: DEFAULT_ENQUIRIES };
}

// Fetch Data with better first-load handling
export async function fetchStore() {
    let errorMsg = null;

    try {
        const res = await fetch(JSON_URL, { 
            cache: 'no-store',
            headers: { 'Accept': 'application/json' }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const raw = await res.json();
        const data = normalize(raw);

        writeLocalProducts(data.products);
        writeLocalEnquiries(data.enquiries);

        return { 
            ...data, 
            source: 'remote', 
            error: null 
        };
    } catch (err) {
        errorMsg = err.message;
        console.warn('Remote fetch failed, trying cache...', errorMsg);

        const local = readLocalProducts();
        if (local?.length > 0) {
            return {
                products: local,
                enquiries: readLocalEnquiries(),
                source: 'cache',
                error: null,                    // ← Don't show error if cache exists
            };
        }

        // Final fallback
        writeLocalProducts(FALLBACK_PRODUCTS);
        writeLocalEnquiries(DEFAULT_ENQUIRIES);

        return {
            products: FALLBACK_PRODUCTS,
            enquiries: DEFAULT_ENQUIRIES,
            source: 'fallback',
            error: null,                        // ← Hide error on first load fallback
        };
    }
}

// Save Data
export async function pushStore({ products, enquiries }) {
    writeLocalProducts(products);
    writeLocalEnquiries(enquiries);

    try {
        const res = await fetch(JSON_URL, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({ 
                _tenant: { id: "tenant_slug", currency: "INR" },
                products, 
                enquiries 
            }),
        });

        if (!res.ok) throw new Error(`Save failed (${res.status})`);

        return { success: true, source: 'remote' };
    } catch (err) {
        console.error('Remote sync failed:', err);
        return { 
            success: true, 
            source: 'local',
            warning: 'Saved locally only.' 
        };
    }
}

export function resetStore() {
    localStorage.clear();
    window.location.reload();
}