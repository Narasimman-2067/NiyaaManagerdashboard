/**
 * Utility Functions for Niyaa Dashboard
 */

/**
 * Convert File to Base64 string
 * @param {File} file - The file to convert
 * @returns {Promise<string>} Base64 data URL
 */
export function toBase64(file) {
    return new Promise((resolve, reject) => {
        if (!(file instanceof File)) {
            reject(new Error('Invalid file input'));
            return;
        }

        // Optional: Add size limit (e.g., 5MB)
        if (file.size > 5 * 1024 * 1024) {
            reject(new Error('File size exceeds 5MB limit'));
            return;
        }

        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Format number as Indian Rupees
 * @param {number|string} amount 
 * @returns {string}
 */
export function formatINR(amount) {
    if (amount === undefined || amount === null || isNaN(Number(amount))) {
        return '₹0';
    }

    const num = Number(amount);
    if (!isFinite(num)) return '₹0';

    return num.toLocaleString('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
}

/**
 * Generate a unique ID (client-side safe)
 * @returns {string}
 */
export function generateId() {
    // Modern approach with better randomness
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    }
    
    // Fallback for older browsers
    return Date.now().toString(36) + 
           Math.random().toString(36).slice(2, 10) + 
           Math.random().toString(36).slice(2, 6);
}

/**
 * Debounce function - delays execution until user stops calling it
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {boolean} immediate - Whether to trigger on leading edge
 * @returns {Function}
 */
export function debounce(fn, delay, immediate = false) {
    let timer = null;

    return function (...args) {
        const callNow = immediate && !timer;

        if (timer) {
            clearTimeout(timer);
        }

        timer = setTimeout(() => {
            timer = null;
            if (!immediate) fn(...args);
        }, delay);

        if (callNow) fn(...args);
    };
}

/* ==================== Additional Useful Utilities ==================== */

/**
 * Truncate text with ellipsis
 */
export function truncateText(text, maxLength = 60) {
    if (!text) return '';
    return text.length > maxLength 
        ? text.substring(0, maxLength) + '...' 
        : text;
}

/**
 * Deep clone object (simple version)
 */
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Validate email
 */
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}