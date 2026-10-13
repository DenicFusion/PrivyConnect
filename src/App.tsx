import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { auth, db, doc, getDoc, setDoc, updateDoc, serverTimestamp, signOut } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { APP_CONFIG } from './config';
import { Home, Search, MessageSquare, User, Wallet, Shield, LogOut, Menu, X, Bell, Settings, AlertCircle, Lock, ShieldAlert, ShieldCheck, Activity, ArrowLeft, Mail, Key, EyeOff, Eye, Zap, Compass } from 'lucide-react';
import { PrivyHeader } from './components/PrivyHeader';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import { ToastProvider, useToast } from './components/Toaster';
import GenderModal from './components/GenderModal';

// Pages
import LandingPage from './pages/Landing';
import DiscoveryPage from './pages/Discovery';
import ProfilePage from './pages/Profile';
import ChatListPage from './pages/ChatList';
import ChatRoomPage from './pages/ChatRoom';
import AdminPage from './admin/AdminPage';
import AdminGuard from './admin/AdminGuard';
import VerifySuccessPage from './pages/VerifySuccess';
import VerifySubscriptionPage from './pages/VerifySubscription';
import EmailPreviewPage from './pages/EmailPreview';
import LoginPage from './pages/Login';
import SignupPage from './pages/Signup';
import ResetPasswordPage from './pages/ResetPassword';
import SettingsPage from './pages/Settings';
import NotificationsPage from './pages/Notifications';
import PublicProfilePage from './pages/PublicProfile';

