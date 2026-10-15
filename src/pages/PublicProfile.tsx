import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, getDocs } from '../lib/firebase';
import { motion } from 'motion/react';
import { 
  MapPin, 
  Shield, 
  Zap, 
  MessageSquare, 
  Share2, 
  ArrowLeft,
  CheckCircle,
  Lock,
  Flame,
  Crown,
  Gem,
  HeartHandshake,
  Users,
  Check
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getVibeStyle } from '../components/DiscoveryFeed';
import { useToast } from '../components/Toaster';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function PublicProfilePage() {
  const { username } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [username]);

  const fetchProfile = async () => {
    const targetKey = (username || '').replace(/^@/, '').trim();
    if (!targetKey) {
      setLoading(false);
      return;
    }

    try {
      // 1. Check direct doc ID in Firestore
      const docSnap = await getDoc(doc(db, 'profiles', targetKey));
      if (docSnap.exists()) {
        setProfile({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
        return;
      }

      // 2. Query by lowercase username
      const qLower = query(collection(db, 'profiles'), where('username', '==', targetKey.toLowerCase()));
      const snapLower = await getDocs(qLower);
      if (!snapLower.empty) {
        setProfile({ id: snapLower.docs[0].id, ...snapLower.docs[0].data() });
        setLoading(false);
        return;
      }

      // 3. Query by exact username
      const qExact = query(collection(db, 'profiles'), where('username', '==', targetKey));
      const snapExact = await getDocs(qExact);
      if (!snapExact.empty) {
        setProfile({ id: snapExact.docs[0].id, ...snapExact.docs[0].data() });
        setLoading(false);
        return;
      }

      // 4. Query by display_name
      const qName = query(collection(db, 'profiles'), where('display_name', '==', targetKey));
      const snapName = await getDocs(qName);
      if (!snapName.empty) {
        setProfile({ id: snapName.docs[0].id, ...snapName.docs[0].data() });
        setLoading(false);
        return;
      }

      // 5. Check users collection in Firestore
      const userDoc = await getDoc(doc(db, 'users', targetKey));
      if (userDoc.exists()) {
        setProfile({ id: userDoc.id, ...userDoc.data() });
        setLoading(false);
        return;
      }

      setProfile(null);
    } catch (error: any) {
      console.error('Error fetching public profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.display_name || profile?.username} on PrivyConnect`,
          text: `Connect with ${profile?.display_name || profile?.username} on PrivyConnect!`,
          url: url,
        });
      } catch {
        navigator.clipboard.writeText(url);
        setCopiedLink(true);
        toast('Profile link copied!', 'success');
        setTimeout(() => setCopiedLink(false), 2500);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast('Profile link copied!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040506] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-[#00d1ff]/20 border-t-[#00d1ff] rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#040506] flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-white/20" />
        </div>
        <h1 className="text-3xl font-serif tracking-tight mb-4">Profile Unavailable</h1>
        <p className="text-white/40 max-w-sm mb-8 font-mono text-xs">
          Unable to locate this profile. Explore all verified members on PrivyConnect.
        </p>
        <Link to="/discovery" className="px-8 py-4 bg-[#00d1ff] text-[#00131a] font-bold uppercase tracking-widest text-xs rounded-2xl hover:scale-105 transition-all">
          Explore Discovery
        </Link>
      </div>
    );
  }

  const profileVibe = profile.vibe || profile.preferences?.vibe || 'HOOKUP';
  const vibeStyle = getVibeStyle(profileVibe);
  const cityLocation = profile.location?.city || profile.state || 'Lagos, Nigeria';

  return (
    <div className="min-h-screen bg-[#040506] text-[#f3f6f8] selection:bg-[#00d1ff]/20 selection:text-[#00d1ff]">
      {/* Top Header bar with Logo & Navigation */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-[#040506]/80 backdrop-blur-xl border-b border-white/[0.08] z-50 px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#00d1ff] font-serif font-bold text-lg">
              P
            </div>
            <span className="font-serif tracking-wide text-white text-base">Privy<span className="text-[#00d1ff]">Connect</span></span>
          </Link>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleShare}
            className="px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-xs font-mono uppercase tracking-wider text-white/80 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-[#35e0a1]" /> : <Share2 className="w-3.5 h-3.5 text-white/60" />}
            <span>{copiedLink ? 'Copied' : 'Share'}</span>
          </button>
          <Link
            to="/login"
            className="px-4 py-2 rounded-xl bg-[#00d1ff] text-[#00131a] text-xs font-bold uppercase tracking-wider hover:bg-[#00d1ff]/90 transition-all font-sans"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-24 pb-20">
        {/* Profile Card */}
        <div className="relative rounded-[32px] overflow-hidden bg-[#090b0d] border border-white/[0.08] shadow-2xl">
          {/* Cover Photo */}
          <div className="relative aspect-[4/3] sm:aspect-[16/9] w-full overflow-hidden bg-[#0e1115]">
            {profile.photo_url ? (
              <img 
                src={profile.photo_url} 
                alt={profile.display_name || profile.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1015] via-[#090b0d] to-[#040506]">
                <div className="w-24 h-24 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center shadow-inner">
                  <span className="font-serif text-4xl font-bold text-[#00d1ff]">
                    {(profile.display_name || profile.username || 'P').charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="mt-3 font-mono text-[10px] uppercase tracking-[0.2em] text-[#59636d]">Privy Member</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b0d] via-[#090b0d]/50 to-transparent pointer-events-none" />

            {/* Online badge */}
            <div className="absolute top-5 left-5 flex items-center gap-2 px-3 py-1.5 bg-black/60 backdrop-blur-md border border-white/15 rounded-full shadow-lg">
              <div className="w-2 h-2 rounded-full bg-[#35e0a1] animate-pulse" />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#f3f6f8] font-semibold">
                Online now
              </span>
            </div>

            {/* Bottom info on photo */}
            <div className="absolute bottom-6 left-6 right-6 space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="font-serif text-3xl sm:text-5xl text-[#f3f6f8] tracking-tight">
                  {profile.display_name || profile.username}
                </h1>
                {(profile.is_subscribed || profile.subscription_status === 'active') && (
                  <div className="w-6 h-6 rounded-full bg-[#00d1ff] text-[#00131a] flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(0,209,255,0.4)] shrink-0" title="Subscribed VIP Member">
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>

              {/* Tags row */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
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

                {profile.gender && (
                  <span className="px-3 py-1.5 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase border border-white/20 bg-black/40 text-white/90 backdrop-blur-md">
                    {profile.gender}
                  </span>
                )}

                <span className="px-3 py-1.5 rounded-full text-[10px] font-mono tracking-wider uppercase border border-white/10 bg-black/40 text-[#8d97a1] backdrop-blur-md">
                  @{profile.username}
                </span>
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-6 sm:p-8 space-y-6">
            {/* Location & Quick Meta */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-3 border-y border-white/[0.06] text-xs font-mono uppercase tracking-wider text-[#8d97a1]">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00d1ff]" />
                <span>{cityLocation}</span>
              </div>
              <div className="flex items-center gap-2 text-[#35e0a1]">
                <Shield className="w-4 h-4" />
                <span>100% DISCREET & VERIFIED</span>
              </div>
            </div>

            {/* About / Bio */}
            <div className="space-y-3">
              <h3 className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#59636d] font-semibold">
                About & Arrangement Preferences
              </h3>
              <p className="text-base text-white/80 font-light leading-relaxed">
                {profile.bio || "Member of PrivyConnect verified network. Seeking mutual arrangement with high discretion."}
              </p>
            </div>

            {/* CTAs */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <Link 
                to={`/login?redirect=/chat/${profile.id}`}
                className="py-4 px-6 bg-[#00d1ff] text-[#00131a] font-bold uppercase tracking-wider text-xs rounded-2xl shadow-[0_0_24px_rgba(0,209,255,0.25)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 font-sans"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with {profile.display_name || profile.username}</span>
              </Link>
              
              <button 
                onClick={handleShare}
                className="py-4 px-6 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-mono uppercase tracking-wider text-xs rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-white/60" />
                <span>{copiedLink ? 'Link Copied to Clipboard' : 'Share Profile Link'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
