import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, MessageSquare, DollarSign, Heart, Lock, Eye, Zap, ArrowLeft, MoreVertical, CheckCircle, AlertCircle, Edit3, Camera, X } from 'lucide-react';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('1500');
  
  // Edit form state
  const [editForm, setEditForm] = useState({
    username: '',
    bio: '',
    photo_url: ''
  });

  const isOwnProfile = uid === myProfile?.id;

  useEffect(() => {
    const fetchUser = async () => {
      if (!uid) return;

      if (!isSupabaseActive) {
        const mockUser = MOCK_USERS.find(u => u.id === uid) || MOCK_USERS[0];
        setUser(mockUser);
        setEditForm({
          username: mockUser.username,
          bio: mockUser.bio || '',
          photo_url: mockUser.photo_url || ''
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
      
      if (!error && data) {
        setUser(data);
        setEditForm({
          username: data.username,
          bio: data.bio || '',
          photo_url: data.photo_url || ''
        });
      }
      setLoading(false);
    };

    fetchUser();
  }, [uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myProfile?.id) return;

    if (!isSupabaseActive) {
      setUser({ ...user, ...editForm });
      setShowEditModal(false);
      return;
    }

    const { error } = await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', myProfile.id);

    if (!error) {
      setUser({ ...user, ...editForm });
      setShowEditModal(false);
    }
  };

  const handleStartChat = async () => {
    if (!uid || !myProfile) return;
    
    // Create or find chat
    const chatId = [uid, myProfile.id].sort().join('_');
    
    if (!isSupabaseActive) {
      navigate(`/chat/${chatId}`);
      return;
    }

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
    
    if (!isSupabaseActive) {
      setShowTipModal(false);
      alert('Tip sent successfully (Mock Mode)!');
      return;
    }

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
          {isOwnProfile && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="px-6 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Edit3 className="w-3 h-3" />
              Edit Profile
            </button>
          )}
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <MoreVertical className="w-6 h-6 text-white/50" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="relative rounded-[48px] overflow-hidden bg-[#050505] border border-white/10 shadow-2xl">
        {/* Cover / Profile Image */}
        <div className="aspect-[3/4] relative">
          <img 
            src={user.photo_url || `https://picsum.photos/seed/${user.id}/1200/1600`} 
            className={cn(
              "w-full h-full object-cover transition-all duration-1000",
              !isSubscribed && !isOwnProfile && "blur-3xl scale-110 grayscale-[0.5]"
            )}
            referrerPolicy="no-referrer"
          />
          
          {/* Blur Overlay for non-subscribers */}
          {!isSubscribed && !isOwnProfile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px]">
              <button className="px-10 py-4 bg-white/10 backdrop-blur-md border border-white/20 text-white font-bold uppercase tracking-[0.2em] rounded-2xl shadow-2xl hover:scale-105 transition-transform">
                Upgrade to view
              </button>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90" />
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-12 -mt-32 relative z-10 space-y-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-5xl md:text-6xl font-display uppercase tracking-tighter italic">{user.username}</h1>
              {user.is_verified && (
                <div className="bg-brand-blue rounded-full p-1 shadow-[0_0_15px_rgba(0,209,255,0.5)]">
                  <Shield className="w-5 h-5 text-brand-dark" />
                </div>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-6 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-blue" />
                <span>Lagos, Nigeria &bull; 2km</span>
              </div>
            </div>

            <p className="max-w-xl text-white/50 text-sm font-medium leading-relaxed">
              {user.bio || "Bio/description and subscription integration, alors with, converting, and somvert... Read more"}
            </p>

            <div className="flex flex-wrap gap-3">
              {['Interests', 'Rooting', 'Subscription'].map(tag => (
                <span key={tag} className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-[9px] uppercase tracking-[0.2em] font-bold text-white/40">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {!isOwnProfile && (
            <div className="space-y-6">
              <div className="flex items-center justify-center gap-4">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/20">Subscribers Only</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-4">
                <div className="flex gap-4">
                  <button 
                    onClick={handleStartChat}
                    className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                    <MessageSquare className="w-5 h-5 text-white/30 group-hover:text-brand-blue transition-colors" />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-white/60">Start Chat</span>
                  </button>
                  <button 
                    onClick={() => setShowTipModal(true)}
                    className="flex-1 flex items-center justify-center gap-3 px-8 py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group"
                  >
                    <DollarSign className="w-5 h-5 text-white/30 group-hover:text-emerald-500 transition-colors" />
                    <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-white/60">Send Tip</span>
                  </button>
                </div>
                <button className="w-full flex items-center justify-center gap-3 px-8 py-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all group">
                  <Heart className="w-5 h-5 text-white/30 group-hover:text-red-500 transition-colors" />
                  <span className="uppercase tracking-[0.2em] text-[10px] font-bold text-white/60">Like Profile</span>
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-center gap-3 pt-4">
            <div className="w-2 h-2 rounded-full bg-white/20" />
            <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/20">Private / Public / Incognito</span>
          </div>
        </div>
      </div>

      {/* Profile Mode Toggle (Own Profile) */}
      {isOwnProfile && (
        <div className="p-8 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display uppercase tracking-[0.2em] font-bold text-white/60">Profile Mode</h3>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-brand-blue/10 border border-brand-blue/20">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              <span className="text-[8px] uppercase tracking-widest font-bold text-brand-blue">{user.profile_mode}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-3">
            {['public', 'private', 'incognito'].map(mode => (
              <button
                key={mode}
                onClick={async () => {
                  if (!isSupabaseActive) {
                    setUser({ ...user, profile_mode: mode });
                    return;
                  }

                  const { error } = await supabase
                    .from('profiles')
                    .update({ profile_mode: mode })
                    .eq('id', myProfile.id);
                  
                  if (!error) {
                    setUser({ ...user, profile_mode: mode });
                  }
                }}
                className={cn(
                  "py-4 rounded-2xl border transition-all text-center group relative overflow-hidden",
                  user.profile_mode === mode 
                    ? "bg-brand-blue/10 border-brand-blue text-brand-blue shadow-[0_0_20px_rgba(0,209,255,0.1)]" 
                    : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10"
                )}
              >
                <div className="uppercase tracking-[0.2em] text-[9px] font-bold relative z-10">{mode}</div>
                {user.profile_mode === mode && (
                  <motion.div 
                    layoutId="active-mode"
                    className="absolute inset-0 bg-brand-blue/5"
                  />
                )}
              </button>
            ))}
          </div>
          <p className="text-[9px] text-center text-white/20 uppercase tracking-widest font-medium">
            {user.profile_mode === 'public' && "Your profile is visible to everyone in discovery"}
            {user.profile_mode === 'private' && "Only approved connections can view your full profile"}
            {user.profile_mode === 'incognito' && "Browse profiles without appearing in discovery or active lists"}
          </p>
        </div>
      )}

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[48px] p-10 space-y-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-white/30" />
                </button>
              </div>

              <div className="text-center space-y-2">
                <h2 className="text-3xl font-display uppercase tracking-tighter italic">Edit Profile</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Customize your presence on <span className="text-brand-blue">PrivyConnect</span></p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="flex justify-center">
                  <div className="relative group cursor-pointer">
                    <img 
                      src={editForm.photo_url || `https://picsum.photos/seed/${user.id}/200/200`} 
                      className="w-32 h-32 rounded-[32px] object-cover border-2 border-white/10 group-hover:border-brand-blue transition-all"
                    />
                    <div className="absolute inset-0 bg-black/40 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Username</label>
                    <input 
                      type="text" 
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Bio</label>
                    <textarea 
                      value={editForm.bio}
                      onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-medium resize-none"
                      placeholder="Tell us about yourself..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Photo URL</label>
                    <input 
                      type="text" 
                      value={editForm.photo_url}
                      onChange={(e) => setEditForm({ ...editForm, photo_url: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Save Changes
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
