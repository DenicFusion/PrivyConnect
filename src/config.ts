/**
 * Application Configuration
 * Toggle between Supabase (Real-time) and Mock (Local) modes
 */

export const APP_CONFIG = {
  // Set to true to use real Supabase backend, false for mock data
  USE_SUPABASE: true,
  
  // Dual Backend Configuration
  backendMode: (localStorage.getItem('backendMode') as 'supabase' | 'firebase' | 'hybrid') || 'firebase',
  storageMode: (localStorage.getItem('storageMode') as 'supabase+cloudflare' | 'firebase+cloudflare') || 'firebase+cloudflare',
  authMode: (localStorage.getItem('authMode') as 'supabase' | 'firebase') || 'firebase',

  // App Metadata
  NAME: 'PrivyConnect',
  VERSION: '1.0.0',
  
  // Feature Flags
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false,

  // Payment Gateway Configuration: 'paystack' | 'korapay' | 'both'
  PAYMENT_GATEWAY: 'both' as 'paystack' | 'korapay' | 'both',

  // Backend URL for API calls (leave empty for same-origin)
  // Use empty string to support relative paths for Vercel API routes
  BACKEND_URL: import.meta.env.VITE_BACKEND_URL || '',
};

export const updateConfig = (key: 'backendMode' | 'storageMode' | 'authMode', value: string) => {
  localStorage.setItem(key, value);
  // We don't mutate APP_CONFIG directly here to avoid reactivity issues, 
  // instead we rely on a reload or a React Context to propagate changes.
};
