import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase, signIn, logOut, isSupabaseActive, signInWithEmail, signUpWithEmail } from './lib/supabase';
import { APP_CONFIG } from './config';
import { Home, Search, MessageSquare, User, Wallet, Shield, LogOut, Menu, X, Bell, Settings, AlertCircle, Lock, ShieldAlert, ShieldCheck, Activity, ArrowLeft, Mail, Key, EyeOff, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { Logo, PrivyLogo } from './components/Logo';
import { ToastProvider, useToast } from './components/Toaster';

// Pages
import LandingPage from './pages/Landing';
import DiscoveryPage from './pages/Discovery';
import ProfilePage from './pages/Profile';
import ChatListPage from './pages/ChatList';
import ChatRoomPage from './pages/ChatRoom';
import WalletPage from './pages/Wallet';
import AdminPage from './pages/Admin';
import VerifySuccessPage from './pages/VerifySuccess';
import EmailPreviewPage from './pages/EmailPreview';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-3xl font-display uppercase tracking-tighter mb-4">Something went wrong</h2>
          <p className="text-white/40 max-w-md mb-8 font-light">
            An unexpected error occurred. This might be due to a connection issue or configuration error.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
          >
            Reload App
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <pre className="mt-8 p-4 bg-white/5 border border-white/10 rounded-xl text-[10px] text-red-400 text-left max-w-full overflow-auto">
              {this.state.error?.message || String(this.state.error)}
            </pre>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

const MOCK_PROFILE = {
  id: 'mock-user-123',
  username: 'demo_user',
  display_name: 'Demo User',
  photo_url: 'https://picsum.photos/seed/demo/200/200',
  role: 'admin',
  is_verified: true,
  profile_mode: 'public',
  balance: 5000,
  created_at: new Date().toISOString()
};

const MOCK_SESSION = {
  user: {
    id: 'mock-user-123',
    email: 'demo@example.com'
  }
};

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!isSupabaseActive) {
      // Use mock data if Supabase is not active
      setSession(MOCK_SESSION);
      setProfile(MOCK_PROFILE);
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { data: user } = await supabase.auth.getUser();
        const newProfile = {
          id: uid,
          username: user.user?.email?.split('@')[0] || 'user_' + Math.random().toString(36).slice(2, 7),
          display_name: user.user?.user_metadata?.full_name || '',
          photo_url: user.user?.user_metadata?.avatar_url || '',
          role: 'user',
          is_verified: false,
          profile_mode: 'public',
          last_active: new Date().toISOString(),
          preferences: { gender: '', interests: [], availability: '' },
          location: { lat: 0, lng: 0, city: 'Unknown' }
        };
        const { data: createdProfile, error: createError } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();
        
        if (createError) throw createError;
        setProfile(createdProfile);
      } else if (error) {
        throw error;
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-white font-display text-4xl uppercase tracking-widest"
        >
          PrivyConnect
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-brand-blue/30 overflow-x-hidden">
          <Routes>
            {/* Website Experience: Landing page is public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify-success" element={<VerifySuccessPage />} />
            <Route path="/dev/emails" element={<EmailPreviewPage />} />
            
            {/* App Experience: Authentication required for these routes */}
            <Route path="/discovery" element={session ? <Layout profile={profile}><DiscoveryPage profile={profile} /></Layout> : <AuthScreen />} />
            <Route path="/profile/:uid" element={session ? <Layout profile={profile}><ProfilePage profile={profile} /></Layout> : <AuthScreen />} />
            <Route path="/chats" element={session ? <Layout profile={profile}><ChatListPage profile={profile} /></Layout> : <AuthScreen />} />
            <Route path="/chat/:chatId" element={session ? <Layout profile={profile}><ChatRoomPage profile={profile} /></Layout> : <AuthScreen />} />
            <Route path="/wallet" element={session ? <Layout profile={profile}><WalletPage profile={profile} /></Layout> : <AuthScreen />} />
            <Route path="/Myadmin" element={session && profile?.role === 'admin' ? <Layout profile={profile}><AdminGuard><AdminPage profile={profile} /></AdminGuard></Layout> : <AuthScreen />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup' | 'select'>('select');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const { toast } = useToast();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await signUpWithEmail(email, password, { username });
        if (error) throw error;
        setVerificationSent(true);
        toast('Verification email sent! Please check your inbox.', 'success');
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) throw error;
        toast('Welcome back!', 'success');
      }
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-brand-blue" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-display uppercase italic">Check your inbox</h2>
            <p className="text-white/40 text-sm font-light leading-relaxed">
              We've sent a verification link to <span className="text-white font-medium">{email}</span>. 
              Please click the link to activate your account.
            </p>
          </div>
          <div className="pt-4">
            <button 
              onClick={() => {
                // Check session again
                supabase.auth.getSession().then(({ data: { session } }) => {
                  if (session) {
                    toast('Email verified! Redirecting...', 'success');
                    window.location.href = '/discovery';
                  } else {
                    toast('Please verify your email first.', 'info');
                  }
                });
              }}
              className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(0,209,255,0.3)]"
            >
              I've verified my email
            </button>
            <button 
              onClick={() => setVerificationSent(false)}
              className="mt-4 text-[10px] text-white/20 uppercase tracking-widest font-bold hover:text-white transition-colors"
            >
              Back to login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-dark flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold z-20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12 relative z-10 text-center"
      >
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-6 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,209,255,0.1)]">
            <Logo className="w-20 h-20" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-display font-black uppercase tracking-tighter italic leading-none">
              Privy<span className="text-brand-blue">Connect</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-bold">Premium Social Infrastructure</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div 
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button 
                onClick={() => signIn()}
                className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continue with Google
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <button 
                onClick={() => setMode('login')}
                className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              >
                Login with Email
              </button>
              <button 
                onClick={() => setMode('signup')}
                className="w-full py-5 text-brand-blue font-bold uppercase tracking-widest text-[10px] hover:underline"
              >
                Create an account
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleEmailAuth}
              className="space-y-4 text-left"
            >
              <div className="space-y-4">
                {mode === 'signup' && (
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase tracking-widest font-bold">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Login'}
              </button>

              <button 
                type="button"
                onClick={() => setMode('select')}
                className="w-full py-2 text-white/20 font-bold uppercase tracking-widest text-[9px] hover:text-white transition-colors"
              >
                Back to options
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-white/20 uppercase tracking-widest leading-relaxed">
          By continuing, you agree to our <br />
          <span className="text-white/40">Terms of Service</span> & <span className="text-white/40">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const [password, setPassword] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(false);
    
    // Simulate system check
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
      <div className="min-h-screen bg-brand-dark flex items-center justify-center p-6 relative overflow-hidden">
        {/* Advanced Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/20 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
        </div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="w-full max-w-lg relative z-10"
        >
          {/* Decorative Elements */}
          <div className="absolute -top-12 -left-12 w-24 h-24 border-t-2 border-l-2 border-brand-blue/30 rounded-tl-[40px] pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-24 h-24 border-b-2 border-r-2 border-brand-blue/30 rounded-br-[40px] pointer-events-none" />

          <div className="text-center mb-12 space-y-6">
            <motion.div 
              animate={{ 
                rotateY: [0, 360],
                boxShadow: ['0 0 20px rgba(0,209,255,0.2)', '0 0 40px rgba(0,209,255,0.4)', '0 0 20px rgba(0,209,255,0.2)']
              }}
              transition={{ rotateY: { duration: 10, repeat: Infinity, ease: "linear" }, boxShadow: { duration: 2, repeat: Infinity } }}
              className="inline-flex items-center justify-center p-6 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl"
            >
              <Logo className="w-20 h-20" />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-5xl font-display font-black uppercase tracking-tighter italic leading-none">
                Privy<span className="text-brand-blue">Command</span>
              </h2>
              <div className="flex items-center justify-center gap-4">
                <div className="h-px w-8 bg-white/10" />
                <p className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-bold">Terminal Authorization Required</p>
                <div className="h-px w-8 bg-white/10" />
              </div>
            </div>
          </div>

          <div className="p-12 rounded-[56px] bg-white/5 border border-white/10 backdrop-blur-3xl space-y-10 relative overflow-hidden group shadow-[0_0_100px_rgba(0,0,0,0.5)]">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/[0.08] via-transparent to-purple-500/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
                <span className="text-[9px] uppercase tracking-widest font-bold text-brand-blue">Encrypted Session</span>
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/20 font-mono">v4.2.0-stable</span>
            </div>

            <form onSubmit={handleLogin} className="space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="flex justify-between items-end px-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/40">Access Key</label>
                  <span className="text-[9px] font-mono text-white/20">AES-256-GCM</span>
                </div>
                <div className="relative group/input">
                  <div className="absolute inset-0 bg-brand-blue/20 blur-xl opacity-0 group-focus-within/input:opacity-100 transition-opacity duration-500" />
                  <Lock className={cn(
                    "absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 transition-all duration-300",
                    error ? "text-red-500" : "text-white/20 group-focus-within/input:text-brand-blue group-focus-within/input:scale-110"
                  )} />
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError(false);
                    }}
                    placeholder="••••••••••••"
                    className={cn(
                      "w-full bg-white/5 border rounded-[32px] py-6 pl-20 pr-8 focus:outline-none transition-all text-2xl tracking-[0.3em] font-mono relative z-10",
                      error ? "border-red-500/50 bg-red-500/5 text-red-500" : "border-white/10 focus:border-brand-blue/50 focus:bg-white/10"
                    )}
                    autoFocus
                  />
                </div>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-3 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest">
                      Authorization Failed: Invalid System Key
                    </p>
                  </motion.div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isLoading}
                className="w-full py-6 bg-brand-blue text-brand-dark rounded-[32px] font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(0,209,255,0.3)] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-4 group/btn"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                    Verifying Credentials...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5 transition-transform group-hover/btn:scale-110" />
                    Initialize Command
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="mt-16 flex flex-col items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Secure Node</span>
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/5 border border-white/5 backdrop-blur-md">
                <Activity className="w-3 h-3 text-brand-blue" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">System Load: 12%</span>
              </div>
            </div>
            <div className="space-y-2 text-center">
              <p className="text-[10px] text-white/10 uppercase tracking-[0.3em] font-bold">
                Proprietary Administrative Interface
              </p>
              <p className="text-[9px] text-white/5 uppercase tracking-widest font-medium">
                © 2026 PrivyConnect Global Infrastructure
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return <>{children}</>;
}

