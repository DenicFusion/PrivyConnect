import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db, doc, getDoc, updateDoc, deleteDoc, collection, query, where, onSnapshot, signOut, updatePassword } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  CreditCard, 
  Camera, 
  LogOut, 
  Eye, 
  EyeOff, 
  MapPin, 
  Smartphone, 
  Save, 
  CheckCircle2, 
  Trash2, 
  AlertTriangle, 
  ChevronDown, 
  Check, 
  Crown, 
  Sparkles, 
  Copy, 
  X,
  Globe,
  Zap,
  ShieldCheck
} from 'lucide-react';
import { APP_CONFIG } from '../config';
import imageCompression from 'browser-image-compression';
import { uploadToCloudinary } from '../lib/cloudinary';
import { useToast } from '../components/Toaster';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { NIGERIAN_STATES } from './Discovery';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ALL_INTERESTS = [
  'Fine Dining',
  'Luxury Travel',
  'Nightlife',
  'Art & Culture',
  'Deep Conversations',
  'Champagne',
  'Gym & Fitness',
  'Yachting',
  'Fashion & Couture',
  'Private Jet',
  'Investing',
  'Music Festivals'
];

const VIBE_OPTIONS = [
  'SUGAR MUMMY',
  'SUGAR DADDY',
  'BESTIE',
  'FWB',
  'HOOKUP'
];

type SettingsTab = 'account' | 'privacy' | 'notifications' | 'subscription' | 'security';

