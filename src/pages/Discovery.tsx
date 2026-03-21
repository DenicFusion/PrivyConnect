import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Shield, Zap, TrendingUp, Users, Filter, Search, Flame, Sparkles, Lock, X, CheckCircle, Map as MapIcon, Grid } from 'lucide-react';
import { Link } from 'react-router-dom';
import MapDiscovery from '../components/MapDiscovery';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DiscoveryPage({ profile }: { profile: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('trending');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLockModal, setShowLockModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [liveCount, setLiveCount] = useState(18);

  const isSubscribed = profile?.is_subscribed || false;

  const fetchUsers = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseActive) {
      setUsers(MOCK_USERS.filter(u => u.id !== profile?.id));
      setLoading(false);
      return;
    }

    try {
      let data: any[] = [];
      
      if (filter === 'nearby') {
        // Get user location first
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (pos) => {
            const { latitude, longitude } = pos.coords;
            const { data: nearbyData, error } = await supabase.rpc('search_nearby_users', {
              user_lat: latitude,
              user_lng: longitude,
              radius_km: 50, // Default 50km for grid view
              preference: profile?.looking_for || 'everyone'
            });
            if (!error) setUsers(nearbyData || []);
            setLoading(false);
          }, async (err) => {
            console.error('Location error:', err);
            // Fallback to general query if location denied
            const { data: fallbackData, error } = await supabase
              .from('profiles')
              .select('*')
              .neq('id', profile?.id)
              .eq('profile_mode', 'public')
              .eq('is_public', true)
              .limit(20);
            if (!error) setUsers(fallbackData || []);
            setLoading(false);
          });
          return; // Exit early as we handle loading in callbacks
        }
      } else if (filter === 'active') {
        const { data: activeData, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', profile?.id)
          .eq('profile_mode', 'public')
          .eq('is_public', true)
          .eq('is_online', true)
          .order('last_active', { ascending: false })
          .limit(20);
        data = activeData || [];
      } else {
        // Trending/Default
        const { data: trendingData, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('id', profile?.id)
          .eq('profile_mode', 'public')
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(20);
        data = trendingData || [];
      }

      setUsers(data);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  }, [profile?.id, profile?.looking_for, filter]);

  useEffect(() => {
    if (!profile?.id) return;
    fetchUsers();

    if (!isSupabaseActive) return;

    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, fetchUsers]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveCount(prev => Math.max(12, Math.min(45, prev + (Math.random() > 0.5 ? 1 : -1))));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const [liveActivity, setLiveActivity] = useState('Someone just joined PrivyConnect');

  // Live activity simulation
  useEffect(() => {
    const interval = setInterval(() => {
      const randomUser = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)];
      const activities = [
        `just joined PrivyConnect`,
        `is now online nearby`,
        `just updated their profile`,
        `is looking for a connection`,
        `just became verified`
      ];
      const randomActivity = activities[Math.floor(Math.random() * activities.length)];
      setLiveActivity(`${randomUser.username} ${randomActivity}`);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const tabs = [
    { id: 'trending', icon: Flame, label: 'Trending' },
    { id: 'nearby', icon: MapPin, label: 'Nearby' },
    { id: 'active', icon: Zap, label: 'Active Now' },
  ];

  return (
    <div className="space-y-8 pb-20 relative">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-tighter mb-2 italic">Discovery</h1>
          <p className="text-white/40 font-light text-sm uppercase tracking-widest font-bold">Find <span className="text-brand-blue">premium</span> connections near you</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white/5 border border-white/10 rounded-2xl p-1 mr-2">
            <button 
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'grid' ? "bg-brand-blue text-brand-dark" : "text-white/40 hover:text-white"
              )}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setViewMode('map')}
              className={cn(
                "p-2 rounded-xl transition-all",
                viewMode === 'map' ? "bg-brand-blue text-brand-dark" : "text-white/40 hover:text-white"
              )}
            >
              <MapIcon className="w-5 h-5" />
            </button>
          </div>
          <div className="relative group flex-1 md:flex-none">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand-blue transition-colors" />
            <input 
              type="text" 
              placeholder="Search usernames..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 w-full md:w-64 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold"
            />
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>

      {(!profile?.gender || !profile?.looking_for) && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-6 rounded-[32px] bg-brand-blue/10 border border-brand-blue/20 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-blue/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-brand-blue" />
            </div>
            <div className="text-center md:text-left">
              <h3 className="font-bold uppercase tracking-widest text-xs">Complete your profile</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Set your gender and discovery preferences to find better matches</p>
            </div>
          </div>
          <Link 
            to="/settings" 
            className="px-8 py-4 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest text-[10px] rounded-xl hover:scale-105 transition-all shadow-lg"
          >
            Go to Settings
          </Link>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit min-w-max">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = filter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest font-bold transition-all whitespace-nowrap relative",
                  isActive ? "bg-brand-blue text-brand-dark shadow-lg shadow-brand-blue/20" : "text-white/40 hover:text-white/70"
                )}
              >
                <Icon className={cn("w-4 h-4", isActive && "animate-pulse")} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Activity Booster */}
      <AnimatePresence mode="wait">
        <motion.div
          key={liveActivity}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center justify-center gap-3 py-3 px-6 bg-brand-blue/5 border border-brand-blue/10 rounded-2xl"
        >
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-ping" />
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-brand-blue/80">
            {liveActivity}
          </p>
        </motion.div>
      </AnimatePresence>

      {/* Grid or Map */}
      {viewMode === 'map' ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full"
        >
          <MapDiscovery profile={profile} />
        </motion.div>
      ) : loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredUsers.map((user, i) => (
            <UserCard 
              key={user.id} 
              user={user} 
              index={i} 
              isSubscribed={isSubscribed}
              onLockedClick={() => setShowLockModal(true)}
            />
          ))}
        </div>
      )}

      {filteredUsers.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 uppercase tracking-widest text-sm">No users found nearby</p>
        </div>
      )}

      {/* Subscription Lock Modal */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLockModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[48px] p-10 space-y-8 text-center"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setShowLockModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-white/30" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="inline-flex items-center justify-center p-6 rounded-[32px] bg-brand-blue/10 border border-brand-blue/20">
                  <Lock className="w-12 h-12 text-brand-blue" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-display uppercase tracking-tighter italic">Unlock Full Access 🔒</h2>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold leading-relaxed">
                    Subscribe to view profiles and chat with users nearby.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <button className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Subscribe Now – ₦1500/week
                </button>
                <p className="text-[8px] text-white/20 uppercase tracking-widest font-bold">Cancel anytime • Secure payment</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function UserCard({ user, index, isSubscribed, onLockedClick }: { 
  user: any, 
  index: number, 
  isSubscribed: boolean,
  onLockedClick: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link 
        to={isSubscribed ? `/profile/${user.id}` : '#'} 
        onClick={(e) => {
          if (!isSubscribed) {
            e.preventDefault();
            onLockedClick();
          }
        }}
        className="group block relative aspect-[3/4] rounded-[32px] overflow-hidden bg-white/5 border border-white/10 shadow-2xl"
      >
        <img 
          src={user.photo_url || `https://picsum.photos/seed/${user.id}/400/600`} 
          className={cn(
            "w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110",
            !isSubscribed && "blur-2xl scale-110"
          )}
          referrerPolicy="no-referrer"
        />
        
        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {index < 3 && (
            <div className="px-3 py-1 rounded-full bg-brand-blue text-brand-dark text-[8px] font-bold uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(0,209,255,0.3)]">
              <Flame className="w-2.5 h-2.5" />
              Hot
            </div>
          )}
          {index > 5 && (
            <div className="px-3 py-1 rounded-full bg-purple-500 text-white text-[8px] font-bold uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              New
            </div>
          )}
        </div>

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/20 to-transparent opacity-90 group-hover:opacity-100 transition-opacity" />
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg tracking-tight truncate text-white">{user.username}</span>
            {user.is_verified && (
              <div className="bg-brand-blue rounded-full p-0.5 shadow-[0_0_10px_rgba(0,209,255,0.5)]">
                <CheckCircle className="w-3 h-3 text-brand-dark" />
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-between text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-brand-blue" />
              <span>{user.distance ? `~${user.distance.toFixed(1)}km away` : 'Nearby'}</span>
            </div>
            {(user.is_online && !user.hide_online_status) && (
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse shadow-[0_0_5px_rgba(0,209,255,0.5)]" />
                <span className="text-brand-blue">Online</span>
              </div>
            )}
          </div>
        </div>

        {/* Lock Overlay for non-subscribers */}
        {!isSubscribed && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="p-4 rounded-full bg-white/10 border border-white/20 backdrop-blur-xl">
              <Lock className="w-6 h-6 text-white" />
            </div>
          </div>
        )}
      </Link>
    </motion.div>
  );
}
