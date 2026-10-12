import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Check, X, Smartphone, Zap, Star, ShieldCheck, Mail, Send, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PrivyHeader } from '../components/PrivyHeader';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MemberProfileModal } from '../components/MemberProfileModal';
import { SubscriptionModal } from '../components/SubscriptionModal';
import { useToast } from '../components/Toaster';
import { getVibeStyle } from './Discovery';

interface ActiveProfile {
  id: string;
  name: string;
  verified: boolean;
  online: boolean;
  area: string;
  state: string;
  vibe: 'FWB' | 'BESTIE' | 'SUGAR MUMMY' | 'SUGAR DADDY' | 'HOOKUP';
  photo_url: string;
}

const INITIAL_PROFILES_POOL: ActiveProfile[] = [
  { id: 'm1', name: 'Hauwa', verified: true, online: true, area: 'VICTORIA ISLAND', state: 'LAGOS', vibe: 'BESTIE', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
  { id: 'm2', name: 'Amara', verified: true, online: true, area: 'LEKKI', state: 'LAGOS', vibe: 'HOOKUP', photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80' },
  { id: 'm3', name: 'Tobi', verified: true, online: true, area: 'VICTORIA ISLAND', state: 'LAGOS', vibe: 'SUGAR DADDY', photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
  { id: 'm4', name: 'Chioma', verified: true, online: true, area: 'IKOYI', state: 'LAGOS', vibe: 'BESTIE', photo_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80' },
  { id: 'm5', name: 'David', verified: true, online: true, area: 'IKEJA', state: 'LAGOS', vibe: 'FWB', photo_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80' },
  { id: 'm6', name: 'Funke', verified: true, online: true, area: 'SURULERE', state: 'LAGOS', vibe: 'SUGAR MUMMY', photo_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=600&q=80' },
  { id: 'm7', name: 'Boma', verified: true, online: true, area: 'YABA', state: 'LAGOS', vibe: 'BESTIE', photo_url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=600&q=80' },
  { id: 'm8', name: 'Kenneth', verified: true, online: true, area: 'LEKKI PHASE 1', state: 'LAGOS', vibe: 'HOOKUP', photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80' },
  { id: 'p12', name: 'Fatima', verified: true, online: true, area: 'MAITAMA', state: 'ABUJA', vibe: 'SUGAR MUMMY', photo_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=600&q=80' },
  { id: 'p18', name: 'Stephanie', verified: true, online: true, area: 'ASABA', state: 'DELTA', vibe: 'FWB', photo_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80' },
  { id: 'p4', name: 'Dayo', verified: true, online: true, area: 'MAKURDI', state: 'BENUE', vibe: 'FWB', photo_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=600&q=80' },
  { id: 'p1', name: 'Obinna', verified: true, online: true, area: 'ADO-EKITI', state: 'EKITI', vibe: 'FWB', photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80' },
  { id: 'p17', name: 'Emeka', verified: true, online: true, area: 'INDEPENDENCE', state: 'ENUGU', vibe: 'HOOKUP', photo_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80' },
  { id: 'p9', name: 'Zara', verified: true, online: true, area: 'MINNA', state: 'NIGER', vibe: 'BESTIE', photo_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&w=600&q=80' }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifyEmail, setNotifyEmail] = useState('');
  const [notified, setNotified] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [messageSent, setMessageSent] = useState(false);

  // Profile modal and subscription modal state
  const [selectedLandingMember, setSelectedLandingMember] = useState<any | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem('privy_favorites');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const handleToggleFavorite = (memberId: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
        toast('Removed from favorites', 'info');
      } else {
        next.add(memberId);
        toast('Added to favorites!', 'success');
      }
      try {
        localStorage.setItem('privy_favorites', JSON.stringify([...next]));
      } catch (e) {
        console.warn('Could not save favorites to localStorage', e);
      }
      return next;
    });
  };

  // Active profiles pool & online count
  const [activeProfiles, setActiveProfiles] = useState<ActiveProfile[]>(() => {
    return INITIAL_PROFILES_POOL.slice(0, 4);
  });
  const [onlineCount, setOnlineCount] = useState(98);
  const [pool, setPool] = useState<ActiveProfile[]>(INITIAL_PROFILES_POOL);

  // Load real members from Supabase / Firestore if available to enrich pool
  useEffect(() => {
    const fetchRealProfiles = async () => {
      if (!isSupabaseActive) return;
      try {
        const { data } = await supabase
          .from('profiles')
          .select('id, username, display_name, is_verified, is_online, area, state, vibe, photo_url, avatar_url')
          .limit(30);
        if (data && data.length > 0) {
          const mapped: ActiveProfile[] = data.map((p, i) => {
            const rawVibe = (p.vibe as any) || (i % 2 === 0 ? 'FWB' : 'BESTIE');
            return {
              id: p.id,
              name: p.username || p.display_name || 'Member',
              verified: Boolean(p.is_verified),
              online: p.is_online !== false,
              area: (p.area || 'CENTRAL').toUpperCase(),
              state: (p.state || 'LAGOS').toUpperCase(),
              vibe: rawVibe,
              photo_url: p.photo_url || p.avatar_url || INITIAL_PROFILES_POOL[i % INITIAL_PROFILES_POOL.length].photo_url
            };
          });
          setPool(prev => {
            const existing = new Set(prev.map(item => item.id));
            const newOnes = mapped.filter(item => !existing.has(item.id));
            return [...prev, ...newOnes];
          });
        }
      } catch (e) {
        console.warn('Real profiles fetch skipped:', e);
      }
    };
    fetchRealProfiles();
  }, []);

  // Update a card every few seconds (just like seen on user screenshots)
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random slot 0..3 to replace
      const slotToReplace = Math.floor(Math.random() * 4);

      setActiveProfiles(prev => {
        // Choose a candidate from the pool not currently displayed in the 4 slots
        const currentIds = new Set(prev.map(p => p.id));
        const availableCandidates = pool.filter(p => !currentIds.has(p.id));

        if (availableCandidates.length === 0) return prev;

        const nextCandidate = availableCandidates[Math.floor(Math.random() * availableCandidates.length)];

        const updated = [...prev];
        updated[slotToReplace] = nextCandidate;
        return updated;
      });

      // Fluctuate online count slightly between 95 and 115 for live feel
      setOnlineCount(prev => {
        const delta = Math.floor(Math.random() * 5) - 2;
        const next = prev + delta;
        return Math.max(95, Math.min(125, next));
      });
    }, 2800);

    return () => clearInterval(interval);
  }, [pool]);

  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifyEmail) return;
    setNotified(true);
    setTimeout(() => setNotified(false), 4000);
    setNotifyEmail('');
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMessage) return;
    setMessageSent(true);
    setTimeout(() => setMessageSent(false), 5000);
    setContactName('');
    setContactEmail('');
    setContactMessage('');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-[#00D1FF]/30 font-sans">
      {/* Header */}
      <PrivyHeader />

      {/* Main Container */}
      <main className="max-w-md mx-auto px-5 pt-8 pb-20 space-y-16 sm:max-w-xl md:max-w-2xl">
        
        {/* HERO SECTION (Screenshot 1) */}
        <section id="hero" className="pt-2">
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-black/60 border border-white/10 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
            <span className="text-[10px] font-mono tracking-widest uppercase text-white/80">
              FUN STARTS HERE
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-[44px] sm:text-5xl md:text-6xl font-serif text-white leading-[1.08] tracking-tight mb-5">
            Find your <span className="italic text-[#00D1FF] font-normal">match.</span>
            <br />
            Keep it fun.
          </h1>

          {/* Subtitle */}
          <p className="text-white/70 text-[15px] sm:text-base leading-relaxed mb-8 font-sans font-light">
            Meet people near you or across Nigeria. Pick your vibe, browse your state and start a chat. Private when you want it, playful when you do not.
          </p>

          {/* CTAs */}
          <div className="space-y-3">
            <button
              onClick={() => navigate('/discovery')}
              className="w-full bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold text-base rounded-2xl py-3.5 px-6 flex items-center justify-center gap-2 transition-all shadow-[0_0_25px_rgba(0,209,255,0.25)] active:scale-[0.99]"
            >
              Get started <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                const el = document.getElementById('how-it-works');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full bg-[#0d1117] hover:bg-white/5 border border-white/15 text-white font-medium text-base rounded-2xl py-3.5 px-6 flex items-center justify-center transition-all"
            >
              See how it works
            </button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center gap-4 mt-8 pt-2">
            {/* Overlapping Avatar Silhouettes */}
            <div className="flex -space-x-2.5 overflow-hidden">
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#050505] bg-gradient-to-tr from-slate-700 to-slate-500 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-slate-400/40"></div>
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#050505] bg-gradient-to-tr from-purple-800 to-purple-600 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-purple-300/40"></div>
              </div>
              <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#050505] bg-gradient-to-tr from-emerald-800 to-teal-600 flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-teal-300/40"></div>
              </div>
            </div>

            <div>
              {/* Cyan Stars */}
              <div className="flex items-center gap-1 text-[#00D1FF] text-xs">
                <span>★</span><span>★</span><span>★</span><span>★</span><span>★</span>
              </div>
              <p className="text-[10px] font-mono tracking-widest uppercase text-white/50 font-semibold mt-0.5">
                10K+ VERIFIED MEMBERS
              </p>
            </div>
          </div>
        </section>

        {/* ACTIVE NOW / ONLINE MEMBERS SECTION (Screenshots 2 & 3) */}
        <section id="online-members" className="pt-2">
          <div className="rounded-3xl bg-[#080d12]/90 border border-[#00D1FF]/25 p-5 shadow-[0_0_35px_rgba(0,209,255,0.06)] relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#00D1FF]/5 blur-3xl pointer-events-none"></div>

            <div className="flex items-center gap-2 mb-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0b151b] border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]"></span>
                <span className="text-[10px] font-mono tracking-wider uppercase text-emerald-300">
                  ACTIVE NOW
                </span>
              </div>
            </div>

            <p className="text-[11px] font-mono tracking-widest uppercase text-[#00D1FF] font-semibold mb-4 mt-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"></span>
              {onlineCount} MEMBERS ONLINE IN YOUR LOCATION OR AROUND YOU
            </p>

            {/* 2-Column Member Cards Grid that updates every few seconds - exact match to Discovery cards */}
            <div className="grid grid-cols-2 gap-3.5 sm:gap-4 pt-1">
              {activeProfiles.map((member, slotIdx) => {
                const vibeStyle = getVibeStyle(member.vibe);

                return (
                  <div
                    key={slotIdx}
                    className="relative aspect-[3/4] cursor-pointer"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={member.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.45 }}
                        onClick={() => setSelectedLandingMember(member)}
                        className="group absolute inset-0 rounded-[24px] bg-[#090b0d] border border-[rgba(255,255,255,0.075)] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between p-3.5 sm:p-4 select-none"
                      >
                        {/* Background Photo - UNBLURRED Full Cover Photo */}
                        <div className="absolute inset-0 z-0 overflow-hidden bg-[#0f1215]">
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt={member.name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-95 contrast-[1.02]"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-[#171b1f] to-[#090b0d]" />
                          )}
                          {/* Gradient vignette so text at bottom remains crisp */}
                          <div className="absolute inset-0 bg-gradient-to-t from-[#040506] via-[#040506]/40 to-black/30" />
                        </div>

                        {/* TOP ROW: 'Online' tag with green dot + Favorite Heart button */}
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[rgba(255,255,255,0.1)] text-[10px] font-mono tracking-wider uppercase text-[#f3f6f8]">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#35e0a1] shadow-[0_0_6px_#35e0a1]" />
                            <span>ONLINE</span>
                          </div>

                          {/* Favorite Heart Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleFavorite(member.id);
                            }}
                            className={`w-8 h-8 rounded-full backdrop-blur-md border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
                              favorites.has(member.id)
                                ? 'bg-rose-500/25 border-rose-500/50 text-rose-400'
                                : 'bg-black/60 border-white/15 text-white/70 hover:text-white hover:border-white/30'
                            }`}
                            aria-label="Toggle Favorite"
                            title={favorites.has(member.id) ? "Remove from favorites" : "Add to favorites"}
                          >
                            <Heart className={`w-4 h-4 ${favorites.has(member.id) ? 'fill-rose-400 text-rose-400' : ''}`} />
                          </button>
                        </div>

                        {/* BOTTOM ROW: Coloured companionship tag, serif first name with cyan verified shield, mono area · state */}
                        <div className="relative z-10 space-y-1">
                          {/* Coloured companionship tag */}
                          <div className="inline-block">
                            <span
                              style={{
                                backgroundColor: vibeStyle.bg,
                                borderColor: vibeStyle.border,
                                color: vibeStyle.color,
                              }}
                              className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold border tracking-wider"
                            >
                              {member.vibe}
                            </span>
                          </div>

                          {/* Name in Serif with Cyan Shield */}
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-serif text-xl sm:text-2xl text-[#f3f6f8] font-normal leading-tight truncate">
                              {member.name}
                            </h3>
                            {member.verified && (
                              <ShieldCheck className="w-4 h-4 text-[#00d1ff] shrink-0 fill-[#00d1ff]/20" />
                            )}
                          </div>

                          {/* Mono Area · State */}
                          <p className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#8d97a1] truncate">
                            {member.area} · {member.state}
                          </p>
                        </div>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <p className="text-[10px] font-mono tracking-widest text-white/40 uppercase text-center mt-5">
              NEW FACES EVERY FEW SECONDS. OPEN THE APP TO SAY HELLO.
            </p>
          </div>
        </section>

        {/* 3-COLUMN METRIC BOX (Screenshot 3) */}
        <section className="py-2">
          <div className="grid grid-cols-3 border-y border-white/10 py-6 text-center divide-x divide-white/10">
            {/* Col 1 */}
            <div className="px-2">
              <div className="text-3xl sm:text-4xl font-serif text-white font-normal">
                10K+
              </div>
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mt-1.5 leading-tight">
                VERIFIED<br />MEMBERS
              </div>
            </div>

            {/* Col 2 */}
            <div className="px-2">
              <div className="text-3xl sm:text-4xl font-serif italic text-white font-normal">
                Free
              </div>
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mt-1.5 leading-tight">
                TO JOIN<br />TODAY
              </div>
            </div>

            {/* Col 3 */}
            <div className="px-2">
              <div className="text-3xl sm:text-4xl font-serif text-white font-normal">
                37
              </div>
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mt-1.5 leading-tight">
                LOCATIONS<br />NATIONWIDE
              </div>
            </div>
          </div>
        </section>

        {/* PICK YOUR VIBE / HOW IT WORKS SECTION (Screenshots 3, 4, 5) */}
        <section id="vibes" className="pt-2">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-3">
            HOW IT WORKS
          </div>

          <h2 className="text-[38px] sm:text-4xl md:text-5xl font-serif text-white leading-tight mb-4">
            Pick your vibe.
            <br />
            <span className="italic text-[#00D1FF] font-normal">Find your people.</span>
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-8 font-light">
            No long forms and no awkward small talk. Choose what you are here for and see who is around.
          </p>

          {/* 5 Vibe Cards */}
          <div className="space-y-3.5">
            {/* 2-column on md or 2x2 grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Vibe 1: Bestie */}
              <div className="bg-[#081714] border border-emerald-500/30 rounded-3xl p-5 hover:border-emerald-500/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <h3 className="font-serif text-2xl text-emerald-300 font-normal">
                    Bestie
                  </h3>
                </div>
                <p className="text-emerald-100/70 text-xs sm:text-sm leading-relaxed">
                  Someone to laugh with, travel with and send memes to.
                </p>
              </div>

              {/* Vibe 2: Hookup */}
              <div className="bg-[#190c10] border border-rose-500/30 rounded-3xl p-5 hover:border-rose-500/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <h3 className="font-serif text-2xl text-rose-300 font-normal">
                    Hookup
                  </h3>
                </div>
                <p className="text-rose-100/70 text-xs sm:text-sm leading-relaxed">
                  Spontaneous, no pressure and totally up to you.
                </p>
              </div>

              {/* Vibe 3: Friends with benefits */}
              <div className="bg-[#120c1d] border border-purple-500/30 rounded-3xl p-5 hover:border-purple-500/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                  <h3 className="font-serif text-2xl text-purple-300 font-normal">
                    Friends with benefits
                  </h3>
                </div>
                <p className="text-purple-100/70 text-xs sm:text-sm leading-relaxed">
                  Friendship first. The rest is between the two of you.
                </p>
              </div>

              {/* Vibe 4: Sugar Daddy */}
              <div className="bg-[#1b1406] border border-amber-500/30 rounded-3xl p-5 hover:border-amber-500/60 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <h3 className="font-serif text-2xl text-amber-300 font-normal">
                    Sugar Daddy
                  </h3>
                </div>
                <p className="text-amber-100/70 text-xs sm:text-sm leading-relaxed">
                  Treats, trips and great company.
                </p>
              </div>
            </div>

            {/* Vibe 5: Sugar Mummy (Full Width) */}
            <div className="bg-[#1a0814] border border-pink-500/30 rounded-3xl p-5 hover:border-pink-500/60 transition-colors">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-pink-400"></span>
                <h3 className="font-serif text-2xl text-pink-300 font-normal">
                  Sugar Mummy
                </h3>
              </div>
              <p className="text-pink-100/70 text-xs sm:text-sm leading-relaxed">
                Spoil and be spoiled, on your own terms.
              </p>
            </div>
          </div>
        </section>

        {/* 3 STEPS (Screenshot 6) */}
        <section id="how-it-works" className="pt-4 border-t border-white/10">
          <div className="space-y-6">
            {/* Step 1 */}
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-1">
                STEP 1
              </div>
              <h3 className="font-serif text-2xl text-white mb-2 font-normal">
                Pick your vibe
              </h3>
              <p className="text-white/60 text-sm leading-relaxed font-light">
                Tell us who you want to meet, from a new bestie to something more.
              </p>
            </div>

            <div className="border-t border-white/10"></div>

            {/* Step 2 */}
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-1">
                STEP 2
              </div>
              <h3 className="font-serif text-2xl text-white mb-2 font-normal">
                Choose your state
              </h3>
              <p className="text-white/60 text-sm leading-relaxed font-light">
                Start in Lagos for free, or unlock all 36 states plus Abuja.
              </p>
            </div>

            <div className="border-t border-white/10"></div>

            {/* Step 3 */}
            <div>
              <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-1">
                STEP 3
              </div>
              <h3 className="font-serif text-2xl text-white mb-2 font-normal">
                Say hi
              </h3>
              <p className="text-white/60 text-sm leading-relaxed font-light">
                Read your messages for free. Premium lets you reply and chat all day.
              </p>
            </div>
          </div>
        </section>

        {/* PRICING SECTION (Screenshots 7, 8, 9) */}
        <section id="pricing" className="pt-4">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-3">
            PRICING
          </div>

          <h2 className="text-[38px] sm:text-4xl md:text-5xl font-serif text-white leading-tight mb-4">
            Pick your <span className="italic text-[#00D1FF] font-normal">plan.</span>
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-8 font-light">
            Start free in Lagos. Upgrade when you want the whole country and the chat.
          </p>

          <div className="space-y-6">
            {/* Free Plan Card (Screenshot 7 & 8) */}
            <div className="rounded-3xl bg-[#0a0d12] border border-white/10 p-6 sm:p-7 relative">
              <h3 className="font-serif text-2xl text-white font-normal mb-3">
                Free
              </h3>

              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-serif text-white font-bold">₦0</span>
                <span className="text-xs font-mono tracking-wider text-white/40 uppercase ml-2">
                  FOREVER
                </span>
              </div>

              <div className="space-y-3.5 mb-8">
                <div className="flex items-center gap-2.5 text-sm text-white/90">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Browse Lagos members</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/90">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Create your profile</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/30">
                  <X className="w-4 h-4 text-white/30" />
                  <span>All 37 locations</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/30">
                  <X className="w-4 h-4 text-white/30" />
                  <span>Open profiles and reply</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/discovery')}
                className="w-full bg-white/5 hover:bg-white/10 border border-white/15 text-white font-medium rounded-2xl py-3.5 text-sm transition-colors"
              >
                Start free
              </button>
            </div>

            {/* Premium Access Plan Card (Screenshots 8 & 9) */}
            <div className="rounded-3xl bg-[#0a111a] border border-[#00D1FF]/50 p-6 sm:p-7 relative shadow-[0_0_40px_rgba(0,209,255,0.12)]">
              {/* Most Popular Badge */}
              <div className="absolute top-6 right-6">
                <span className="px-3 py-1 rounded-full bg-[#00D1FF] text-black font-mono font-bold text-[9px] tracking-wider uppercase">
                  MOST POPULAR
                </span>
              </div>

              <h3 className="font-serif text-2xl text-white font-normal mb-3">
                Premium Access
              </h3>

              <div className="flex items-baseline mb-6">
                <span className="text-5xl font-serif text-white font-bold">₦2,000</span>
                <span className="text-xs font-mono tracking-wider text-white/50 uppercase ml-2">
                  / MONTH
                </span>
              </div>

              <div className="space-y-3.5 mb-8">
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>All 36 states plus Abuja</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Unlimited profile views</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Real-time chatting</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Verified badge</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Priority support</span>
                </div>
                <div className="flex items-center gap-2.5 text-sm text-white/95">
                  <Check className="w-4 h-4 text-[#00D1FF]" />
                  <span>Exclusive events</span>
                </div>
              </div>

              <button
                onClick={() => navigate('/settings')}
                className="w-full bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 text-sm transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)] active:scale-[0.99]"
              >
                Subscribe now
              </button>
            </div>
          </div>
        </section>

        {/* MOBILE APP SECTION (Screenshots 9, 10, 11) */}
        <section id="mobile-app" className="pt-4">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-3">
            MOBILE APP
          </div>

          <h2 className="text-[38px] sm:text-4xl md:text-5xl font-serif text-white leading-tight mb-4">
            Take it <span className="italic text-[#00D1FF] font-normal">with you.</span>
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-6 font-light">
            The full PrivyConnect experience on your phone. The store apps are in review; join the list and we will message you the day they go live.
          </p>

          {/* App Store & Google Play Badges with SOON tag */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            {/* App Store */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0e1219] border border-white/10 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00D1FF]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-white/40 tracking-wider uppercase">
                    DOWNLOAD ON
                  </div>
                  <div className="text-sm font-semibold text-white">
                    App Store
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00D1FF] text-black font-mono font-bold text-[9px] tracking-wider uppercase">
                SOON
              </span>
            </div>

            {/* Google Play */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0e1219] border border-white/10 relative">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#00D1FF]">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[9px] font-mono text-white/40 tracking-wider uppercase">
                    GET IT ON
                  </div>
                  <div className="text-sm font-semibold text-white">
                    Google Play
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-[#00D1FF] text-black font-mono font-bold text-[9px] tracking-wider uppercase">
                SOON
              </span>
            </div>
          </div>

          {/* Email Notify Form */}
          <form onSubmit={handleNotifySubmit} className="space-y-3 mb-10">
            <input
              type="email"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full bg-[#10141c] border border-white/15 focus:border-[#00D1FF] rounded-2xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
            />
            <button
              type="submit"
              className="w-full bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 text-sm transition-all"
            >
              {notified ? '✓ You are on the VIP waitlist!' : 'Notify me'}
            </button>
          </form>

          {/* Dual Mockup Phone Graphic (Screenshots 10 & 11) */}
          <div className="relative pt-6 pb-4 overflow-hidden">
            <div className="flex justify-center items-center gap-2 -mx-4">
              {/* Left Phone: Discover Screen */}
              <div className="w-[160px] sm:w-[190px] h-[310px] sm:h-[350px] bg-[#0c1017] border-2 border-white/15 rounded-[32px] p-3 shadow-2xl rotate-[-4deg] -translate-x-2 flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-serif text-white font-medium mb-3">Discover</div>
                  <div className="space-y-2">
                    <div className="bg-[#141b24] rounded-xl p-2 h-24 flex flex-col justify-end">
                      <div className="w-9 h-9 rounded-full bg-white/15 mb-auto"></div>
                      <div className="text-[10px] text-white font-serif">Amara</div>
                    </div>
                    <div className="bg-[#211422] rounded-xl p-2 h-24 flex flex-col justify-end">
                      <div className="w-9 h-9 rounded-full bg-white/15 mb-auto"></div>
                      <div className="text-[10px] text-white font-serif">Tobi</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Phone: Messages Screen */}
              <div className="w-[175px] sm:w-[210px] h-[330px] sm:h-[370px] bg-[#080b10] border-2 border-white/20 rounded-[32px] p-3.5 shadow-2xl rotate-[3deg] flex flex-col justify-between">
                <div>
                  <div className="text-[12px] font-serif text-white font-medium mb-4">Messages</div>
                  <div className="space-y-2.5">
                    {/* Message 1 */}
                    <div className="bg-[#1a1f29] text-white/90 text-[10px] rounded-2xl rounded-tl-sm px-2.5 py-1.5 max-w-[85%] self-start">
                      Dinner on Friday?
                    </div>
                    {/* Message 2 */}
                    <div className="bg-[#00D1FF] text-black font-medium text-[10px] rounded-2xl rounded-tr-sm px-2.5 py-1.5 max-w-[90%] ml-auto text-right">
                      Eight at the usual place.
                    </div>
                    {/* Message 3 */}
                    <div className="bg-[#1a1f29] text-white/90 text-[10px] rounded-2xl rounded-tl-sm px-2.5 py-1.5 max-w-[85%] self-start">
                      Perfect. I'll book it.
                    </div>
                    {/* Message 4 */}
                    <div className="bg-[#00D1FF] text-black font-medium text-[10px] rounded-2xl rounded-tr-sm px-2.5 py-1.5 max-w-[80%] ml-auto text-right">
                      See you there.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OUR VISION SECTION (Screenshot 12) */}
        <section id="vision" className="pt-4 border-t border-white/10">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-6">
            OUR VISION
          </div>

          <p className="font-serif text-[28px] sm:text-3xl md:text-4xl text-white font-light leading-relaxed mb-10">
            We built PrivyConnect because meeting people should be{' '}
            <span className="italic text-[#00D1FF] font-normal">
              fun, easy and on your terms.
            </span>{' '}
            Pick your vibe, choose who sees you, and enjoy the ride.
          </p>

          {/* 3-Column Stats Box */}
          <div className="grid grid-cols-3 border-y border-white/10 py-6 text-center divide-x divide-white/10">
            <div className="px-1">
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mb-2">
                ESTABLISHED
              </div>
              <div className="font-serif text-xl sm:text-2xl text-white">
                2026
              </div>
            </div>

            <div className="px-1">
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mb-2">
                HEADQUARTERS
              </div>
              <div className="font-serif text-xl sm:text-2xl text-white">
                Global
              </div>
            </div>

            <div className="px-1">
              <div className="text-[9px] font-mono tracking-widest uppercase text-white/40 mb-2">
                MISSION
              </div>
              <div className="font-serif text-sm sm:text-base text-white leading-tight">
                Good vibes, good people
              </div>
            </div>
          </div>
        </section>

        {/* CONTACT SECTION (Screenshots 13 & 14) */}
        <section id="contact" className="pt-4">
          <div className="text-[10px] font-mono tracking-widest uppercase text-white/40 font-semibold mb-3">
            CONTACT
          </div>

          <h2 className="text-[38px] sm:text-4xl md:text-5xl font-serif text-white leading-tight mb-4">
            Talk to a <span className="italic text-[#00D1FF] font-normal">person.</span>
          </h2>

          <p className="text-white/60 text-sm leading-relaxed mb-8 font-light">
            Premium members get priority support. Everyone gets an answer within a day.
          </p>

          <form onSubmit={handleContactSubmit} className="space-y-5">
            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-white/50 mb-2">
                NAME
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="Your name"
                required
                className="w-full bg-[#10141c] border border-white/15 focus:border-[#00D1FF] rounded-2xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-white/50 mb-2">
                EMAIL
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full bg-[#10141c] border border-white/15 focus:border-[#00D1FF] rounded-2xl py-3.5 px-4 text-white text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono tracking-widest uppercase text-white/50 mb-2">
                MESSAGE
              </label>
              <textarea
                value={contactMessage}
                onChange={(e) => setContactMessage(e.target.value)}
                placeholder="How can we help?"
                rows={4}
                required
                className="w-full bg-[#10141c] border border-white/15 focus:border-[#00D1FF] rounded-2xl py-3.5 px-4 text-white text-sm outline-none transition-colors resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              className="bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 px-8 text-sm transition-all"
            >
              {messageSent ? '✓ Message sent! We will reply soon.' : 'Send message'}
            </button>
          </form>
        </section>

        {/* FOOTER (Screenshot 14) */}
        <footer className="pt-12 border-t border-white/10 space-y-6">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0055ff] to-[#00d1ff] p-[1.5px]">
              <div className="w-full h-full rounded-full bg-[#070b12] flex items-center justify-center">
                <span className="font-serif italic text-white text-base">p</span>
              </div>
            </div>
            <div className="flex items-baseline">
              <span className="text-2xl font-serif text-white tracking-tight">Privy</span>
              <span className="text-2xl font-serif italic text-[#00D1FF] tracking-tight ml-1.5">Connect</span>
            </div>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-white/70">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#vision" className="hover:text-white transition-colors">Privacy</a>
            <a href="#contact" className="hover:text-white transition-colors">Contact</a>
          </div>

          {/* Copyright */}
          <div className="text-[10px] font-mono tracking-widest text-white/30 uppercase">
            © 2026 PRIVYCONNECT ECOSYSTEM
          </div>
        </footer>
      </main>

      {/* Member Profile Details Modal */}
      <MemberProfileModal
        member={selectedLandingMember ? {
          ...selectedLandingMember,
          location: selectedLandingMember.area || 'LEKKI',
          state: selectedLandingMember.state || 'LAGOS'
        } : null}
        isOpen={Boolean(selectedLandingMember)}
        onClose={() => setSelectedLandingMember(null)}
        isSubscribed={false}
        isFavorite={selectedLandingMember ? favorites.has(selectedLandingMember.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onOpenSubscription={() => setShowSubscriptionModal(true)}
        onStartChat={() => setShowSubscriptionModal(true)}
      />

      {/* Subscription Modal */}
      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        profile={null}
        title="Unlock VIP Subscription"
        subtitle="Reveal contact information, unmask direct WhatsApp & phone numbers, and chat freely with verified members."
      />
    </div>
  );
}
