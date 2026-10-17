import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, doc, onSnapshot } from '../lib/firebase';
import { calculateProfileStrength, recordProfileView } from '../lib/stats';
import { 
  X, 
  Heart, 
  ShieldCheck, 
  Phone, 
  MessageCircle, 
  Send, 
  Lock, 
  Crown, 
  MapPin, 
  Sparkles, 
  Copy, 
  Check, 
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useToast } from './Toaster';

export interface ProfileDetails {
  id: string;
  name: string;
  verified: boolean;
  online: boolean;
  location: string;
  state: string;
  vibe: string;
  photo_url?: string;
  bio?: string;
  gender?: string;
  age?: number;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  interests?: string[];
  occupation?: string;
  username?: string;
  views?: number;
  connections?: number;
  strength?: number;
  [key: string]: any;
}

interface MemberProfileModalProps {
  member: ProfileDetails | null;
  isOpen: boolean;
  onClose: () => void;
  isSubscribed: boolean;
  isFavorite: boolean;
  onToggleFavorite: (memberId: string) => void;
  onOpenSubscription: () => void;
  onStartChat?: (memberId: string) => void;
}

export function MemberProfileModal({
  member,
  isOpen,
  onClose,
  isSubscribed,
  isFavorite,
  onToggleFavorite,
  onOpenSubscription,
  onStartChat
}: MemberProfileModalProps) {
  const { toast } = useToast();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [liveMember, setLiveMember] = useState<any>(member);

  useEffect(() => {
    setLiveMember(member);
  }, [member]);

  // Real-time listener for live updates on views, connections, and profile data
  useEffect(() => {
    if (!isOpen || !member?.id) return;

    const unsub = onSnapshot(doc(db, 'profiles', member.id), (snap) => {
      if (snap.exists()) {
        setLiveMember((prev: any) => ({ ...(prev || {}), id: snap.id, ...snap.data() }));
      }
    }, (err) => {
      console.warn('Realtime member modal listener error:', err);
    });

    return () => unsub();
  }, [isOpen, member?.id]);

  // Record view when opened
  useEffect(() => {
    if (!isOpen || !member?.id) return;
    const currentUid = auth.currentUser?.uid;
    if (currentUid && currentUid !== member.id) {
      recordProfileView(currentUid, member.id);
    }
  }, [isOpen, member?.id]);

  if (!isOpen || !member) return null;

  // Defaults based on member data
  const age = member.age || 24;
  const occupation = member.occupation || (
    member.gender === 'male' 
      ? 'Tech Entrepreneur & Investor' 
      : 'Creative Director & Model'
  );
  
  const bio = member.bio || (
    `Based in ${member.location}, ${member.state}. Loving good vibes, genuine dinner conversations, weekend travel, and exciting energy. Looking for high-frequency connection.`
  );

  const interests = member.interests || [
    'Fine Dining',
    'Luxury Travel',
    'Acoustic Music',
    'Fitness & Wellness',
    'Contemporary Art'
  ];

  // Contact numbers
  const maskedPhone = member.phone ? member.phone.replace(/(\+234\s?\d{2})\d{4}(\d{2})/, '$1••••$2') : '+234 81• ••• ••84';
  const realPhone = member.phone || '';
  const realWhatsApp = member.whatsapp || realPhone;
  const maskedHandle = '@••••••_privy';
  const realTelegram = member.telegram || (member.username ? `@${member.username.toLowerCase()}_privy` : '');

  const copyToClipboard = (text: string, fieldName: string) => {
    if (!text) {
      toast(`${fieldName} not provided by user`, 'error');
      return;
    }
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    toast(`${fieldName} copied to clipboard!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(member.id);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.98 }}
          transition={{ type: 'spring', damping: 25, stiffness: 320 }}
          className="relative w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] bg-[#090b0d] border border-white/10 rounded-t-[28px] sm:rounded-[28px] overflow-hidden flex flex-col z-10 shadow-2xl"
        >
          {/* Header Bar */}
          <div className="relative h-72 sm:h-80 w-full shrink-0 overflow-hidden bg-[#111418]">
            {member.photo_url ? (
              <img
                src={member.photo_url}
                alt={member.name}
                className="w-full h-full object-cover brightness-95 contrast-[1.02]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1015] via-[#090b0d] to-[#040506]">
                <div className="w-20 h-20 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center">
                  <span className="font-serif text-4xl font-bold text-[#00d1ff]">
                    {member.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>
            )}
            
            {/* Top gradient vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#090b0d] via-black/25 to-black/60 pointer-events-none" />

            {/* Top Navigation Row */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
              <button
                type="button"
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-black/80 transition-all active:scale-95 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2">
                {/* Favorite Button (Works for everyone including unsubscribed!) */}
                <button
                  type="button"
                  onClick={handleFavoriteClick}
                  className={`h-10 px-3.5 rounded-full backdrop-blur-md border flex items-center gap-2 transition-all active:scale-95 cursor-pointer ${
                    isFavorite 
                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-400' 
                      : 'bg-black/60 border-white/15 text-white/80 hover:text-white hover:border-white/30'
                  }`}
                  title={isFavorite ? "Favorited" : "Add to favorites"}
                >
                  <Heart className={`w-4 h-4 ${isFavorite ? 'fill-rose-400 text-rose-400' : ''}`} />
                  <span className="text-xs font-mono uppercase tracking-wider font-semibold">
                    {isFavorite ? 'Favorited' : 'Favorite'}
                  </span>
                </button>
              </div>
            </div>

            {/* Bottom info banner on photo */}
            <div className="absolute bottom-4 left-4 right-4 z-10 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-semibold bg-[#00d1ff]/15 border border-[#00d1ff]/30 text-[#00d1ff]">
                  {member.vibe}
                </span>

                {member.online && (
                  <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-black/60 border border-white/15 text-[10px] font-mono tracking-wider uppercase text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                    Online Now
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <h2 className="font-serif text-3xl sm:text-4xl text-[#f3f6f8] font-normal tracking-tight">
                  {member.name}{age ? `, ` : ''}{age && <span className="font-sans font-light text-2xl sm:text-3xl text-white/80">{age}</span>}
                </h2>
                {member.verified && (
                  <ShieldCheck className="w-5 h-5 text-[#00d1ff] fill-[#00d1ff]/20 shrink-0" />
                )}
              </div>

              {member.username && (
                <p className="font-mono text-sm text-[#00d1ff] font-semibold tracking-wide">
                  @{member.username.replace(/^@/, '')}
                </p>
              )}

              <p className="font-mono text-xs uppercase tracking-[0.16em] text-[#8d97a1] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#00d1ff]" />
                {member.location} · {member.state}
              </p>
            </div>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 divide-y divide-white/[0.06]">
            
            {/* Real Stats Card (All-time Views, Connections, Strength) */}
            <div className="bg-[#040506] border border-white/[0.075] rounded-[20px] grid grid-cols-3 divide-x divide-white/[0.075] p-3.5 text-center shadow-lg">
              <div className="space-y-0.5">
                <div className="font-serif text-2xl text-[#f3f6f8] leading-tight">
                  {Number(liveMember.views) || 0}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#59636d]">Views</div>
              </div>
              <div className="space-y-0.5">
                <div className="font-serif text-2xl text-[#00d1ff] leading-tight">
                  {Number(liveMember.connections) || 0}
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#59636d]">Connections</div>
              </div>
              <div className="space-y-0.5">
                <div className="font-serif text-2xl text-[#35e0a1] leading-tight">
                  {calculateProfileStrength(liveMember)}%
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#59636d]">Strength</div>
              </div>
            </div>

            {/* 1. About / Bio */}
            <div className="space-y-2 pt-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold block">
                ABOUT
              </span>
              <p className="text-[#f3f6f8]/90 text-sm leading-relaxed font-sans font-light">
                {bio}
              </p>
              <p className="text-xs font-mono text-[#8d97a1] pt-1">
                Occupation: <span className="text-[#f3f6f8] font-medium">{occupation}</span>
              </p>
            </div>

            {/* 2. Interests & Lifestyle */}
            <div className="space-y-2.5 pt-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold block">
                INTERESTS & VIBE
              </span>
              <div className="flex flex-wrap gap-2">
                {interests.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-xs font-mono uppercase tracking-wider text-[#8d97a1]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* 3. CONTACT INFORMATION (Subscribers Only vs Revealed) */}
            <div className="space-y-3.5 pt-4">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#00d1ff]" />
                  CONTACT INFORMATION
                </span>
                {!isSubscribed && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-[#f2b04b]/15 border border-[#f2b04b]/30 text-[#f2b04b] font-semibold">
                    <Lock className="w-3 h-3" />
                    Subscribers Only
                  </span>
                )}
              </div>

              {/* SUBSCRIBED STATE: Direct Phone, WhatsApp, Telegram, Chat */}
              {isSubscribed ? (
                <div className="space-y-2.5 bg-white/[0.02] border border-[#00d1ff]/20 rounded-2xl p-4">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#00d1ff]/10 text-[#00d1ff] flex items-center justify-center">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">Phone Number</p>
                        <p className="text-sm font-semibold text-white">{realPhone}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(realPhone, 'Phone number')}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      title="Copy"
                    >
                      {copiedField === 'Phone number' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <MessageCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">WhatsApp Direct</p>
                        <p className="text-sm font-semibold text-white">{realWhatsApp}</p>
                      </div>
                    </div>
                    <a
                      href={`https://wa.me/${realWhatsApp.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-mono text-xs uppercase tracking-wider flex items-center gap-1 transition-colors"
                    >
                      Chat <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/10">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-400 flex items-center justify-center">
                        <Send className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-[#8d97a1]">Telegram</p>
                        <p className="text-sm font-semibold text-white">{realTelegram}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(realTelegram, 'Telegram handle')}
                      className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                      title="Copy"
                    >
                      {copiedField === 'Telegram handle' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {onStartChat && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onStartChat(member.id);
                      }}
                      className="w-full mt-2 py-3 bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(0,209,255,0.25)] flex items-center justify-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Start In-App Chat
                    </button>
                  )}
                </div>
              ) : (
                /* NON-SUBSCRIBED STATE: Masked numbers + VIP Subscriber Unlock Box */
                <div className="space-y-3">
                  <div className="relative rounded-2xl bg-black/50 border border-white/10 p-4 overflow-hidden">
                    {/* Masked items */}
                    <div className="space-y-2 opacity-50 blur-[1px] select-none pointer-events-none">
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-xs text-[#8d97a1] font-mono">WhatsApp:</span>
                        <span className="text-xs font-mono text-white tracking-widest">{maskedPhone}</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-white/5">
                        <span className="text-xs text-[#8d97a1] font-mono">Direct Line:</span>
                        <span className="text-xs font-mono text-white tracking-widest">{maskedPhone}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-[#8d97a1] font-mono">Telegram:</span>
                        <span className="text-xs font-mono text-white tracking-widest">{maskedHandle}</span>
                      </div>
                    </div>

                    {/* Prominent Overlay Message */}
                    <div className="absolute inset-0 bg-[#090b0d]/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-4 text-center">
                      <div className="w-8 h-8 rounded-full bg-[#f2b04b]/15 border border-[#f2b04b]/30 flex items-center justify-center mb-1.5 text-[#f2b04b]">
                        <Lock className="w-4 h-4" />
                      </div>
                      <p className="text-xs font-semibold text-white">Contact Info is for Subscribers Only</p>
                      <p className="text-[11px] text-[#8d97a1] font-sans mt-0.5 max-w-xs">
                        Phone number, WhatsApp & direct messaging are protected. You can view all about this user, but subscribe to get in touch.
                      </p>
                    </div>
                  </div>

                  {/* Unlock CTA Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSubscription();
                    }}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <Crown className="w-4 h-4" />
                    <span>Subscribe to Reveal Contact Info & Chat</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Bar: Quick close / actions */}
          <div className="p-4 bg-black/60 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#59636d]">
              PrivyConnect Verified
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white font-mono text-xs uppercase tracking-wider transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
