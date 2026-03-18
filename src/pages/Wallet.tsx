import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Plus, 
  History, 
  Shield, 
  Zap, 
  DollarSign, 
  CreditCard,
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function WalletPage({ profile }: { profile: any }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('5000');

  useEffect(() => {
    if (!profile?.id) return;

    const fetchTransactions = async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .or(`from_uid.eq.${profile.id},to_uid.eq.${profile.id}`)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();

    // Real-time updates
    const channel = supabase
      .channel('transactions-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions' 
      }, () => {
        fetchTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleDeposit = async () => {
    if (!profile?.id) return;
    
    const amount = parseFloat(depositAmount);
    
    const { error } = await supabase
      .from('transactions')
      .insert({
        to_uid: profile.id,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        timestamp: new Date().toISOString()
      });

    if (!error) {
      setShowDepositModal(false);
      alert('Deposit successful!');
    }
  };

  const balance = profile?.balance || 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-tighter mb-2">Wallet</h1>
          <p className="text-white/40 font-light text-sm uppercase tracking-widest">Manage your funds securely</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative rounded-[40px] bg-emerald-500 p-10 overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-1000" />
        <div className="relative z-10 space-y-8">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-white/60 text-xs font-bold uppercase tracking-[0.3em]">Available Balance</p>
              <h2 className="text-6xl md:text-7xl font-display tracking-tighter text-white">
                ₦{balance.toLocaleString()}
              </h2>
            </div>
            <div className="p-4 bg-white/20 backdrop-blur-md rounded-2xl">
              <Wallet className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4">
            <button 
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-2 px-8 py-4 bg-white text-emerald-500 rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-105 transition-all shadow-xl shadow-black/10"
            >
              <Plus className="w-4 h-4" />
              Deposit
            </button>
            <button className="flex items-center gap-2 px-8 py-4 bg-white/20 backdrop-blur-md text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/30 transition-all">
              <ArrowUpRight className="w-4 h-4" />
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Spent', value: '₦45,000', icon: ArrowUpRight, color: 'text-red-400' },
          { label: 'Total Earned', value: '₦120,500', icon: ArrowDownLeft, color: 'text-emerald-400' },
          { label: 'Pending', value: '₦12,000', icon: Clock, color: 'text-amber-400' },
        ].map((stat, i) => (
          <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className={cn("p-2 rounded-lg bg-white/5", stat.color)}>
                <stat.icon className="w-4 h-4" />
              </div>
              <TrendingUp className="w-4 h-4 text-white/10" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/30">{stat.label}</p>
              <p className="text-2xl font-display tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display uppercase tracking-widest">Transaction History</h3>
          <button className="text-[10px] uppercase tracking-widest font-bold text-emerald-500 hover:underline">View All</button>
        </div>

        <div className="space-y-2">
          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
            ))
          ) : transactions.length > 0 ? (
            transactions.map((tx, i) => {
              const isOutgoing = tx.from_uid === profile.id;
              return (
                <motion.div
                  key={tx.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      tx.type === 'deposit' ? "bg-emerald-500/10 text-emerald-500" :
                      isOutgoing ? "bg-red-500/10 text-red-500" : "bg-emerald-500/10 text-emerald-500"
                    )}>
                      {tx.type === 'deposit' ? <Plus className="w-6 h-6" /> :
                       isOutgoing ? <ArrowUpRight className="w-6 h-6" /> : <ArrowDownLeft className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="font-bold tracking-tight uppercase text-xs">
                        {tx.type === 'deposit' ? 'Wallet Deposit' : 
                         tx.type === 'tip' ? (isOutgoing ? 'Sent Tip' : 'Received Tip') : tx.type}
                      </p>
                      <p className="text-[10px] text-white/30 uppercase tracking-widest">
                        {format(new Date(tx.timestamp), 'MMM dd, yyyy • HH:mm')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-display text-lg",
                      isOutgoing && tx.type !== 'deposit' ? "text-red-400" : "text-emerald-400"
                    )}>
                      {isOutgoing && tx.type !== 'deposit' ? '-' : '+'}₦{tx.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                      <span className="text-[8px] uppercase tracking-widest font-bold text-white/20">Completed</span>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
              <History className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40 uppercase tracking-widest text-sm">No transactions yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDepositModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[40px] p-10 space-y-8"
            >
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-display uppercase tracking-tighter">Add Funds</h2>
                <p className="text-white/40 text-xs uppercase tracking-widest">Secure deposit via Kora Pay</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">₦</span>
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['1000', '5000', '10000'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                        depositAmount === amount ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                    >
                      ₦{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleDeposit}
                  className="w-full py-5 bg-emerald-500 text-white font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Proceed to Payment
                </button>
                <button 
                  onClick={() => setShowDepositModal(false)}
                  className="w-full py-5 bg-white/5 text-white/40 font-bold uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center justify-center gap-4 opacity-20 grayscale">
                <CreditCard className="w-8 h-8" />
                <span className="text-2xl font-bold italic">Kora</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
