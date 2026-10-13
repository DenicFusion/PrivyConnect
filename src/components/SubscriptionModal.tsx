import React, { useState, useEffect } from 'react';
import { db, doc, getDoc, collection, query, where, getDocs, onSnapshot } from '../lib/firebase';
import { APP_CONFIG } from '../config';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Check, 
  Crown, 
  CreditCard, 
  Zap, 
  ShieldCheck, 
  Sparkles,
  Lock
} from 'lucide-react';
import { useToast } from './Toaster';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

declare global {
  interface Window {
    Korapay: any;
    PaystackPop: any;
  }
}

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: any;
  onSuccess?: () => void;
  title?: string;
  subtitle?: string;
}

export function SubscriptionModal({
  isOpen,
  onClose,
  profile,
  onSuccess,
  title = "Upgrade to VIP Membership",
  subtitle = "Unlock all 37 Nigerian states, unblurred photos, and unlimited direct messaging replies."
}: SubscriptionModalProps) {
  const { toast } = useToast();
  const [subscriptionPrice, setSubscriptionPrice] = useState(2000);
  const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'korapay'>(
    APP_CONFIG.PAYMENT_GATEWAY === 'korapay' ? 'korapay' : 'paystack'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);

  // Load configured subscription price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const settingsSnap = await getDoc(doc(db, 'system_settings', 'paystack_plan'));
        if (settingsSnap.exists() && settingsSnap.data()?.value?.amount) {
          setSubscriptionPrice(settingsSnap.data().value.amount);
        } else {
          const subSnap = await getDoc(doc(db, 'system_settings', 'subscription_price'));
          if (subSnap.exists() && subSnap.data()?.value?.amount) {
            setSubscriptionPrice(subSnap.data().value.amount);
          }
        }
      } catch (err) {
        console.warn('Error fetching subscription price:', err);
      }
    };
    fetchPrice();
  }, []);

  // Listen for real-time verification via Firestore
  useEffect(() => {
    if (!profile?.id || !isOpen) return;

    const q = query(collection(db, 'transactions'), where('profile_id', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const tx = change.doc.data();
          if (pendingReference && tx.reference === pendingReference) {
            toast('Payment verified! VIP subscription activated.', 'success');
            setPendingReference(null);
            setIsProcessing(false);
            onClose();
            if (onSuccess) onSuccess();
          }
        }
      });
    }, (error) => {
      console.error('Transaction listener error:', error);
    });

    return () => {
      unsubscribe();
    };
  }, [profile?.id, isOpen, pendingReference, onSuccess, onClose, toast]);

  const handleSubscribe = async () => {
    if (!profile?.id || !profile?.email) {
      toast('Please log in with a valid account first.', 'error');
      return;
    }

    setIsProcessing(true);

    if (paymentGateway === 'paystack') {
      try {
        const backendUrl = APP_CONFIG.BACKEND_URL || '';
        const settingsSnap = await getDoc(doc(db, 'system_settings', 'paystack_plan'));
        const settingsData = settingsSnap.exists() ? settingsSnap.data() : null;

        const planCode = settingsData?.value?.code;

        if (!planCode) {
          handlePaystackPayment(subscriptionPrice);
          return;
        }

        const res = await fetch(`${backendUrl}/api/initiate-subscription`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: profile.email,
            amount: subscriptionPrice,
            plan: planCode,
            user_id: profile.id,
            interval: settingsData?.value?.interval || 'monthly'
          })
        });

        if (res.ok) {
          const data = await res.json();
          if (data.status && data.data?.authorization_url) {
            window.location.href = data.data.authorization_url;
            return;
          }
        }
        handlePaystackPayment(subscriptionPrice);
      } catch (err) {
        console.error('Subscription initiate error:', err);
        handlePaystackPayment(subscriptionPrice);
      }
    } else {
      handleKorapayPayment(subscriptionPrice);
    }
  };

  const handlePaystackPayment = (amount: number) => {
    const publicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY?.trim();
    if (!publicKey) {
      toast('Paystack is not configured. Please check your environment variables.', 'error');
      setIsProcessing(false);
      return;
    }

    if (!window.PaystackPop) {
      toast('Paystack is still loading. Please wait a moment.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      const paystack = new window.PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: profile.email,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        ref: `PS-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        onSuccess: (transaction: any) => {
          const reference = transaction.reference;
          setPendingReference(reference);
          setIsProcessing(true);
          toast('Payment received! Waiting for verification...', 'info');
          verifyPayment(reference, 'paystack');
        },
        onCancel: () => {
          setIsProcessing(false);
          toast('Payment cancelled', 'info');
        }
      });
    } catch {
      try {
        const handler = window.PaystackPop.setup({
          key: publicKey,
          email: profile.email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          ref: `PS-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          callback: (response: any) => {
            const reference = response.reference;
            setPendingReference(reference);
            setIsProcessing(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, 'paystack');
          },
          onClose: () => {
            setIsProcessing(false);
            toast('Payment window closed', 'info');
          }
        });
        handler.openIframe();
      } catch (fallbackErr: any) {
        toast(`Failed to start Paystack: ${fallbackErr.message || 'Unknown error'}`, 'error');
        setIsProcessing(false);
      }
    }
  };

  const handleKorapayPayment = (amount: number) => {
    const publicKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY?.trim();
    if (!publicKey) {
      toast('KoraPay is not configured. Please check your environment variables.', 'error');
      setIsProcessing(false);
      return;
    }

    if (!window.Korapay) {
      toast('KoraPay is still loading. Please wait a moment and try again.', 'error');
      setIsProcessing(false);
      return;
    }

    try {
      window.Korapay.initialize({
        key: publicKey,
        amount: amount,
        currency: 'NGN',
        reference: `KORA-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        customer: {
          name: profile?.display_name || profile?.username || 'Customer',
          email: profile?.email || 'customer@example.com'
        },
        onSuccess: (response: any) => {
          const reference = response.reference || response.checkout_reference || (response.data && response.data.reference);
          if (reference) {
            setPendingReference(reference);
            setIsProcessing(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, 'korapay');
          } else {
            toast('Payment completed but reference missing.', 'error');
            setIsProcessing(false);
          }
        },
        onFailed: () => {
          setIsProcessing(false);
          toast('Payment failed. Please try again.', 'error');
        },
        onClose: () => {
          setIsProcessing(false);
          toast('Payment window closed', 'info');
        }
      });
    } catch (err: any) {
      toast(`Failed to initialize KoraPay: ${err.message || 'Unknown error'}`, 'error');
      setIsProcessing(false);
    }
  };

  const verifyPayment = async (reference: string, gateway: string) => {
    const backendUrl = APP_CONFIG.BACKEND_URL || '';
    try {
      const verifyRes = await fetch(`${backendUrl}/api/payment-success`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference,
          user_id: profile.id,
          type: 'subscription',
          gateway
        })
      });

      if (verifyRes.ok) {
        toast('VIP Subscription activated successfully!', 'success');
        setIsProcessing(false);
        onClose();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          window.location.reload();
        }, 1200);
      } else {
        const text = await verifyRes.text();
        let errorMsg = `Status ${verifyRes.status}`;
        try {
          const err = JSON.parse(text);
          errorMsg = err.error || err.message || errorMsg;
        } catch {
          // ignore
        }
        toast(`Verification error: ${errorMsg}`, 'error');
        setIsProcessing(false);
      }
    } catch (err: any) {
      toast(`Payment error: ${err.message || 'Unknown error'}`, 'error');
      setIsProcessing(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isProcessing && onClose()}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 15 }}
            className="relative w-full max-w-md bg-[#090b0d] border border-[rgba(0,209,255,0.35)] rounded-[28px] p-6 sm:p-7 space-y-5 shadow-2xl z-10"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/[0.075] pb-4">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  MEMBERSHIP UPGRADE
                </span>
                <h3 className="font-serif text-2xl text-[#f3f6f8] mt-0.5">
                  {title}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isProcessing}
                className="p-2 text-[#59636d] hover:text-[#f3f6f8] rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price Badge */}
            <div className="p-5 bg-gradient-to-br from-[#022c37] via-[#08151b] to-[#040506] border border-[#00d1ff]/30 rounded-[22px] space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#00d1ff] font-semibold flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  VIP ACCESS PASS
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="font-serif text-3xl sm:text-4xl text-[#f3f6f8]">₦{subscriptionPrice.toLocaleString()}</span>
                  <span className="font-mono text-xs text-[#8d97a1] uppercase">/ mo</span>
                </div>
              </div>
              <p className="text-xs text-[#8d97a1] leading-relaxed">
                {subtitle}
              </p>
            </div>

            {/* Perks */}
            <div className="bg-[#0f1215] rounded-[18px] p-4 border border-white/[0.075] space-y-2 text-xs text-[#f3f6f8]">
              <div className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#00d1ff] shrink-0 stroke-[3]" />
                <span>All 37 Nigerian states unlocked (36 states + Abuja)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#00d1ff] shrink-0 stroke-[3]" />
                <span>Unlimited direct message replies & chat initiation</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Check className="w-3.5 h-3.5 text-[#00d1ff] shrink-0 stroke-[3]" />
                <span>Unblurred HD photo galleries and member verification badge</span>
              </div>
            </div>

            {/* Gateway Selection */}
            <div className="space-y-2">
              <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                Select Payment Gateway
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentGateway('paystack')}
                  className={cn(
                    "p-3.5 rounded-[18px] border text-left transition-all cursor-pointer space-y-1",
                    paymentGateway === 'paystack'
                      ? 'border-[#00d1ff] bg-[#00d1ff]/10 shadow-[0_0_15px_rgba(0,209,255,0.15)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  )}
                >
                  <CreditCard className={cn("w-4 h-4", paymentGateway === 'paystack' ? "text-[#00d1ff]" : "text-[#8d97a1]")} />
                  <p className="text-xs font-bold text-[#f3f6f8]">Paystack</p>
                  <p className="font-mono text-[10px] text-[#59636d] uppercase">Cards & Bank</p>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentGateway('korapay')}
                  className={cn(
                    "p-3.5 rounded-[18px] border text-left transition-all cursor-pointer space-y-1",
                    paymentGateway === 'korapay'
                      ? 'border-[#00d1ff] bg-[#00d1ff]/10 shadow-[0_0_15px_rgba(0,209,255,0.15)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                  )}
                >
                  <Zap className={cn("w-4 h-4", paymentGateway === 'korapay' ? "text-[#00d1ff]" : "text-[#8d97a1]")} />
                  <p className="text-xs font-bold text-[#f3f6f8]">KoraPay</p>
                  <p className="font-mono text-[10px] text-[#59636d] uppercase">Instant Transfer</p>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <button
              type="button"
              onClick={handleSubscribe}
              disabled={isProcessing}
              className="w-full bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold py-4 rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] flex items-center justify-center gap-2 cursor-pointer font-sans text-sm disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#00131a] border-t-transparent rounded-full animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">Processing...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Subscribe with {paymentGateway === 'paystack' ? 'Paystack' : 'KoraPay'} · ₦{subscriptionPrice.toLocaleString()}</span>
                </>
              )}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
