// ============================================================
// FILE: src/utils/constants.js
// ============================================================

/* ====================== API / Storage ====================== */

// ✅ MyJSON.online - Current Live Database
export const JSON_URL = 'https://myjson.online/api/quick/51fd2b5f-ca2b-4a6d-9812-779409f19724';

// Local Storage Keys
export const STORAGE_KEY = 'niyaa_products';
export const ENQUIRY_STORAGE_KEY = 'niyaa_enquiries';
export const SESSION_KEY = 'niyaa_session';

// Session expires after 24 hours
export const SESSION_EXPIRY = 24 * 60 * 60 * 1000;

// Sync Settings
export const SAVE_DEBOUNCE_MS = 900;
export const POLL_INTERVAL_MS = 20000;

/* ====================== Auth ====================== */

export const ADMIN_USERNAME = 'admin';
export const ADMIN_PASSWORD = 'niyaa@2026';

/* ====================== Fallback Data ====================== */

export const FALLBACK_PRODUCTS = [
    {
        id: "7-cm-bobby-gold-sparklers",
        sku: "NCW00001",
        category: "SPARKLERS",
        name: "7 CM Bobby Gold Sparklers",
        contents: "10 Pcs",
        price: 210,
        discount_percent: 90,
        discount_amount: 21,
        amount: 21,
        currency: "INR",
        tax_rate: 0,
        image: "https://gp7rixo.xyz/wp-content/tenants/ncw-uudarti583498fdjkdg90kfd/images/7-cm-bobby-gold-sparklers.jpg",
        status: "in_stock",
        active: true,
        stock_quantity: null,
        min_order_qty: 1,
        max_order_qty: null,
        backorder_allowed: false,
        ui_flags: { featured: false, hidden: false }
    }
    // You can add more fallback items if needed
];

export const DEFAULT_ENQUIRIES = {
    day: 0,
    week: 0,
    month: 0,
};

/* ====================== UI Config ====================== */

export const STATUS_OPTIONS = [
    { value: 'in_stock', label: 'In Stock', variant: 'success' },
    { value: 'no_stock', label: 'Out of Stock', variant: 'danger' },
    { value: 'low_stock', label: 'Low Stock', variant: 'warning' },
];

export const CATEGORIES = [
    'SPARKLERS',
    'ROCKETS',
    'FOUNTAINS',
    'CRACKERS',
    'ONE SOUND / TWO SOUND CRACKERS',
    'GROUND SPINNERS',
    'SKY SHOTS',
    'OTHERS'
];