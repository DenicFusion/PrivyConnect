import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { MapPin, Shield, Zap, TrendingUp, Users, Filter, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DiscoveryPage({ profile }: { profile: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [filter, setFilter] = useState('nearby');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchUsers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .neq('id', profile.id)
        .limit(20);

      if (!error) {
        setUsers(data || []);
      }
      setLoading(false);
    };

    fetchUsers();

    // Real-time subscription
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const tabs = [
    { id: 'trending', icon: TrendingUp, label: 'Trending' },
    { id: 'nearby', icon: MapPin, label: 'Nearby' },
    { id: 'active', icon: Users, label: 'Active Now' },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-tighter mb-2">Discovery</h1>
          <p className="text-white/40 font-light text-sm uppercase tracking-widest">Find verified connections near you</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Search usernames..."
              className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-12 pr-6 w-full md:w-64 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
            />
          </div>
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5 text-white/70" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-white/5 rounded-2xl w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = filter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={cn(
                "flex items-center gap-2 px-6 py-2 rounded-xl text-xs uppercase tracking-widest font-bold transition-all",
                isActive ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-white/40 hover:text-white/70"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="aspect-[3/4] rounded-3xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {users.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to={`/profile/${user.id}`} className="group block relative aspect-[3/4] rounded-3xl overflow-hidden bg-white/5 border border-white/10">
                <img 
                  src={user.photo_url || `https://picsum.photos/seed/${user.id}/400/600`} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />
                
                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-lg tracking-tight truncate">{user.username}</span>
                    {user.is_verified && (
                      <div className="bg-emerald-500 rounded-full p-0.5">
                        <Shield className="w-3 h-3 text-white" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.15em] font-bold text-white/50">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span>2km away</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-emerald-500">Online</span>
                    </div>
                  </div>
                </div>

                {/* Badge */}
                <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] uppercase tracking-widest font-bold">
                  {user.profile_mode === 'private' ? 'Private' : 'Public'}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}

      {users.length === 0 && !loading && (
        <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
          <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <p className="text-white/40 uppercase tracking-widest text-sm">No users found nearby</p>
        </div>
      )}
    </div>
  );
}