function Layout({ children, profile }: { children: React.ReactNode, profile: any }) {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/discovery' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: MessageSquare, label: 'Chats', path: '/chats' },
    { icon: User, label: 'Profile', path: `/profile/${profile?.id}` },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 md:pl-20 overflow-x-hidden">
      {/* Top Bar */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-40">
        <Link to="/discovery">
          <PrivyLogo className="scale-90 origin-left drop-shadow-[0_0_10px_rgba(0,209,255,0.3)]" />
        </Link>
        
        <div className="flex items-center gap-3">
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors relative group">
            <Bell className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
            <span className="absolute top-3 right-3 w-2 h-2 bg-brand-blue rounded-full border-2 border-[#050505] shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
          </button>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
            <Settings className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
          </button>
          <button onClick={() => logOut()} className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-colors group">
            <LogOut className="w-5 h-5 text-red-500/70 group-hover:text-red-500" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation - Mobile Bottom / Desktop Side */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-4 z-50 md:top-0 md:bottom-0 md:right-auto md:w-20 md:flex-col md:border-t-0 md:border-r md:h-full">
        <div className="hidden md:flex flex-col items-center py-8 gap-8">
           <PrivyLogo className="md:flex-col md:gap-1 drop-shadow-[0_0_10px_rgba(0,209,255,0.3)]" />
        </div>
        
        <div className="flex flex-1 justify-around md:flex-col md:justify-center md:gap-10">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/discovery' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 transition-all group relative",
                  isActive ? "text-brand-blue" : "text-white/30 hover:text-white"
                )}
              >
                <div className={cn(
                  "p-2.5 rounded-2xl transition-all duration-500",
                  isActive ? "bg-brand-blue/10 shadow-[0_0_20px_rgba(0,209,255,0.15)]" : "group-hover:bg-white/5"
                )}>
                  <Icon className={cn("w-6 h-6 transition-transform duration-500", isActive && "scale-110")} />
                </div>
                {isActive && (
                  <motion.div 
                    layoutId="nav-glow"
                    className="absolute -bottom-1 w-1 h-1 bg-brand-blue rounded-full shadow-[0_0_10px_rgba(0,209,255,1)]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
