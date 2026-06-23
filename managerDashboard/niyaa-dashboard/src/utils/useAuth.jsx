import { useState, useEffect, useCallback } from 'react';
import { SESSION_KEY, SESSION_EXPIRY, ADMIN_USERNAME, ADMIN_PASSWORD } from './constants';

export function useAuth() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true); // Added loading state

    // Check for existing valid session on mount
    useEffect(() => {
        const checkSession = () => {
            try {
                const session = localStorage.getItem(SESSION_KEY);
                if (!session) {
                    setIsLoggedIn(false);
                    return;
                }

                const { expiry } = JSON.parse(session);
                
                if (Date.now() < expiry) {
                    setIsLoggedIn(true);
                } else {
                    localStorage.removeItem(SESSION_KEY);
                    setIsLoggedIn(false);
                }
            } catch (_) {
                localStorage.removeItem(SESSION_KEY);
                setIsLoggedIn(false);
            } finally {
                setIsLoading(false);
            }
        };

        checkSession();
    }, []);

    // Listen for changes in other tabs
    useEffect(() => {
        const handleStorageChange = (e) => {
            if (e.key === SESSION_KEY) {
                setIsLoggedIn(!!e.newValue);
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, []);

    const login = useCallback((username, password) => {
        if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
            try {
                const expiry = Date.now() + SESSION_EXPIRY;
                const sessionData = { username, expiry };
                
                localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
                setIsLoggedIn(true);
                return { success: true };
            } catch (error) {
                console.error('Failed to save session:', error);
                return { success: false, error: 'Failed to save session' };
            }
        }
        
        return { success: false, error: 'Invalid credentials' };
    }, []);

    const logout = useCallback(() => {
        try {
            localStorage.removeItem(SESSION_KEY);
        } catch (_) {
            // Ignore cleanup errors
        }
        setIsLoggedIn(false);
    }, []);

    return { 
        isLoggedIn, 
        isLoading, 
        login, 
        logout 
    };
}