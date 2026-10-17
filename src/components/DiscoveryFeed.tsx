import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Lock, 
  Crown, 
  ChevronDown, 
  X, 
  Search, 
  ShieldCheck,
  Sparkles,
  Heart,
  Compass
} from 'lucide-react';
import { db, collection, getDocs, limit, query } from '../lib/firebase';
import { calculateDistanceKm, formatDistance, normalizeNigerianState } from '../lib/location';
import { SubscriptionModal } from './SubscriptionModal';
import { MemberProfileModal } from './MemberProfileModal';
import { useToast } from './Toaster';

export interface DiscoveryFeedProps {
  profile?: any;
  title?: string;
  subtitle?: string;
  className?: string;
}

export interface MemberCard {
  id: string;
  name: string;
  username?: string;
  verified: boolean;
  is_subscribed?: boolean;
  online: boolean;
  location: string;
  state: string;
  coarse_lat?: number;
  coarse_lng?: number;
  vibe: 'BESTIE' | 'FWB' | 'HOOKUP' | 'SUGAR DADDY' | 'SUGAR MUMMY';
  avatarSeed: string;
  gender: string;
  photo_url?: string;
  bio?: string;
  age?: number;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
}

// All 37 Nigerian administrative states (36 States + Abuja FCT)
export const NIGERIAN_STATES = [
  'Abia',
  'Abuja (FCT)',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara'
];

export const COMPANIONSHIP_TYPES = [
  { 
    id: 'all', 
    label: 'All Companionship', 
    color: '#8d97a1', 
    rgb: '141, 151, 161',
    dotBg: 'bg-[#8d97a1]' 
  },
  { 
    id: 'BESTIE', 
    label: 'Bestie', 
    color: '#35e0a1', 
    rgb: '53, 224, 161',
    dotBg: 'bg-[#35e0a1]' 
  },
  { 
    id: 'HOOKUP', 
    label: 'Hookup', 
    color: '#ff6b6b', 
    rgb: '255, 107, 107',
    dotBg: 'bg-[#ff6b6b]' 
  },
  { 
    id: 'FWB', 
    label: 'Friends with benefits', 
    color: '#b388ff', 
    rgb: '179, 136, 255',
    dotBg: 'bg-[#b388ff]' 
  },
  { 
    id: 'SUGAR DADDY', 
    label: 'Sugar Daddy', 
    color: '#f2b04b', 
    rgb: '242, 176, 75',
    dotBg: 'bg-[#f2b04b]' 
  },
  { 
    id: 'SUGAR MUMMY', 
    label: 'Sugar Mummy', 
    color: '#ff7ab8', 
    rgb: '255, 122, 184',
    dotBg: 'bg-[#ff7ab8]' 
  },
];

export const getVibeStyle = (vibe: string) => {
  const found = COMPANIONSHIP_TYPES.find(v => v.id === vibe);
  if (!found) return { color: '#35e0a1', border: 'rgba(53, 224, 161, 0.3)', bg: 'rgba(53, 224, 161, 0.12)' };
  return {
    color: found.color,
    border: `rgba(${found.rgb}, 0.3)`,
    bg: `rgba(${found.rgb}, 0.12)`
  };
};

export const DEFAULT_MEMBERS: MemberCard[] = [];

