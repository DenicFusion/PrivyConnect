import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import AdminLogin from './AdminLogin';

interface AdminGuardProps {
  children: React.ReactNode;
  profile: any;
}

export default function AdminGuard({ children, profile }: AdminGuardProps) {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user is admin or the specific allowed email (case-insensitive)
  const isAdminEmail = profile?.email?.toLowerCase() === 'denic9426@gmail.com';
  
  useEffect(() => {
    if (profile) {
      console.log('AdminGuard Check:', {
        email: profile.email,
        role: profile.role,
        isAdminEmail,
        isAuthorized
      });
    }
  }, [profile, isAdminEmail, isAuthorized]);

  if (profile && profile.role !== 'admin' && !isAdminEmail) {
    console.log('Admin Access Denied for:', profile?.email, 'Role:', profile?.role);
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-display font-bold uppercase tracking-tight">Access Denied</h2>
          <p className="text-white/40 max-w-xs mx-auto">
            This area is restricted to system administrators only.
            <br />
            <span className="text-[10px] mt-2 block opacity-50">Logged in as: {profile?.email || 'Unknown'}</span>
          </p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            <button 
              onClick={() => window.location.href = '/discovery'}
              className="px-6 py-3 bg-brand-blue text-brand-dark rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-transform"
            >
              Return to Safety
            </button>
            <button 
              onClick={async () => {
                const { auth, signOut } = await import('../lib/firebase');
                await signOut(auth);
                window.location.href = '/';
              }}
              className="px-6 py-3 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-colors"
            >
              Logout & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleLogin = (password: string) => {
    setIsLoading(true);
    setError(false);
    
    // Simulate system check - in production this would be a real secondary auth
    setTimeout(() => {
      if (password === 'Admin123') {
        setIsAuthorized(true);
      } else {
        setError(true);
        setIsLoading(false);
      }
    }, 800);
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
