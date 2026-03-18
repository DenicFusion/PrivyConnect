import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Check if Supabase is both enabled in config AND has valid credentials
export const isSupabaseActive = APP_CONFIG.USE_SUPABASE && 
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && !supabaseUrl.includes('placeholder'));

if (APP_CONFIG.USE_SUPABASE && !isSupabaseActive) {
  console.warn('Supabase is enabled in config but credentials are missing. Falling back to mock data.');
}

// Initialize Supabase client (even if not active, to prevent import errors)
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

// Auth Helpers
export const signIn = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/discovery',
    },
  });
  if (error) throw error;
  return data;
};

export const logOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};
