import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_USERS, MOCK_TRANSACTIONS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Shield, 
  Zap, 
  TrendingUp, 
  DollarSign, 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  AlertCircle,
  BarChart3,
  Activity,
  Lock,
  Eye,
  Clock,
  Ban,
  UserCheck,
  Trash2,
  MessageSquare,
  Settings,
  CreditCard,
  Gift,
  Share2,
  Bell,
  Flag,
  Plus,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
  Wallet,
  X,
  Database,
  Server,
  Cloud
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { PrivyLogo } from '../components/Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPage({ profile: myProfile }: { profile: any }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'finance' | 'moderation' | 'settings'>('dashboard');
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    dailyRevenue: 0,
    totalEarnings: 0,
    newSignups: 0,
    activeNow: 0,
    cpuLoad: 12,
    memoryUsage: 45
  });

  const [settings, setSettings] = useState<any>({});

  useEffect(() => {
    const fetchAdminData = async () => {
      setLoading(true);
      
      if (!isSupabaseActive) {
        setUsers(MOCK_USERS);
        setTransactions(MOCK_TRANSACTIONS);
        setSettings({
          subscription_price: { amount: 1500 },
          platform_commission: { percentage: 25 },
          withdrawal_limits: { min: 5000, max: 500000 },
          feature_flags: { chat: true, tipping: true, discovery: true, notifications: true }
        });
        
        const volume = MOCK_TRANSACTIONS.reduce((acc, tx) => acc + tx.amount, 0);
        
        setStats({
          totalUsers: MOCK_USERS.length,
          activeSubscriptions: Math.floor(MOCK_USERS.length * 0.4),
          dailyRevenue: 15000,
          totalEarnings: volume,
          newSignups: 5,
          activeNow: 42,
          cpuLoad: 12 + Math.floor(Math.random() * 5),
          memoryUsage: 45 + Math.floor(Math.random() * 10)
        });
        setLoading(false);
        return;
      }

      try {
        // Fetch Users
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (profilesError) throw profilesError;
        setUsers(profiles || []);

        // Fetch Transactions
        const { data: txs, error: txsError } = await supabase
          .from('transactions')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (txsError) throw txsError;
        setTransactions(txs || []);

        // Fetch Settings
        const { data: settingsData, error: settingsError } = await supabase
          .from('system_settings')
          .select('*');
        
        if (settingsError) throw settingsError;
        const settingsObj = (settingsData || []).reduce((acc, s) => ({ ...acc, [s.key]: s.value }), {});
        setSettings(settingsObj);

        // Calculate Stats
        const totalUsers = profiles?.length || 0;
        const activeSubs = profiles?.filter(p => p.is_subscribed && p.subscription_expiry && new Date(p.subscription_expiry) > new Date()).length || 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dailyRevenue = txs
          ?.filter(tx => new Date(tx.created_at) >= today && tx.status === 'completed' && (tx.type === 'payment' || tx.type === 'tip'))
          .reduce((acc, tx) => acc + Number(tx.amount), 0) || 0;
        
        const totalEarnings = txs
          ?.filter(tx => tx.status === 'completed' && (tx.type === 'payment' || tx.type === 'tip'))
          .reduce((acc, tx) => acc + Number(tx.amount), 0) || 0;

        const newSignups = profiles
          ?.filter(p => new Date(p.created_at) >= today).length || 0;

        const activeNow = profiles?.filter(p => p.is_online).length || 0;

        setStats({
          totalUsers,
          activeSubscriptions: activeSubs,
          dailyRevenue,
          totalEarnings,
          newSignups,
          activeNow,
          cpuLoad: 12 + Math.floor(Math.random() * 5),
          memoryUsage: 45 + Math.floor(Math.random() * 10)
        });

      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'moderation', label: 'Moderation', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-brand-dark text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 md:px-8 pt-8 md:pt-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-6">
            <PrivyLogo className="scale-125 origin-left hidden md:flex" />
            <div className="h-12 w-px bg-white/10 hidden md:block" />
            <div>
              <h1 className="text-5xl font-display font-extrabold uppercase tracking-tighter mb-2 italic">
                Command <span className="text-brand-blue">Center</span>
              </h1>
              <p className="text-white/40 font-light text-sm uppercase tracking-[0.3em]">System Administration & Global Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/discovery" className="px-4 py-2 rounded-2xl bg-white/5 border border-white/10 text-white/40 text-[10px] uppercase tracking-widest font-bold hover:text-white hover:bg-white/10 transition-all flex items-center gap-2">
              <ArrowLeft className="w-3 h-3" />
              Exit Terminal
            </Link>
            <div className="px-4 py-2 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 text-brand-blue text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-brand-blue animate-pulse shadow-[0_0_8px_rgba(0,209,255,0.8)]" />
              Live System Active
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto scrollbar-hide gap-2 mb-12 p-1 bg-white/5 rounded-[24px] border border-white/10 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-3 px-6 py-3 rounded-[20px] text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-brand-blue text-brand-dark shadow-lg shadow-brand-blue/20" 
                  : "text-white/40 hover:text-white hover:bg-white/5"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'dashboard' && <DashboardView stats={stats} transactions={transactions} />}
            {activeTab === 'users' && <UserManagementView users={users} />}
            {activeTab === 'finance' && <FinancialControlView transactions={transactions} settings={settings} />}
            {activeTab === 'moderation' && <ModerationView />}
            {activeTab === 'settings' && <SystemSettingsView settings={settings} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function DashboardView({ stats, transactions }: { stats: any, transactions: any[] }) {
  return (
    <div className="space-y-12">
      {/* System Health Bar */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-wrap items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Core Systems: <span className="text-emerald-500">Operational</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Database: <span className="text-emerald-500">Synced</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">CPU: <span className="text-brand-blue font-mono">{stats.cpuLoad}%</span></span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">RAM: <span className="text-purple-500 font-mono">{stats.memoryUsage}%</span></span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Server Time:</span>
          <span className="text-[10px] font-mono font-bold text-white/70">{new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Active Subs', value: stats.activeSubscriptions, icon: Zap, color: 'text-amber-400' },
          { label: 'Daily Revenue', value: `₦${stats.dailyRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Total Earnings', value: `₦${stats.totalEarnings.toLocaleString()}`, icon: DollarSign, color: 'text-brand-blue' },
          { label: 'New Signups', value: stats.newSignups, icon: UserCheck, color: 'text-purple-400' },
          { label: 'Live Activity', value: stats.activeNow, icon: Activity, color: 'text-red-400' },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4 hover:bg-white/10 transition-all group">
            <div className={cn("p-3 rounded-2xl bg-white/5 w-fit transition-transform group-hover:scale-110", stat.color)}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-1">{stat.label}</p>
              <p className="text-2xl font-display font-bold tracking-tight font-mono">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Growth Chart Placeholder */}
        <div className="lg:col-span-2 p-8 rounded-[40px] bg-white/5 border border-white/10 h-[400px] flex flex-col relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="space-y-1">
              <h3 className="text-xl font-display font-bold uppercase tracking-widest">Growth Analytics</h3>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">User acquisition & Retention</p>
            </div>
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              {['7D', '1M', '1Y'].map(p => (
                <button key={p} className={cn(
                  "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                  p === '7D' ? "bg-brand-blue text-brand-dark" : "text-white/40 hover:text-white"
                )}>{p}</button>
              ))}
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 px-4 relative z-10">
            {[40, 60, 45, 90, 65, 80, 55, 70, 85, 100, 75, 95].map((h, i) => (
              <div key={i} className="flex-1 bg-brand-blue/20 rounded-t-lg relative group transition-all hover:bg-brand-blue/40" style={{ height: `${h}%` }}>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-brand-blue text-brand-dark text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 shadow-lg shadow-brand-blue/20">
                  {h}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Creators */}
        <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest">Top Creators</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Highest revenue generators</p>
          </div>
          <div className="space-y-4">
            {MOCK_USERS.slice(1, 5).map((user, i) => (
              <div key={user.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={user.photo_url} className="w-12 h-12 rounded-2xl object-cover border border-white/10" />
                    <div className="absolute -top-2 -left-2 w-6 h-6 rounded-xl bg-brand-blue text-brand-dark text-[10px] font-bold flex items-center justify-center border-2 border-brand-dark shadow-lg shadow-brand-blue/20">
                      {i + 1}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-bold tracking-tight group-hover:text-brand-blue transition-colors">{user.username}</p>
                    <p className="text-[11px] text-brand-blue font-mono font-bold uppercase tracking-widest mt-0.5">₦{(Math.random() * 50000 + 10000).toLocaleString()}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Live Activity Tracker */}
      <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity className="w-32 h-32" />
        </div>
        <div className="flex items-center justify-between relative z-10">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest">Live Activity Tracker</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Real-time platform events</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Feed
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
          {[
            { user: 'Sarah_J', action: 'subscribed to', target: 'Alex_Pro', time: '2m ago', type: 'sub' },
            { user: 'Mike_99', action: 'tipped', target: 'Lara_K', amount: '₦2,500', time: '5m ago', type: 'tip' },
            { user: 'NewUser_4', action: 'just joined', target: 'the platform', time: '8m ago', type: 'join' },
            { user: 'Admin', action: 'verified', target: 'Creator_X', time: '12m ago', type: 'verify' },
          ].map((event, i) => (
            <div key={i} className="p-5 rounded-3xl bg-white/5 border border-white/5 flex items-start gap-4 hover:bg-white/10 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className={cn(
                "p-3 rounded-2xl bg-white/5 relative z-10",
                event.type === 'sub' ? "text-amber-400" :
                event.type === 'tip' ? "text-emerald-400" :
                event.type === 'join' ? "text-purple-400" : "text-brand-blue"
              )}>
                {event.type === 'sub' ? <Zap className="w-5 h-5" /> :
                 event.type === 'tip' ? <DollarSign className="w-5 h-5" /> :
                 event.type === 'join' ? <Users className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div className="space-y-1 relative z-10">
                <p className="text-xs leading-relaxed">
                  <span className="font-bold text-white">{event.user}</span>
                  <span className="text-white/40"> {event.action} </span>
                  <span className="font-bold text-white">{event.target}</span>
                  {event.amount && <span className="text-emerald-400 font-bold font-mono"> {event.amount}</span>}
                </p>
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-mono font-bold">{event.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function UserManagementView({ users: initialUsers }: { users: any[] }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'verified' | 'unverified' | 'active' | 'suspended' | 'subscribers'>('all');
  const [users, setUsers] = useState(initialUsers);

  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  useEffect(() => {
    let filtered = initialUsers.filter(user => 
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    if (filter === 'verified') filtered = filtered.filter(u => u.is_verified);
    if (filter === 'unverified') filtered = filtered.filter(u => !u.is_verified);
    if (filter === 'active') filtered = filtered.filter(u => !u.is_suspended);
    if (filter === 'suspended') filtered = filtered.filter(u => u.is_suspended);
    if (filter === 'subscribers') filtered = filtered.filter(u => u.is_subscribed);

    setUsers(filtered);
  }, [searchQuery, filter, initialUsers]);

  const handleAction = async (userId: string, action: 'verify' | 'ban' | 'delete') => {
    if (action === 'delete') {
      setDeleteUserId(userId);
      return;
    }

    if (!isSupabaseActive) {
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          if (action === 'verify') return { ...u, is_verified: !u.is_verified };
          if (action === 'ban') return { ...u, is_suspended: !u.is_suspended };
        }
        return u;
      }));
      return;
    }

    try {
      const user = initialUsers.find(u => u.id === userId);
      if (!user) return;

      if (action === 'verify') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_verified: !user.is_verified })
          .eq('id', userId);
        if (error) throw error;
      } else if (action === 'ban') {
        const { error } = await supabase
          .from('profiles')
          .update({ is_suspended: !user.is_suspended })
          .eq('id', userId);
        if (error) throw error;
      }
      
      // Local update
      setUsers(prev => prev.map(u => {
        if (u.id === userId) {
          if (action === 'verify') return { ...u, is_verified: !u.is_verified };
          if (action === 'ban') return { ...u, is_suspended: !u.is_suspended };
        }
        return u;
      }));
    } catch (error) {
      console.error(`Error performing ${action} action:`, error);
    }
  };

  const confirmDelete = async () => {
    if (!deleteUserId) return;

    if (!isSupabaseActive) {
      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', deleteUserId);
      
      if (error) throw error;

      setUsers(prev => prev.filter(u => u.id !== deleteUserId));
      setDeleteUserId(null);
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="relative flex-1 max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-brand-blue transition-colors" />
          <input 
            type="text" 
            placeholder="Search database by UID, username or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all text-sm font-medium"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          {(['all', 'verified', 'unverified', 'active', 'suspended', 'subscribers'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-6 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border whitespace-nowrap",
                filter === f 
                  ? "bg-brand-blue border-brand-blue text-brand-dark shadow-lg shadow-brand-blue/20" 
                  : "bg-white/5 border-white/10 text-white/40 hover:text-white hover:bg-white/10"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[40px] bg-white/5 border border-white/10 overflow-hidden overflow-x-auto relative">
        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <table className="w-full text-left border-collapse min-w-[900px] relative z-10">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-8 py-6 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">User Identity</th>
              <th className="px-8 py-6 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Status Matrix</th>
              <th className="px-8 py-6 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Activity Log</th>
              <th className="px-8 py-6 text-[10px] uppercase tracking-[0.3em] font-bold text-white/30 text-right">Control Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {users.map((user) => (
              <tr key={user.id} className={cn(
                "hover:bg-white/5 transition-colors group",
                user.is_suspended && "bg-red-500/[0.02]"
              )}>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <img src={user.photo_url} className="w-14 h-14 rounded-2xl object-cover border border-white/10" />
                      {user.is_verified && (
                        <div className="absolute -bottom-1 -right-1 p-1 bg-brand-blue rounded-lg shadow-lg">
                          <CheckCircle className="w-3 h-3 text-brand-dark" />
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-base font-bold tracking-tight flex items-center gap-2 group-hover:text-brand-blue transition-colors">
                        {user.username}
                        {user.is_suspended && <Ban className="w-3.5 h-3.5 text-red-500" />}
                      </p>
                      <p className="text-[11px] text-white/30 uppercase tracking-widest font-mono">{user.email || 'demo@example.com'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col gap-2">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] uppercase tracking-widest font-bold w-fit border",
                      user.is_verified ? "bg-brand-blue/10 border-brand-blue/20 text-brand-blue" : "bg-white/5 border-white/10 text-white/30"
                    )}>
                      {user.is_verified ? <Shield className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                      {user.is_verified ? 'Verified Creator' : 'Standard User'}
                    </div>
                    {user.is_subscribed && user.subscription_expiry && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] uppercase tracking-widest font-bold w-fit bg-amber-500/10 border border-amber-500/20 text-amber-500">
                        <Zap className="w-3.5 h-3.5" />
                        Active Sub ({Math.max(0, Math.ceil((new Date(user.subscription_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))}d left)
                      </div>
                    )}
                    {user.is_suspended && (
                      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-[9px] uppercase tracking-widest font-bold w-fit bg-red-500/10 border border-red-500/20 text-red-500">
                        <Ban className="w-3.5 h-3.5" />
                        Account Suspended
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-white/70">Last active <span className="text-brand-blue font-mono">2h ago</span></p>
                    <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Lagos, Nigeria • <span className="font-mono">192.168.1.1</span></p>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => handleAction(user.id, 'verify')}
                      className={cn(
                        "p-3 rounded-xl transition-all border",
                        user.is_verified 
                          ? "bg-brand-blue border-brand-blue text-brand-dark shadow-lg shadow-brand-blue/20" 
                          : "bg-white/5 border-white/10 text-white/20 hover:text-brand-blue hover:border-brand-blue/50"
                      )} 
                      title={user.is_verified ? "Revoke Verification" : "Verify Manually"}
                    >
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleAction(user.id, 'ban')}
                      className={cn(
                        "p-3 rounded-xl transition-all border",
                        user.is_suspended 
                          ? "bg-red-500 border-red-500 text-white shadow-lg shadow-red-500/20" 
                          : "bg-white/5 border-white/10 text-white/20 hover:text-red-500 hover:border-red-500/50"
                      )} 
                      title={user.is_suspended ? "Unban Account" : "Suspend Account"}
                    >
                      <Ban className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleAction(user.id, 'delete')}
                      className="p-3 bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/50 rounded-xl transition-all text-white/20 hover:text-red-500" 
                      title="Permanently Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteUserId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteUserId(null)}
              className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-md bg-brand-dark border border-white/10 rounded-[48px] p-10 relative z-10 shadow-2xl"
            >
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-[32px] bg-red-500/10 flex items-center justify-center mx-auto border border-red-500/20">
                  <Trash2 className="w-10 h-10 text-red-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter italic">Confirm <span className="text-red-500">Deletion</span></h3>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold leading-relaxed">
                    This action is irreversible. All user data, chats, and financial records will be purged from the system.
                  </p>
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setDeleteUserId(null)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={confirmDelete}
                    className="flex-1 py-4 bg-red-500 text-white rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    Delete User
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinancialControlView({ transactions: initialTransactions, settings }: { transactions: any[], settings: any }) {
  const [subPrice, setSubPrice] = useState(settings?.subscription_price?.amount?.toString() || '1500');
  const [commission, setCommission] = useState(settings?.platform_commission?.percentage?.toString() || '25');
  const [txFilter, setTxFilter] = useState<'all' | 'subscription' | 'tip' | 'withdrawal'>('all');
  const [transactions, setTransactions] = useState(initialTransactions);

  useEffect(() => {
    if (settings?.subscription_price?.amount) setSubPrice(settings.subscription_price.amount.toString());
    if (settings?.platform_commission?.percentage) setCommission(settings.platform_commission.percentage.toString());
  }, [settings]);

  useEffect(() => {
    let filtered = initialTransactions;
    if (txFilter === 'subscription') filtered = initialTransactions.filter(tx => tx.type === 'subscription');
    if (txFilter === 'tip') filtered = initialTransactions.filter(tx => tx.type === 'tip');
    if (txFilter === 'withdrawal') filtered = initialTransactions.filter(tx => tx.type === 'withdrawal');
    setTransactions(filtered);
  }, [txFilter, initialTransactions]);

  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const handleWithdraw = () => {
    setIsWithdrawModalOpen(true);
  };

  const confirmWithdraw = async () => {
    setIsWithdrawing(true);
    
    if (isSupabaseActive) {
      try {
        // In a real app, this would trigger a backend process or record a withdrawal
        const { error } = await supabase
          .from('transactions')
          .insert({
            profile_id: (await supabase.auth.getUser()).data.user?.id,
            amount: 1240500, // Example amount
            type: 'withdrawal',
            status: 'completed',
            description: 'Platform Treasury Disbursement'
          });
        if (error) throw error;
      } catch (error) {
        console.error('Error processing withdrawal:', error);
      }
    }

    setTimeout(() => {
      setIsWithdrawing(false);
      setIsWithdrawModalOpen(false);
    }, 2000);
  };

  const updateSetting = async (key: string, value: any) => {
    if (!isSupabaseActive) return;
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ key, value, updated_at: new Date().toISOString() });
      if (error) throw error;
      alert(`Setting ${key} updated successfully!`);
    } catch (error) {
      console.error(`Error updating setting ${key}:`, error);
    }
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-10 rounded-[40px] bg-brand-blue text-brand-dark space-y-8 relative overflow-hidden group shadow-2xl shadow-brand-blue/20">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <Wallet className="w-5 h-5 opacity-60" />
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60">Platform Treasury</p>
            </div>
            <h2 className="text-6xl font-display font-black tracking-tighter mb-8 font-mono">₦1,240,500</h2>
            <button 
              onClick={handleWithdraw}
              className="w-full py-5 bg-brand-dark text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl flex items-center justify-center gap-3"
            >
              <ArrowUpRight className="w-4 h-4" />
              Withdraw Total Earnings
            </button>
          </div>
        </div>

        <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Settings className="w-24 h-24" />
          </div>
          <h3 className="text-lg font-display font-bold uppercase tracking-widest relative z-10">Revenue Controls</h3>
          <div className="space-y-6 relative z-10">
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-2">Monthly Subscription (₦)</p>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={subPrice} 
                  onChange={(e) => setSubPrice(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono font-bold focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all" 
                />
                <button 
                  onClick={() => updateSetting('subscription_price', { amount: Number(subPrice), currency: 'NGN' })}
                  className="px-6 py-4 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue hover:text-brand-dark transition-all"
                >
                  Update
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-2">Platform Commission (%)</p>
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={commission} 
                  onChange={(e) => setCommission(e.target.value)}
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm font-mono font-bold focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all" 
                />
                <button 
                  onClick={() => updateSetting('platform_commission', { percentage: Number(commission) })}
                  className="px-6 py-4 bg-brand-blue/10 text-brand-blue border border-brand-blue/20 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue hover:text-brand-dark transition-all"
                >
                  Update
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <TrendingUp className="w-24 h-24" />
          </div>
          <h3 className="text-lg font-display font-bold uppercase tracking-widest relative z-10">Performance Snapshot</h3>
          <div className="grid grid-cols-1 gap-4 relative z-10">
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-1 group-hover:text-emerald-400 transition-colors">Tips Processed Today</p>
              <p className="text-3xl font-display font-bold font-mono">₦12,400</p>
            </div>
            <div className="p-6 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all group">
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/20 mb-1 group-hover:text-brand-blue transition-colors">Subs Processed Today</p>
              <p className="text-3xl font-display font-bold font-mono">₦45,000</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-xl font-display font-bold uppercase tracking-widest">Global Transaction Ledger</h3>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Comprehensive financial history</p>
          </div>
          <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10 scrollbar-hide overflow-x-auto">
            {(['all', 'subscription', 'tip', 'withdrawal'] as const).map(f => (
              <button
                key={f}
                onClick={() => setTxFilter(f)}
                className={cn(
                  "px-6 py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all whitespace-nowrap",
                  txFilter === f ? "bg-brand-blue text-brand-dark shadow-lg shadow-brand-blue/20" : "text-white/40 hover:text-white hover:bg-white/5"
                )}
              >
                {f}s
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          {transactions.map((tx, i) => (
            <div key={tx.id} className="flex items-center justify-between p-6 rounded-[32px] bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-6 relative z-10">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center border transition-transform group-hover:scale-110",
                  tx.type === 'deposit' || tx.type === 'tip' 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "bg-brand-blue/10 border-brand-blue/20 text-brand-blue"
                )}>
                  {tx.type === 'deposit' ? <ArrowDownLeft className="w-7 h-7" /> : 
                   tx.type === 'tip' ? <Gift className="w-7 h-7" /> : <Zap className="w-7 h-7" />}
                </div>
                <div>
                  <p className="text-sm font-bold tracking-tight uppercase group-hover:text-white transition-colors">{tx.type} Payment</p>
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono font-bold">ID: {tx.id.slice(0, 12)} • <span className="text-white/20">2m ago</span></p>
                </div>
              </div>
              <div className="text-right relative z-10">
                <p className="text-2xl font-display font-bold font-mono tracking-tight">₦{tx.amount.toLocaleString()}</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold font-mono">Fee: ₦{(tx.commission || 0).toLocaleString()}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="py-24 text-center space-y-6 rounded-[40px] bg-white/5 border border-white/10 border-dashed">
              <div className="w-20 h-20 rounded-[32px] bg-white/5 flex items-center justify-center mx-auto border border-white/5">
                <CreditCard className="w-10 h-10 text-white/10" />
              </div>
              <div className="space-y-2">
                <p className="text-white/30 text-xs uppercase tracking-widest font-bold">No transactions found</p>
                <p className="text-[10px] text-white/10 uppercase tracking-[0.2em]">Try adjusting your filter criteria</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Withdrawal Modal */}
      <AnimatePresence>
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isWithdrawing && setIsWithdrawModalOpen(false)}
              className="absolute inset-0 bg-brand-dark/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg bg-brand-dark border border-white/10 rounded-[48px] p-10 relative z-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                <Wallet className="w-32 h-32" />
              </div>
              
              <div className="space-y-8 relative z-10">
                <div className="space-y-2">
                  <h3 className="text-3xl font-display font-black uppercase tracking-tighter italic">Confirm <span className="text-brand-blue">Withdrawal</span></h3>
                  <p className="text-xs text-white/40 uppercase tracking-widest font-bold">System Treasury Disbursement</p>
                </div>

                <div className="p-8 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Available Balance</span>
                    <span className="text-xl font-mono font-bold text-brand-blue">₦1,240,500</span>
                  </div>
                  <div className="h-px bg-white/10" />
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">Destination</span>
                    <span className="text-xs font-bold">Standard Bank • •••• 4242</span>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button 
                    disabled={isWithdrawing}
                    onClick={() => setIsWithdrawModalOpen(false)}
                    className="flex-1 py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button 
                    disabled={isWithdrawing}
                    onClick={confirmWithdraw}
                    className="flex-1 py-4 bg-brand-blue text-brand-dark rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isWithdrawing ? (
                      <>
                        <div className="w-3 h-3 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Confirm
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ModerationView() {
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchModerationData = async () => {
      if (!isSupabaseActive) {
        setKeywords(['spam', 'scam', 'crypto', 'whatsapp', 'telegram']);
        setReports([
          { id: '1', reporter_id: 'user-1', reported_id: 'user-2', reason: 'Spamming links', status: 'pending', created_at: new Date().toISOString() },
          { id: '2', reporter_id: 'user-3', reported_id: 'user-4', reason: 'Inappropriate content', status: 'pending', created_at: new Date().toISOString() }
        ]);
        setLoading(false);
        return;
      }

      try {
        const { data: kwData } = await supabase.from('moderation_keywords').select('keyword');
        setKeywords(kwData?.map(k => k.keyword) || []);

        const { data: reportData } = await supabase
          .from('reports')
          .select('*, reporter:profiles!reporter_id(username, photo_url), reported:profiles!reported_id(username, photo_url)')
          .order('created_at', { ascending: false });
        setReports(reportData || []);
      } catch (error) {
        console.error('Error fetching moderation data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModerationData();
  }, []);

  const addKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newKeyword && !keywords.includes(newKeyword.toLowerCase())) {
      const kw = newKeyword.toLowerCase();
      if (isSupabaseActive) {
        try {
          const { error } = await supabase.from('moderation_keywords').insert({ keyword: kw });
          if (error) throw error;
        } catch (error) {
          console.error('Error adding keyword:', error);
          return;
        }
      }
      setKeywords([...keywords, kw]);
      setNewKeyword('');
    }
  };

  const removeKeyword = async (kw: string) => {
    if (isSupabaseActive) {
      try {
        const { error } = await supabase.from('moderation_keywords').delete().eq('keyword', kw);
        if (error) throw error;
      } catch (error) {
        console.error('Error removing keyword:', error);
        return;
      }
    }
    setKeywords(keywords.filter(k => k !== kw));
  };

  const handleReport = async (reportId: string, action: 'resolve' | 'dismiss') => {
    if (isSupabaseActive) {
      try {
        const { error } = await supabase
          .from('reports')
          .update({ status: action === 'resolve' ? 'resolved' : 'dismissed' })
          .eq('id', reportId);
        if (error) throw error;
      } catch (error) {
        console.error(`Error ${action}ing report:`, error);
        return;
      }
    }
    setReports(prev => prev.filter(r => r.id !== reportId));
  };

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-8">
          <h3 className="text-xl font-display font-bold uppercase tracking-widest flex items-center gap-3">
            <Flag className="w-6 h-6 text-red-500" />
            Reports Queue
          </h3>
          <div className="space-y-4">
            {reports.map((report, i) => (
              <div key={report.id} className="p-6 rounded-[32px] bg-white/5 border border-white/10 space-y-4 group hover:bg-white/10 transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={report.reported?.photo_url || `https://picsum.photos/seed/report${i}/100/100`} className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                    <div>
                      <p className="text-sm font-bold tracking-tight">{report.reported?.username || 'Unknown User'}</p>
                      <p className="text-[10px] text-red-400 uppercase tracking-widest font-bold">Reported for {report.reason}</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold font-mono">
                    {new Date(report.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-white/50 leading-relaxed bg-black/20 p-4 rounded-2xl italic border border-white/5">
                  "Reported by {report.reporter?.username || 'Anonymous'}"
                </p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleReport(report.id, 'resolve')}
                    className="flex-1 py-3 bg-red-500 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                  >
                    Resolve
                  </button>
                  <button 
                    onClick={() => handleReport(report.id, 'dismiss')}
                    className="flex-1 py-3 bg-white/5 text-white/40 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all border border-white/10"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="py-12 text-center text-white/30 text-xs uppercase tracking-widest font-bold">
                No pending reports
              </div>
            )}
          </div>
        </div>

        <div className="space-y-8">
          <h3 className="text-xl font-display font-bold uppercase tracking-widest flex items-center gap-3">
            <Activity className="w-6 h-6 text-brand-blue" />
            AI Content Monitor
          </h3>
          <div className="p-8 rounded-[40px] bg-brand-blue/5 border border-brand-blue/10 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Shield className="w-24 h-24" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <p className="text-sm font-bold tracking-tight">Automated Detection</p>
              <div className="w-12 h-6 bg-brand-blue rounded-full p-1 flex justify-end cursor-pointer">
                <div className="w-4 h-4 bg-brand-dark rounded-full" />
              </div>
            </div>
            <div className="space-y-4 relative z-10">
              {[
                { label: 'Spam Detection', status: 'Active', color: 'text-emerald-400' },
                { label: 'Fake Account Filter', status: 'Active', color: 'text-emerald-400' },
                { label: 'NSFW Image Blur', status: 'Active', color: 'text-emerald-400' },
                { label: 'Suspicious Activity', status: 'Monitoring', color: 'text-amber-400' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                  <span className="text-xs font-medium text-white/70">{item.label}</span>
                  <span className={cn("text-[9px] font-bold uppercase tracking-widest", item.color)}>{item.status}</span>
                </div>
              ))}
            </div>
            <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all relative z-10">
              View AI Audit Logs
            </button>
          </div>
        </div>
      </div>

      {/* Keyword Filtering */}
      <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8">
        <div className="space-y-1">
          <h3 className="text-xl font-display font-bold uppercase tracking-widest">Keyword Filtering</h3>
          <p className="text-[10px] text-white/30 uppercase tracking-[0.2em]">Automatically flag or block messages containing these terms</p>
        </div>

        <form onSubmit={addKeyword} className="flex gap-4">
          <input 
            type="text" 
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            placeholder="Add new restricted keyword..."
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:border-brand-blue/50"
          />
          <button type="submit" className="px-8 py-4 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] transition-all">
            Add Term
          </button>
        </form>

        <div className="flex flex-wrap gap-3">
          {keywords.map(kw => (
            <div key={kw} className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/10 group hover:border-red-500/50 transition-all">
              <span className="text-xs font-bold text-white/70">{kw}</span>
              <button onClick={() => removeKeyword(kw)} className="text-white/20 hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SystemSettingsView({ settings }: { settings: any }) {
  const [flags, setFlags] = useState(settings?.feature_flags || { chat: true, tipping: true, discovery: true, notifications: true });
  const [maintenanceMode, setMaintenanceMode] = useState(settings?.maintenance_mode || false);
  const [minWithdrawal, setMinWithdrawal] = useState(settings?.min_withdrawal || 5000);
  const [maxWithdrawal, setMaxWithdrawal] = useState(settings?.max_withdrawal || 500000);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings?.feature_flags) setFlags(settings.feature_flags);
    if (settings?.maintenance_mode !== undefined) setMaintenanceMode(settings.maintenance_mode);
    if (settings?.min_withdrawal) setMinWithdrawal(settings.min_withdrawal);
    if (settings?.max_withdrawal) setMaxWithdrawal(settings.max_withdrawal);
  }, [settings]);

  const toggleFlag = async (flag: string) => {
    const newFlags = { ...flags, [flag]: !flags[flag] };
    setFlags(newFlags);
    
    if (isSupabaseActive) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({ key: 'feature_flags', value: newFlags, updated_at: new Date().toISOString() });
        if (error) throw error;
      } catch (error) {
        console.error(`Error toggling flag ${flag}:`, error);
      }
    }
  };

  const toggleMaintenance = async () => {
    const newVal = !maintenanceMode;
    setMaintenanceMode(newVal);
    
    if (isSupabaseActive) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({ key: 'maintenance_mode', value: newVal, updated_at: new Date().toISOString() });
        if (error) throw error;
      } catch (error) {
        console.error('Error toggling maintenance mode:', error);
      }
    }
  };

  const saveLimits = async () => {
    setIsSaving(true);
    if (isSupabaseActive) {
      try {
        await Promise.all([
          supabase.from('system_settings').upsert({ key: 'min_withdrawal', value: Number(minWithdrawal), updated_at: new Date().toISOString() }),
          supabase.from('system_settings').upsert({ key: 'max_withdrawal', value: Number(maxWithdrawal), updated_at: new Date().toISOString() })
        ]);
      } catch (error) {
        console.error('Error saving withdrawal limits:', error);
      }
    }
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Settings className="w-24 h-24" />
        </div>
        <h3 className="text-xl font-display font-bold uppercase tracking-widest relative z-10">General Settings</h3>
        <div className="space-y-6 relative z-10">
          {[
            { id: 'chat', label: 'Enable Chat System', desc: 'Allow users to message each other', active: flags.chat },
            { id: 'tipping', label: 'Enable Tipping', desc: 'Allow creators to receive tips', active: flags.tipping },
            { id: 'discovery', label: 'Public Discovery', desc: 'Show profiles in discovery feed', active: flags.discovery },
            { id: 'notifications', label: 'Email Notifications', desc: 'Send system alerts to users', active: flags.notifications },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between group">
              <div>
                <p className="text-sm font-bold tracking-tight group-hover:text-brand-blue transition-colors">{item.label}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">{item.desc}</p>
              </div>
              <div 
                onClick={() => toggleFlag(item.id)}
                className={cn(
                  "w-12 h-6 rounded-full p-1 flex transition-all cursor-pointer",
                  item.active ? "bg-brand-blue justify-end" : "bg-white/10 justify-start"
                )}
              >
                <div className="w-4 h-4 bg-brand-dark rounded-full shadow-sm" />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-white/5 space-y-6 relative z-10">
          <div className="flex items-center justify-between p-6 rounded-3xl bg-red-500/5 border border-red-500/10 group">
            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight text-red-500">Maintenance Mode</p>
              <p className="text-[10px] text-red-500/40 uppercase tracking-widest">Restrict platform access for updates</p>
            </div>
            <div 
              onClick={toggleMaintenance}
              className={cn(
                "w-12 h-6 rounded-full p-1 flex transition-all cursor-pointer",
                maintenanceMode ? "bg-red-500 justify-end" : "bg-white/10 justify-start"
              )}
            >
              <div className="w-4 h-4 bg-brand-dark rounded-full shadow-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Zap className="w-24 h-24" />
        </div>
        <h3 className="text-xl font-display font-bold uppercase tracking-widest relative z-10">Growth & Promotions</h3>
        <div className="space-y-4 relative z-10">
          <button className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                <Gift className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold tracking-tight">Promo Codes</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Create discount campaigns</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>

          <button className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-brand-blue/10 text-brand-blue group-hover:scale-110 transition-transform">
                <Share2 className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="text-sm font-bold tracking-tight">Referral System</p>
                <p className="text-[10px] text-white/30 uppercase tracking-widest">Track invites & rewards</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
          </button>
        </div>

        <div className="pt-4 space-y-6 relative z-10">
          <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 mb-4">Withdrawal Limits</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <p className="text-[8px] uppercase tracking-widest font-bold text-white/20">Minimum (₦)</p>
              <input 
                type="number" 
                value={minWithdrawal} 
                onChange={(e) => setMinWithdrawal(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all" 
              />
            </div>
            <div className="space-y-2">
              <p className="text-[8px] uppercase tracking-widest font-bold text-white/20">Maximum (₦)</p>
              <input 
                type="number" 
                value={maxWithdrawal} 
                onChange={(e) => setMaxWithdrawal(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all" 
              />
            </div>
          </div>
          
          <button 
            onClick={saveLimits}
            disabled={isSaving}
            className="w-full py-4 bg-brand-blue text-brand-dark rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Limits'}
          </button>

          <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
            <Clock className="w-4 h-4 text-white/20 group-hover:text-brand-blue transition-colors" />
            Schedule System Backup
          </button>
        </div>
      </div>
    </div>
  );
}
