import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, MapPin, MessageSquare, DollarSign, Heart, Lock, Eye, Zap, ArrowLeft, MoreVertical, CheckCircle, AlertCircle, Edit3, Camera, X, Upload, Check, Sliders, Image as ImageIcon, User, Settings, Info, ShieldOff } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import Cropper from 'react-easy-crop';
import imageCompression from 'browser-image-compression';

import { Logo, PrivyLogo } from '../components/Logo';
import { useToast } from '../components/Toaster';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ProfilePage({ profile: myProfile }: { profile: any }) {
  const { uid } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showTipModal, setShowTipModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [tipAmount, setTipAmount] = useState('1500');
  
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Advanced Image Edit State
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    username: '',
    display_name: '',
    bio: '',
    photo_url: '',
    preferences: [] as string[],
    is_public: true,
    hide_online_status: false,
    profile_mode: 'public'
  });

  const isOwnProfile = uid === myProfile?.id;
  const isSubscribed = myProfile?.is_subscribed || false;

  useEffect(() => {
    const fetchUser = async () => {
      if (!uid || uid === 'undefined') {
        setLoading(false);
        return;
      }

      if (!isSupabaseActive) {
        const mockUser = MOCK_USERS.find(u => u.id === uid) || MOCK_USERS[0];
        setUser(mockUser);
        setEditForm({
          username: mockUser.username,
          display_name: mockUser.display_name || mockUser.username,
          bio: mockUser.bio || '',
          photo_url: mockUser.photo_url || '',
          preferences: mockUser.preferences || [],
          is_public: true,
          hide_online_status: false,
          profile_mode: mockUser.profile_mode || 'public'
        });
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .single();
        
        if (error) {
          console.error('ProfilePage: Error fetching user:', error);
        } else if (data) {
          setUser(data);
          setEditForm({
            username: data.username,
            display_name: data.display_name || data.username,
            bio: data.bio || '',
            photo_url: data.photo_url || '',
            preferences: data.preferences || [],
            is_public: data.is_public ?? true,
            hide_online_status: data.hide_online_status ?? false,
            profile_mode: data.profile_mode || 'public'
          });

          // Check if we should show lock modal
          if (!isOwnProfile && !isSubscribed) {
            setShowLockModal(true);
          }
        }
      } catch (err) {
        console.error('ProfilePage: Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [uid, myProfile, isSubscribed]);

  useEffect(() => {
    const checkIsSaved = async () => {
      if (!isSupabaseActive || !myProfile || !uid || uid === 'undefined') return;
      
      const { data, error } = await supabase
        .from('saved_profiles')
        .select('id')
        .eq('user_id', myProfile.id)
        .eq('saved_profile_id', uid)
        .maybeSingle();
      
      if (!error && data) {
        setIsSaved(true);
      }
    };

    checkIsSaved();
  }, [uid, myProfile]);

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        setImageToCrop(reader.result as string);
      });
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCroppedImage = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setIsUploading(true);

    try {
      // In a real app, we would crop the image using canvas and then upload to Supabase Storage
      // For this demo, we'll simulate compression and upload
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.src = imageToCrop;
      
      await new Promise((resolve) => { img.onload = resolve; });
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const { x, y, width, height } = croppedAreaPixels as any;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, x, y, width, height, 0, 0, width, height);

      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.8));
      
      // Compress
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(blob as File, options);
      
      // Mock upload URL
      const reader = new FileReader();
      reader.readAsDataURL(compressedFile);
      reader.onloadend = async () => {
        const base64data = reader.result as string;
        setEditForm({ ...editForm, photo_url: base64data });
        
        if (isSupabaseActive && myProfile?.id) {
          await supabase
            .from('profiles')
            .update({ photo_url: base64data })
            .eq('id', myProfile.id);
        }
        
        setImageToCrop(null);
        setIsUploading(false);
        toast('Profile photo updated!', 'success');
      };

    } catch (error) {
      console.error('Error processing image:', error);
      setIsUploading(false);
    }
  };

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
      toast('Tip sent successfully!', 'success');
    }
  };

  const handleSaveProfile = async () => {
    if (!isSupabaseActive || !myProfile || !uid) return;
    
    setIsSaving(true);
    try {
      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_profiles')
          .delete()
          .eq('user_id', myProfile.id)
          .eq('saved_profile_id', uid);
        
        if (!error) {
          setIsSaved(false);
          toast('Profile removed from saved', 'success');
        }
      } else {
        // Save
        const { error } = await supabase
          .from('saved_profiles')
          .insert({
            user_id: myProfile.id,
            saved_profile_id: uid
          });
        
        if (!error) {
          setIsSaved(true);
          toast('Profile saved successfully!', 'success');
        }
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleBlockUser = async () => {
    if (!uid || !myProfile) return;
    
    if (!isSupabaseActive) {
      toast('User blocked successfully (Mock Mode)!', 'success');
      return;
    }

    try {
      const { error } = await supabase
        .from('blocked_users')
        .insert({
          user_id: myProfile.id,
          blocked_user_id: uid,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      toast('User blocked successfully. You will no longer see their content.', 'success');
      navigate('/discovery');
    } catch (err: any) {
      console.error('Error blocking user:', err);
      toast('Failed to block user. Please try again.', 'error');
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;
  if (!user) return <div className="h-screen flex items-center justify-center">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-0">
        <button onClick={() => navigate(-1)} className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3">
          {isOwnProfile && (
            <button 
              onClick={() => setShowEditModal(true)}
              className="px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              Edit Profile
            </button>
          )}
          <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
            <MoreVertical className="w-6 h-6 text-white/50" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="relative rounded-[64px] overflow-hidden bg-[#050505] border border-white/10 shadow-2xl">
        {/* Cover / Profile Image */}
        <div className="aspect-[3/4] relative group">
          <img 
            src={user.photo_url || `https://picsum.photos/seed/${user.id}/1200/1600`} 
            className={cn(
              "w-full h-full object-cover transition-all duration-1000",
              !isSubscribed && !isOwnProfile && "blur-3xl scale-110 grayscale-[0.5]"
            )}
            referrerPolicy="no-referrer"
          />
          
          {/* Status Indicator */}
          <div className="absolute top-8 left-8 z-20 flex items-center gap-2 px-4 py-2 bg-black/40 backdrop-blur-md border border-white/10 rounded-full">
            <div className={cn("w-2 h-2 rounded-full", (user.is_online && !user.hide_online_status) ? "bg-emerald-500 animate-pulse" : "bg-white/20")} />
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/80">
              {(user.is_online && !user.hide_online_status) ? "Online Now" : "Last seen 2h ago"}
            </span>
          </div>

          {/* Blur Overlay for non-subscribers */}
          {!isSubscribed && !isOwnProfile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20 backdrop-blur-[2px] z-30">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center space-y-6"
              >
                <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center mx-auto shadow-2xl">
                  <Lock className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-display uppercase italic tracking-tighter">Profile Locked</h3>
                  <p className="text-white/60 text-xs uppercase tracking-widest">Subscribe to unlock full access</p>
                </div>
                <button 
                  onClick={() => setShowLockModal(true)}
                  className="px-10 py-5 bg-brand-blue text-brand-dark font-black uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_40px_rgba(0,209,255,0.3)] hover:scale-105 transition-transform"
                >
                  Unlock Access &bull; ₦1500
                </button>
              </motion.div>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent opacity-90" />
        </div>

        {/* Profile Info */}
        <div className="px-10 pb-16 -mt-40 relative z-10 space-y-10">
          {(!isSubscribed && !isOwnProfile) ? (
            <div className="space-y-6">
              <div className="flex items-end justify-between">
                <div className="space-y-4">
                  <h1 className="text-6xl md:text-7xl font-display uppercase tracking-tighter italic leading-none">{user.display_name || user.username}</h1>
                  <div className="flex flex-wrap items-center gap-6 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-blue" />
                      <span>Lagos, Nigeria</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto">
                  <Lock className="w-6 h-6 text-white/20" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-display uppercase italic tracking-tight">Full Profile Locked</h3>
                  <p className="text-white/40 text-xs uppercase tracking-widest max-w-[240px] mx-auto">Subscribe to view bio, preferences, and start chatting</p>
                </div>
                <button 
                  onClick={() => setShowLockModal(true)}
                  className="px-8 py-4 bg-brand-blue text-brand-dark font-black uppercase tracking-[0.2em] text-[10px] rounded-xl"
                >
                  Unlock Now &bull; ₦1500
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-6">
                <div className="flex items-end justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <h1 className="text-6xl md:text-7xl font-display uppercase tracking-tighter italic leading-none">{user.display_name || user.username}</h1>
                      {user.is_verified && (
                        <div className="bg-brand-blue rounded-full p-1.5 shadow-[0_0_20px_rgba(0,209,255,0.4)]">
                          <Shield className="w-6 h-6 text-brand-dark" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-6 text-white/40 uppercase tracking-[0.2em] text-[10px] font-bold">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-brand-blue" />
                        <span>Lagos, Nigeria &bull; 2km</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span>98% Response Rate</span>
                      </div>
                    </div>
                  </div>

                  {isOwnProfile && (
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">Profile Strength</span>
                      <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <div className="w-4/5 h-full bg-brand-blue shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-6">
                    <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        About
                      </h3>
                      <p className="text-white/60 text-lg font-medium leading-relaxed">
                        {user.bio || "No bio provided yet. Add a bio to let people know more about you."}
                      </p>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 flex items-center gap-2">
                        <Sliders className="w-3 h-3" />
                        Preferences
                      </h3>
                      <div className="flex flex-wrap gap-3">
                        {(user.preferences || ['Travel', 'Dining', 'Luxury', 'Tech']).map((tag: string) => (
                          <span key={tag} className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-[10px] uppercase tracking-[0.2em] font-bold text-white/60 hover:bg-white/10 transition-colors cursor-default">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 space-y-4">
                      <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20">Quick Stats</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <div className="text-xl font-display italic">1.2k</div>
                          <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Profile Views</div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-xl font-display italic">48</div>
                          <div className="text-[8px] uppercase tracking-widest text-white/30 font-bold">Connections</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Media Gallery */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-white/20 flex items-center gap-2">
                    <ImageIcon className="w-3 h-3" />
                    Media Gallery
                  </h3>
                  <button className="text-[9px] uppercase tracking-widest font-bold text-brand-blue hover:underline">View All</button>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="aspect-square rounded-3xl overflow-hidden bg-white/5 border border-white/10 group cursor-pointer relative">
                      <img 
                        src={`https://picsum.photos/seed/media-${user.id}-${i}/600/600`} 
                        className={cn(
                          "w-full h-full object-cover transition-all duration-500 group-hover:scale-110",
                          !isSubscribed && !isOwnProfile && "blur-2xl opacity-50"
                        )}
                        referrerPolicy="no-referrer"
                      />
                      {!isSubscribed && !isOwnProfile && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Lock className="w-5 h-5 text-white/20" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {!isOwnProfile && isSubscribed && (
                <div className="space-y-6 pt-6">
                  <div className="flex items-center justify-center gap-4">
                    <div className="h-px flex-1 bg-white/10" />
                    <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-white/20">Exclusive Actions</span>
                    <div className="h-px flex-1 bg-white/10" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <button 
                      onClick={handleStartChat}
                      className="flex items-center justify-center gap-4 px-8 py-6 bg-brand-blue text-brand-dark rounded-[24px] hover:scale-[1.02] transition-all group shadow-xl shadow-brand-blue/10"
                    >
                      <MessageSquare className="w-6 h-6" />
                      <span className="uppercase tracking-[0.2em] text-xs font-black">Start Chat</span>
                    </button>
                    <button 
                      onClick={() => setShowTipModal(true)}
                      className="flex items-center justify-center gap-4 px-8 py-6 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all group"
                    >
                      <DollarSign className="w-6 h-6 text-emerald-500" />
                      <span className="uppercase tracking-[0.2em] text-xs font-black text-white/80">Send Tip</span>
                    </button>
                  </div>
                  <div className="space-y-4">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="w-full flex items-center justify-center gap-4 px-8 py-6 bg-white/5 border border-white/10 rounded-[24px] hover:bg-white/10 transition-all group disabled:opacity-50"
                    >
                      <Heart className={cn("w-6 h-6 transition-colors", isSaved ? "text-red-500 fill-red-500" : "text-white/20 group-hover:text-red-500")} />
                      <span className="uppercase tracking-[0.2em] text-xs font-black text-white/80">{isSaved ? 'Saved' : 'Save Profile'}</span>
                    </button>
                    <button 
                      onClick={handleBlockUser}
                      className="w-full flex items-center justify-center gap-4 px-8 py-6 bg-red-500/5 border border-red-500/10 rounded-[24px] hover:bg-red-500/10 transition-all group"
                    >
                      <ShieldOff className="w-6 h-6 text-red-500/20 group-hover:text-red-500 transition-colors" />
                      <span className="uppercase tracking-[0.2em] text-xs font-black text-red-500/80">Block User</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Profile Settings (Own Profile) */}
      {isOwnProfile && (
        <div className="grid md:grid-cols-2 gap-8">
          <div className="p-10 rounded-[48px] bg-white/5 border border-white/10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                <Settings className="w-6 h-6 text-brand-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-display uppercase tracking-[0.2em] font-bold text-white/60">Privacy Settings</h3>
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-medium">Manage your visibility</p>
              </div>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'is_public', label: 'Public Profile', desc: 'Visible in discovery' },
                { id: 'hide_online_status', label: 'Hide Online Status', desc: 'Browse anonymously' }
              ].map(setting => (
                <button
                  key={setting.id}
                  onClick={async () => {
                    const newValue = !editForm[setting.id as keyof typeof editForm];
                    setEditForm({ ...editForm, [setting.id]: newValue });
                    
                    if (isSupabaseActive) {
                      await supabase
                        .from('profiles')
                        .update({ [setting.id]: newValue })
                        .eq('id', myProfile.id);
                    } else {
                      setUser({ ...user, [setting.id]: newValue });
                    }
                  }}
                  className="w-full p-6 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between group hover:bg-white/10 transition-all"
                >
                  <div className="text-left space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-bold text-white/60">{setting.label}</div>
                    <div className="text-[8px] uppercase tracking-widest text-white/20">{setting.desc}</div>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-all duration-500",
                    editForm[setting.id as keyof typeof editForm] ? "bg-brand-blue" : "bg-white/10"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-500",
                      editForm[setting.id as keyof typeof editForm] ? "right-1" : "left-1"
                    )} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="p-10 rounded-[48px] bg-white/5 border border-white/10 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-display uppercase tracking-[0.2em] font-bold text-white/60">Account Mode</h3>
                <p className="text-[9px] text-white/20 uppercase tracking-widest font-medium">Current: {user.profile_mode}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'public', icon: Eye, label: 'Public' },
                { id: 'private', icon: Lock, label: 'Private' },
                { id: 'incognito', icon: Shield, label: 'Ghost' }
              ].map(mode => (
                <button
                  key={mode.id}
                  onClick={async () => {
                    if (!isSupabaseActive) {
                      setUser({ ...user, profile_mode: mode.id });
                      return;
                    }
                    const { error } = await supabase.from('profiles').update({ profile_mode: mode.id }).eq('id', myProfile.id);
                    if (!error) setUser({ ...user, profile_mode: mode.id });
                  }}
                  className={cn(
                    "py-6 rounded-2xl border transition-all flex flex-col items-center gap-3",
                    user.profile_mode === mode.id ? "bg-brand-blue/10 border-brand-blue text-brand-blue" : "bg-white/5 border-white/10 text-white/30"
                  )}
                >
                  <mode.icon className="w-5 h-5" />
                  <span className="text-[8px] uppercase tracking-widest font-bold">{mode.label}</span>
                </button>
              ))}
            </div>
          </div>
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
              onClick={() => !imageToCrop && setShowEditModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0a0a0a] border border-white/10 rounded-[64px] p-12 space-y-10 overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="absolute top-0 right-0 p-10">
                <button onClick={() => setShowEditModal(false)} className="p-3 hover:bg-white/5 rounded-full transition-colors">
                  <X className="w-6 h-6 text-white/30" />
                </button>
              </div>

              <div className="text-center space-y-3">
                <h2 className="text-4xl font-display uppercase tracking-tighter italic">Edit Profile</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Refine your premium identity</p>
              </div>

              {imageToCrop ? (
                <div className="space-y-8">
                  <div className="relative h-[400px] rounded-3xl overflow-hidden bg-black">
                    <Cropper
                      image={imageToCrop}
                      crop={crop}
                      zoom={zoom}
                      aspect={3 / 4}
                      onCropChange={setCrop}
                      onCropComplete={onCropComplete}
                      onZoomChange={setZoom}
                    />
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">Zoom</span>
                      <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-brand-blue"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setImageToCrop(null)}
                        className="flex-1 py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] uppercase tracking-widest font-bold text-white/40"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveCroppedImage}
                        disabled={isUploading}
                        className="flex-1 py-5 bg-brand-blue text-brand-dark rounded-2xl text-[10px] uppercase tracking-widest font-bold flex items-center justify-center gap-2"
                      >
                        {isUploading ? "Processing..." : "Save Photo"}
                        {!isUploading && <Check className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-10">
                  <div className="flex flex-col items-center gap-6">
                    <div className="relative group">
                      <div className="w-40 h-40 rounded-[48px] overflow-hidden border-2 border-white/10 group-hover:border-brand-blue transition-all relative">
                        <img 
                          src={editForm.photo_url || `https://picsum.photos/seed/${user.id}/400/400`} 
                          className="w-full h-full object-cover"
                        />
                        <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer gap-2">
                          <Camera className="w-8 h-8 text-white" />
                          <span className="text-[8px] uppercase tracking-widest font-bold text-white">Change Photo</span>
                          <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                      </div>
                      <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-brand-blue rounded-2xl flex items-center justify-center shadow-lg">
                        <Upload className="w-5 h-5 text-brand-dark" />
                      </div>
                    </div>
                    <p className="text-[9px] text-white/20 uppercase tracking-widest font-medium">Drag & drop or click to upload. Max 5MB.</p>
                  </div>

                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Display Name</label>
                        <input 
                          type="text" 
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold"
                          placeholder="Your public name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Username</label>
                        <div className="relative">
                          <span className="absolute left-8 top-1/2 -translate-y-1/2 text-white/20 font-bold">@</span>
                          <input 
                            type="text" 
                            value={editForm.username}
                            onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-8 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Bio</label>
                      <textarea 
                        value={editForm.bio}
                        onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-medium resize-none"
                        placeholder="Tell your story..."
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Preferences</label>
                    <div className="flex flex-wrap gap-3">
                      {['Travel', 'Dining', 'Luxury', 'Tech', 'Art', 'Music', 'Fitness', 'Business'].map(pref => (
                        <button
                          key={pref}
                          type="button"
                          onClick={() => {
                            const newPrefs = editForm.preferences.includes(pref)
                              ? editForm.preferences.filter(p => p !== pref)
                              : [...editForm.preferences, pref];
                            setEditForm({ ...editForm, preferences: newPrefs });
                          }}
                          className={cn(
                            "px-5 py-3 rounded-xl border text-[9px] uppercase tracking-widest font-bold transition-all",
                            editForm.preferences.includes(pref)
                              ? "bg-brand-blue/10 border-brand-blue text-brand-blue shadow-[0_0_15px_rgba(0,209,255,0.1)]"
                              : "bg-white/5 border-white/10 text-white/30 hover:bg-white/10"
                          )}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-6 bg-brand-blue text-brand-dark font-black uppercase tracking-[0.3em] text-xs rounded-[24px] shadow-[0_0_50px_rgba(0,209,255,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all"
                  >
                    Update Profile
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lock Modal */}
      <AnimatePresence>
        {showLockModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLockModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-2xl"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[56px] p-12 text-center space-y-10"
            >
              <div className="w-24 h-24 rounded-[32px] bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(0,209,255,0.1)]">
                <Lock className="w-10 h-10 text-brand-blue" />
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl font-display uppercase tracking-tighter italic">Profile Locked</h2>
                <p className="text-white/50 text-sm font-medium leading-relaxed">
                  Subscribe to <span className="text-white font-bold">PrivyConnect Premium</span> to view full profiles, high-res media, and start unlimited chats.
                </p>
              </div>

              <div className="space-y-4">
                <button 
                  className="w-full py-6 bg-brand-blue text-brand-dark font-black uppercase tracking-[0.2em] text-xs rounded-[24px] shadow-[0_0_50px_rgba(0,209,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Unlock Access &bull; ₦1500/wk
                </button>
                <button 
                  onClick={() => setShowLockModal(false)}
                  className="w-full py-6 bg-white/5 text-white/40 font-bold uppercase tracking-widest text-[10px] rounded-[24px] hover:bg-white/10 transition-all"
                >
                  Maybe Later
                </button>
              </div>

              <div className="flex items-center justify-center gap-6 pt-4">
                <div className="flex flex-col items-center gap-1">
                  <Shield className="w-4 h-4 text-white/20" />
                  <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Secure</span>
                </div>
                <div className="w-px h-8 bg-white/10" />
                <div className="flex flex-col items-center gap-1">
                  <Zap className="w-4 h-4 text-white/20" />
                  <span className="text-[8px] uppercase tracking-widest text-white/20 font-bold">Instant</span>
                </div>
              </div>
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
