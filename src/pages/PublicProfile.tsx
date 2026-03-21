import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Shield, 
  Zap, 
  MessageSquare, 
  Share2, 
  ArrowLeft,
  CheckCircle,
  Lock
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (username && isSupabaseActive) {
      fetchProfile();
    }
  }, [username]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile || !profile.is_public) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-display uppercase tracking-tighter italic mb-4">Profile Not Found</h1>
        <p className="text-white/40 max-w-sm mb-8 font-light">
          This profile might be private or doesn't exist.
        </p>
        <Link to="/" className="px-8 py-4 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest rounded-2xl hover:scale-105 transition-all">
          Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Hero Section */}
      <div className="relative h-[40vh] md:h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src={profile.photo_url || `https://picsum.photos/seed/${profile.id}/1200/800`}
            className="w-full h-full object-cover opacity-40 blur-sm scale-110"
            alt="Cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-transparent" />
        </div>
        
        <div className="absolute top-6 left-6 z-10">
          <button 
            onClick={() => navigate(-1)}
            className="p-4 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-black/60 transition-all"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-4xl mx-auto px-6 -mt-32 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row items-end gap-8 mb-10">
          <div className="relative group">
            <div className="w-48 h-48 rounded-[48px] overflow-hidden border-4 border-[#050505] shadow-2xl">
              <img 
                src={profile.photo_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.username}`}
                className="w-full h-full object-cover"
                alt={profile.username}
              />
            </div>
            {profile.is_online && !profile.hide_online_status && (
              <div className="absolute bottom-4 right-4 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#050505] shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
            )}
          </div>

          <div className="flex-1 space-y-4 text-center md:text-left">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
              <h1 className="text-5xl font-display uppercase tracking-tighter italic">{profile.display_name || profile.username}</h1>
              {profile.is_verified && (
                <div className="p-1 bg-brand-blue rounded-full shadow-[0_0_15px_rgba(0,209,255,0.5)]">
                  <CheckCircle className="w-5 h-5 text-brand-dark" />
                </div>
              )}
            </div>
            <p className="text-white/40 font-light text-lg tracking-widest uppercase">@{profile.username}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 bg-white/5 border border-white/10 rounded-[40px] space-y-6">
              <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-white/30">About</h3>
              <p className="text-lg font-light leading-relaxed text-white/80">
                {profile.bio || "No bio provided."}
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                  <MapPin className="w-4 h-4 text-brand-blue" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">{profile.location?.city || 'Worldwide'}</span>
                </div>
                {profile.is_subscribed && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 rounded-full border border-brand-blue/20">
                    <Zap className="w-4 h-4 text-brand-blue" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-blue">Premium Member</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Link 
              to={`/chat/${profile.id}`}
              className="w-full py-6 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              <MessageSquare className="w-5 h-5" />
              Send Message
            </Link>
            
            <button className="w-full py-6 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3">
              <Share2 className="w-5 h-5" />
              Share Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
