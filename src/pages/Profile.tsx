import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, MessageSquare, DollarSign, Heart, Lock, Eye, Zap, ArrowLeft, MoreVertical, CheckCircle, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ProfilePage({ profile: myProfile }: { profile: any }) {
  const { uid } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false); // Mocked for now
  const [showTipModal, setShowTipModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('1500');

  const isOwnProfile = uid === myProfile?.id;

  useEffect(() => {
    const fetchUser = async () => {
      if (!uid) return;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (!error) {
        setUser(data);
      }
      setLoading(false);
    };

    fetchUser();
  }, [uid]);

  const handleStartChat = async () => {
    if (!uid || !myProfile) return;
    
    // Create or find chat
    const chatId = [uid, myProfile.id].sort().join('_');
    
    const { data: existingChat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single();
    
    if (!existingChat) {
      await supabase
        .from('chats')
        .insert({
          id: chatId,
          participants: [uid, myProfile.id],
          last_message: '',
          last_timestamp: new Date().toISOString(),
        });
    }
    
    navigate(`/chat/${chatId}`);
  };

  const handleSendTip = async () => {
    if (!uid || !myProfile) return;
    
    const amount = parseFloat(tipAmount);
    const commission = amount * 0.25;
    
    const { error } = await supabase
      .from('transactions')
      .insert({
        from_uid: myProfile.id,
        to_uid: uid,
        amount: amount,
        commission: commission,
        type: 'tip',
        status: 'completed',
        timestamp: new Date().toISOString()
      });
    
    if (!error) {
      setShowTipModal(false);
      alert('Tip sent successfully!');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <div className="h-screen flex items-center justify-center">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <MoreVertical className="w-6 h-6 text-white/50" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="relative rounded-[40px] overflow-hidden bg-white/5 border border-white/10">
        {/* Cover / Profile Image */}
        <div className="aspect-[4/5] md:aspect-video relative">
          <img 
            src={user.photo_url || `https://picsum.photos/seed/${user.id}/1200/800`} 
            className={cn(
              "w-full h-full object-cover transition-all duration-1000",
              !isSubscribed && !isOwnProfile && "blur-2xl scale-110 grayscale"
            )}
            referrerPolicy="no-referrer"
          />
          
          {/* Blur Overlay for non-subscribers */}
          {!isSubscribed && !isOwnProfile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
              <Lock className="w-12 h-12 text-white/50 mb-4" />
              <p className="text-white font-display text-2xl uppercase tracking-widest mb-6">Upgrade to View</p>
              <button className="px-8 py-3 bg-emerald-500 text-white font-bold uppercase tracking-widest rounded-full shadow-lg shadow-emerald-500/20 hover:scale-105 transition-transform">
                Subscribe Now
              </button>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>

        {/* Profile Info */}
        <div className="p-8 md:p-12 -mt-24 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h1 className="text-5xl md:text-7xl font-display uppercase tracking-tighter">{user.username}</h1>
                {user.is_verified && (
                  <div className="bg-emerald-500 rounded-full p-1 shadow-lg shadow-emerald-500/20">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-6 text-white/50 uppercase tracking-[0.2em] text-xs font-bold">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>Lagos, Nigeria &bull; 2km</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-emerald-500">Active Now</span>
                </div>
              </div>

              <p className="max-w-2xl text-white/60 text-lg font-light leading-relaxed">
                {user.bio || "Bio/description and subscription integration, alors with, converting, and somvert... Read more"}
              </p>

              <div className="flex flex-wrap gap-3">
                {['Interests', 'Rating', 'Subscription'].map(tag => (
                  <span key={tag} className="px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-white/40">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {!isOwnProfile && (
              <div className="flex flex-col gap-4 w-full md:w-auto">
                <div className="flex gap-3">
                  <button 
                    onClick={handleStartChat}
                    disabled={!isSubscribed}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/10 rounded-2xl hover:bg-white/20 transition-all disabled:opacity-50"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="uppercase tracking-widest text-xs font-bold">Chat</span>
                  </button>
                  <button 
                    onClick={() => setShowTipModal(true)}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                  >
                    <DollarSign className="w-5 h-5" />
                    <span className="uppercase tracking-widest text-xs font-bold">Send Tip</span>
                  </button>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                  <Heart className="w-5 h-5 text-red-500" />
                  <span className="uppercase tracking-widest text-xs font-bold">Like Profile</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Mode Toggle (Own Profile) */}
      {isOwnProfile && (
        <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
          <h3 className="text-xl font-display uppercase tracking-widest">Privacy Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {['public', 'private', 'incognito'].map(mode => (
              <button
                key={mode}
                onClick={async () => {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ profile_mode: mode })
                    .eq('id', myProfile.id);
                  
                  if (!error) {
                    setUser({ ...user, profile_mode: mode });
                  }
                }}
                className={cn(
                  "p-6 rounded-3xl border transition-all text-center space-y-2",
                  user.profile_mode === mode 
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-500" 
                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                )}
              >
                <div className="uppercase tracking-[0.2em] text-xs font-bold">{mode}</div>
                <p className="text-[10px] opacity-60">
                  {mode === 'public' && "Visible to all subscribers"}
                  {mode === 'private' && "Only visible when approved"}
                  {mode === 'incognito' && "Browse without being seen"}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tip Modal */}
      <AnimatePresence>
        {showTipModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTipModal(false)}
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
                  <DollarSign className="w-8 h-8 text-emerald-500" />
                </div>
                <h2 className="text-3xl font-display uppercase tracking-tighter">Send a Tip</h2>
                <p className="text-white/40 text-xs uppercase tracking-widest">Support {user.username}</p>
              </div>

              <div className="space-y-4">
                <div className="relative">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-white/30">₦</span>
                  <input 
                    type="number" 
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 pl-12 pr-6 text-3xl font-bold focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {['500', '1500', '5000'].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setTipAmount(amount)}
                      className={cn(
                        "py-3 rounded-xl border text-xs font-bold uppercase tracking-widest transition-all",
                        tipAmount === amount ? "bg-emerald-500 border-emerald-500 text-white" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                      )}
                    >
                      ₦{amount}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <button 
                  onClick={handleSendTip}
                  className="w-full py-5 bg-emerald-500 text-white font-bold uppercase tracking-widest rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Confirm Tip
                </button>
                <button 
                  onClick={() => setShowTipModal(false)}
                  className="w-full py-5 bg-white/5 text-white/40 font-bold uppercase tracking-widest rounded-2xl hover:bg-white/10 transition-all"
                >
                  Cancel
                </button>
              </div>

              <p className="text-[10px] text-center text-white/20 uppercase tracking-widest">
                Platform takes 25% commission &bull; Secure via Kora Pay
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
