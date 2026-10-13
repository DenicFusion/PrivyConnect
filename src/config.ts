/**
 * Application Configuration
 */

export const APP_CONFIG = {
  // Use Firebase backend
  USE_FIREBASE: true,
  
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
