import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase, signIn, logOut } from './lib/supabase';
import { Home, Search, MessageSquare, User, Wallet, Shield, LogOut, Menu, X, Bell, Settings, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Pages
import LandingPage from './pages/Landing';
import DiscoveryPage from './pages/Discovery';
import ProfilePage from './pages/Profile';
import ChatListPage from './pages/ChatList';
import ChatRoomPage from './pages/ChatRoom';
import WalletPage from './pages/Wallet';
import AdminPage from './pages/Admin';

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

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
          <Routes>
            <Route path="/" element={!session ? <LandingPage /> : <Navigate to="/discovery" />} />
            <Route path="/discovery" element={session ? <Layout profile={profile}><DiscoveryPage profile={profile} /></Layout> : <Navigate to="/" />} />
            <Route path="/profile/:uid" element={session ? <Layout profile={profile}><ProfilePage profile={profile} /></Layout> : <Navigate to="/" />} />
            <Route path="/chats" element={session ? <Layout profile={profile}><ChatListPage profile={profile} /></Layout> : <Navigate to="/" />} />
            <Route path="/chat/:chatId" element={session ? <Layout profile={profile}><ChatRoomPage profile={profile} /></Layout> : <Navigate to="/" />} />
            <Route path="/wallet" element={session ? <Layout profile={profile}><WalletPage profile={profile} /></Layout> : <Navigate to="/" />} />
            <Route path="/admin" element={session && profile?.role === 'admin' ? <Layout profile={profile}><AdminPage profile={profile} /></Layout> : <Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function Layout({ children, profile }: { children: React.ReactNode, profile: any }) {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/discovery' },
    { icon: MessageSquare, label: 'Chats', path: '/chats' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: `/profile/${profile?.id}` },
  ];

  if (profile?.role === 'admin') {
    navItems.push({ icon: Shield, label: 'Admin', path: '/admin' });
  }

  return (
    <div className="flex flex-col min-h-screen pb-20 md:pb-0 md:pl-20">
      {/* Top Bar */}
      <header className="h-16 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-40">
        <Link to="/discovery" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="font-display text-xl uppercase tracking-wider font-bold">PrivyConnect</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors relative">
            <Bell className="w-5 h-5 text-white/70" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-[#050505]" />
          </button>
          <button onClick={() => logOut()} className="p-2 hover:bg-red-500/10 rounded-full transition-colors group">
            <LogOut className="w-5 h-5 text-white/70 group-hover:text-red-500" />
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
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-4 z-50 md:top-0 md:bottom-0 md:right-auto md:w-20 md:flex-col md:border-t-0 md:border-r md:h-full">
        <div className="hidden md:flex flex-col items-center py-8 gap-8">
           {/* Logo for desktop sidebar */}
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-white" />
          </div>
        </div>
        
        <div className="flex flex-1 justify-around md:flex-col md:justify-center md:gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/discovery' && location.pathname.startsWith(item.path));
            const Icon = item.icon;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 transition-all group",
                  isActive ? "text-emerald-500" : "text-white/50 hover:text-white"
                )}
              >
                <div className={cn(
                  "p-2 rounded-xl transition-all",
                  isActive ? "bg-emerald-500/10" : "group-hover:bg-white/5"
                )}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[10px] uppercase tracking-widest font-medium md:hidden">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="hidden md:flex flex-col items-center py-8 gap-4">
          <button className="p-3 text-white/30 hover:text-white transition-colors">
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </nav>
    </div>
  );
}
