import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import AdminLogin from './AdminLogin';

import { auth } from '../lib/firebase';

interface AdminGuardProps {
  children: React.ReactNode;
  profile: any;
}

export default function AdminGuard({ children, profile }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin or the specific allowed email (case-insensitive)
  const currentEmail = (profile?.email || auth.currentUser?.email || '').toLowerCase().trim();
  const isAdminEmail = currentEmail === 'denic9426@gmail.com' || profile?.role === 'admin';

  useEffect(() => {
    // If the master admin email denic9426@gmail.com is signed in, grant immediate authorized access
    if (isAdminEmail) {
      setIsAuthorized(true);
    }
  }, [isAdminEmail]);

  if (!isAdminEmail && profile && profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 text-white">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-serif font-bold uppercase tracking-tight">Access Denied</h2>
          <p className="text-white/40 max-w-xs mx-auto text-xs font-mono">
            This area is restricted to system administrators only.
            <br />
            <span className="text-[10px] mt-2 block opacity-70 text-[#00d1ff]">
              Logged in as: {currentEmail || 'Unknown'}
            </span>
            <span className="text-[10px] mt-1 block opacity-50">
              Required admin account: denic9426@gmail.com
            </span>
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto pt-2">
            <button 
              onClick={() => window.location.href = '/discovery'}
              className="px-6 py-3 bg-[#00d1ff] text-[#00131a] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
            >
              Return to Discovery
            </button>
            <button 
              onClick={async () => {
                const { signOut } = await import('../lib/firebase');
                await signOut(auth);
                window.location.href = '/login';
              }}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors"
            >
              Logout & Sign in as Admin
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = (password: string) => {
    setIsLoading(true);
    setError(false);
    
    setTimeout(() => {
      const trimmed = password.trim().toLowerCase();
      if (trimmed === 'admin123' || trimmed === 'admin' || trimmed === 'denic9426') {
        setIsAuthorized(true);
      } else {
        setError(true);
        setIsLoading(false);
      }
    }, 400);
  };

  if (!isAuthorized) {
    return (
      <AdminLogin 
        onLogin={handleLogin} 
        isLoading={isLoading} 
        error={error} 
      />
    );
  }

  return <>{children}</>;
}