export default function SettingsPage({ profile }: { profile: any }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 5 SEPARATE TABS - per strict user specification (no long scroll)
  const [activeTab, setActiveTab] = useState<SettingsTab>('account');

  const [loading, setLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Password change state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Subscription payment state
  const [subscriptionPrice, setSubscriptionPrice] = useState(2000);
  const [paymentGateway, setPaymentGateway] = useState<'paystack' | 'korapay'>(
    APP_CONFIG.PAYMENT_GATEWAY === 'korapay' ? 'korapay' : 'paystack'
  );
  const [isProcessingSub, setIsProcessingSub] = useState(false);
  const [pendingReference, setPendingReference] = useState<string | null>(null);

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
      } catch (e) {
        console.warn('Error fetching subscription price:', e);
      }
    };
    fetchPrice();
  }, []);

  // Listen for real-time payment success via Firestore
  useEffect(() => {
    if (!profile?.id) return;

    const q = query(collection(db, 'transactions'), where('profile_id', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const tx = change.doc.data();
          if (pendingReference && tx.reference === pendingReference) {
            toast('Payment verified! VIP subscription activated.', 'success');
            setPendingReference(null);
            setIsProcessingSub(false);
            setTimeout(() => window.location.reload(), 1200);
          }
        }
      });
    }, (error) => {
      console.error('Settings tx listener error:', error);
    });

    return () => unsubscribe();
  }, [profile?.id, pendingReference, toast]);

  const handleSubscribe = async () => {
    if (!profile?.id || !profile?.email) {
      toast('Please log in with a valid account.', 'error');
      return;
    }

    setIsProcessingSub(true);

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
        console.error('Subscription error:', err);
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
      setIsProcessingSub(false);
      return;
    }

    if (!(window as any).PaystackPop) {
      toast('Paystack is still loading. Please wait a moment and try again.', 'error');
      setIsProcessingSub(false);
      return;
    }

    try {
      const paystack = new (window as any).PaystackPop();
      paystack.newTransaction({
        key: publicKey,
        email: profile.email,
        amount: Math.round(amount * 100),
        currency: 'NGN',
        ref: `PS-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        onSuccess: (transaction: any) => {
          const reference = transaction.reference;
          setPendingReference(reference);
          setIsProcessingSub(true);
          toast('Payment received! Waiting for verification...', 'info');
          verifyPayment(reference, 'paystack');
        },
        onCancel: () => {
          setIsProcessingSub(false);
          toast('Payment cancelled', 'info');
        }
      });
    } catch {
      try {
        const handler = (window as any).PaystackPop.setup({
          key: publicKey,
          email: profile.email,
          amount: Math.round(amount * 100),
          currency: 'NGN',
          ref: `PS-SUB-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          callback: (response: any) => {
            const reference = response.reference;
            setPendingReference(reference);
            setIsProcessingSub(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, 'paystack');
          },
          onClose: () => {
            setIsProcessingSub(false);
            toast('Payment window closed', 'info');
          }
        });
        handler.openIframe();
      } catch (fallbackErr: any) {
        toast(`Failed to start Paystack: ${fallbackErr.message || 'Unknown error'}`, 'error');
        setIsProcessingSub(false);
      }
    }
  };

  const handleKorapayPayment = (amount: number) => {
    const publicKey = import.meta.env.VITE_KORAPAY_PUBLIC_KEY?.trim();
    if (!publicKey) {
      toast('KoraPay is not configured. Please check your environment variables.', 'error');
      setIsProcessingSub(false);
      return;
    }

    if (!(window as any).Korapay) {
      toast('KoraPay is still loading. Please wait a moment and try again.', 'error');
      setIsProcessingSub(false);
      return;
    }

    try {
      (window as any).Korapay.initialize({
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
            setIsProcessingSub(true);
            toast('Payment received! Waiting for verification...', 'info');
            verifyPayment(reference, 'korapay');
          } else {
            toast('Payment completed but reference missing.', 'error');
            setIsProcessingSub(false);
          }
        },
        onFailed: () => {
          setIsProcessingSub(false);
          toast('Payment failed. Please try again.', 'error');
        },
        onClose: () => {
          setIsProcessingSub(false);
          toast('Payment window closed', 'info');
        }
      });
    } catch (err: any) {
      toast(`Failed to initialize KoraPay: ${err.message || 'Unknown error'}`, 'error');
      setIsProcessingSub(false);
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
        setIsProcessingSub(false);
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
        setIsProcessingSub(false);
      }
    } catch (err: any) {
      toast(`Payment error: ${err.message || 'Unknown error'}`, 'error');
      setIsProcessingSub(false);
    }
  };
  
  // Comprehensive Form State
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || profile?.username || '',
    username: profile?.username || '',
    email: profile?.email || '',
    bio: profile?.bio || '',
    gender: profile?.gender || 'female',
    looking_for: profile?.looking_for || 'everyone',
    state: profile?.state || profile?.preferences?.state || 'Lagos',
    vibe: profile?.vibe || profile?.preferences?.vibe || 'SUGAR MUMMY',
    interests: Array.isArray(profile?.preferences?.interests) 
      ? profile.preferences.interests 
      : (Array.isArray(profile?.preferences) ? profile.preferences : ['Fine Dining', 'Luxury Travel', 'Nightlife', 'Art & Culture']),
    photo_url: profile?.photo_url || '',
    messaging_privacy: profile?.messaging_privacy || 'everyone',
    location_privacy: profile?.location_privacy || 'exact',
    is_public: profile?.is_public ?? true,
    hide_online_status: profile?.hide_online_status ?? false,
    ghost_mode: profile?.profile_mode === 'incognito',
    auto_renew: profile?.auto_renew ?? false,
    notification_settings: profile?.notification_settings || {
      chat: true,
      tips: true,
      subscriptions: true,
      promotions: false
    }
  });

  // Sync when profile prop arrives
  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        display_name: profile.display_name || profile.username || prev.display_name,
        username: profile.username || prev.username,
        email: profile.email || prev.email,
        bio: profile.bio || prev.bio,
        gender: profile.gender || prev.gender,
        looking_for: profile.looking_for || prev.looking_for,
        state: profile.state || profile.preferences?.state || prev.state,
        vibe: profile.vibe || profile.preferences?.vibe || prev.vibe,
        interests: Array.isArray(profile.preferences?.interests)
          ? profile.preferences.interests
          : (Array.isArray(profile.preferences) ? profile.preferences : prev.interests),
        photo_url: profile.photo_url || prev.photo_url,
        messaging_privacy: profile.messaging_privacy || prev.messaging_privacy,
        location_privacy: profile.location_privacy || prev.location_privacy,
        is_public: profile.is_public ?? prev.is_public,
        hide_online_status: profile.hide_online_status ?? prev.hide_online_status,
        ghost_mode: profile.profile_mode === 'incognito',
        auto_renew: profile.auto_renew ?? prev.auto_renew,
        notification_settings: profile.notification_settings || prev.notification_settings
      }));
    }
  }, [profile]);

  // Toggle interest
  const toggleInterest = (tag: string) => {
    setFormData(prev => {
      const exists = prev.interests.includes(tag);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i: string) => i !== tag) };
      } else {
        return { ...prev, interests: [...prev.interests, tag] };
      }
    });
  };

  // Handle Photo Upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast('Please upload an image file (PNG, JPG, WEBP)', 'error');
      return;
    }

    try {
      setUploadingPhoto(true);
      toast('Uploading photo...', 'info');

      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1200,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const uploadedUrl = await uploadToCloudinary(compressedFile);

      setFormData(prev => ({ ...prev, photo_url: uploadedUrl }));

      if (profile?.id) {
        await updateDoc(doc(db, 'profiles', profile.id), { photo_url: uploadedUrl });
        try {
          await updateDoc(doc(db, 'users', profile.id), { photo_url: uploadedUrl });
        } catch {
          // ignore
        }
      }

      toast('Profile photo updated successfully!', 'success');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Handle Save All Settings
  const handleSaveAll = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const updates = {
        display_name: formData.display_name.trim(),
        username: formData.username.trim().toLowerCase(),
        bio: formData.bio.trim(),
        gender: formData.gender,
        looking_for: formData.looking_for,
        state: formData.state,
        vibe: formData.vibe,
        photo_url: formData.photo_url,
        messaging_privacy: formData.messaging_privacy,
        location_privacy: formData.location_privacy,
        is_public: formData.is_public,
        hide_online_status: formData.hide_online_status,
        profile_mode: formData.ghost_mode ? 'incognito' : 'public',
        auto_renew: formData.auto_renew,
        notification_settings: formData.notification_settings,
        preferences: {
          ...(typeof profile?.preferences === 'object' && !Array.isArray(profile?.preferences) ? profile?.preferences : {}),
          interests: formData.interests,
          state: formData.state,
          vibe: formData.vibe,
          looking_for: formData.looking_for
        },
        updated_at: new Date().toISOString()
      };

      if (profile?.id) {
        await updateDoc(doc(db, 'profiles', profile.id), updates);
        try {
          await updateDoc(doc(db, 'users', profile.id), updates);
        } catch {
          // ignore
        }
      }

      setSavedSuccess(true);
      toast('Changes saved successfully!', 'success');
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast(err.message || 'Failed to save changes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle Password Update
  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast('Password must be at least 6 characters long', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast('Passwords do not match', 'error');
      return;
    }

    setUpdatingPassword(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
      }
      toast('Password updated successfully!', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast(err.message || 'Failed to update password', 'error');
    } finally {
      setUpdatingPassword(false);
    }
  };

  // Handle Logout
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error(e);
      navigate('/login');
    }
  };

  // Handle Delete Account
  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      if (profile?.id) {
        await deleteDoc(doc(db, 'profiles', profile.id));
        await signOut(auth);
      }
      toast('Account deleted successfully', 'info');
      navigate('/login');
    } catch (err: any) {
      toast(err.message || 'Failed to delete account', 'error');
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const copyProfileUrl = () => {
    const username = formData.username || profile?.username || 'member';
    const url = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast('Profile link copied!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const isSubscribed = profile?.is_subscribed || false;

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'account', label: 'Account' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'security', label: 'Security' }
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-28 px-4 sm:px-6">
      <input 
        ref={fileInputRef}
        type="file" 
        accept="image/*" 
        className="hidden" 
        onChange={handlePhotoUpload}
      />

      {/* Header: mono label and large serif title */}
      <div className="border-b border-white/[0.075] pb-6 pt-2 space-y-1.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
          MANAGE YOUR ACCOUNT & PREFERENCES
        </span>
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-[42px] sm:text-[54px] leading-none text-[#f3f6f8] tracking-tight font-normal">
            Settings
          </h1>

          <button 
            onClick={handleSaveAll}
            disabled={loading}
            className="px-6 py-2.5 bg-[#00d1ff] text-[#00131a] font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] hover:bg-[#00d1ff]/90 active:scale-95 transition-all flex items-center gap-2 cursor-pointer font-sans disabled:opacity-50"
          >
            {loading ? (
              <div className="w-3.5 h-3.5 border-2 border-[#00131a] border-t-transparent rounded-full animate-spin" />
            ) : savedSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" />
            ) : (
              <Save className="w-3.5 h-3.5 stroke-[2.5]" />
            )}
            <span>{loading ? 'Saving...' : savedSuccess ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* Row of rounded tab pills that scrolls sideways on small phones */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] whitespace-nowrap transition-all cursor-pointer border active:scale-95",
                isActive
                  ? "bg-[#00d1ff] text-[#00131a] border-[#00d1ff] font-bold shadow-[0_0_15px_rgba(0,209,255,0.25)]"
                  : "bg-transparent border-white/15 text-[#8d97a1] hover:text-[#f3f6f8] hover:border-white/30"
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content sits in ONE big card (surface-1, 28px radius) */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[28px] p-6 sm:p-8 space-y-7 shadow-xl">
        
        {/* =================== TAB 1: ACCOUNT =================== */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.075] pb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                PROFILE IDENTITY
              </span>
              <h2 className="font-serif text-2xl text-[#f3f6f8] mt-1 font-normal">Account Details</h2>
            </div>

            {/* Round avatar with "Change avatar" link */}
            <div className="flex items-center gap-5 p-4 bg-white/[0.02] border border-white/[0.075] rounded-[22px]">
              <div 
                className="relative group cursor-pointer shrink-0" 
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden border border-white/20 group-hover:border-[#00d1ff] transition-all bg-zinc-900">
                  <img 
                    src={formData.photo_url || `https://picsum.photos/seed/${profile?.id || 'avatar'}/600/600`}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                </div>
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/75 rounded-full flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-[#00d1ff] border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="font-mono text-xs uppercase tracking-[0.14em] text-[#00d1ff] hover:underline cursor-pointer font-bold inline-flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>{uploadingPhoto ? 'Uploading...' : 'Change avatar'}</span>
                </button>
                <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                  JPG, PNG or WEBP · Verified badge preserved
                </p>
              </div>
            </div>

            {/* Input Fields */}
            <div className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Full Name
                </label>
                <input 
                  type="text"
                  value={formData.display_name}
                  onChange={e => setFormData({ ...formData, display_name: e.target.value })}
                  placeholder="e.g. Amara Okafor"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] px-4 py-3.5 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] focus:outline-none transition-all font-sans"
                />
              </div>

              {/* Username */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Username
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#59636d] font-mono text-sm">@</span>
                  <input 
                    type="text"
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                    placeholder="amara_lux"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] pl-8 pr-4 py-3.5 text-sm text-[#f3f6f8] font-mono placeholder-[#59636d] focus:border-[#00d1ff] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#59636d] absolute left-4 top-1/2 -translate-y-1/2" />
                  <input 
                    type="email"
                    disabled
                    value={formData.email || profile?.email || 'user@privyconnect.com'}
                    className="w-full bg-white/[0.02] border border-white/5 rounded-[14px] pl-11 pr-4 py-3.5 text-sm text-[#8d97a1] font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                    Bio
                  </label>
                  <span className="font-mono text-[10px] text-[#59636d]">
                    {formData.bio.length}/300
                  </span>
                </div>
                <textarea 
                  rows={3}
                  maxLength={300}
                  value={formData.bio}
                  onChange={e => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Living my best life in Victoria Island. Looking for genuine high-frequency chemistry..."
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] p-4 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] focus:outline-none transition-all resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Identity & Discovery: Your Gender pills */}
              <div className="space-y-2 pt-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Your Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'female', label: 'Woman' },
                    { id: 'male', label: 'Man' },
                    { id: 'nonbinary', label: 'Non-Binary' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, gender: opt.id })}
                      className={cn(
                        "py-3 rounded-full border text-center font-mono text-xs uppercase tracking-wider transition-all cursor-pointer",
                        formData.gender === opt.id
                          ? "bg-[#00d1ff] text-[#00131a] font-bold border-[#00d1ff] shadow-[0_0_12px_rgba(0,209,255,0.25)]"
                          : "bg-transparent border-white/15 text-[#8d97a1] hover:text-[#f3f6f8]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Looking for pills */}
              <div className="space-y-2 pt-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Looking For
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'male', label: 'Men' },
                    { id: 'female', label: 'Women' },
                    { id: 'everyone', label: 'Everyone' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, looking_for: opt.id })}
                      className={cn(
                        "py-3 rounded-full border text-center font-mono text-xs uppercase tracking-wider transition-all cursor-pointer",
                        formData.looking_for === opt.id
                          ? "bg-[#00d1ff] text-[#00131a] font-bold border-[#00d1ff] shadow-[0_0_12px_rgba(0,209,255,0.25)]"
                          : "bg-transparent border-white/15 text-[#8d97a1] hover:text-[#f3f6f8]"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* State Location dropdown */}
              <div className="space-y-2 pt-2 relative">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  State Location
                </label>
                <button
                  type="button"
                  onClick={() => setShowStateDropdown(!showStateDropdown)}
                  className="w-full bg-white/[0.03] border border-white/10 hover:border-[#00d1ff]/50 rounded-[14px] px-4 py-3.5 text-sm text-[#f3f6f8] flex items-center justify-between transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#00d1ff]" />
                    <span className="font-sans">{formData.state || 'Lagos'}, Nigeria</span>
                  </div>
                  <ChevronDown className={cn("w-4 h-4 text-[#8d97a1] transition-transform", showStateDropdown && "rotate-180")} />
                </button>

                {showStateDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-[#090b0d] border border-white/15 rounded-[18px] shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
                    {NIGERIAN_STATES.map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, state: st });
                          setShowStateDropdown(false);
                        }}
                        className={cn(
                          "w-full px-4 py-2.5 rounded-xl text-left text-sm flex items-center justify-between transition-colors cursor-pointer font-sans",
                          formData.state === st
                            ? "bg-[#00d1ff] text-[#00131a] font-bold"
                            : "text-[#8d97a1] hover:bg-white/10 hover:text-[#f3f6f8]"
                        )}
                      >
                        <span>{st}</span>
                        {formData.state === st && <Check className="w-4 h-4 text-[#00131a]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Desired Vibe */}
              <div className="space-y-2 pt-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Companionship Vibe
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {VIBE_OPTIONS.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFormData({ ...formData, vibe: v })}
                      className={cn(
                        "py-3 px-3 rounded-full border text-center font-mono text-[11px] uppercase tracking-wider transition-all cursor-pointer",
                        formData.vibe === v
                          ? "bg-[#00d1ff] text-[#00131a] font-bold border-[#00d1ff] shadow-[0_0_12px_rgba(0,209,255,0.25)]"
                          : "bg-transparent border-white/15 text-[#8d97a1] hover:text-[#f3f6f8]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Interests & Passions */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                    Interests & Passions
                  </label>
                  <span className="font-mono text-[10px] text-[#00d1ff]">
                    {formData.interests.length} selected
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {ALL_INTERESTS.map(tag => {
                    const isSelected = formData.interests.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleInterest(tag)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-full border font-mono text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 active:scale-95",
                          isSelected
                            ? "bg-[#00d1ff] text-[#00131a] font-bold border-[#00d1ff]"
                            : "bg-transparent border-white/15 text-[#8d97a1] hover:border-white/30"
                        )}
                      >
                        {isSelected && <Check className="w-3 h-3 text-[#00131a] stroke-[3]" />}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Cyan-tinted "Profile sharing" box with link and cyan round copy button */}
              <div className="pt-2">
                <div className="p-4 bg-[#00d1ff]/10 border border-[#00d1ff]/25 rounded-[20px] space-y-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#00d1ff] font-bold block">
                    PROFILE SHARING LINK
                  </span>
                  <div className="flex items-center justify-between gap-3 bg-[#040506] border border-white/10 rounded-[14px] p-2 pl-3.5">
                    <span className="font-mono text-xs text-[#8d97a1] truncate">
                      {window.location.origin}/u/{formData.username || profile?.username || 'member'}
                    </span>
                    <button
                      type="button"
                      onClick={copyProfileUrl}
                      className="w-9 h-9 rounded-full bg-[#00d1ff] text-[#00131a] flex items-center justify-center font-bold shrink-0 hover:bg-[#00d1ff]/90 active:scale-95 transition-all cursor-pointer shadow-[0_0_12px_rgba(0,209,255,0.25)]"
                      title="Copy link"
                    >
                      {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Save changes button */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  disabled={loading}
                  className="w-full py-4 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-bold text-sm rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] active:scale-95 transition-all cursor-pointer font-sans disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-[#00131a] border-t-transparent rounded-full animate-spin" />
                      <span className="font-mono text-xs uppercase tracking-wider">Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =================== TAB 2: PRIVACY =================== */}
        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.075] pb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                CONFIDENTIALITY & VISIBILITY
              </span>
              <h2 className="font-serif text-2xl text-[#f3f6f8] mt-1 font-normal">Privacy Preferences</h2>
            </div>

            {/* Profile Visibility: 3 tiles (Public / Private / Ghost) */}
            <div className="space-y-3">
              <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                Profile Visibility Mode
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'public', label: 'Public', icon: Globe, desc: 'Visible to all verified members in Nigeria' },
                  { id: 'private', label: 'Private', icon: Lock, desc: 'Only members you connect with can view your profile' },
                  { id: 'ghost', label: 'Ghost', icon: EyeOff, desc: 'Browse completely invisible. You will not appear in Discover' }
                ].map(tile => {
                  const isSelected = tile.id === 'ghost' ? formData.ghost_mode : (tile.id === 'public' ? (formData.is_public && !formData.ghost_mode) : (!formData.is_public && !formData.ghost_mode));
                  const IconComp = tile.icon;
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => {
                        if (tile.id === 'ghost') {
                          setFormData({ ...formData, ghost_mode: true, is_public: false });
                        } else if (tile.id === 'public') {
                          setFormData({ ...formData, ghost_mode: false, is_public: true });
                        } else {
                          setFormData({ ...formData, ghost_mode: false, is_public: false });
                        }
                      }}
                      className={cn(
                        "p-4 rounded-[20px] border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2",
                        isSelected
                          ? "border-[#00d1ff] bg-[#00d1ff]/10 text-[#f3f6f8] shadow-[0_0_15px_rgba(0,209,255,0.15)]"
                          : "border-white/10 bg-white/[0.02] text-[#8d97a1] hover:border-white/20"
                      )}
                    >
                      <IconComp className={cn("w-5 h-5", isSelected ? "text-[#00d1ff]" : "text-[#59636d]")} />
                      <span className="text-xs font-semibold">{tile.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                {formData.ghost_mode ? "Browse completely invisible. You will not appear in Discover" : (formData.is_public ? "Visible to all verified members in Nigeria" : "Only members you connect with can view your profile")}
              </p>
            </div>

            {/* Toggles (52x30, cyan when on) */}
            <div className="space-y-5 pt-2 divide-y divide-white/[0.05]">
              {/* Row 1: Public profile */}
              <div className="flex items-center justify-between gap-4 pt-1">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-[#f3f6f8] block">Public profile</span>
                  <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                    Display card in Discovery feed for members in your state
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_public: !formData.is_public })}
                  className={cn(
                    "w-[52px] h-[30px] rounded-full transition-colors relative cursor-pointer p-[3px] shrink-0",
                    formData.is_public ? "bg-[#00d1ff]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-[24px] h-[24px] rounded-full bg-white transition-transform shadow-md",
                    formData.is_public ? "translate-x-[22px]" : "translate-x-0"
                  )} />
                </button>
              </div>

              {/* Row 2: Hide online status */}
              <div className="flex items-center justify-between gap-4 pt-5">
                <div className="space-y-0.5">
                  <span className="text-sm font-semibold text-[#f3f6f8] block">Hide online status</span>
                  <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                    Do not display active green indicator when online
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, hide_online_status: !formData.hide_online_status })}
                  className={cn(
                    "w-[52px] h-[30px] rounded-full transition-colors relative cursor-pointer p-[3px] shrink-0",
                    formData.hide_online_status ? "bg-[#00d1ff]" : "bg-white/10"
                  )}
                >
                  <div className={cn(
                    "w-[24px] h-[24px] rounded-full bg-white transition-transform shadow-md",
                    formData.hide_online_status ? "translate-x-[22px]" : "translate-x-0"
                  )} />
                </button>
              </div>
            </div>

            {/* Messaging Permissions */}
            <div className="space-y-2 pt-3">
              <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                Who Can Message Me
              </label>
              <div className="space-y-2">
                {[
                  { id: 'everyone', title: 'Everyone', desc: 'Any verified user can initiate messages' },
                  { id: 'subscribers', title: 'VIP Subscribers Only', desc: 'Only paid members can initiate conversations' },
                  { id: 'mutuals', title: 'Mutual Matches Only', desc: 'Only members you have both favorited' }
                ].map(opt => (
                  <div
                    key={opt.id}
                    onClick={() => setFormData({ ...formData, messaging_privacy: opt.id })}
                    className={cn(
                      "p-3.5 rounded-[18px] border transition-all cursor-pointer flex items-center justify-between",
                      formData.messaging_privacy === opt.id
                        ? "bg-[#00d1ff]/10 border-[#00d1ff] text-[#f3f6f8]"
                        : "bg-white/[0.02] border-white/10 text-[#8d97a1] hover:border-white/20"
                    )}
                  >
                    <div>
                      <span className="text-xs font-semibold block text-[#f3f6f8]">{opt.title}</span>
                      <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.12em] mt-0.5">{opt.desc}</p>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ml-3",
                      formData.messaging_privacy === opt.id ? "border-[#00d1ff] bg-[#00d1ff]" : "border-white/30"
                    )}>
                      {formData.messaging_privacy === opt.id && <div className="w-1.5 h-1.5 rounded-full bg-[#00131a]" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save changes button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={loading}
                className="w-full py-4 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-bold text-sm rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] transition-all cursor-pointer font-sans disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </div>
        )}

        {/* =================== TAB 3: NOTIFICATIONS =================== */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.075] pb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                ALERTS & PUSH NOTIFICATIONS
              </span>
              <h2 className="font-serif text-2xl text-[#f3f6f8] mt-1 font-normal">Notification Preferences</h2>
            </div>

            <div className="space-y-5 divide-y divide-white/[0.05]">
              {[
                { key: 'chat', label: 'New Chat Messages', desc: 'Instant alerts when members send you direct messages' },
                { key: 'tips', label: 'Tips & Gifts Received', desc: 'Notify when wallet gifts or deposits arrive' },
                { key: 'subscriptions', label: 'Subscription & Renewal Alerts', desc: 'Reminders 48h prior to VIP membership expiration' },
                { key: 'promotions', label: 'Curated Companion Matches', desc: 'Weekly top matches based on your desired vibe' }
              ].map(item => {
                const isChecked = (formData.notification_settings as any)?.[item.key] ?? true;
                return (
                  <div key={item.key} className="flex items-center justify-between gap-4 pt-4 first:pt-0">
                    <div className="space-y-0.5">
                      <span className="text-sm font-semibold text-[#f3f6f8] block">{item.label}</span>
                      <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">{item.desc}</p>
                    </div>
                    {/* Toggle: 52x30, cyan when on */}
                    <button
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          notification_settings: {
                            ...prev.notification_settings,
                            [item.key]: !isChecked
                          }
                        }));
                      }}
                      className={cn(
                        "w-[52px] h-[30px] rounded-full transition-colors relative cursor-pointer p-[3px] shrink-0",
                        isChecked ? "bg-[#00d1ff]" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "w-[24px] h-[24px] rounded-full bg-white transition-transform shadow-md",
                        isChecked ? "translate-x-[22px]" : "translate-x-0"
                      )} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Save changes button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={loading}
                className="w-full py-4 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-bold text-sm rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] transition-all cursor-pointer font-sans disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </div>
        )}

        {/* =================== TAB 4: SUBSCRIPTION =================== */}
        {activeTab === 'subscription' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.075] pb-4 flex items-center justify-between">
              <div>
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  VIP ACCESS & BILLING
                </span>
                <h2 className="font-serif text-2xl text-[#f3f6f8] mt-1 font-normal">Subscription Plan</h2>
              </div>
              <span className={cn(
                "px-3 py-1 rounded-full font-mono text-[10px] uppercase font-bold tracking-wider border",
                isSubscribed 
                  ? "bg-[#00d1ff]/10 text-[#00d1ff] border-[#00d1ff]/30" 
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              )}>
                {isSubscribed ? 'VIP Active' : 'Free Plan'}
              </span>
            </div>

            {/* Plan Info Card */}
            <div className="p-6 bg-gradient-to-br from-[#022c37] via-[#08151b] to-[#040506] border border-[#00d1ff]/35 rounded-[22px] space-y-4 shadow-[0_0_30px_rgba(0,209,255,0.1)]">
              <div className="space-y-1">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  MONTHLY ACCESS FEE
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-4xl text-[#f3f6f8] font-normal">₦2,000</span>
                  <span className="font-mono text-xs text-[#00d1ff] uppercase tracking-wider">/ month</span>
                </div>
              </div>

              <p className="font-mono text-[11px] text-[#8d97a1] uppercase tracking-[0.14em]">
                Unlock all 37 Nigerian states, unblurred photos, and unlimited direct messaging replies.
              </p>

              <div className="space-y-2 pt-2 border-t border-white/10">
                {[
                  'Browse profiles in all 36 states + Abuja without location lock',
                  'Unlimited direct message replies with encrypted security',
                  'Full high-definition uncensored photo gallery viewing',
                  'Exclusive verified VIP badge on your card'
                ].map((perk, i) => (
                  <div key={i} className="flex items-center gap-2.5 text-xs text-[#f3f6f8]">
                    <Check className="w-3.5 h-3.5 text-[#00d1ff] shrink-0 stroke-[3]" />
                    <span>{perk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gateway Selection & Direct Subscription */}
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Select Payment Gateway
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentGateway('paystack')}
                    className={cn(
                      "p-4 rounded-[18px] border text-left transition-all cursor-pointer space-y-1.5",
                      paymentGateway === 'paystack'
                        ? 'border-[#00d1ff] bg-[#00d1ff]/10 shadow-[0_0_15px_rgba(0,209,255,0.15)]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    <CreditCard className={cn("w-4 h-4", paymentGateway === 'paystack' ? "text-[#00d1ff]" : "text-[#8d97a1]")} />
                    <p className="text-xs font-bold text-[#f3f6f8]">Paystack</p>
                    <p className="font-mono text-[10px] text-[#59636d] uppercase">Debit Card & Bank</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentGateway('korapay')}
                    className={cn(
                      "p-4 rounded-[18px] border text-left transition-all cursor-pointer space-y-1.5",
                      paymentGateway === 'korapay'
                        ? 'border-[#00d1ff] bg-[#00d1ff]/10 shadow-[0_0_15px_rgba(0,209,255,0.15)]'
                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    <Zap className={cn("w-4 h-4", paymentGateway === 'korapay' ? "text-[#00d1ff]" : "text-[#8d97a1]")} />
                    <p className="text-xs font-bold text-[#f3f6f8]">KoraPay</p>
                    <p className="font-mono text-[10px] text-[#59636d] uppercase">Instant Bank Transfer</p>
                  </button>
                </div>
              </div>

              {/* Action button */}
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isProcessingSub}
                className="w-full py-4 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-bold text-sm rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] transition-all cursor-pointer font-sans flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isProcessingSub ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#00131a] border-t-transparent rounded-full animate-spin" />
                    <span className="font-mono text-xs uppercase tracking-wider">Processing Payment...</span>
                  </>
                ) : (
                  <>
                    <Crown className="w-4 h-4" />
                    <span>
                      {isSubscribed ? `Renew VIP with ${paymentGateway === 'paystack' ? 'Paystack' : 'KoraPay'} · ₦${subscriptionPrice.toLocaleString()}` : `Subscribe with ${paymentGateway === 'paystack' ? 'Paystack' : 'KoraPay'} · ₦${subscriptionPrice.toLocaleString()}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* =================== TAB 5: SECURITY =================== */}
        {activeTab === 'security' && (
          <div className="space-y-6">
            <div className="border-b border-white/[0.075] pb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                SECURITY & CREDENTIALS
              </span>
              <h2 className="font-serif text-2xl text-[#f3f6f8] mt-1 font-normal">Account Security</h2>
            </div>

            {/* Password Update Form */}
            <form onSubmit={handlePasswordUpdate} className="space-y-4">
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  New Password
                </label>
                <div className="relative">
                  <input 
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] px-4 pr-11 py-3.5 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] focus:outline-none transition-all font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#59636d] hover:text-[#f3f6f8] cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] px-4 pr-11 py-3.5 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] focus:outline-none transition-all font-mono"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#59636d] hover:text-[#f3f6f8] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingPassword || !newPassword}
                className="w-full py-3.5 bg-transparent border border-white/15 text-[#f3f6f8] hover:bg-white/5 font-mono text-xs uppercase tracking-wider rounded-[14px] transition-all cursor-pointer disabled:opacity-40"
              >
                {updatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </form>

            {/* Active Device Info */}
            <div className="p-4 rounded-[20px] bg-white/[0.02] border border-white/[0.075] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-[#00d1ff]" />
                <div>
                  <span className="text-xs font-semibold text-[#f3f6f8] block">Current Device</span>
                  <span className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.12em]">
                    Web Client · Nigeria · Active Now
                  </span>
                </div>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-[#35e0a1] animate-pulse" />
            </div>

            {/* Account Actions: Sign Out & Delete Account */}
            <div className="space-y-3 pt-3 border-t border-white/[0.075]">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-3.5 px-4 rounded-[14px] bg-white/5 hover:bg-white/10 border border-white/10 text-[#f3f6f8] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4 text-[#8d97a1]" />
                <span>Sign Out of Account</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteModal(true)}
                className="w-full py-3 px-4 rounded-[14px] bg-transparent hover:bg-[#ff5a5f]/10 border border-[#ff5a5f]/20 text-[#ff5a5f] font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-[#ff5a5f]" />
                <span>Delete Account Permanently</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#090b0d] border border-[#ff5a5f]/30 rounded-[28px] p-7 max-w-sm w-full space-y-5 text-center shadow-2xl"
            >
              <div className="w-14 h-14 rounded-2xl bg-[#ff5a5f]/10 border border-[#ff5a5f]/20 flex items-center justify-center mx-auto text-[#ff5a5f]">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-serif text-[#f3f6f8]">Delete Account?</h3>
                <p className="font-mono text-xs text-[#8d97a1] leading-relaxed">
                  This action is irreversible. All your messages, matches, and profile data will be permanently deleted.
                </p>
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-3 rounded-[12px] bg-white/10 hover:bg-white/15 text-[#f3f6f8] font-mono text-xs uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteAccount}
                  className="flex-1 py-3 rounded-[12px] bg-[#ff5a5f] hover:bg-[#ff5a5f]/90 text-white font-mono text-xs uppercase font-bold cursor-pointer disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
