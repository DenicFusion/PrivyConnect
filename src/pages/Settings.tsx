import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Mail, 
  Lock, 
  Bell, 
  Shield, 
  CreditCard, 
  Share2, 
  Copy, 
  Check, 
  Camera, 
  LogOut, 
  ChevronRight, 
  Eye, 
  EyeOff, 
  MessageSquare,
  Globe,
  MapPin,
  Smartphone,
  History,
  QrCode
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from '../components/Toaster';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function SettingsPage({ profile }: { profile: any }) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    display_name: profile?.display_name || '',
    username: profile?.username || '',
    email: profile?.email || '',
    bio: profile?.bio || '',
    gender: profile?.gender || '',
    looking_for: profile?.looking_for || 'everyone',
    messaging_privacy: profile?.messaging_privacy || 'everyone',
    location_privacy: profile?.location_privacy || 'exact',
    is_public: profile?.is_public ?? true,
    hide_online_status: profile?.hide_online_status ?? false,
    auto_renew: profile?.auto_renew ?? false,
    notification_settings: profile?.notification_settings || {
      chat: true,
      tips: true,
      subscriptions: true,
      promotions: true
    }
  });

  const [loginActivity, setLoginActivity] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.id && isSupabaseActive) {
      fetchLoginActivity();
    }
  }, [profile?.id]);

  const fetchLoginActivity = async () => {
    const { data, error } = await supabase
      .from('login_activity')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (!error && data) {
      setLoginActivity(data);
    }
  };

  const handleUpdateProfile = async (updates: any) => {
    if (!profile?.id) return;
    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;
      toast('Settings updated successfully', 'success');
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file || !profile?.id) return;

    setLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath);

      await handleUpdateProfile({ photo_url: publicUrl });
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [profile?.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    multiple: false
  });

  const copyProfileLink = () => {
    const link = `${window.location.origin}/u/${formData.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast('Profile link copied!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareProfile = async () => {
    const link = `${window.location.origin}/u/${formData.username}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'PrivyConnect Profile',
          text: `Check out my profile on PrivyConnect!`,
          url: link,
        });
      } catch (err) {
        console.error(err);
      }
    } else {
      copyProfileLink();
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'subscription', label: 'Subscription', icon: CreditCard },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
            <History className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-display uppercase tracking-tighter italic">Settings</h1>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Manage your account & preferences</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all group",
                activeTab === tab.id 
                  ? "bg-brand-blue text-brand-dark font-bold italic" 
                  : "bg-white/5 text-white/40 hover:bg-white/10"
              )}
            >
              <tab.icon className={cn("w-5 h-5", activeTab === tab.id ? "text-brand-dark" : "text-white/40 group-hover:text-white")} />
              <span className="uppercase tracking-widest text-xs">{tab.label}</span>
              {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
            </button>
          ))}
          
          <div className="pt-8">
            <button 
              onClick={() => supabase.auth.signOut()}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-red-500/5 text-red-500 hover:bg-red-500/10 transition-all group"
            >
              <LogOut className="w-5 h-5" />
              <span className="uppercase tracking-widest text-xs font-bold">Logout</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-[#0a0a0a] border border-white/10 rounded-[40px] p-8 md:p-12 space-y-10"
            >
              {activeTab === 'account' && (
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    <div {...getRootProps()} className="relative group cursor-pointer">
                      <input {...getInputProps()} />
                      <div className="w-32 h-32 rounded-[40px] overflow-hidden border-2 border-brand-blue/20 group-hover:border-brand-blue transition-all">
                        <img 
                          src={profile?.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.username}`} 
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all rounded-[40px]">
                        <Camera className="w-8 h-8 text-white" />
                      </div>
                    </div>
                    <div className="text-center md:text-left space-y-2">
                      <h3 className="text-2xl font-display italic tracking-tight">{profile?.display_name || profile?.username}</h3>
                      <p className="text-white/40 text-xs uppercase tracking-widest">Profile Picture</p>
                      <button className="text-brand-blue text-[10px] font-bold uppercase tracking-widest hover:underline">Change Avatar</button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Full Name</label>
                      <input 
                        type="text" 
                        value={formData.display_name}
                        onChange={(e) => setFormData({...formData, display_name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Email Address</label>
                      <div className="relative group">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="email" 
                          value={profile?.email || ''}
                          readOnly
                          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-6 text-white/40 cursor-not-allowed"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Username</label>
                      <input 
                        type="text" 
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Bio</label>
                      <textarea 
                        value={formData.bio}
                        onChange={(e) => setFormData({...formData, bio: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all min-h-[100px]"
                      />
                    </div>

                    <div className="space-y-6 md:col-span-2">
                      <h3 className="text-xl font-display italic tracking-tight">Identity & Discovery</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Your Gender</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'male', label: 'Male', icon: '♂️' },
                              { id: 'female', label: 'Female', icon: '♀️' },
                              { id: 'unspecified', label: 'Other', icon: '✨' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setFormData({...formData, gender: opt.id})}
                                className={cn(
                                  "px-6 py-3 rounded-xl border text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2",
                                  formData.gender === opt.id 
                                    ? "bg-brand-blue border-brand-blue text-brand-dark" 
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                              >
                                <span>{opt.icon}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <label className="text-[10px] uppercase tracking-widest font-bold text-white/30 ml-4">Looking For</label>
                          <div className="flex flex-wrap gap-2">
                            {[
                              { id: 'male', label: 'Men', icon: '🕺' },
                              { id: 'female', label: 'Women', icon: '💃' },
                              { id: 'everyone', label: 'Everyone', icon: '🌈' }
                            ].map((opt) => (
                              <button
                                key={opt.id}
                                onClick={() => setFormData({...formData, looking_for: opt.id})}
                                className={cn(
                                  "px-6 py-3 rounded-xl border text-[10px] uppercase tracking-widest font-bold transition-all flex items-center gap-2",
                                  formData.looking_for === opt.id 
                                    ? "bg-brand-blue border-brand-blue text-brand-dark" 
                                    : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                                )}
                              >
                                <span>{opt.icon}</span>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 rounded-[32px] bg-brand-blue/5 border border-brand-blue/10 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Share2 className="w-6 h-6 text-brand-blue" />
                        <div>
                          <h4 className="font-bold uppercase tracking-widest text-xs">Profile Sharing</h4>
                          <p className="text-[10px] text-white/40 uppercase tracking-widest">Share your public link</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setShowQR(!showQR)}
                          className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={shareProfile}
                          className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all"
                        >
                          <Share2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 p-2 bg-black/40 rounded-2xl border border-white/5">
                      <div className="flex-1 px-4 text-xs text-white/40 truncate">
                        {window.location.origin}/u/{formData.username}
                      </div>
                      <button 
                        onClick={copyProfileLink}
                        className="p-3 bg-brand-blue text-brand-dark rounded-xl font-bold transition-all hover:scale-105 active:scale-95"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>

                    {showQR && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-4 pt-4"
                      >
                        <div className="p-4 bg-white rounded-3xl">
                          <QRCodeSVG value={`${window.location.origin}/u/${formData.username}`} size={160} />
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Scan to view profile</p>
                      </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={() => handleUpdateProfile({
                      display_name: formData.display_name,
                      username: formData.username,
                      bio: formData.bio,
                      gender: formData.gender,
                      looking_for: formData.looking_for
                    })}
                    disabled={loading}
                    className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-xl font-display italic tracking-tight">Messaging Privacy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['everyone', 'subscribers', 'nobody'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleUpdateProfile({ messaging_privacy: option })}
                          className={cn(
                            "p-6 rounded-3xl border transition-all text-center space-y-2",
                            formData.messaging_privacy === option 
                              ? "bg-brand-blue border-brand-blue text-brand-dark" 
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <MessageSquare className={cn("w-6 h-6 mx-auto", formData.messaging_privacy === option ? "text-brand-dark" : "text-brand-blue")} />
                          <p className="uppercase tracking-widest text-[10px] font-bold">{option}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display italic tracking-tight">Visibility & Status</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-4">
                          <Globe className="w-6 h-6 text-brand-blue" />
                          <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs">Public Profile</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Allow everyone to see your profile</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateProfile({ is_public: !formData.is_public })}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            formData.is_public ? "bg-brand-blue" : "bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 rounded-full bg-white transition-all",
                            formData.is_public ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-4">
                          <EyeOff className="w-6 h-6 text-brand-blue" />
                          <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs">Hide Online Status</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Don't show when you're active</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleUpdateProfile({ hide_online_status: !formData.hide_online_status })}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            formData.hide_online_status ? "bg-brand-blue" : "bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 rounded-full bg-white transition-all",
                            formData.hide_online_status ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display italic tracking-tight">Location Privacy</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['exact', 'approximate', 'hidden'].map((option) => (
                        <button
                          key={option}
                          onClick={() => handleUpdateProfile({ location_privacy: option })}
                          className={cn(
                            "p-6 rounded-3xl border transition-all text-center space-y-2",
                            formData.location_privacy === option 
                              ? "bg-brand-blue border-brand-blue text-brand-dark" 
                              : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                          )}
                        >
                          <MapPin className={cn("w-6 h-6 mx-auto", formData.location_privacy === option ? "text-brand-dark" : "text-brand-blue")} />
                          <p className="uppercase tracking-widest text-[10px] font-bold">{option}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div className="space-y-8">
                  <div className="space-y-4">
                    {[
                      { key: 'chat', label: 'Chat Messages', icon: MessageSquare },
                      { key: 'tips', label: 'Tips Received', icon: CreditCard },
                      { key: 'subscriptions', label: 'Subscription Alerts', icon: Shield },
                      { key: 'promotions', label: 'Promotions', icon: Bell },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                        <div className="flex items-center gap-4">
                          <item.icon className="w-6 h-6 text-brand-blue" />
                          <div>
                            <h4 className="font-bold uppercase tracking-widest text-xs">{item.label}</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Receive alerts for {item.label.toLowerCase()}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => {
                            const newSettings = { ...formData.notification_settings, [item.key]: !formData.notification_settings[item.key] };
                            handleUpdateProfile({ notification_settings: newSettings });
                          }}
                          className={cn(
                            "w-14 h-8 rounded-full transition-all relative",
                            formData.notification_settings[item.key] ? "bg-brand-blue" : "bg-white/10"
                          )}
                        >
                          <div className={cn(
                            "absolute top-1 w-6 h-6 rounded-full bg-white transition-all",
                            formData.notification_settings[item.key] ? "right-1" : "left-1"
                          )} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'subscription' && (
                <div className="space-y-8">
                  <div className="p-10 rounded-[48px] bg-brand-blue/5 border border-brand-blue/10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-blue/10 blur-[100px] -mr-32 -mt-32" />
                    <div className="relative z-10 space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/30">Current Plan</p>
                          <h3 className="text-4xl font-display italic tracking-tighter text-brand-blue">
                            {profile?.is_subscribed ? 'PREMIUM ACCESS' : 'FREE PLAN'}
                          </h3>
                        </div>
                        <div className="p-4 bg-brand-blue/10 rounded-3xl border border-brand-blue/20">
                          <Shield className="w-10 h-10 text-brand-blue" />
                        </div>
                      </div>

                      {profile?.is_subscribed && (
                        <div className="flex items-center gap-8">
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-white/30">Expiry Date</p>
                            <p className="text-lg font-bold">{new Date(profile.subscription_expiry).toLocaleDateString()}</p>
                          </div>
                          <div>
                            <p className="text-[10px] uppercase tracking-widest font-bold text-white/30">Auto-Renew</p>
                            <p className="text-lg font-bold">{formData.auto_renew ? 'ON' : 'OFF'}</p>
                          </div>
                        </div>
                      )}

                      <div className="pt-4 flex flex-col md:flex-row gap-4">
                        <button className="flex-1 py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-brand-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                          {profile?.is_subscribed ? 'Renew Now' : 'Upgrade to Premium'}
                        </button>
                        {profile?.is_subscribed && (
                          <button 
                            onClick={() => handleUpdateProfile({ auto_renew: !formData.auto_renew })}
                            className="flex-1 py-5 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-white/10 transition-all"
                          >
                            {formData.auto_renew ? 'Disable Auto-Renew' : 'Enable Auto-Renew'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-10">
                  <div className="space-y-6">
                    <h3 className="text-xl font-display italic tracking-tight">Login Activity</h3>
                    <div className="space-y-4">
                      {loginActivity.length > 0 ? loginActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-4">
                            <Smartphone className="w-6 h-6 text-brand-blue" />
                            <div>
                              <h4 className="font-bold uppercase tracking-widest text-xs">{activity.device}</h4>
                              <p className="text-[10px] text-white/40 uppercase tracking-widest">{activity.location} • {new Date(activity.created_at).toLocaleString()}</p>
                            </div>
                          </div>
                          <div className="px-3 py-1 bg-brand-blue/10 rounded-full">
                            <span className="text-[8px] font-bold text-brand-blue uppercase tracking-widest">Active</span>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-10 text-white/20 uppercase tracking-widest text-xs">No recent activity</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-xl font-display italic tracking-tight">Account Security</h3>
                    <div className="space-y-4">
                      <button className="w-full flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                        <div className="flex items-center gap-4">
                          <Lock className="w-6 h-6 text-brand-blue" />
                          <div className="text-left">
                            <h4 className="font-bold uppercase tracking-widest text-xs">Change Password</h4>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Update your account password</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-brand-blue transition-all" />
                      </button>

                      <button className="w-full flex items-center justify-between p-6 rounded-3xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 transition-all group">
                        <div className="flex items-center gap-4">
                          <LogOut className="w-6 h-6 text-red-500" />
                          <div className="text-left">
                            <h4 className="font-bold uppercase tracking-widest text-xs text-red-500">Logout All Devices</h4>
                            <p className="text-[10px] text-red-500/40 uppercase tracking-widest">Secure your account from other sessions</p>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-red-500/20 group-hover:text-red-500 transition-all" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
