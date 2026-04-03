import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { supabase, signIn, logOut, isSupabaseActive, signInWithEmail, signUpWithEmail } from './lib/supabase';
import { APP_CONFIG } from './config';
import { Home, Search, MessageSquare, User, Wallet, Shield, LogOut, Menu, X, Bell, Settings, AlertCircle, Lock, ShieldAlert, ShieldCheck, Activity, ArrowLeft, Mail, Key, EyeOff, Eye, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Components
import { Logo, PrivyLogo } from './components/Logo';
import { requestNotificationPermission, onForegroundMessage } from './lib/firebase';
import { ToastProvider, useToast } from './components/Toaster';

// Pages
import LandingPage from './pages/Landing';
import DiscoveryPage from './pages/Discovery';
import ProfilePage from './pages/Profile';
import ChatListPage from './pages/ChatList';
import ChatRoomPage from './pages/ChatRoom';
import WalletPage from './pages/Wallet';
import AdminPage from './admin/AdminPage';
import AdminGuard from './admin/AdminGuard';
import VerifySuccessPage from './pages/VerifySuccess';
import VerifySubscriptionPage from './pages/VerifySubscription';
import EmailPreviewPage from './pages/EmailPreview';
import LoginPage from './pages/Login';
import ResetPasswordPage from './pages/ResetPassword';
import SettingsPage from './pages/Settings';
import NotificationsPage from './pages/Notifications';
import PublicProfilePage from './pages/PublicProfile';
import Onboarding from './components/Onboarding';

// Subscription Guard Component
function SubscriptionGuard({ children, profile }: { children: React.ReactNode, profile: any }) {
  const location = useLocation();
  
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
            className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand-blue flex items-center justify-center shadow-lg shadow-brand-blue/20"
          >
            <ShieldCheck className="w-4 h-4 text-black" />
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
            to="/wallet" 
            className="relative z-50 py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" />
            Subscribe Now (₦1,500)
          </Link>
          <Link 
            to="/discovery" 
            className="relative z-50 py-5 bg-white/5 border border-white/10 text-white/60 font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all text-center"
          >
            Back to Discovery
          </Link>
        </div>

        <div className="flex items-center gap-6 pt-8 opacity-20 grayscale">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secure Payment</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Instant Access</span>
          </div>
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
  is_subscribed: true,
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
  const [unreadCount, setUnreadCount] = useState(0);
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
      console.log('Fetching profile for:', uid);
      
      // Strict profile fetching: Get user first to ensure session is valid
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('No auth user found');

      let { data, error } = await supabase
        .from('profiles')
        .select('*, wallet(balance)')
        .eq('id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // Fallback: Create profile if it doesn't exist
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert([
            { 
              id: user.id,
              username: user.email?.split('@')[0] || `user_${user.id.slice(0, 5)}`,
              display_name: user.user_metadata?.full_name || '',
              created_at: new Date().toISOString()
            }
          ])
          .select('*, wallet(balance)')
          .single();
        
        if (createError) {
          console.error('Error creating fallback profile:', createError);
          throw new Error('User profile not found and could not be created.');
        }
        data = newProfile;
        error = null;
      } else if (error) {
        console.error('Supabase error fetching profile:', error);
        throw error;
      }

      if (data) {
        console.log('Profile fetched successfully:', data);
        // Force admin role for the specific admin email
        const isAdminEmail = user.email?.toLowerCase() === 'denic9426@gmail.com';
        const profileWithEmail = { 
          ...data, 
          email: user.email,
          role: isAdminEmail ? 'admin' : data.role 
        };
        setProfile(profileWithEmail);
        fetchUnreadCount(user.id);

        // Update online status
        if (isSupabaseActive) {
          await supabase
            .from('profiles')
            .update({ is_online: true, last_active: new Date().toISOString() })
            .eq('id', user.id);
          
          // Set up heartbeat or cleanup on window close
          const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
              supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
            } else {
              supabase.from('profiles').update({ is_online: true, last_active: new Date().toISOString() }).eq('id', user.id);
            }
          };
          document.addEventListener('visibilitychange', handleVisibilityChange);
          window.addEventListener('beforeunload', () => {
            supabase.from('profiles').update({ is_online: false }).eq('id', user.id);
          });

          // Subscribe to notifications for unread count
          const channel = supabase
            .channel(`unread-notifications-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table: 'notifications',
                filter: `user_id=eq.${user.id}`
              },
              () => {
                fetchUnreadCount(user.id);
              }
            )
            .subscribe();
        }

        // Handle Push Notifications
        if (isSupabaseActive) {
          const token = await requestNotificationPermission();
          if (token && token !== data.push_token) {
            await supabase
              .from('profiles')
              .update({ push_token: token })
              .eq('id', user.id);
          }

          onForegroundMessage((payload) => {
            console.log('Foreground message received:', payload);
            toast(payload.notification.body, 'info');
          });

          // Real-time profile updates
          const profileChannel = supabase
            .channel(`profile-updates-${user.id}`)
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${user.id}`
              },
              (payload) => {
                console.log('Real-time profile update received:', payload.new);
                setProfile((prev: any) => ({
                  ...prev,
                  ...payload.new
                }));
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'wallet',
                filter: `profile_id=eq.${user.id}`
              },
              (payload) => {
                console.log('Real-time wallet update received:', payload.new);
                setProfile((prev: any) => ({
                  ...prev,
                  wallet: payload.new
                }));
              }
            )
            .subscribe();
        }
      }
    } catch (err) {
      console.error('Error in fetchProfile:', err);
      // Only toast if we actually have a session and it's not a background fetch failure
      if (session) {
        toast('Failed to load profile. Please try refreshing.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchUnreadCount = async (uid: string) => {
    if (!isSupabaseActive) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', uid)
      .eq('is_read', false);
    
    if (!error) setUnreadCount(count || 0);
  };

  useEffect(() => {
    if (!profile?.id || !isSupabaseActive) return;

    const checkSubscriptionStatus = async () => {
      const now = new Date();
      const expiryDate = profile.subscription_expiry ? new Date(profile.subscription_expiry) : null;
      
      if (!expiryDate) return;

      const timeLeft = expiryDate.getTime() - now.getTime();
      const hoursLeft = timeLeft / (1000 * 60 * 60);

      // 1. Handle Auto-Renewal
      if (hoursLeft <= 0 && profile.auto_renew && profile.wallet?.balance >= 1500) {
        try {
          console.log('Attempting auto-renewal for:', profile.id);
          const newExpiry = new Date();
          newExpiry.setDate(newExpiry.getDate() + 7); // 1 week

          // Use a transaction-like approach
          const { error: renewError } = await supabase.rpc('handle_subscription_renewal', {
            user_id: profile.id,
            amount: 1500,
            new_expiry: newExpiry.toISOString()
          });

          if (!renewError) {
            toast('Subscription auto-renewed successfully!', 'success');
            fetchProfile(profile.id);
            
            // Notify user
            await supabase.from('notifications').insert({
              user_id: profile.id,
              type: 'subscription',
              title: 'Subscription Auto-Renewed',
              message: 'Your weekly subscription has been automatically renewed using your wallet balance.',
              link: '/wallet'
            });
          }
        } catch (err) {
          console.error('Auto-renewal failed:', err);
        }
      }

      // 2. Handle Retention Alerts (48h and 24h)
      if (hoursLeft > 0 && hoursLeft <= 48) {
        const alertType = hoursLeft <= 24 ? 'retention_24h' : 'retention_48h';
        
        // Check if already notified for this expiry
        const { data: existingNotif } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', profile.id)
          .eq('type', 'retention')
          .gte('created_at', new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString())
          .maybeSingle();

        if (!existingNotif) {
          const message = hoursLeft <= 24 
            ? "Your subscription expires in less than 24 hours. Renew now to stay connected!"
            : "Your subscription expires in 48 hours. Don't lose your premium benefits!";
          
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'retention',
            title: 'Subscription Expiring Soon',
            message,
            link: '/wallet'
          });
          
          // Also trigger email via our API
          fetch('/api/send-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'retention',
              recipientId: profile.id,
              message
            })
          }).catch(console.error);
        }
      }
    };

    checkSubscriptionStatus();
    const interval = setInterval(checkSubscriptionStatus, 1000 * 60 * 60); // Check every hour
    return () => clearInterval(interval);
  }, [profile?.id, profile?.subscription_expiry, profile?.auto_renew, profile?.wallet?.balance]);

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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-success" element={<VerifySuccessPage />} />
            <Route path="/verify-subscription" element={<VerifySubscriptionPage />} />
            <Route path="/email-preview" element={<EmailPreviewPage />} />
            
            {/* App Experience: Authentication required for these routes */}
            <Route path="/discovery" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><DiscoveryPage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute session={session}><Navigate to={profile?.id ? `/profile/${profile.id}` : '/discovery'} replace /></ProtectedRoute>} />
            <Route path="/profile/:uid" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><ProfilePage profile={profile} /></Layout></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><SubscriptionGuard profile={profile}><ChatListPage profile={profile} /></SubscriptionGuard></Layout></ProtectedRoute>} />
            <Route path="/chat/:chatId" element={<ProtectedRoute session={session}><Layout profile={profile} unreadCount={unreadCount}><SubscriptionGuard profile={profile}><ChatRoomPage profile={profile} /></SubscriptionGuard></Layout></ProtectedRoute>} />
            <Route path="/wallet" element={
              <ProtectedRoute session={session}>
                <Layout profile={profile} unreadCount={unreadCount}>
                  <WalletPage 
                    profile={profile} 
                    onUpdate={() => session?.user?.id && fetchProfile(session.user.id)} 
                  />
                </Layout>
              </ProtectedRoute>
            } />
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
  const isDiscoveryPage = location.pathname === '/discovery';
  const isChatRoom = location.pathname.startsWith('/chat/');

  const navItems = [
    { icon: Home, label: 'Home', path: '/discovery' },
    { icon: MessageSquare, label: 'Chats', path: '/chats' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: profile?.id ? `/profile/${profile.id}` : '/profile' },
  ];

  return (
    <div className={cn("flex flex-col min-h-screen overflow-x-hidden", !isChatRoom && "pb-20 md:pb-0 md:pl-20")}>
      {/* Top Bar - Only visible on Discovery page */}
      {isDiscoveryPage && (
        <header className="h-20 border-b border-white/10 flex items-center justify-between px-6 sticky top-0 bg-[#050505]/80 backdrop-blur-xl z-40">
          <div className="flex-1 flex items-center">
            <Link to="/discovery" className="max-w-[50%]">
              <PrivyLogo className="scale-90 origin-left drop-shadow-[0_0_10px_rgba(0,209,255,0.3)]" />
            </Link>
          </div>
          
          <div className="flex items-center gap-3">
            <Link to="/notifications" className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors relative group">
              <Bell className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-brand-blue rounded-full border-2 border-[#050505] shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
              )}
            </Link>
            
            <Link to="/settings" className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
              <Settings className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
            </Link>
            
            <button onClick={() => logOut()} className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-colors group">
              <LogOut className="w-5 h-5 text-red-500/70 group-hover:text-red-500" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn("flex-1 w-full", !isChatRoom && "max-w-7xl mx-auto p-4 md:p-8")}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className={cn(isChatRoom && "h-full flex flex-col")}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Navigation - Mobile Bottom / Desktop Side */}
      {!isChatRoom && (
        <nav className="fixed bottom-0 left-0 right-0 h-20 bg-[#050505]/95 backdrop-blur-2xl border-t border-white/10 flex items-center justify-around px-4 z-50 md:top-0 md:bottom-0 md:right-auto md:w-20 md:flex-col md:border-t-0 md:border-r md:h-full">
          <div className="hidden md:flex flex-col items-center py-8 gap-8">
             <PrivyLogo className="md:flex-col md:gap-1 drop-shadow-[0_0_10px_rgba(0,209,255,0.3)]" />
          </div>
          
          <div className="flex flex-1 justify-around md:flex-col md:justify-center md:gap-10">
            {navItems.map((item) => {
              const isActive = item.path === '/discovery' 
                ? location.pathname === '/discovery'
                : item.path === '/chats'
                  ? location.pathname.startsWith('/chats') || location.pathname.startsWith('/chat/')
                  : location.pathname.startsWith(item.path);
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
      )}
    </div>
  );
}