// Subscription Guard Component
function SubscriptionGuard({ children, profile }: { children: React.ReactNode, profile: any }) {
  if (!profile) return null;

  if (!profile.is_subscribed && profile.subscription_status !== 'active') {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="relative">
          <div className="w-24 h-24 rounded-[32px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Lock className="w-10 h-10 text-amber-500" />
          </div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-[#00d1ff] flex items-center justify-center shadow-lg shadow-[#00d1ff]/20"
          >
            <ShieldCheck className="w-4 h-4 text-[#00131a]" />
          </motion.div>
        </div>

        <div className="space-y-3 max-w-md">
          <h2 className="text-4xl font-display uppercase tracking-tighter italic">Premium Access Required</h2>
          <p className="text-white/40 font-light leading-relaxed">
            Your weekly subscription has ended. Renew now to continue chatting and viewing exclusive profiles.
          </p>
        </div>

        <div className="flex flex-col w-full max-w-xs gap-4">
          <Link 
            to="/settings" 
            className="relative z-50 py-5 bg-[#00d1ff] text-[#00131a] font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Subscribe Now (₦2,000)
          </Link>
          <Link 
            to="/discovery" 
            className="relative z-50 py-5 bg-white/5 border border-white/10 text-white/60 font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all text-center"
          >
            Back to Discovery
          </Link>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
}

// Protected Route Component
function ProtectedRoute({ children, session }: { children: React.ReactNode, session: any }) {
  const location = useLocation();
  
  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  return <>{children}</>;
}

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
            className="px-8 py-3 bg-white text-black font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform cursor-pointer"
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setSession(user);
        await fetchProfile(user.uid, user);
      } else {
        setSession(null);
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfile = async (uid: string, authUser: any) => {
    try {
      const userRef = doc(db, 'profiles', uid);
      let userSnap = await getDoc(userRef);

      let data: any = null;
      if (!userSnap.exists()) {
        // Fallback create profile if missing
        const newProfile = {
          id: uid,
          email: authUser.email || '',
          username: authUser.email?.split('@')[0] || `user_${uid.slice(0, 5)}`,
          display_name: authUser.displayName || '',
          gender: '',
          is_verified: false,
          is_subscribed: false,
          is_online: true,
          created_at: serverTimestamp()
        };
        await setDoc(userRef, newProfile);
        await setDoc(doc(db, 'users', uid), newProfile);
        data = newProfile;
      } else {
        data = userSnap.data();
      }

      const userEmail = authUser.email || data.email || '';
      const isAdminEmail = userEmail.toLowerCase() === 'denic9426@gmail.com';
      const profileWithEmail = { 
        ...data, 
        email: userEmail,
        role: isAdminEmail ? 'admin' : (data.role || 'user')
      };

      setProfile(profileWithEmail);

      // Check if gender is missing
      if (!profileWithEmail.gender) {
        setShowGenderModal(true);
      }

      // Update online status
      await updateDoc(userRef, { is_online: true, last_active: new Date().toISOString() }).catch(() => {});
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
      <GenderModal 
        isOpen={showGenderModal} 
        onClose={() => setShowGenderModal(false)}
        userId={session?.uid}
        onSuccess={() => {
          setShowGenderModal(false);
          if (session?.uid) fetchProfile(session.uid, session);
        }}
      />
      <Router>
        <div className="min-h-screen bg-[#040506] text-[#f3f6f8] font-sans selection:bg-[#00d1ff]/20 selection:text-[#00d1ff] overflow-x-hidden">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-success" element={<VerifySuccessPage />} />
            <Route path="/verify-subscription" element={<VerifySubscriptionPage />} />
            <Route path="/email-preview" element={<EmailPreviewPage />} />
            <Route path="/dashboard" element={<Navigate to="/discovery" replace />} />
            
            <Route path="/discovery" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><DiscoveryPage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute session={session}><Navigate to={profile?.id ? `/profile/${profile.id}` : '/discovery'} replace /></ProtectedRoute>} />
            <Route path="/profile/:uid" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><ProfilePage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><SubscriptionGuard profile={profile}><ChatListPage profile={profile} /></SubscriptionGuard></Layout></ProtectedRoute>} />
            <Route path="/chat/:chatId" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><SubscriptionGuard profile={profile}><ChatRoomPage profile={profile} /></SubscriptionGuard></Layout></ProtectedRoute>} />
            <Route path="/wallet" element={<Navigate to="/settings" replace />} />
            <Route path="/settings" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><SettingsPage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><NotificationsPage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/u/:username" element={<PublicProfilePage />} />
            <Route path="/myadmin" element={<ProtectedRoute session={session}><AdminGuard profile={profile}><AdminPage profile={profile} /></AdminGuard></ProtectedRoute>} />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

function Layout({ children, profile, unreadCount }: { children: React.ReactNode, profile: any, unreadCount: number }) {
  const location = useLocation();
  const isChatRoom = location.pathname.startsWith('/chat/');

  const navItems = [
    { icon: Compass, label: 'DISCOVER', path: '/discovery' },
    { icon: MessageSquare, label: 'MESSAGES', path: '/chats', badge: unreadCount > 0 ? unreadCount : undefined },
    { icon: User, label: 'PROFILE', path: profile?.id ? `/profile/${profile.id}` : '/settings' },
    { icon: Settings, label: 'SETTINGS', path: '/settings' },
  ];

  return (
    <div className={cn("min-h-screen bg-[#040506] text-[#f3f6f8]", !isChatRoom && "pb-20 min-[860px]:pb-0")}>
      <aside className="hidden min-[860px]:flex fixed left-0 top-0 bottom-0 w-[96px] bg-[#090b0d] border-r border-white/[0.075] flex-col items-center justify-between py-6 z-50">
        <div className="flex flex-col items-center w-full">
          <Link to="/discovery" className="mb-8 flex flex-col items-center group">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center relative group-hover:border-[#00d1ff]/50 transition-colors">
              <span className="font-serif text-2xl font-bold italic text-white tracking-tight">P</span>
              <span className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-[#00d1ff] shadow-[0_0_6px_#00d1ff]" />
            </div>
          </Link>

          <div className="flex flex-col items-center w-full space-y-2">
            {navItems.map((item) => {
              const isActive = item.path === '/discovery' 
                ? location.pathname === '/discovery'
                : item.path === '/chats'
                  ? location.pathname.startsWith('/chats') || location.pathname.startsWith('/chat/')
                  : item.path === '/settings'
                    ? location.pathname === '/settings'
                    : location.pathname.startsWith(item.path);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={cn(
                    "w-full flex flex-col items-center justify-center py-3.5 px-1 relative transition-colors group",
                    isActive ? "text-[#00d1ff]" : "text-[#8d97a1] hover:text-[#f3f6f8]"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="rail-glow-bar"
                      className="absolute left-0 top-2 bottom-2 w-[2px] bg-[#00d1ff] rounded-r-full shadow-[0_0_8px_#00d1ff]"
                    />
                  )}
                  <div className="relative">
                    <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-105", isActive && "text-[#00d1ff]")} />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#00d1ff] text-[#00131a] font-mono font-bold text-[9px] flex items-center justify-center shadow-[0_0_6px_rgba(0,209,255,0.6)]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[10px] font-mono uppercase tracking-[0.16em] mt-1.5",
                    isActive ? "text-[#00d1ff] font-semibold" : "text-[#59636d]"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {profile && (
          <Link 
            to={profile.id ? `/profile/${profile.id}` : '/settings'}
            className="w-10 h-10 rounded-full overflow-hidden border border-white/10 hover:border-[#00d1ff] transition-all relative"
            title={profile.full_name || 'Profile'}
          >
            {profile.avatar_url || profile.photo_url ? (
              <img src={profile.avatar_url || profile.photo_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-white/5 flex items-center justify-center text-xs font-mono text-[#8d97a1]">
                {(profile.full_name || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#35e0a1] ring-2 ring-[#090b0d]" />
          </Link>
        )}
      </aside>

      <div className="min-h-screen flex flex-col flex-1 w-full min-[860px]:pl-[96px] transition-all">
        <main className={cn(
          "flex-1 w-full mx-auto",
          !isChatRoom && "max-w-6xl px-3 sm:px-6 py-6"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className={cn(isChatRoom && "h-full flex flex-col")}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {!isChatRoom && (
        <nav className="min-[860px]:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#090b0d]/95 backdrop-blur-2xl border-t border-white/[0.075] flex items-center justify-around px-2 z-50">
          <div className="flex flex-1 justify-around max-w-lg mx-auto h-full">
            {navItems.map((item) => {
              const isActive = item.path === '/discovery' 
                ? location.pathname === '/discovery'
                : item.path === '/chats'
                  ? location.pathname.startsWith('/chats') || location.pathname.startsWith('/chat/')
                  : item.path === '/settings'
                    ? location.pathname === '/settings'
                    : location.pathname.startsWith(item.path);
              const Icon = item.icon;
              
              return (
                <Link
                  key={item.label}
                  to={item.path}
                  className={cn(
                    "flex flex-col items-center justify-center py-1 px-2 transition-all relative flex-1 text-center h-full",
                    isActive ? "text-[#00d1ff]" : "text-[#59636d] hover:text-[#8d97a1]"
                  )}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="bottom-glow-bar"
                      className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-[#00d1ff] rounded-full shadow-[0_0_8px_#00d1ff]"
                    />
                  )}
                  <div className="relative">
                    <Icon className={cn("w-5 h-5 transition-transform", isActive && "scale-105 text-[#00d1ff]")} />
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-[#00d1ff] text-[#00131a] font-mono font-bold text-[9px] flex items-center justify-center shadow-[0_0_6px_rgba(0,209,255,0.6)]">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className={cn(
                    "text-[9px] font-mono tracking-[0.16em] uppercase mt-1",
                    isActive ? "text-[#00d1ff] font-semibold" : "text-[#59636d]"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
