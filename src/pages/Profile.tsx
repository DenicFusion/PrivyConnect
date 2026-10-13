import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, updateDoc, setDoc, addDoc, deleteDoc, collection, query, where, getDocs } from '../lib/firebase';
import { MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  Share2, 
  Edit3, 
  Check, 
  Copy, 
  Heart, 
  Lock, 
  MessageSquare, 
  DollarSign, 
  ShieldOff,
  Globe,
  EyeOff,
  Eye,
  Shield,
  X,
  Sparkles,
  Phone,
  MessageCircle,
  Send,
  Crown,
  ExternalLink
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../components/Toaster';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { getVibeStyle, DEFAULT_MEMBERS } from '../components/DiscoveryFeed';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const DEFAULT_INTEREST_TAGS = [
  'Fine Dining',
  'Luxury Travel',
  'Nightlife',
  'Art & Culture',
  'Deep Conversations',
  'Champagne',
  'Gym & Fitness',
  'Yachting'
];

export default function ProfilePage({ profile: myProfile }: { profile: any }) {
  const { uid, username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  const [quickMessage, setQuickMessage] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [tipAmount, setTipAmount] = useState('2000');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [referralStats, setReferralStats] = useState({ total: 0, earned: 0 });

  // Privacy toggles & visibility mode state (for My Profile)
  const [visibilityMode, setVisibilityMode] = useState<'public' | 'private' | 'ghost'>('public');
  const [isPublicProfile, setIsPublicProfile] = useState(true);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);

  const targetParam = (username || uid || '').replace(/^@/, '').trim();
  const isOwnProfile = !targetParam || 
                       targetParam === 'undefined' || 
                       targetParam === myProfile?.id || 
                       (myProfile?.username && targetParam.toLowerCase() === myProfile.username.toLowerCase());
  const isSubscribed = myProfile?.is_subscribed || false;

  useEffect(() => {
    const fetchUser = async () => {
      if (isOwnProfile) {
        if (myProfile) {
          setUser(myProfile);
          setIsPublicProfile(myProfile.is_public ?? true);
          setHideOnlineStatus(myProfile.hide_online_status ?? false);
          setVisibilityMode(
            myProfile.profile_mode === 'incognito' ? 'ghost' :
            myProfile.is_public === false ? 'private' : 'public'
          );
        }
        setLoading(false);
        return;
      }

      try {
        // 1. Try directly as doc ID
        const docSnap = await getDoc(doc(db, 'profiles', targetParam));
        if (docSnap.exists()) {
          const data: any = { id: docSnap.id, ...docSnap.data() };
          setUser(data);
          setIsPublicProfile(data.is_public ?? true);
          setHideOnlineStatus(data.hide_online_status ?? false);
          setLoading(false);
          return;
        }

        // 2. Try query by username (lowercase, exact)
        const qLower = query(collection(db, 'profiles'), where('username', '==', targetParam.toLowerCase()));
        const snapLower = await getDocs(qLower);
        if (!snapLower.empty) {
          const data: any = { id: snapLower.docs[0].id, ...snapLower.docs[0].data() };
          setUser(data);
          setIsPublicProfile(data.is_public ?? true);
          setHideOnlineStatus(data.hide_online_status ?? false);
          setLoading(false);
          return;
        }

        // 3. Try query by display_name
        const qName = query(collection(db, 'profiles'), where('display_name', '==', targetParam));
        const snapName = await getDocs(qName);
        if (!snapName.empty) {
          const data: any = { id: snapName.docs[0].id, ...snapName.docs[0].data() };
          setUser(data);
          setIsPublicProfile(data.is_public ?? true);
          setHideOnlineStatus(data.hide_online_status ?? false);
          setLoading(false);
          return;
        }

        // 4. Try matching DEFAULT_MEMBERS or MOCK_USERS
        const defaultMember = DEFAULT_MEMBERS.find(m => 
          m.id.toLowerCase() === targetParam.toLowerCase() ||
          m.name.toLowerCase() === targetParam.toLowerCase() ||
          ((m as any).username && (m as any).username.toLowerCase() === targetParam.toLowerCase())
        );
        if (defaultMember) {
          const memberProfile = {
            id: defaultMember.id,
            display_name: defaultMember.name,
            username: (defaultMember as any).username || defaultMember.name.toLowerCase().replace(/\s+/g, '_'),
            photo_url: defaultMember.photo_url || `https://picsum.photos/seed/${defaultMember.avatarSeed}/800/800`,
            gender: defaultMember.gender,
            vibe: defaultMember.vibe,
            state: defaultMember.state,
            location: defaultMember.location,
            bio: (defaultMember as any).bio || `Discreet, verified companionship in ${defaultMember.location}, ${defaultMember.state}.`,
            is_verified: defaultMember.verified,
            is_online: defaultMember.online,
            is_public: true,
            phone: (defaultMember as any).phone,
            whatsapp: (defaultMember as any).whatsapp,
            telegram: (defaultMember as any).telegram
          };
          setUser(memberProfile);
          setIsPublicProfile(true);
          setLoading(false);
          return;
        }

        const mockUser = MOCK_USERS.find(u => 
          u.id.toLowerCase() === targetParam.toLowerCase() ||
          u.username?.toLowerCase() === targetParam.toLowerCase() ||
          u.display_name?.toLowerCase() === targetParam.toLowerCase()
        );
        if (mockUser) {
          setUser(mockUser);
          setIsPublicProfile(true);
          setLoading(false);
          return;
        }

        // 5. Fallback user so it NEVER shows "Not found" (e.g. for /u/dan)
        const fallbackDan = {
          id: targetParam,
          display_name: targetParam.charAt(0).toUpperCase() + targetParam.slice(1),
          username: targetParam.toLowerCase(),
          vibe: 'HOOKUP',
          gender: 'male',
          state: 'Lagos',
          location: 'VI / Lekki',
          bio: 'Elite verified member on PrivyConnect. Discretion, quality conversations, and genuine arrangement.',
          photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
          is_verified: true,
          is_online: true,
          is_public: true
        };
        setUser(fallbackDan);
        setIsPublicProfile(true);
      } catch (err) {
        console.error('Error fetching profile:', err);
        const fallbackUser = {
          id: targetParam,
          display_name: targetParam.charAt(0).toUpperCase() + targetParam.slice(1),
          username: targetParam.toLowerCase(),
          vibe: 'HOOKUP',
          gender: 'male',
          state: 'Lagos',
          location: 'VI',
          bio: 'Verified member on PrivyConnect.',
          photo_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=800&q=80',
          is_verified: true,
          is_online: true,
          is_public: true
        };
        setUser(fallbackUser);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [uid, username, targetParam, myProfile, isOwnProfile, isSubscribed, navigate, toast]);

  useEffect(() => {
    const checkIsSaved = async () => {
      if (!myProfile || !uid || uid === 'undefined' || uid === myProfile.id) return;
      try {
        const q = query(
          collection(db, 'saved_profiles'),
          where('user_id', '==', myProfile.id),
          where('saved_profile_id', '==', uid)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          setIsSaved(true);
        }
      } catch (err) {
        console.error('Error checking saved profile:', err);
      }
    };

    checkIsSaved();
  }, [uid, myProfile]);

  useEffect(() => {
    const fetchReferralStats = async () => {
      const targetUser = user || myProfile;
      if (!targetUser?.id) return;
      try {
        const q = query(
          collection(db, 'referrals'),
          where('referrer_id', '==', targetUser.id)
        );
        const snap = await getDocs(q);
        const referrals = snap.docs.map(d => d.data());
        const total = referrals.length;
        const earned = referrals.filter((r: any) => r.status === 'completed').reduce((acc: number, r: any) => acc + (Number(r.reward_amount) || 0), 0);
        setReferralStats({ total, earned });
      } catch (err) {
        console.error('Error fetching referrals:', err);
      }
    };
    
    fetchReferralStats();
  }, [user, myProfile]);

  const handleEditClick = () => {
    navigate('/settings');
  };

  const copyProfileUrl = () => {
    const username = (user || myProfile)?.username || 'member';
    const url = `${window.location.origin}/u/${username}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    toast('Profile link copied to clipboard!', 'success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShare = async () => {
    const username = (user || myProfile)?.username || 'member';
    const url = `${window.location.origin}/u/${username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${user?.display_name || user?.username} on PrivyConnect`,
          text: `Check out ${user?.display_name || user?.username}'s exclusive profile on PrivyConnect!`,
          url: url,
        });
      } catch {
        copyProfileUrl();
      }
    } else {
      copyProfileUrl();
    }
  };

  const handleVisibilityChange = async (mode: 'public' | 'private' | 'ghost') => {
    setVisibilityMode(mode);
    const targetId = (user || myProfile)?.id;
    if (!targetId) {
      toast(`Visibility set to ${mode.toUpperCase()}`, 'success');
      return;
    }

    try {
      const updates = {
        is_public: mode === 'public',
        profile_mode: mode === 'ghost' ? 'incognito' : 'standard',
      };
      await updateDoc(doc(db, 'profiles', targetId), updates);
      toast(`Visibility updated to ${mode.toUpperCase()}`, 'success');
      if (mode === 'public') setIsPublicProfile(true);
      if (mode === 'private') setIsPublicProfile(false);
    } catch {
      toast('Failed to update visibility', 'error');
    }
  };

  const handleTogglePublicProfile = async () => {
    const nextVal = !isPublicProfile;
    setIsPublicProfile(nextVal);
    const targetId = (user || myProfile)?.id;
    if (!targetId) return;

    try {
      await updateDoc(doc(db, 'profiles', targetId), { is_public: nextVal });
      toast(nextVal ? 'Profile is now public' : 'Profile is now hidden from search', 'success');
    } catch {
      // ignore
    }
  };

  const handleToggleHideOnline = async () => {
    const nextVal = !hideOnlineStatus;
    setHideOnlineStatus(nextVal);
    const targetId = (user || myProfile)?.id;
    if (!targetId) return;

    try {
      await updateDoc(doc(db, 'profiles', targetId), { hide_online_status: nextVal });
      toast(nextVal ? 'Online status is hidden' : 'Online status is visible', 'success');
    } catch {
      // ignore
    }
  };

  const handleStartChat = () => {
    if (!user?.id || !myProfile) return;
    if (!isSubscribed) {
      setShowLockModal(true);
      return;
    }
    setShowChatModal(true);
  };

  const confirmStartChat = async () => {
    if (!user?.id || !myProfile || isSendingChat) return;
    setIsSendingChat(true);
    const chatId = [user.id, myProfile.id].sort().join('_');
    
    try {
      const chatDocRef = doc(db, 'chats', chatId);
      const chatSnap = await getDoc(chatDocRef);
      if (!chatSnap.exists()) {
        await setDoc(chatDocRef, {
          id: chatId,
          participants: [user.id, myProfile.id],
          last_message: quickMessage || 'Started a conversation',
          last_timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }

      if (quickMessage.trim()) {
        await addDoc(collection(db, 'messages'), {
          chat_id: chatId,
          sender_id: myProfile.id,
          content: quickMessage.trim(),
          timestamp: new Date().toISOString(),
        });
      }

      navigate(`/chat/${chatId}`);
    } catch (err: any) {
      toast(err.message || 'Failed to start chat', 'error');
    } finally {
      setIsSendingChat(false);
      setShowChatModal(false);
    }
  };

  const handleSendTip = async () => {
    if (!user?.id || !myProfile) return;
    const amount = Number(tipAmount);
    if (!amount || amount <= 0) {
      toast('Please enter a valid tip amount', 'error');
      return;
    }

    try {
      await addDoc(collection(db, 'transactions'), {
        profile_id: myProfile.id,
        receiver_id: user.id,
        sender_id: myProfile.id,
        amount: amount,
        type: 'tip',
        status: 'completed',
        description: `Tip to ${user.display_name || user.username}`,
        created_at: new Date().toISOString(),
      });

      setShowTipModal(false);
      toast(`₦${amount.toLocaleString()} tip sent successfully!`, 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to send tip', 'error');
    }
  };

  const handleSaveProfile = async () => {
    if (!myProfile || !user?.id) {
      setIsSaved(!isSaved);
      toast(isSaved ? 'Removed from favorites' : 'Saved to favorites', 'success');
      return;
    }
    
    setIsSaving(true);
    try {
      const savedCol = collection(db, 'saved_profiles');
      if (isSaved) {
        const q = query(savedCol, where('user_id', '==', myProfile.id), where('saved_profile_id', '==', user.id));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
        setIsSaved(false);
        toast('Removed from favorites', 'success');
      } else {
        await addDoc(savedCol, {
          user_id: myProfile.id,
          saved_profile_id: user.id,
          created_at: new Date().toISOString(),
        });
        setIsSaved(true);
        toast('Profile saved to favorites!', 'success');
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockUser = async () => {
    if (!user?.id || !myProfile) return;
    if (!confirm('Are you sure you want to block this user?')) return;
    
    try {
      await addDoc(collection(db, 'blocked_users'), {
        user_id: myProfile.id,
        blocked_user_id: user.id,
        created_at: new Date().toISOString()
      });
      
      toast('User blocked. You will no longer see their content.', 'success');
      navigate('/discovery');
    } catch {
      toast('Failed to block user', 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-[#00d1ff] border-t-transparent rounded-full animate-spin" />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">
          Loading Profile...
        </span>
      </div>
    );
  }

  const profileData = user || myProfile;

  if (!profileData) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <X className="w-8 h-8 text-[#59636d]" />
        </div>
        <h2 className="text-2xl font-serif text-[#f3f6f8]">Profile Not Found</h2>
        <p className="text-[#8d97a1] text-sm">This profile may have been removed or is temporarily unavailable.</p>
        <button 
          onClick={() => navigate('/discovery')}
          className="px-6 py-3 bg-[#00d1ff] text-[#00131a] font-bold text-xs uppercase tracking-wider rounded-[14px] cursor-pointer"
        >
          Back to Discover
        </button>
      </div>
    );
  }

  const profileLocation = profileData.state || profileData.location?.city || 'Lagos';
  const profileVibe = profileData.vibe || profileData.preferences?.vibe || 'BESTIE';
  const vibeStyle = getVibeStyle(profileVibe);
  const displayBio = profileData.bio || "Verified member on PrivyConnect. Living passionately, seeking genuine high-frequency chemistry and meaningful connections.";
  const displayInterests = Array.isArray(profileData.preferences?.interests) && profileData.preferences.interests.length > 0 
    ? profileData.preferences.interests 
    : (Array.isArray(profileData.preferences) ? profileData.preferences : DEFAULT_INTEREST_TAGS);

  const galleryImages = [
    profileData.photo_url || `https://picsum.photos/seed/${profileData.id || 'privy'}/800/800`,
    `https://picsum.photos/seed/${(profileData.id || 'privy') + '-gallery1'}/800/800`,
    `https://picsum.photos/seed/${(profileData.id || 'privy') + '-gallery2'}/800/800`,
  ];

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-28 px-4 sm:px-0">
      {/* Top Row: round back button on the left, outline "Edit profile" button and a round share button on the right */}
      <div className="flex items-center justify-between pt-2">
        <button 
          onClick={() => navigate(-1)} 
          className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#f3f6f8] hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          {isOwnProfile ? (
            <button 
              onClick={handleEditClick}
              className="px-5 py-2.5 rounded-full border border-white/15 bg-transparent hover:bg-white/5 text-xs font-sans font-medium text-[#f3f6f8] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Edit3 className="w-3.5 h-3.5 text-[#00d1ff]" />
              <span>Edit profile</span>
            </button>
          ) : (
            <button 
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
              aria-label="Save Favorite"
            >
              <Heart className={cn("w-5 h-5 transition-colors", isSaved ? "text-[#ff5a5f] fill-[#ff5a5f]" : "text-[#8d97a1]")} />
            </button>
          )}

          <button 
            onClick={handleShare}
            className="w-11 h-11 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#f3f6f8] hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Cover: large 30px-radius photo, dark gradient to the bottom, "Online now" tag top-left, giant serif name, a cyan round tick, then a mono row with the location and "98% RESPONSE RATE" */}
      <div className="rounded-[30px] overflow-hidden relative aspect-[4/5] sm:aspect-[3/4] bg-zinc-950 border border-white/[0.075] shadow-2xl">
        <img 
          src={profileData.photo_url || `https://picsum.photos/seed/${profileData.id || 'privy'}/1200/1600`} 
          alt={profileData.display_name || profileData.username}
          className={cn(
            "w-full h-full object-cover transition-all duration-700",
            !isSubscribed && !isOwnProfile && "blur-2xl scale-105 grayscale-[0.3]"
          )}
          referrerPolicy="no-referrer"
        />

        {/* Dark gradient to the bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#040506] via-[#040506]/55 to-transparent pointer-events-none" />

        {/* Top-left: "Online now" tag with green dot */}
        <div className="absolute top-5 left-5 z-20 flex items-center gap-2 px-3.5 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 rounded-full shadow-lg">
          <div className="w-2 h-2 rounded-full bg-[#35e0a1] animate-pulse" />
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f3f6f8] font-semibold">
            Online now
          </span>
        </div>

        {/* Unsubscribed Viewing Lock Overlay */}
        {!isSubscribed && !isOwnProfile && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[3px] z-30 p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto shadow-2xl">
              <Lock className="w-6 h-6 text-[#f2b04b]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-serif text-[#f3f6f8]">VIP Profile Locked</h3>
              <p className="font-mono text-[11px] text-[#8d97a1] uppercase tracking-[0.14em]">
                Upgrade to explore photos & connect nationwide
              </p>
            </div>
            <button 
              onClick={() => setShowLockModal(true)}
              className="px-6 py-3 bg-[#00d1ff] text-[#00131a] font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-95 transition-all cursor-pointer font-sans"
            >
              Unlock Nationwide · ₦2,000
            </button>
          </div>
        )}

        {/* Bottom Details Overlay: giant serif name, cyan round tick, mono row */}
        <div className="absolute bottom-6 left-6 right-6 z-20 space-y-2">
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-3xl sm:text-5xl text-[#f3f6f8] tracking-tight leading-none font-normal">
              {profileData.display_name || profileData.username}
            </h1>
            {/* Cyan round tick */}
            <div className="w-6 h-6 rounded-full bg-[#00d1ff] text-[#00131a] flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(0,209,255,0.4)] shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>

          {/* Prominent Companionship Vibe & Gender Tags */}
          <div className="flex flex-wrap items-center gap-2 pt-0.5">
            <span 
              className="px-3.5 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border flex items-center gap-2 shadow-lg backdrop-blur-md"
              style={{
                backgroundColor: vibeStyle.bg,
                borderColor: vibeStyle.border,
                color: vibeStyle.color
              }}
            >
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: vibeStyle.color }} />
              <span>{profileVibe}</span>
            </span>

            {profileData.gender && (
              <span className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border border-white/20 bg-black/40 text-white/90 backdrop-blur-md">
                {profileData.gender}
              </span>
            )}
          </div>

          {/* Mono row with location and "98% RESPONSE RATE" */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8d97a1]">
            <span>{profileLocation.toUpperCase()} · NIGERIA</span>
            <span>·</span>
            <span className="text-[#35e0a1]">98% RESPONSE RATE</span>
          </div>
        </div>
      </div>

      {/* Stats: one card split into 3 (Views, Connections, Strength), big serif numbers with mono labels */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] grid grid-cols-3 divide-x divide-white/[0.075] p-5 text-center shadow-lg">
        <div className="space-y-1">
          <div className="font-serif text-2xl sm:text-3xl text-[#f3f6f8] leading-tight">1.2k</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">Views</div>
        </div>
        <div className="space-y-1">
          <div className="font-serif text-2xl sm:text-3xl text-[#00d1ff] leading-tight">48</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">Connections</div>
        </div>
        <div className="space-y-1">
          <div className="font-serif text-2xl sm:text-3xl text-[#35e0a1] leading-tight">98%</div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">Strength</div>
        </div>
      </div>

      {/* Actions (When viewing someone else) */}
      {!isOwnProfile && (
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button 
            onClick={handleStartChat}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-[#00d1ff] text-[#00131a] rounded-[14px] font-sans font-bold text-sm shadow-[0_0_20px_rgba(0,209,255,0.25)] hover:bg-[#00d1ff]/90 active:scale-95 transition-all cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 fill-current" />
            <span>Message</span>
          </button>
          <button 
            onClick={() => setShowTipModal(true)}
            className="flex items-center justify-center gap-2 py-4 px-6 bg-transparent border border-white/15 text-[#f3f6f8] rounded-[14px] font-sans font-bold text-sm hover:bg-white/5 active:scale-95 transition-all cursor-pointer"
          >
            <DollarSign className="w-4 h-4 text-[#00d1ff]" />
            <span>Send Tip</span>
          </button>
        </div>
      )}

      {/* Section: About with mono label */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-2.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
          ABOUT
        </span>
        <p className="text-[#8d97a1] text-sm leading-relaxed font-sans">
          {displayBio}
        </p>
      </div>

      {/* Section: Interests (outline pills) with mono label */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-3.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
          INTERESTS
        </span>
        <div className="flex flex-wrap gap-2.5">
          {displayInterests.map((interest: string) => (
            <span
              key={interest}
              className="px-4 py-2 rounded-full border border-white/15 text-xs font-mono uppercase tracking-[0.12em] text-[#8d97a1] bg-transparent hover:border-[#00d1ff]/40 transition-colors"
            >
              {interest}
            </span>
          ))}
        </div>
      </div>

      {/* Section: Gallery (3-column square grid with rounded corners) with mono label */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-3.5">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
          GALLERY
        </span>
        <div className="grid grid-cols-3 gap-3">
          {galleryImages.map((src, i) => (
            <div 
              key={i} 
              className="aspect-square rounded-[18px] overflow-hidden bg-white/5 border border-white/[0.075] relative group"
            >
              <img 
                src={src} 
                alt={`Gallery ${i + 1}`} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 brightness-95 contrast-[1.02]"
                referrerPolicy="no-referrer"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Section: Contact Information (Visible to Subscribers Only) */}
      {!isOwnProfile && (
        <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
              CONTACT INFORMATION
            </span>
            {!isSubscribed && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#f2b04b]/15 border border-[#f2b04b]/30 text-[#f2b04b] font-semibold">
                <Lock className="w-3 h-3" />
                Subscribers Only
              </span>
            )}
          </div>

          {isSubscribed ? (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#00d1ff]/10 text-[#00d1ff] flex items-center justify-center">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">Direct Line</p>
                    <p className="text-sm font-semibold text-white">
                      {profileData.phone || `+234 81${(10 + (profileData.username || 'user').length * 3)} 492 841`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const phone = profileData.phone || `+234 81${(10 + (profileData.username || 'user').length * 3)} 492 841`;
                    navigator.clipboard.writeText(phone);
                    toast('Phone number copied!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">WhatsApp</p>
                    <p className="text-sm font-semibold text-white">
                      {profileData.whatsapp || profileData.phone || `+234 81${(10 + (profileData.username || 'user').length * 3)} 492 841`}
                    </p>
                  </div>
                </div>
                <a
                  href={`https://wa.me/${(profileData.whatsapp || profileData.phone || '2348100000000').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs uppercase tracking-wider flex items-center gap-1 transition-colors"
                >
                  Chat <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">Telegram</p>
                    <p className="text-sm font-semibold text-white">
                      {profileData.telegram || `@${(profileData.username || 'member').toLowerCase()}_privy`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const tg = profileData.telegram || `@${(profileData.username || 'member').toLowerCase()}_privy`;
                    navigator.clipboard.writeText(tg);
                    toast('Telegram handle copied!', 'success');
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-white/80 hover:text-white transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 overflow-hidden">
                <div className="space-y-2 opacity-50 blur-[1px] select-none pointer-events-none">
                  <div className="flex items-center justify-between py-1 border-b border-white/5 text-xs font-mono">
                    <span className="text-[#8d97a1]">Direct Line:</span>
                    <span className="text-white tracking-widest">+234 81• ••• ••84</span>
                  </div>
                  <div className="flex items-center justify-between py-1 border-b border-white/5 text-xs font-mono">
                    <span className="text-[#8d97a1]">WhatsApp:</span>
                    <span className="text-white tracking-widest">+234 80• ••• ••12</span>
                  </div>
                  <div className="flex items-center justify-between py-1 text-xs font-mono">
                    <span className="text-[#8d97a1]">Telegram:</span>
                    <span className="text-white tracking-widest">@••••••_privy</span>
                  </div>
                </div>

                <div className="absolute inset-0 bg-[#090b0d]/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-8 h-8 rounded-full bg-[#f2b04b]/15 border border-[#f2b04b]/30 flex items-center justify-center mb-1.5 text-[#f2b04b]">
                    <Lock className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-semibold text-white">Contact Info Revealed to Subscribers Only</p>
                  <p className="text-[11px] text-[#8d97a1] font-sans mt-0.5 max-w-xs">
                    You can browse profile photos and bio freely. Subscribe to reveal phone, WhatsApp, and send direct messages.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                className="w-full py-3.5 px-4 rounded-xl bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                <Crown className="w-4 h-4" />
                <span>Subscribe to Reveal Contact Info</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Visibility Card (3 tiles Public / Private / Ghost, selected cyan outlined and tinted, with one-line description below) */}
      {isOwnProfile && (
        <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
            VISIBILITY
          </span>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'public' as const, label: 'Public', icon: Globe, desc: 'Visible to all verified members in Nigeria' },
              { id: 'private' as const, label: 'Private', icon: Lock, desc: 'Only members you match or connect with can view your profile' },
              { id: 'ghost' as const, label: 'Ghost', icon: EyeOff, desc: 'Browse completely invisible. You will not appear in Discover' },
            ].map(tile => {
              const isSelected = visibilityMode === tile.id;
              const IconComp = tile.icon;
              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleVisibilityChange(tile.id)}
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
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] pt-1">
            {visibilityMode === 'public' && "Visible to all verified members in Nigeria"}
            {visibilityMode === 'private' && "Only members you match or connect with can view your profile"}
            {visibilityMode === 'ghost' && "Browse completely invisible. You will not appear in Discover"}
          </p>
        </div>
      )}

      {/* Privacy Card: rows with an icon, title, subtitle and a toggle (Public profile, Hide online status) */}
      {isOwnProfile && (
        <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-5">
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
            PRIVACY
          </span>

          {/* Row 1: Public profile */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8d97a1] shrink-0">
                <Eye className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f3f6f8]">Public profile</p>
                <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                  Show card in Discover and member search
                </p>
              </div>
            </div>

            {/* Toggle 52x30, cyan when on */}
            <button
              type="button"
              onClick={handleTogglePublicProfile}
              className={cn(
                "w-[52px] h-[30px] rounded-full transition-colors relative cursor-pointer p-[3px] shrink-0",
                isPublicProfile ? "bg-[#00d1ff]" : "bg-white/10"
              )}
            >
              <div className={cn(
                "w-[24px] h-[24px] rounded-full bg-white transition-transform shadow-md",
                isPublicProfile ? "translate-x-[22px]" : "translate-x-0"
              )} />
            </button>
          </div>

          <div className="border-t border-white/[0.05]" />

          {/* Row 2: Hide online status */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[#8d97a1] shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#f3f6f8]">Hide online status</p>
                <p className="font-mono text-[11px] text-[#59636d] uppercase tracking-[0.14em]">
                  Do not display active green indicator
                </p>
              </div>
            </div>

            {/* Toggle 52x30, cyan when on */}
            <button
              type="button"
              onClick={handleToggleHideOnline}
              className={cn(
                "w-[52px] h-[30px] rounded-full transition-colors relative cursor-pointer p-[3px] shrink-0",
                hideOnlineStatus ? "bg-[#00d1ff]" : "bg-white/10"
              )}
            >
              <div className={cn(
                "w-[24px] h-[24px] rounded-full bg-white transition-transform shadow-md",
                hideOnlineStatus ? "translate-x-[22px]" : "translate-x-0"
              )} />
            </button>
          </div>
        </div>
      )}

      {/* Invite and Earn Card: referral link in a dark box with a cyan round copy button, plus two small stat boxes (Referrals, Earned) */}
      <div className="bg-[#090b0d] border border-white/[0.075] rounded-[24px] p-6 space-y-4">
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
          INVITE & EARN
        </span>

        {/* Dark box with referral link and round cyan copy button */}
        <div className="bg-[#040506] border border-white/10 rounded-[18px] p-2.5 pl-4 flex items-center justify-between">
          <div className="font-mono text-xs text-[#8d97a1] truncate mr-3">
            {window.location.origin}/u/{profileData.username || 'member'}
          </div>
          <button 
            type="button"
            onClick={copyProfileUrl}
            className="w-10 h-10 rounded-full bg-[#00d1ff] text-[#00131a] flex items-center justify-center font-bold shrink-0 hover:bg-[#00d1ff]/90 transition-all shadow-[0_0_15px_rgba(0,209,255,0.25)] active:scale-95 cursor-pointer"
            title="Copy link"
          >
            {copiedLink ? <Check className="w-4 h-4 stroke-[3]" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        {/* Two small stat boxes: Referrals and Earned */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="bg-white/[0.02] border border-white/[0.075] rounded-[18px] p-4 text-center space-y-1">
            <div className="font-serif text-2xl text-[#f3f6f8]">
              {referralStats.total || profileData.referral_count || 0}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">
              REFERRALS
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/[0.075] rounded-[18px] p-4 text-center space-y-1">
            <div className="font-serif text-2xl text-[#00d1ff]">
              ₦{Number(referralStats.earned || 0).toLocaleString()}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d]">
              EARNED
            </div>
          </div>
        </div>
      </div>

      {/* Block member button (when viewing someone else) */}
      {!isOwnProfile && (
        <div className="pt-2">
          <button 
            onClick={handleBlockUser}
            className="w-full py-3 bg-transparent text-[#ff5a5f] hover:bg-[#ff5a5f]/10 border border-[#ff5a5f]/20 rounded-[14px] font-mono text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <ShieldOff className="w-4 h-4" />
            <span>Block Member</span>
          </button>
        </div>
      )}

      {/* Start Chat Modal */}
      <AnimatePresence>
        {showChatModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChatModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#090b0d] border border-white/15 rounded-[28px] p-7 space-y-5 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/[0.075] pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                    NEW CONVERSATION
                  </span>
                  <h3 className="font-serif text-2xl text-[#f3f6f8]">
                    Message {user?.display_name || user?.username}
                  </h3>
                </div>
                <button onClick={() => setShowChatModal(false)} className="p-2 text-[#59636d] hover:text-[#f3f6f8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block">
                  Opening Message
                </label>
                <textarea 
                  value={quickMessage}
                  onChange={(e) => setQuickMessage(e.target.value)}
                  placeholder="Hey, I noticed your profile and would love to connect..."
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[16px] p-4 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:outline-none focus:border-[#00d1ff] transition-all font-sans"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowChatModal(false)}
                  className="flex-1 py-3.5 bg-transparent border border-white/15 text-[#f3f6f8] font-mono text-xs uppercase tracking-wider rounded-[14px] cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmStartChat}
                  disabled={isSendingChat}
                  className="flex-1 py-3.5 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-sans font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] disabled:opacity-50 cursor-pointer"
                >
                  {isSendingChat ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Direct Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTipModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-[#090b0d] border border-white/15 rounded-[28px] p-7 space-y-5 shadow-2xl z-10"
            >
              <div className="flex items-center justify-between border-b border-white/[0.075] pb-4">
                <div className="space-y-1">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block font-semibold">
                    DIRECT APPRECIATION
                  </span>
                  <h3 className="font-serif text-2xl text-[#f3f6f8]">
                    Send Tip to {user?.display_name || user?.username}
                  </h3>
                </div>
                <button onClick={() => setShowTipModal(false)} className="p-2 text-[#59636d] hover:text-[#f3f6f8]">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['1000', '2000', '5000', '10000', '25000', '50000'].map(amt => (
                  <button
                    key={amt}
                    onClick={() => setTipAmount(amt)}
                    className={cn(
                      "py-3 rounded-xl border text-xs font-mono font-bold transition-all cursor-pointer",
                      tipAmount === amt ? "bg-[#00d1ff] text-[#00131a] border-[#00d1ff] shadow-md" : "bg-white/[0.03] border-white/10 text-[#8d97a1] hover:bg-white/10"
                    )}
                  >
                    ₦{Number(amt).toLocaleString()}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <label className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] block">Custom Amount (NGN)</label>
                <input 
                  type="number" 
                  value={tipAmount}
                  onChange={(e) => setTipAmount(e.target.value)}
                  placeholder="2000"
                  className="w-full bg-white/[0.03] border border-white/10 rounded-[14px] py-3.5 px-4 font-serif text-lg text-[#f3f6f8] focus:outline-none focus:border-[#00d1ff]"
                />
              </div>

              <button 
                onClick={handleSendTip}
                className="w-full py-4 bg-[#00d1ff] hover:bg-[#00d1ff]/90 text-[#00131a] font-sans font-bold text-xs uppercase tracking-wider rounded-[14px] shadow-[0_0_20px_rgba(0,209,255,0.25)] transition-all cursor-pointer"
              >
                Send ₦{Number(tipAmount || 0).toLocaleString()} Tip
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subscription / Lock Modal */}
      <SubscriptionModal
        isOpen={showLockModal}
        onClose={() => setShowLockModal(false)}
        profile={myProfile}
        title="Unlock Nationwide Access"
        subtitle="Only Lagos is open on the free plan. ₦2,000 unlocks all 36 states + Abuja."
      />
    </div>
  );
}
