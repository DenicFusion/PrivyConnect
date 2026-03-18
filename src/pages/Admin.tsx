import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
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
  Clock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AdminPage({ profile: myProfile }: { profile: any }) {
  const [users, setUsers] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalVolume: 0,
    activeNow: 0,
    revenue: 0
  });

  useEffect(() => {
    if (myProfile?.role !== 'admin') return;

    const fetchAdminData = async () => {
      setLoading(true);
      
      // Fetch users
      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (userData) setUsers(userData);

      // Fetch transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .order('timestamp', { ascending: false });
      
      if (txData) {
        setTransactions(txData);
        
        const volume = txData.reduce((acc, tx) => acc + tx.amount, 0);
        const commission = txData.reduce((acc, tx) => acc + (tx.commission || 0), 0);
        
        setStats({
          totalUsers: userData?.length || 0,
          totalVolume: volume,
          activeNow: Math.floor(Math.random() * 50) + 10, // Mocked
          revenue: commission
        });
      }
      
      setLoading(false);
    };

    fetchAdminData();
  }, [myProfile?.role]);

  const handleToggleVerify = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_verified: !currentStatus })
      .eq('id', userId);
    
    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_verified: !currentStatus } : u));
    }
  };

  if (myProfile?.role !== 'admin') {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <Lock className="w-12 h-12 text-white/20" />
        <p className="text-white/40 uppercase tracking-[0.3em] font-bold">Access Denied</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-5xl font-display uppercase tracking-tighter mb-2">Command Center</h1>
          <p className="text-white/40 font-light text-sm uppercase tracking-widest">System administration & analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-blue-400' },
          { label: 'Total Volume', value: `₦${stats.totalVolume.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400' },
          { label: 'Platform Revenue', value: `₦${stats.revenue.toLocaleString()}`, icon: DollarSign, color: 'text-amber-400' },
          { label: 'Active Sessions', value: stats.activeNow, icon: Activity, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={i} className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4 group hover:bg-white/10 transition-all">
            <div className="flex items-center justify-between">
              <div className={cn("p-3 rounded-2xl bg-white/5", stat.color)}>
                <stat.icon className="w-6 h-6" />
              </div>
              <BarChart3 className="w-5 h-5 text-white/5" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-white/30 mb-1">{stat.label}</p>
              <p className="text-3xl font-display tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* User Management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-display uppercase tracking-widest">User Management</h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <input 
                type="text" 
                placeholder="Search users..."
                className="bg-white/5 border border-white/10 rounded-full py-2 pl-9 pr-4 text-[10px] uppercase tracking-widest focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
          </div>

          <div className="rounded-[32px] bg-white/5 border border-white/10 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/30">User</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/30">Status</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/30">Balance</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-widest font-bold text-white/30 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={user.photo_url || `https://picsum.photos/seed/${user.id}/100/100`} 
                          className="w-10 h-10 rounded-xl object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <p className="text-sm font-bold tracking-tight">{user.username}</p>
                          <p className="text-[10px] text-white/30 uppercase tracking-widest">{user.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[8px] uppercase tracking-widest font-bold",
                        user.is_verified ? "bg-emerald-500/10 text-emerald-500" : "bg-white/5 text-white/30"
                      )}>
                        {user.is_verified ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                        {user.is_verified ? 'Verified' : 'Pending'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-display">₦{(user.balance || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleToggleVerify(user.id, user.is_verified)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/20 hover:text-white"
                      >
                        <Shield className={cn("w-4 h-4", user.is_verified && "text-emerald-500")} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="space-y-6">
          <h3 className="text-xl font-display uppercase tracking-widest">Recent Activity</h3>
          <div className="space-y-4">
            {transactions.slice(0, 8).map((tx, i) => (
              <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center",
                    tx.type === 'tip' ? "bg-amber-500/10 text-amber-500" : "bg-emerald-500/10 text-emerald-500"
                  )}>
                    {tx.type === 'tip' ? <Zap className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest">{tx.type}</p>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest">{new Date(tx.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <p className="text-xs font-display">₦{tx.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
