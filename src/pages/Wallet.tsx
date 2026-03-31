import { useState, useEffect } from 'react';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_TRANSACTIONS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { APP_CONFIG } from '../config';
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
  AlertCircle,
  Users,
  X,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../components/Toaster';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    Korapay: any;
    PaystackPop: any;
  }
}

export default function WalletPage({ profile, onUpdate }: { profile: any, onUpdate?: () => void }) {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState('1500');
  const [paymentType, setPaymentType] = useState<'subscription' | 'topup'>('subscription');
  const [paymentGateway, setPaymentGateway] = useState<'korapay' | 'paystack'>(
    APP_CONFIG.PAYMENT_GATEWAY === 'korapay' ? 'korapay' : 'paystack'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [debugStatus, setDebugStatus] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [scriptStatus, setScriptStatus] = useState({
    paystack: false,
    korapay: false
  });

  useEffect(() => {
    const checkScripts = () => {
      setScriptStatus({
        paystack: !!window.PaystackPop,
        korapay: !!window.Korapay
      });
    };
    
    checkScripts();
    const interval = setInterval(checkScripts, 2000);
    return () => clearInterval(interval);
  }, []);

  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (onUpdate) await onUpdate();
      toast('Wallet data refreshed', 'success');
    } catch (err) {
      toast('Failed to refresh data', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const checkBackend = async () => {
    console.log('Checking backend connection...');
    const backendUrl = APP_CONFIG.BACKEND_URL || '';
    try {
      const res = await fetch(`${backendUrl}/api/debug-config`);
      if (res.ok) {
        const data = await res.json();
        setDebugStatus(data);
        setShowDebug(true);
        toast('Backend is reachable!', 'success');
      } else {
        const text = await res.text();
        console.error('Backend check failed:', res.status, text);
        toast(`Backend check failed: Status ${res.status}`, 'error');
      }
    } catch (err: any) {
      console.error('Backend check error:', err);
      toast(`Failed to reach backend: ${err.message || 'Unknown error'}. If you are on Vercel, make sure your backend is running on Cloud Run and reachable.`, 'error');
    }
  };

  const testDb = async () => {
    const backendUrl = APP_CONFIG.BACKEND_URL || '';
    try {
      const res = await fetch(`${backendUrl}/api/test-db`);
      const data = await res.json();
      toast(data.message, data.status === 'ok' ? 'success' : 'error');
    } catch (err) {
      toast('Failed to test DB connection', 'error');
    }
  };

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
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setTransactions(data);
      }
      setLoading(false);
    };

    fetchTransactions();

    if (!isSupabaseActive) return;

    // Real-time updates
    const channel = supabase
      .channel(`wallet-tx-${profile.id}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'transactions',
        filter: `profile_id=eq.${profile.id}`
      }, (payload) => {
        console.log('New transaction detected:', payload.new);
        fetchTransactions();
        if (onUpdate) onUpdate();
        
        // If this is our pending transaction, show success
        if (pendingReference && payload.new.reference === pendingReference) {
          toast('Payment verified! Your balance has been updated.', 'success');
          setPendingReference(null);
          setIsProcessing(false);
          setShowDepositModal(false);
        }
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'wallet',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        if (onUpdate) onUpdate();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, onUpdate, pendingReference]);

  const handleDeposit = async () => {
    if (!profile?.id || !profile?.email) {
      toast('Your profile is still loading. Please wait a moment.', 'info');
      return;
    }
    
    const amount = paymentType === 'subscription' ? 1500 : parseFloat(depositAmount);
    
    if (isNaN(amount) || amount <= 0) {
      toast('Please enter a valid amount', 'error');
      return;
    }

    setIsProcessing(true);

    if (paymentGateway === 'paystack') {
      handlePaystackPayment(amount);
    } else {
      handleKorapayPayment(amount);
    }
  };

  const handlePaystackPayment = (amount: number) => {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
    console.log('Paystack: Starting payment process (v2)...', { amount, hasKey: !!publicKey });
    
    if (!publicKey || publicKey === '') {
      console.error('Paystack Public Key is missing');
      toast('Paystack is not configured. Please check your environment variables.', 'error');
      setIsProcessing(false);
      return;
    }

    if (!window.PaystackPop) {
      console.error('Paystack script not loaded');
      toast('Paystack is still loading. Please wait a moment and try again.', 'error');
      setIsProcessing(false);
      return;
    }

    if (!profile?.email) {
      console.error('Paystack: No user email found');
      toast('User email not found. Please log in again.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      console.log('Paystack: Initializing v2 popup...');
      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: profile.email,
        amount: Math.round(amount * 100), // Amount in kobo
        currency: 'NGN',
        ref: `PS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        onSuccess: (transaction: any) => {
          console.log('Paystack: Payment successful (frontend callback)', transaction);
          const reference = transaction.reference;
          setPendingReference(reference);
          setIsProcessing(true);
          toast('Payment received! Waiting for verification...', 'info');
          verifyPayment(reference, amount, 'paystack');
        },
        onCancel: () => {
          console.log('Paystack: Window closed/cancelled');
          setIsProcessing(false);
          toast('Payment window closed', 'info');
        }
      });
    } catch (err: any) {
      console.error("Paystack initialization error:", err);
      
      // Fallback to v1 if v2 constructor fails for some reason
      try {
        console.log('Paystack: Falling back to v1 setup...');
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: profile.email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          ref: `PS-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          callback: (response: any) => {
            console.log('Paystack v1: Payment successful (frontend callback)', response);
            const reference = response.reference;
            setPendingReference(reference);
            setIsProcessing(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, amount, 'paystack');
          },
          onClose: () => {
            console.log('Paystack v1: Window closed');
            setIsProcessing(false);
            toast('Payment window closed', 'info');
          }
        });
        handler.openIframe();
      } catch (fallbackErr: any) {
        console.error("Paystack fallback error:", fallbackErr);
        const errorMsg = fallbackErr.message || (typeof fallbackErr === 'string' ? fallbackErr : 'Unknown error');
        toast(`Failed to start Paystack payment: ${errorMsg}`, 'error');
        setIsProcessing(false);
      }
    }
  };

  const handleKorapayPayment = (amount: number) => {
    const publicKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY?.trim();
    console.log('KoraPay: Starting payment process...', { amount, hasKey: !!publicKey });
    
    if (!publicKey || publicKey === '') {
      console.error('KoraPay Public Key is missing');
      toast('KoraPay is not configured. Please check your environment variables.', 'error');
      setIsProcessing(false);
      return;
    }

    if (!window.Korapay) {
      console.error('KoraPay script not loaded');
      toast('KoraPay is still loading. Please wait a moment and try again.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      console.log('KoraPay: Initializing checkout...');
      window.Korapay.initialize({
        key: publicKey,
        amount: amount, // KoraPay expects Naira
        currency: 'NGN',
        reference: `KORA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customer: { 
          name: profile?.display_name || profile?.username || 'Customer',
          email: profile?.email || 'customer@example.com' 
        },
        onSuccess: (response: any) => {
          console.log("KoraPay: Payment successful (frontend callback)", response);
          const reference = response.reference || response.checkout_reference || (response.data && response.data.reference);
          if (reference) {
            setPendingReference(reference);
            setIsProcessing(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, amount, 'korapay');
          } else {
            console.error('KoraPay: No reference found in response', response);
            toast('Payment successful but reference not found. Please contact support.', 'error');
            setIsProcessing(false);
          }
        },
        onFailed: (response: any) => {
          console.error("KoraPay: Payment failed", response);
          setIsProcessing(false);
          toast('Payment failed. Please try again.', 'error');
        },
        onClose: () => {
          console.log("KoraPay: Checkout closed");
          setIsProcessing(false);
          toast('Payment window closed', 'info');
        }
      });
    } catch (err: any) {
      console.error("KoraPay initialization error:", err);
      const errorMsg = err.message || (typeof err === 'string' ? err : 'Unknown error');
      toast(`Failed to initialize KoraPay: ${errorMsg}`, 'error');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (reference: string, amount: number, gateway: string) => {
    const backendUrl = APP_CONFIG.BACKEND_URL || '';
    const fullUrl = `${backendUrl}/api/payment-success`;
    console.log(`Starting verification for ${gateway} payment. Ref: ${reference}, Amount: ${amount}`);
    console.log(`Targeting backend URL: ${fullUrl}`);
    
    try {
      const verifyRes = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          type: paymentType,
          amount,
          userId: profile.id,
          email: profile.email,
          gateway
        })
      });

      if (verifyRes.ok) {
        const data = await verifyRes.json();
        console.log("Verification success:", data);
        toast('Payment successful! Your account has been updated.', 'success');
        setShowDepositModal(false);
        
        // Trigger profile refresh
        if (onUpdate) onUpdate();
        
        // Redirect after success
        setTimeout(() => window.location.href = '/discovery', 1500);
      } else {
        let errorMsg = `Status ${verifyRes.status}`;
        try {
          const text = await verifyRes.text();
          console.error("Verification failed response text:", text);
          try {
            const err = JSON.parse(text);
            errorMsg = err.error || err.message || errorMsg;
          } catch (e) {
            errorMsg = text.substring(0, 100);
          }
        } catch (e) {
          console.error("Failed to read response body:", e);
        }
        toast(`Payment verification failed: ${errorMsg}`, 'error');
      }
    } catch (err: any) {
      console.error("Verification fetch error:", err);
      toast(`Failed to reach backend for verification: ${err.message || 'Unknown error'} (URL: ${fullUrl})`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const balance = profile?.wallet?.balance || profile?.balance || 0;

  // Calculate dynamic stats
  const stats = transactions.reduce((acc, tx) => {
    if (tx.status !== 'completed') {
      acc.pending += tx.amount;
      return acc;
    }

    const isOutgoing = tx.from_uid === profile?.id;
    if (tx.type === 'deposit') {
      // Deposits are technically incoming to the wallet but not "earned" from others
      return acc;
    }

    if (isOutgoing) {
      acc.spent += tx.amount;
    } else {
      acc.earned += tx.amount;
    }
    return acc;
  }, { spent: 0, earned: 0, pending: 0 });

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('5000');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: ''
  });

  const handleWithdraw = async () => {
    if (!profile?.id) return;
    const amount = parseFloat(withdrawAmount);
    
    if (amount > balance) {
      toast('Insufficient balance', 'error');
      return;
    }

    if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
      toast('Please fill in all bank details', 'error');
      return;
    }

    if (!isSupabaseActive) {
      const newTx = {
        id: `tx-out-${Date.now()}`,
        from_uid: profile.id,
        amount: amount,
        type: 'withdrawal',
        status: 'pending',
        timestamp: new Date().toISOString()
      };
      setTransactions(prev => [newTx, ...prev]);
      setShowWithdrawModal(false);
      toast('Withdrawal request submitted (Mock Mode)!', 'success');
      return;
    }

    const { error } = await supabase
      .from('transactions')
      .insert({
        profile_id: profile.id,
        amount: amount,
        type: 'withdrawal',
        status: 'pending',
        metadata: bankDetails
      });

    if (!error) {
      setShowWithdrawModal(false);
      toast('Withdrawal request submitted successfully!', 'success');
    }
  };

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
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
          >
            <Zap className={cn("w-5 h-5 text-white/40 group-hover:text-brand-blue transition-colors", isRefreshing && "animate-spin")} />
          </button>
          
          {profile?.role === 'admin' && (
            <button 
              onClick={checkBackend}
              className="p-3 bg-amber-500/5 border border-amber-500/10 rounded-2xl hover:bg-amber-500/10 transition-all group"
            >
              <Shield className="w-5 h-5 text-amber-500/40 group-hover:text-amber-500 transition-colors" />
            </button>
          )}
          
          <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
            <Shield className="w-6 h-6 text-brand-blue" />
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <AnimatePresence>
        {showDebug && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-3xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-amber-500 font-bold uppercase tracking-widest text-[10px]">Backend Debug Console</h3>
                <button onClick={() => setShowDebug(false)} className="text-white/20 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <div className="text-[8px] text-white/30 uppercase mb-1">Paystack Key</div>
                  <div className={cn("text-[10px] font-mono", debugStatus?.hasPaystackKey ? "text-green-500" : "text-red-500")}>
                    {debugStatus?.hasPaystackKey ? "PRESENT" : "MISSING"}
                  </div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <div className="text-[8px] text-white/30 uppercase mb-1">KoraPay Key</div>
                  <div className={cn("text-[10px] font-mono", debugStatus?.hasKorapayKey ? "text-green-500" : "text-red-500")}>
                    {debugStatus?.hasKorapayKey ? "PRESENT" : "MISSING"}
                  </div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <div className="text-[8px] text-white/30 uppercase mb-1">Supabase Key</div>
                  <div className={cn("text-[10px] font-mono", debugStatus?.hasServiceKey ? "text-green-500" : "text-red-500")}>
                    {debugStatus?.hasServiceKey ? "PRESENT" : "MISSING"}
                  </div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5">
                  <div className="text-[8px] text-white/30 uppercase mb-1">Env</div>
                  <div className="text-[10px] font-mono text-brand-blue uppercase">{debugStatus?.nodeEnv}</div>
                </div>
              </div>
              <button 
                onClick={testDb}
                className="w-full py-2 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-amber-500/20 transition-all"
              >
                Test Database Write Access
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Balance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                onClick={() => {
                  setPaymentType('topup');
                  setShowDepositModal(true);
                }}
                className="relative z-50 py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Deposit
              </button>
              <button 
                onClick={() => setShowWithdrawModal(true)}
                className="relative z-50 py-5 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-2"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>

        {/* Subscription Status Card */}
        <div className="relative overflow-hidden rounded-[48px] bg-[#0a0a0a] border border-white/10 p-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 blur-[100px] -mr-32 -mt-32" />
          
          <div className="relative z-10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Subscription Status</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-3xl font-display italic tracking-tighter",
                    profile?.is_subscribed ? "text-brand-blue" : "text-white/40"
                  )}>
                    {profile?.is_subscribed ? "ACTIVE" : "INACTIVE"}
                  </span>
                  {profile?.is_subscribed && (
                    <div className="px-3 py-1 bg-brand-blue/10 border border-brand-blue/20 rounded-full">
                      <span className="text-[8px] font-bold text-brand-blue uppercase tracking-widest">Premium</span>
                    </div>
                  )}
                </div>
                {profile?.subscription_expiry && profile?.is_subscribed && (
                  <div className="space-y-1">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                      Expires: {format(new Date(profile.subscription_expiry), 'MMM dd, yyyy')}
                    </p>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-brand-blue" />
                      <span className="text-[10px] text-brand-blue uppercase tracking-widest font-bold">
                        {Math.max(0, Math.ceil((new Date(profile.subscription_expiry).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days Remaining
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-white/5 rounded-3xl border border-white/10">
                <Shield className={cn("w-8 h-8", profile?.is_subscribed ? "text-brand-blue" : "text-white/20")} />
              </div>
            </div>

            <button 
              onClick={() => {
                setPaymentType('subscription');
                setShowDepositModal(true);
              }}
              className={cn(
                "relative z-50 w-full py-5 font-bold uppercase tracking-[0.2em] text-xs rounded-2xl transition-all flex items-center justify-center gap-2",
                profile?.is_subscribed 
                  ? "bg-white/5 border border-white/10 text-white hover:bg-white/10" 
                  : "bg-amber-500 text-black shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:scale-[1.02] active:scale-[0.98]"
              )}
            >
              <Zap className="w-4 h-4" />
              {profile?.is_subscribed ? "Renew Subscription" : "Subscribe Now (₦1,500)"}
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Earnings', value: `₦${stats.earned.toLocaleString()}`, icon: ArrowDownLeft, color: 'text-brand-blue' },
          { label: 'Referrals', value: profile?.referral_count || '0', icon: Users, color: 'text-purple-400' },
          { label: 'Current Balance', value: `₦${balance.toLocaleString()}`, icon: Wallet, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className="p-8 rounded-[32px] bg-[#0a0a0a] border border-white/10 space-y-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-3xl -mr-16 -mt-16 group-hover:bg-brand-blue/5 transition-colors" />
            <div className="flex items-center justify-between relative z-10">
              <div className={cn("p-3 rounded-2xl bg-white/5 border border-white/10", stat.color)}>
                {typeof stat.icon === 'string' ? <span className="text-xl font-bold">{stat.icon}</span> : <stat.icon className="w-6 h-6" />}
              </div>
              <TrendingUp className="w-4 h-4 text-white/10" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">{stat.label}</p>
              <p className="text-3xl font-display italic tracking-tighter mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-display uppercase tracking-widest italic">Recent Transactions</h3>
          <button className="text-[10px] uppercase tracking-widest font-bold text-brand-blue hover:underline">View All</button>
        </div>

        {pendingReference && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-brand-blue/10 border border-brand-blue/20 rounded-3xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-brand-blue border-t-transparent animate-spin" />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-brand-blue">Verifying Payment...</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Reference: {pendingReference}</p>
              </div>
            </div>
            <p className="text-[10px] text-white/40 uppercase tracking-widest italic">Please do not refresh</p>
          </motion.div>
        )}

        <div className="bg-[#0a0a0a] border border-white/10 rounded-[32px] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-white/20">Type</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-white/20">Date</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-white/20">Amount</th>
                  <th className="px-6 py-4 text-[10px] uppercase tracking-[0.2em] font-bold text-white/20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-8"><div className="h-4 bg-white/5 rounded w-full" /></td>
                    </tr>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => {
                    return (
                      <tr key={tx.id} className="hover:bg-white/5 transition-colors group">
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center",
                              tx.type === 'deposit' ? "bg-brand-blue/10 text-brand-blue" :
                              tx.type === 'withdrawal' ? "bg-amber-500/10 text-amber-500" :
                              (tx.type === 'payment' || tx.type === 'subscription') ? "bg-red-500/10 text-red-500" : "bg-brand-blue/10 text-brand-blue"
                            )}>
                              {tx.type === 'deposit' ? <Plus className="w-5 h-5" /> :
                               tx.type === 'withdrawal' ? <ArrowUpRight className="w-5 h-5" /> :
                               (tx.type === 'payment' || tx.type === 'subscription') ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                            </div>
                            <span className="font-bold tracking-tight uppercase text-[10px]">
                              {tx.type === 'deposit' ? 'Deposit' : 
                               tx.type === 'withdrawal' ? 'Withdrawal' :
                               tx.type === 'subscription' ? 'Subscription' :
                               tx.type === 'tip' ? 'Tip' : tx.type}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-6">
                          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                            {format(new Date(tx.created_at), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <span className={cn(
                            "font-display text-lg italic",
                            (tx.type === 'payment' || tx.type === 'subscription' || tx.type === 'withdrawal') ? "text-red-400" : "text-brand-blue"
                          )}>
                            {(tx.type === 'payment' || tx.type === 'subscription' || tx.type === 'withdrawal') ? '-' : '+'}₦{tx.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-6 py-6">
                          <div className="flex items-center gap-2">
                            {tx.status === 'completed' ? (
                              <CheckCircle className="w-3 h-3 text-brand-blue" />
                            ) : (
                              <Clock className="w-3 h-3 text-amber-400" />
                            )}
                            <span className={cn(
                              "text-[8px] uppercase tracking-widest font-bold",
                              tx.status === 'completed' ? "text-brand-blue/60" : "text-amber-400/60"
                            )}>
                              {tx.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center">
                      <History className="w-12 h-12 text-white/10 mx-auto mb-4" />
                      <p className="text-white/20 uppercase tracking-widest text-[10px] font-bold">No transactions yet</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Deposit Modal */}
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isProcessing && setShowDepositModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-display uppercase tracking-tighter italic text-white">
                    {paymentType === 'subscription' ? 'Renew Access' : 'Top-up Wallet'}
                  </h3>
                  <button 
                    onClick={() => setShowDepositModal(false)}
                    disabled={isProcessing}
                    className="p-2 hover:bg-white/5 rounded-full transition-colors disabled:opacity-50"
                  >
                    <X className="w-6 h-6 text-white/40" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Payment Type Selection */}
                  <div className="grid grid-cols-2 gap-3 p-1 bg-white/5 rounded-2xl border border-white/10">
                    <button
                      onClick={() => setPaymentType('subscription')}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        paymentType === 'subscription' 
                          ? 'bg-white/10 text-white shadow-lg' 
                          : 'text-white/30 hover:text-white'
                      )}
                    >
                      Subscription
                    </button>
                    <button
                      onClick={() => setPaymentType('topup')}
                      className={cn(
                        "py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all",
                        paymentType === 'topup' 
                          ? 'bg-white/10 text-white shadow-lg' 
                          : 'text-white/30 hover:text-white'
                      )}
                    >
                      Wallet Top-up
                    </button>
                  </div>

                  {paymentType === 'subscription' ? (
                    <div className="p-6 bg-brand-blue/10 border border-brand-blue/20 rounded-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-white/60 text-xs uppercase tracking-widest font-bold">Weekly Access</span>
                        <span className="text-2xl font-display italic text-white">₦1,500</span>
                      </div>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest leading-relaxed">Full access to all features for 7 days.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Amount (NGN)</label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 font-bold text-xl">₦</span>
                        <input 
                          type="number" 
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="Enter amount"
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-12 pr-6 text-white focus:outline-none focus:border-brand-blue/50 transition-all font-bold text-2xl"
                        />
                      </div>
                    </div>
                  )}

                  {/* Gateway Selection */}
                  {(APP_CONFIG.PAYMENT_GATEWAY === 'both' || APP_CONFIG.PAYMENT_GATEWAY === 'paystack' || APP_CONFIG.PAYMENT_GATEWAY === 'korapay') && (
                    <div className="space-y-3">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Select Payment Method</label>
                      <div className={cn(
                        "grid gap-4",
                        APP_CONFIG.PAYMENT_GATEWAY === 'both' ? "grid-cols-2" : "grid-cols-1"
                      )}>
                        {(APP_CONFIG.PAYMENT_GATEWAY === 'both' || APP_CONFIG.PAYMENT_GATEWAY === 'paystack') && (
                          <button
                            onClick={() => setPaymentGateway('paystack')}
                            className={cn(
                              "relative p-4 rounded-2xl border transition-all text-left group",
                              paymentGateway === 'paystack'
                                ? 'bg-brand-blue/10 border-brand-blue/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                paymentGateway === 'paystack' ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/40'
                              )}>
                                <CreditCard className="w-4 h-4" />
                              </div>
                              {paymentGateway === 'paystack' && (
                                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                              )}
                            </div>
                            <span className="block font-bold text-white text-[10px] uppercase tracking-widest">Paystack</span>
                            <span className="text-[8px] text-white/40 uppercase tracking-widest">Cards, Bank</span>
                          </button>
                        )}

                        {(APP_CONFIG.PAYMENT_GATEWAY === 'both' || APP_CONFIG.PAYMENT_GATEWAY === 'korapay') && (
                          <button
                            onClick={() => setPaymentGateway('korapay')}
                            className={cn(
                              "relative p-4 rounded-2xl border transition-all text-left group",
                              paymentGateway === 'korapay'
                                ? 'bg-brand-blue/10 border-brand-blue/50 shadow-[0_0_20px_rgba(37,99,235,0.1)]'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                paymentGateway === 'korapay' ? 'bg-brand-blue text-white' : 'bg-white/10 text-white/40'
                              )}>
                                <Zap className="w-4 h-4" />
                              </div>
                              {paymentGateway === 'korapay' && (
                                <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
                              )}
                            </div>
                            <span className="block font-bold text-white text-[10px] uppercase tracking-widest">Kora Pay</span>
                            <span className="text-[8px] text-white/40 uppercase tracking-widest">Fast & Secure</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={handleDeposit}
                    disabled={isProcessing}
                    className="w-full bg-brand-blue hover:bg-blue-600 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-brand-blue/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                  >
                    {isProcessing ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span className="uppercase tracking-widest text-[10px]">Processing...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5" />
                        <span className="uppercase tracking-widest text-[10px]">Proceed to Payment</span>
                      </>
                    )}
                  </button>
                  
                  <p className="text-center text-[10px] text-white/20 uppercase tracking-widest">
                    Secure encrypted payment via {paymentGateway === 'paystack' ? 'Paystack' : 'KoraPay'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Withdraw Modal */}
      <AnimatePresence>
        {showWithdrawModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowWithdrawModal(false)}
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
                  <ArrowUpRight className="w-8 h-8 text-brand-blue" />
                </div>
                <h2 className="text-3xl font-display uppercase tracking-tighter italic">Withdraw</h2>
                <p className="text-white/40 text-xs uppercase tracking-widest">Transfer funds to your bank account</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="relative">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">₦</span>
                    <input 
                      type="number" 
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:outline-none focus:border-brand-blue/50 transition-all"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      placeholder="Bank Name"
                      value={bankDetails.bankName}
                      onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-brand-blue/50 transition-all"
                    />
                    <input 
                      type="text" 
                      placeholder="Account Number"
                      value={bankDetails.accountNumber}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-brand-blue/50 transition-all"
                    />
                    <input 
                      type="text" 
                      placeholder="Account Name"
                      value={bankDetails.accountName}
                      onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-sm focus:outline-none focus:border-brand-blue/50 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={handleWithdraw}
                    className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    Confirm Withdrawal
                  </button>
                  <button 
                    onClick={() => setShowWithdrawModal(false)}
                    className="w-full py-5 bg-white/5 text-white/40 font-bold uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                  >
                    Cancel
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