export function DiscoveryFeed({ 
  profile, 
  title = "Discover", 
  subtitle, 
  className = "" 
}: DiscoveryFeedProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [members, setMembers] = useState<MemberCard[]>([]);
  const [chipFilter, setChipFilter] = useState<'everyone' | 'online' | 'verified' | 'favorites'>('everyone');
  const [vibeFilter, setVibeFilter] = useState<string>('all');
  const [genderFilter, setGenderFilter] = useState<string>('all');
  const isSubscribed = Boolean(profile?.is_subscribed);

  const userCurrentState = useMemo(() => {
    return profile?.state ? normalizeNigerianState(profile.state) : 'Lagos';
  }, [profile?.state]);

  const [selectedState, setSelectedState] = useState<string>(() => {
    return isSubscribed ? 'all' : (profile?.state ? normalizeNigerianState(profile.state) : 'Lagos');
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState<number>(8);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberCard | null>(null);
  const [profileModalMember, setProfileModalMember] = useState<MemberCard | null>(null);
  const [lockedStateAttempt, setLockedStateAttempt] = useState<string | null>(null);

  // Favorites state (unsubscribed & subscribed users can favorite freely, persisted in localStorage)
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
      const isFav = next.has(memberId);
      if (isFav) {
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

  // Dropdown sheet states: 'vibe' | 'gender' | 'state' | null
  const [openDropdown, setOpenDropdown] = useState<'vibe' | 'gender' | 'state' | null>(null);

  useEffect(() => {
    if (isSubscribed) {
      setSelectedState('all');
    } else {
      setSelectedState(userCurrentState);
    }
  }, [isSubscribed, userCurrentState]);

  useEffect(() => {
    const loadFirestoreProfiles = async () => {
      try {
        const q = query(collection(db, 'profiles'), limit(100));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (data && data.length > 0) {
          const mapped: MemberCard[] = data
            .filter((p: any) => p.id !== profile?.id)
            .map((p: any) => {
              const rawState = p.state || 'Lagos';
              const isSub = Boolean(p.is_subscribed || p.subscription_status === 'active');
              return {
                id: p.id,
                name: p.display_name || p.username || 'Member',
                username: p.username || p.id,
                verified: isSub,
                is_subscribed: isSub,
                online: p.is_online !== false,
                location: (p.city || p.area || p.location || rawState).toUpperCase(),
                state: rawState,
                coarse_lat: p.coarse_lat || (typeof p.location === 'object' ? p.location?.lat : undefined),
                coarse_lng: p.coarse_lng || (typeof p.location === 'object' ? p.location?.lng : undefined),
                vibe: (p.vibe as any) || 'HOOKUP',
                avatarSeed: p.id,
                gender: p.gender || 'unspecified',
                photo_url: p.photo_url || p.avatar_url || (Array.isArray(p.photos) ? p.photos[0] : undefined),
                bio: p.bio || undefined,
                age: p.age || 25,
                phone: p.phone,
                whatsapp: p.whatsapp || p.phone,
                telegram: p.telegram
              };
            });

          setMembers(mapped);
        } else {
          setMembers([]);
        }
      } catch (err) {
        console.warn('Could not load firestore profiles for discovery:', err);
        setMembers([]);
      }
    };
    loadFirestoreProfiles();
  }, [profile?.id]);

  const handleMemberClick = (member: MemberCard) => {
    // Open as the user's page profile, not like a modal!
    const target = (member as any).username || member.name.toLowerCase().replace(/\s+/g, '_') || member.id;
    navigate(`/u/${target}`);
  };

  const handleStateClick = (stateName: string) => {
    const isCurrent = stateName.toLowerCase() === userCurrentState.toLowerCase();
    if (!isSubscribed && !isCurrent) {
      setOpenDropdown(null);
      setLockedStateAttempt(stateName);
      setShowUpgradeModal(true);
      return;
    }

    setSelectedState(stateName);
    setOpenDropdown(null);
  };

  const filteredStatesList = useMemo(() => {
    if (!stateSearch.trim()) return NIGERIAN_STATES;
    return NIGERIAN_STATES.filter(s => 
      s.toLowerCase().includes(stateSearch.trim().toLowerCase())
    );
  }, [stateSearch]);

  const filteredMembers = useMemo(() => {
    const cleanSearch = searchQuery.trim().toLowerCase().replace(/^@/, '');
    const isSearching = cleanSearch.length > 0;

    return members.filter(m => {
      // 1. Location state check
      if (!isSubscribed) {
        // Free users strictly see members in their current state
        const stateNorm = normalizeNigerianState(m.state).toLowerCase();
        const userNorm = userCurrentState.toLowerCase();
        const matchesCurrent = 
          stateNorm === userNorm || 
          m.state.toLowerCase() === userNorm ||
          m.location.toUpperCase().includes(userNorm.toUpperCase());
        if (!matchesCurrent) return false;
      } else {
        // Subscribers: If actively searching, search all of Nigeria!
        // If not searching and selectedState !== 'all', filter by selectedState
        if (!isSearching && selectedState !== 'all') {
          const stateNorm = normalizeNigerianState(m.state).toLowerCase();
          const targetNorm = selectedState.toLowerCase();
          const matchState = 
            stateNorm === targetNorm || 
            m.state.toLowerCase() === targetNorm ||
            m.location.toUpperCase().includes(targetNorm.toUpperCase());
          if (!matchState) return false;
        }
      }

      // 2. Live search filter by name or @username (works with or without @)
      if (isSearching) {
        const nameMatch = m.name.toLowerCase().includes(cleanSearch);
        const usernameMatch = m.username 
          ? m.username.toLowerCase().replace(/^@/, '').includes(cleanSearch)
          : false;
        if (!nameMatch && !usernameMatch) return false;
      }

      // 3. Chip filters
      if (chipFilter === 'online' && !m.online) return false;
      if (chipFilter === 'verified' && !m.verified) return false;
      if (chipFilter === 'favorites' && !favorites.has(m.id)) return false;

      // 4. Companionship filter
      if (vibeFilter !== 'all' && m.vibe !== vibeFilter) return false;

      // 5. Gender filter
      if (genderFilter === 'women' && m.gender !== 'female') return false;
      if (genderFilter === 'men' && m.gender !== 'male') return false;

      return true;
    });
  }, [members, isSubscribed, userCurrentState, selectedState, searchQuery, chipFilter, vibeFilter, genderFilter, favorites]);

  const currentVibeConfig = COMPANIONSHIP_TYPES.find(v => v.id === vibeFilter) || COMPANIONSHIP_TYPES[0];

  return (
    <div className={`space-y-6 pb-16 pt-2 max-w-7xl mx-auto ${className}`}>
      {/* ========================================================================= */}
      {/* 1. HEADER SECTION                                                         */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          {/* Mono Label */}
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold mb-1 flex items-center gap-2">
            {!isSubscribed ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#f2b04b]" />
                <span>FREE PLAN · {userCurrentState.toUpperCase()} DIRECTORY</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d1ff] shadow-[0_0_8px_#00d1ff]" />
                <span>PREMIUM · {selectedState === 'all' ? 'ALL NIGERIA' : selectedState.toUpperCase()}</span>
              </>
            )}
          </div>

          {/* Large Serif Title */}
          <h1 className="font-serif text-4xl sm:text-[52px] leading-none text-[#f3f6f8] font-normal tracking-tight">
            {title}
          </h1>

          {/* Subtitle */}
          <p className="text-[#8d97a1] text-xs sm:text-sm font-light mt-2 max-w-xl">
            {subtitle || (
              isSubscribed
                ? 'Browsing verified members nationwide. Connect freely with all 36 states and Abuja.'
                : `Browsing verified members in ${userCurrentState}. Upgrade to explore all of Nigeria.`
            )}
          </p>

          {/* Members Online Around Your Location Banner */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0b151b] border border-[#00d1ff]/25 shadow-[0_0_15px_rgba(0,209,255,0.06)] mt-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" />
            <span className="text-[11px] font-mono tracking-widest uppercase text-[#00d1ff] font-semibold">
              {members.filter(m => m.online).length > 0 ? `${members.filter(m => m.online).length} ` : ''}MEMBERS ONLINE IN YOUR LOCATION OR AROUND YOU
            </span>
          </div>
        </div>

        {/* Right Action: Button or Premium Badge */}
        <div className="shrink-0 pt-1">
          {!isSubscribed ? (
            <button
              onClick={() => {
                setLockedStateAttempt(null);
                setShowUpgradeModal(true);
              }}
              className="bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-semibold rounded-[14px] px-4 py-2.5 sm:py-3 flex items-center gap-2 text-xs sm:text-sm shadow-[0_0_20px_rgba(0,209,255,0.25)] hover:shadow-[0_0_28px_rgba(0,209,255,0.4)] active:scale-[0.98] transition-all cursor-pointer"
            >
              <Crown className="w-4 h-4 fill-current shrink-0" />
              <span className="hidden sm:inline">Unlock nationwide matches</span>
              <span className="sm:hidden">Unlock nationwide</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#00d1ff]/10 border border-[#00d1ff]/30 text-[#00d1ff] font-mono text-[11px] uppercase tracking-[0.16em]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Premium</span>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LIVE SEARCH BAR (Find people by name or @username)                        */}
      {/* ========================================================================= */}
      <div className="pt-1">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-[#59636d] absolute left-4 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              isSubscribed 
                ? "Search people by name or @username across all of Nigeria..." 
                : `Search people by name or @username in ${userCurrentState}...`
            }
            className="w-full bg-[#090b0d] border border-white/[0.08] hover:border-white/20 focus:border-[#00d1ff] rounded-[16px] pl-11 pr-10 py-3 text-sm text-[#f3f6f8] placeholder-[#59636d] focus:outline-none transition-all font-sans"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-full text-[#59636d] hover:text-white transition-colors cursor-pointer"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. THREE CUSTOM DROPDOWNS (No native <select>)                            */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Dropdown 1: Companionship Type */}
        <button
          type="button"
          onClick={() => setOpenDropdown('vibe')}
          style={{
            borderColor: vibeFilter !== 'all' ? `rgba(${currentVibeConfig.rgb}, 0.4)` : undefined,
            color: vibeFilter !== 'all' ? currentVibeConfig.color : undefined
          }}
          className={`w-full bg-[#090b0d] hover:bg-[#0f1215] border border-[rgba(255,255,255,0.075)] hover:border-[rgba(255,255,255,0.15)] rounded-2xl px-4 py-3 text-sm flex items-center justify-between transition-colors cursor-pointer text-left ${
            vibeFilter === 'all' ? 'text-[#f3f6f8]' : ''
          }`}
        >
          <div className="flex items-center gap-2.5 truncate">
            {vibeFilter !== 'all' && (
              <span 
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: currentVibeConfig.color }}
              />
            )}
            <span className="truncate font-medium text-xs sm:text-sm">
              {vibeFilter === 'all' ? 'Companionship: All' : currentVibeConfig.label}
            </span>
          </div>
          <ChevronDown className="w-4 h-4 text-[#8d97a1] shrink-0 ml-2" />
        </button>

        {/* Dropdown 2: Gender */}
        <button
          type="button"
          onClick={() => setOpenDropdown('gender')}
          className="w-full bg-[#090b0d] hover:bg-[#0f1215] border border-[rgba(255,255,255,0.075)] hover:border-[rgba(255,255,255,0.15)] rounded-2xl px-4 py-3 text-[#f3f6f8] text-sm flex items-center justify-between transition-colors cursor-pointer text-left"
        >
          <span className="truncate font-medium text-xs sm:text-sm">
            {genderFilter === 'all' ? 'Gender: Everyone' : genderFilter === 'women' ? 'Gender: Female' : 'Gender: Male'}
          </span>
          <ChevronDown className="w-4 h-4 text-[#8d97a1] shrink-0 ml-2" />
        </button>

        {/* Dropdown 3: State */}
        <button
          type="button"
          onClick={() => setOpenDropdown('state')}
          className={`w-full bg-[#090b0d] hover:bg-[#0f1215] border rounded-2xl px-4 py-3 text-sm flex items-center justify-between transition-colors cursor-pointer text-left ${
            !isSubscribed
              ? 'border-[rgba(242,176,75,0.35)] hover:border-[rgba(242,176,75,0.55)] text-[#f3f6f8]'
              : 'border-[rgba(255,255,255,0.075)] hover:border-[rgba(0,209,255,0.35)] text-[#f3f6f8]'
          }`}
        >
          <div className="flex items-center gap-2 truncate">
            {!isSubscribed ? (
              <Lock className="w-3.5 h-3.5 text-[#f2b04b] shrink-0" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-[#00d1ff] shrink-0" />
            )}
            <span className="truncate font-medium text-xs sm:text-sm">
              {!isSubscribed
                ? `State: ${userCurrentState} (Current Area)`
                : (selectedState === 'all' ? 'State: All Nigeria' : `State: ${selectedState}`)}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0 ml-2">
            {!isSubscribed && (
              <span className="text-[10px] font-mono uppercase bg-[#f2b04b]/15 text-[#f2b04b] border border-[#f2b04b]/30 px-2 py-0.5 rounded-full font-semibold">
                LOCKED
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-[#8d97a1]" />
          </div>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 3. FILTER CHIPS & COUNT LINE                                              */}
      {/* ========================================================================= */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          <button
            type="button"
            onClick={() => setChipFilter('everyone')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              chipFilter === 'everyone'
                ? 'bg-[#00d1ff] text-[#00131a] border-[#00d1ff] font-semibold shadow-[0_0_12px_rgba(0,209,255,0.3)]'
                : 'bg-transparent text-[#8d97a1] border-[rgba(255,255,255,0.15)] hover:text-[#f3f6f8] hover:border-[rgba(255,255,255,0.3)]'
            }`}
          >
            Everyone
          </button>

          <button
            type="button"
            onClick={() => setChipFilter('online')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              chipFilter === 'online'
                ? 'bg-[#00d1ff] text-[#00131a] border-[#00d1ff] font-semibold shadow-[0_0_12px_rgba(0,209,255,0.3)]'
                : 'bg-transparent text-[#8d97a1] border-[rgba(255,255,255,0.15)] hover:text-[#f3f6f8] hover:border-[rgba(255,255,255,0.3)]'
            }`}
          >
            Online now
          </button>

          <button
            type="button"
            onClick={() => setChipFilter('verified')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              chipFilter === 'verified'
                ? 'bg-[#00d1ff] text-[#00131a] border-[#00d1ff] font-semibold shadow-[0_0_12px_rgba(0,209,255,0.3)]'
                : 'bg-transparent text-[#8d97a1] border-[rgba(255,255,255,0.15)] hover:text-[#f3f6f8] hover:border-[rgba(255,255,255,0.3)]'
            }`}
          >
            Verified
          </button>

          <button
            type="button"
            onClick={() => setChipFilter('favorites')}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
              chipFilter === 'favorites'
                ? 'bg-[#00d1ff] text-[#00131a] border-[#00d1ff] font-semibold shadow-[0_0_12px_rgba(0,209,255,0.3)]'
                : 'bg-transparent text-[#8d97a1] border-[rgba(255,255,255,0.15)] hover:text-[#f3f6f8] hover:border-[rgba(255,255,255,0.3)]'
            }`}
          >
            <Heart className={`w-3.5 h-3.5 ${chipFilter === 'favorites' ? 'fill-[#00131a]' : 'text-rose-400 fill-rose-400/40'}`} />
            <span>Favorites {favorites.size > 0 && `(${favorites.size})`}</span>
          </button>
        </div>

        {/* Mono Count Line */}
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold">
          {filteredMembers.length} {filteredMembers.length === 1 ? 'MEMBER' : 'MEMBERS'} IN {isSubscribed ? (selectedState === 'all' ? 'NIGERIA' : selectedState.toUpperCase()) : 'LAGOS'}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MEMBER GRID: 2 cols phone, 3+ wide, portrait 3:4, 24px radius          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-4 pt-1">
        {filteredMembers.slice(0, visibleCount).map((member) => {
          const vibeStyle = getVibeStyle(member.vibe);
          const myLat = profile?.coarse_lat;
          const myLng = profile?.coarse_lng;
          const distKm = calculateDistanceKm(myLat, myLng, member.coarse_lat, member.coarse_lng);
          const distanceStr = distKm != null ? formatDistance(distKm) : null;

          return (
            <div
              key={member.id}
              onClick={() => handleMemberClick(member)}
              className="group relative aspect-[3/4] rounded-[24px] bg-[#090b0d] border border-[rgba(255,255,255,0.075)] overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(255,255,255,0.2)] hover:shadow-[0_12px_32px_rgba(0,0,0,0.6)] flex flex-col justify-between p-3.5 sm:p-4 select-none"
            >
              {/* Background Photo - Real photos only or monogram */}
              <div className="absolute inset-0 z-0 overflow-hidden bg-[#0f1215]">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 brightness-95 contrast-[1.02]"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#171b1f] to-[#090b0d] flex items-center justify-center">
                    <span className="font-serif text-3xl sm:text-4xl font-bold text-[#00d1ff]">
                      {member.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Gradient vignette so text at bottom remains crisp */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#040506] via-[#040506]/40 to-black/30 pointer-events-none" />
              </div>

              {/* TOP ROW: 'Online' tag with green dot + Favorite Heart button */}
              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-[rgba(255,255,255,0.1)] text-[10px] font-mono tracking-wider uppercase text-[#f3f6f8]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#35e0a1] shadow-[0_0_6px_#35e0a1]" />
                  <span>Online</span>
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

              {/* BOTTOM ROW: Coloured companionship tag, serif first name with cyan verified shield, mono area · state · distance */}
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

                {/* Name in Serif with Cyan Shield (Subscribers Only) */}
                <div className="flex items-center gap-1.5">
                  <h3 className="font-serif text-xl sm:text-2xl text-[#f3f6f8] font-normal leading-tight truncate">
                    {member.name}
                  </h3>
                  {member.verified && member.is_subscribed && (
                    <span title="Subscribed VIP Member" className="shrink-0 flex items-center">
                      <ShieldCheck className="w-4 h-4 text-[#00d1ff] fill-[#00d1ff]/20" />
                    </span>
                  )}
                </div>

                {/* Show @username under name */}
                {member.username && (
                  <p className="font-mono text-xs text-[#00d1ff] font-medium truncate">
                    @{member.username.replace(/^@/, '')}
                  </p>
                )}

                {/* Mono Area · State · Distance */}
                <div className="flex flex-wrap items-center gap-1 font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-[#8d97a1] truncate">
                  <span>{member.location} · {member.state}</span>
                  <span>·</span>
                  {isSubscribed ? (
                    <span className="text-[#00d1ff] font-semibold">{distanceStr || 'Nearby'}</span>
                  ) : (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowUpgradeModal(true);
                      }}
                      className="inline-flex items-center gap-1 text-[#f2b04b] hover:text-[#f2b04b]/90 cursor-pointer"
                    >
                      <Lock className="w-2.5 h-2.5" />
                      <span>Subscribe to see distance</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Show More Outline Button */}
      {filteredMembers.length > visibleCount && (
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setVisibleCount(prev => prev + 8)}
            className="px-8 py-3 rounded-[14px] bg-transparent border border-[rgba(255,255,255,0.15)] hover:border-[#00d1ff]/40 text-[#f3f6f8] text-xs sm:text-sm font-semibold tracking-wide transition-all cursor-pointer hover:bg-[#0f1215]"
          >
            Show more members
          </button>
        </div>
      )}

      {/* Empty State */}
      {filteredMembers.length === 0 && (
        <div className="py-20 text-center space-y-4 max-w-md mx-auto">
          {searchQuery.trim() ? (
            !isSubscribed ? (
              <>
                <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#00d1ff]">
                  <Search className="w-7 h-7 stroke-1" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-[#f3f6f8]">No members found in {userCurrentState}</h3>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#8d97a1]">
                    Subscribe to search all of Nigeria
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setLockedStateAttempt('All Nigeria');
                    setShowUpgradeModal(true);
                  }}
                  className="px-6 py-3 rounded-[14px] bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(0,209,255,0.25)] active:scale-95"
                >
                  Subscribe to search all of Nigeria
                </button>
              </>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#00d1ff]">
                  <Search className="w-7 h-7 stroke-1" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-2xl text-[#f3f6f8]">No members found for "{searchQuery}"</h3>
                  <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#8d97a1]">
                    Try searching by first name or username with or without @
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d1ff]/40 text-xs text-[#00d1ff] font-mono uppercase tracking-wider transition-all cursor-pointer"
                >
                  Clear search
                </button>
              </>
            )
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center mx-auto text-[#00d1ff]">
                <Compass className="w-7 h-7 stroke-1" />
              </div>
              <div className="space-y-1">
                <h3 className="font-serif text-2xl text-[#f3f6f8]">No members here yet. Be the first.</h3>
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#8d97a1]">
                  Invite connections or explore members across other states.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedState(isSubscribed ? 'all' : userCurrentState);
                  setVibeFilter('all');
                  setGenderFilter('all');
                  setChipFilter('everyone');
                }}
                className="px-6 py-2.5 rounded-full bg-white/5 border border-white/10 hover:border-[#00d1ff]/40 text-xs text-[#00d1ff] font-mono uppercase tracking-wider transition-all cursor-pointer"
              >
                Reset filters
              </button>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DARK BOTTOM SHEETS / MODALS (Desktop centered, Phone bottom sheet)      */}
      {/* ========================================================================= */}
      {openDropdown && (
        <div 
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
          onClick={() => setOpenDropdown(null)}
        >
          <div 
            className="w-full max-w-lg bg-[#090b0d] border border-[rgba(255,255,255,0.15)] rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle for Mobile */}
            <div className="w-10 h-1 bg-[rgba(255,255,255,0.2)] rounded-full mx-auto mt-3 mb-1 sm:hidden shrink-0" />

            {/* Header: Title and X button */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(255,255,255,0.075)] shrink-0">
              <div>
                <h3 className="font-serif text-2xl text-[#f3f6f8] font-normal tracking-tight">
                  {openDropdown === 'vibe' && 'Companionship Type'}
                  {openDropdown === 'gender' && 'Select Gender'}
                  {openDropdown === 'state' && 'Select Nigerian State'}
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#59636d] mt-0.5">
                  {openDropdown === 'vibe' && 'CHOOSE YOUR DESIRED ARRANGEMENT'}
                  {openDropdown === 'gender' && 'FILTER BY GENDER'}
                  {openDropdown === 'state' && (isSubscribed ? '37 STATES · NATIONWIDE' : 'FREE PLAN · LAGOS ONLY')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenDropdown(null)}
                className="w-8 h-8 rounded-full bg-[#171b1f] hover:bg-[#20252b] border border-[rgba(255,255,255,0.1)] text-[#8d97a1] hover:text-[#f3f6f8] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* A. COMPANIONSHIP SHEET (NO CROWNS. Each type has its own colour dot and coloured text) */}
            {openDropdown === 'vibe' && (
              <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                {COMPANIONSHIP_TYPES.map((opt) => {
                  const isSelected = vibeFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setVibeFilter(opt.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-[#171b1f] border-[rgba(255,255,255,0.25)]' 
                          : 'bg-[#0f1215] hover:bg-[#171b1f] border-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span 
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                        <span 
                          className="font-medium text-sm"
                          style={{ color: opt.color }}
                        >
                          {opt.label}
                        </span>
                      </div>

                      {/* Radio Circle on the right */}
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-[#00d1ff] bg-[#00d1ff]/20' 
                          : 'border-[rgba(255,255,255,0.2)]'
                      }`}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#00d1ff]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* B. GENDER SHEET (Everyone / Female / Male) */}
            {openDropdown === 'gender' && (
              <div className="p-4 space-y-2 overflow-y-auto max-h-[60vh]">
                {[
                  { id: 'all', label: 'Everyone' },
                  { id: 'women', label: 'Female' },
                  { id: 'men', label: 'Male' },
                ].map((opt) => {
                  const isSelected = genderFilter === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setGenderFilter(opt.id);
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-[#171b1f] border-[rgba(255,255,255,0.25)]' 
                          : 'bg-[#0f1215] hover:bg-[#171b1f] border-[rgba(255,255,255,0.05)]'
                      }`}
                    >
                      <span className="font-medium text-sm text-[#f3f6f8]">
                        {opt.label}
                      </span>

                      {/* Radio Circle on the right */}
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                        isSelected 
                          ? 'border-[#00d1ff] bg-[#00d1ff]/20' 
                          : 'border-[rgba(255,255,255,0.2)]'
                      }`}>
                        {isSelected && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#00d1ff]" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* C. STATE SHEET: Search box, Lagos open, amber banner for free users, locked states with lock + tiny PREMIUM label */}
            {openDropdown === 'state' && (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Search Box */}
                <div className="p-4 pb-2 shrink-0">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#8d97a1] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search state..."
                      value={stateSearch}
                      onChange={(e) => setStateSearch(e.target.value)}
                      className="w-full bg-[#0f1215] border border-[rgba(255,255,255,0.1)] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] outline-none"
                    />
                  </div>
                </div>

                {/* Amber Banner at top for free users */}
                {!isSubscribed && (
                  <div className="mx-4 mb-2 p-3.5 bg-[#f2b04b]/10 border border-[#f2b04b]/30 rounded-2xl flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2.5 text-[#f2b04b]">
                      <Lock className="w-4 h-4 shrink-0" />
                      <p className="text-xs text-[#f2b04b] leading-tight font-medium">
                        Only Lagos is open on the free plan. ₦2,000 a month unlocks all 36 states plus Abuja.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setOpenDropdown(null);
                        setLockedStateAttempt(null);
                        setShowUpgradeModal(true);
                      }}
                      className="bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold px-3 py-1.5 rounded-xl text-[10px] tracking-wider uppercase shadow-[0_0_12px_rgba(0,209,255,0.3)] shrink-0 cursor-pointer"
                    >
                      Unlock
                    </button>
                  </div>
                )}

                {/* States List */}
                <div className="p-4 pt-1 space-y-1.5 overflow-y-auto max-h-[50vh] pr-2">
                  {/* Premium user "All Nigeria" option */}
                  {isSubscribed && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedState('all');
                        setOpenDropdown(null);
                      }}
                      className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                        selectedState === 'all'
                          ? 'bg-[#171b1f] border-[#00d1ff]/40 text-[#f3f6f8]'
                          : 'bg-[#0f1215] hover:bg-[#171b1f] border-[rgba(255,255,255,0.05)] text-[#8d97a1]'
                      }`}
                    >
                      <span className="text-xs font-semibold text-[#f3f6f8]">All Nigeria (37 States)</span>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        selectedState === 'all' ? 'border-[#00d1ff] bg-[#00d1ff]/20' : 'border-[rgba(255,255,255,0.2)]'
                      }`}>
                        {selectedState === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-[#00d1ff]" />}
                      </div>
                    </button>
                  )}

                  {/* 37 Nigerian States */}
                  {filteredStatesList.map((stateName) => {
                    const isLagos = stateName === 'Lagos';
                    const isLocked = !isSubscribed && !isLagos;
                    const isSelected = selectedState === stateName;

                    return (
                      <button
                        key={stateName}
                        type="button"
                        onClick={() => handleStateClick(stateName)}
                        className={`w-full text-left px-4 py-3 rounded-2xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-[#171b1f] border-[#00d1ff]/40'
                            : isLocked
                              ? 'bg-[#090b0d] hover:bg-[#0f1215] border-[rgba(255,255,255,0.04)] opacity-75'
                              : 'bg-[#0f1215] hover:bg-[#171b1f] border-[rgba(255,255,255,0.05)]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {isLocked ? (
                            <Lock className="w-3.5 h-3.5 text-[#f2b04b] shrink-0" />
                          ) : (
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isLagos ? 'bg-[#00d1ff]' : 'bg-[#59636d]'}`} />
                          )}
                          <span className={`text-xs ${isLocked ? 'text-[#8d97a1]' : 'text-[#f3f6f8] font-medium'}`}>
                            {stateName}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isLocked && (
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#f2b04b]/15 border border-[#f2b04b]/30 text-[#f2b04b] font-semibold tracking-wider">
                              PREMIUM
                            </span>
                          )}

                          {isLagos && !isSubscribed && (
                            <span className="text-[9px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#00d1ff]/15 border border-[#00d1ff]/30 text-[#00d1ff] font-semibold">
                              OPEN
                            </span>
                          )}

                          {/* Radio circle on the right */}
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                            isSelected && !isLocked
                              ? 'border-[#00d1ff] bg-[#00d1ff]/20'
                              : 'border-[rgba(255,255,255,0.2)]'
                          }`}>
                            {isSelected && !isLocked && (
                              <div className="w-2.5 h-2.5 rounded-full bg-[#00d1ff]" />
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MEMBER PROFILE DETAILS MODAL (Free & Subscribed users can browse)       */}
      {/* ========================================================================= */}
      <MemberProfileModal
        member={profileModalMember}
        isOpen={Boolean(profileModalMember)}
        onClose={() => setProfileModalMember(null)}
        isSubscribed={isSubscribed}
        isFavorite={profileModalMember ? favorites.has(profileModalMember.id) : false}
        onToggleFavorite={handleToggleFavorite}
        onOpenSubscription={() => {
          setSelectedMember(profileModalMember);
          setShowUpgradeModal(true);
        }}
        onStartChat={() => {
          if (!isSubscribed) {
            setShowUpgradeModal(true);
          } else {
            navigate('/chats');
          }
        }}
      />

      {/* ========================================================================= */}
      {/* 7. UPGRADE PAYMENT FLOW MODAL                                             */}
      {/* ========================================================================= */}
      <SubscriptionModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setLockedStateAttempt(null);
        }}
        profile={profile}
        title={lockedStateAttempt ? `Unlock ${lockedStateAttempt}` : 'Unlock Nationwide Matches'}
        subtitle={
          lockedStateAttempt
            ? `Members in ${lockedStateAttempt} are locked for free users. Upgrade to browse all 36 states plus Abuja.`
            : selectedMember
              ? `Connect directly with ${selectedMember.name}, send unlimited messages, and discover members across all 37 states.`
              : 'Discover verified members across all 36 states and Abuja, send unlimited messages, and unlock VIP privileges.'
        }
      />
    </div>
  );
}
