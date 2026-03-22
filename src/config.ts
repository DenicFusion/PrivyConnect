/**
 * Application Configuration
 * Toggle between Supabase (Real-time) and Mock (Local) modes
 */

export const APP_CONFIG = {
  // Set to true to use real Supabase backend, false for mock data
  USE_SUPABASE: true,
  
  // App Metadata
  NAME: 'PrivyConnect',
  VERSION: '1.0.0',
  
  // Feature Flags
  ENABLE_NOTIFICATIONS: true,
  ENABLE_ANALYTICS: false,
};
