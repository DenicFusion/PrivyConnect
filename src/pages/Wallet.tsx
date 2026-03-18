import { useState, useEffect } from 'react';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_TRANSACTIONS } from '../lib/mockData';
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
      if (!isSupabaseActive) {
        setTransactions(MOCK_TRANSACTIONS);
        setLoading(false);
        return;
      }

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

    if (!isSupabaseActive) return;

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
    
    if (!isSupabaseActive) {
      const newTx = {
        id: `tx-${Date.now()}`,
        to_uid: profile.id,
        amount: amount,
        type: 'deposit',
        status: 'completed',
        timestamp: new Date().toISOString()
      };
      setTransactions(prev => [newTx, ...prev]);
      setShowDepositModal(false);
      alert('Deposit successful (Mock Mode)!');
      return;
    }

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
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-2xl font-display uppercase tracking-tighter italic">My Wallet</h1>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Manage your earnings & deposits</p>
          </div>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-brand-blue" />
        </div>
      </div>

      {/* Balance Card */}
      <div className="relative overflow-hidden rounded-[48px] bg-[#0a0a0a] border border-white/10 p-10">
        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] -mr-32 -mt-32" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-blue/5 blur-[100px] -ml-32 -mb-32" />
        
        <div className="relative z-10 space-y-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Total Balance</span>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-display italic tracking-tighter">₦{balance.toLocaleString()}</span>
                <span className="text-brand-blue text-xs font-bold">NGN</span>
              </div>
            </div>
            <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
              <Zap className="w-8 h-8 text-brand-blue" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => setShowDepositModal(true)}
              className="py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              Deposit
            </button>
            <button className="py-5 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
              Withdraw
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Spent', value: '₦45,000', icon: ArrowUpRight, color: 'text-red-400' },
          { label: 'Total Earned', value: '₦120,500', icon: ArrowDownLeft, color: 'text-brand-blue' },
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
          <button className="text-[10px] uppercase tracking-widest font-bold text-brand-blue hover:underline">View All</button>
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
                      tx.type === 'deposit' ? "bg-brand-blue/10 text-brand-blue" :
                      isOutgoing ? "bg-red-500/10 text-red-500" : "bg-brand-blue/10 text-brand-blue"
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
                      isOutgoing && tx.type !== 'deposit' ? "text-red-400" : "text-brand-blue"
                    )}>
                      {isOutgoing && tx.type !== 'deposit' ? '-' : '+'}₦{tx.amount.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-1">
                      <CheckCircle className="w-3 h-3 text-brand-blue" />
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
                <div className="w-16 h-16 rounded-2xl bg-brand-blue/10 flex items-center justify-center mx-auto mb-4">
                  <Plus className="w-8 h-8 text-brand-blue" />
                </div>
                <h2 className="text-3xl font-display uppercase tracking-tighter italic">Add Funds</h2>
                <p className="text-white/40 text-xs uppercase tracking-widest">Secure deposit via <span className="text-brand-blue">Kora Pay</span></p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">₦</span>
                  <input 
                    type="number" 
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:outline-none focus:border-brand-blue/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['1000', '5000', '10000'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setDepositAmount(amount)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                        depositAmount === amount ? "bg-brand-blue border-brand-blue text-brand-dark" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
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
                  className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
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
