import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  Crown, 
  Gem, 
  Users, 
  Check, 
  ArrowRight, 
  ArrowLeft, 
  ShieldCheck,
  HeartHandshake,
  UploadCloud,
  X,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import { db, storage, doc, updateDoc, setDoc, ref, uploadBytes, getDownloadURL } from '../lib/firebase';
import { useToast } from './Toaster';

interface GenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentGender?: string;
  currentVibe?: string;
  onSuccess: () => void;
}

export type CompanionshipVibe = 'HOOKUP' | 'FWB' | 'SUGAR DADDY' | 'SUGAR MUMMY' | 'BESTIE';

export interface VibeOption {
  id: CompanionshipVibe;
  label: string;
  tagline: string;
  badge: string;
  color: string;
  borderColor: string;
  bgColor: string;
  icon: React.ReactNode;
}

export const VIBE_OPTIONS: VibeOption[] = [
  {
    id: 'HOOKUP',
    label: 'Hookup',
    tagline: 'Discreet, exciting & confidential encounters',
    badge: 'HOOKUP',
    color: '#ff6b6b',
    borderColor: 'border-[#ff6b6b]/40',
    bgColor: 'bg-[#ff6b6b]/10',
    icon: <Flame className="w-5 h-5 text-[#ff6b6b]" />
  },
  {
    id: 'FWB',
    label: 'Friends with benefits (FWB)',
    tagline: 'Companionship, mutual pleasure & zero drama',
    badge: 'FWB',
    color: '#b388ff',
    borderColor: 'border-[#b388ff]/40',
    bgColor: 'bg-[#b388ff]/10',
    icon: <HeartHandshake className="w-5 h-5 text-[#b388ff]" />
  },
  {
    id: 'SUGAR DADDY',
    label: 'Sugar Daddy',
    tagline: 'Generous lifestyle, spoiling, dinners & mentorship',
    badge: 'SUGAR DADDY',
    color: '#f2b04b',
    borderColor: 'border-[#f2b04b]/40',
    bgColor: 'bg-[#f2b04b]/10',
    icon: <Crown className="w-5 h-5 text-[#f2b04b]" />
  },
  {
    id: 'SUGAR MUMMY',
    label: 'Sugar Mummy',
    tagline: 'Luxe pampering, exclusive company & mutual reward',
    badge: 'SUGAR MUMMY',
    color: '#ff7ab8',
    borderColor: 'border-[#ff7ab8]/40',
    bgColor: 'bg-[#ff7ab8]/10',
    icon: <Gem className="w-5 h-5 text-[#ff7ab8]" />
  },
  {
    id: 'BESTIE',
    label: 'Bestie',
    tagline: 'Genuine friendship, travel partner & dinner dates',
    badge: 'BESTIE',
    color: '#35e0a1',
    borderColor: 'border-[#35e0a1]/40',
    bgColor: 'bg-[#35e0a1]/10',
    icon: <Users className="w-5 h-5 text-[#35e0a1]" />
  }
];

// Helper to compress an image file using browser Canvas
async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => reject(new Error('Failed to read image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('File reader error'));
    reader.readAsDataURL(file);
  });
}

export default function GenderModal({
  isOpen,
  onClose,
  userId,
  currentGender,
  currentVibe,
  onSuccess
}: GenderModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [vibe, setVibe] = useState<CompanionshipVibe | ''>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (currentGender === 'male' || currentGender === 'female') {
      setGender(currentGender);
    }
    if (currentVibe && VIBE_OPTIONS.some(v => v.id === currentVibe)) {
      setVibe(currentVibe as CompanionshipVibe);
    }
  }, [currentGender, currentVibe, isOpen]);

  const handleNextFromStep1 = () => {
    if (!gender) {
      toast('Please select your gender first.', 'error');
      return;
    }
    setStep(2);
  };

  const handleNextFromStep2 = () => {
    if (!vibe) {
      toast('Please select what you are looking for.', 'error');
      return;
    }
    setStep(3);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const newUrls: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;

        // 1. Compress image client-side
        const compressedDataUrl = await compressImageFile(file);

        // 2. Upload to Firebase Storage or use optimized Data URL fallback
        let finalUrl = compressedDataUrl;
        if (userId) {
          try {
            const fileBlob = await (await fetch(compressedDataUrl)).blob();
            const storagePath = `profiles/${userId}/${Date.now()}_${i}.jpg`;
            const storageReference = ref(storage, storagePath);
            await uploadBytes(storageReference, fileBlob);
            finalUrl = await getDownloadURL(storageReference);
          } catch (storageErr) {
            console.warn('Storage upload fallback to compressed data URL:', storageErr);
            finalUrl = compressedDataUrl;
          }
        }
        newUrls.push(finalUrl);
      }

      setPhotos(prev => [...prev, ...newUrls]);
      toast(`Added ${newUrls.length} photo${newUrls.length > 1 ? 's' : ''}`, 'success');
    } catch (err: any) {
      console.error('Error uploading photos:', err);
      toast('Failed to process one or more images', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!gender) {
      setStep(1);
      toast('Please select your gender.', 'error');
      return;
    }
    if (!vibe) {
      setStep(2);
      toast('Please select your desired companionship.', 'error');
      return;
    }
    if (photos.length < 2) {
      setStep(3);
      toast('Please upload at least 2 photos before completing.', 'error');
      return;
    }
    if (!userId) {
      toast('Session missing. Please re-login.', 'error');
      return;
    }

    setLoading(true);
    try {
      const updates = { 
        gender, 
        vibe,
        photos,
        photo_url: photos[0],
        preferences: { vibe },
        onboarding_completed: true,
        is_public: true,
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'profiles', userId), updates);
      try {
        await updateDoc(doc(db, 'users', userId), { 
          gender, 
          vibe, 
          photos, 
          photo_url: photos[0],
          onboarding_completed: true,
          is_public: true
        });
      } catch {
        await setDoc(doc(db, 'users', userId), { 
          gender, 
          vibe, 
          photos,
          photo_url: photos[0],
          onboarding_completed: true,
          is_public: true 
        }, { merge: true });
      }

      sessionStorage.removeItem('just_registered');

      toast('Profile completed successfully! Welcome to PrivyConnect.', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error saving onboarding data:', error);
      toast(error.message || 'Failed to update preferences', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-xl"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 25 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 25 }}
            transition={{ type: "spring", duration: 0.45 }}
            className="relative w-full max-w-lg bg-[#080d14] border border-white/10 rounded-[36px] sm:rounded-[44px] p-6 sm:p-8 shadow-2xl shadow-black/80 space-y-6 my-auto z-10 overflow-hidden"
          >
            {/* Top Glow Highlights */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-20 bg-gradient-to-b from-[#00D1FF]/20 to-transparent blur-2xl pointer-events-none" />

            {/* Header: Step counter and progress bars */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00D1FF] animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[#00D1FF] font-bold">
                    Profile Setup
                  </span>
                </div>
                
                {/* 1/3, 2/3, or 3/3 Indicator */}
                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 flex items-center gap-1 font-mono text-xs font-bold text-white/90">
                  <span className="text-[#00D1FF]">{step}</span>
                  <span className="text-white/30">/</span>
                  <span>3</span>
                </div>
              </div>

              {/* Progress Bar (3 segments) */}
              <div className="grid grid-cols-3 gap-2">
                <div className="h-1.5 rounded-full bg-[#00D1FF] transition-all" />
                <div className={`h-1.5 rounded-full transition-all ${
                  step >= 2 ? 'bg-[#00D1FF]' : 'bg-white/10'
                }`} />
                <div className={`h-1.5 rounded-full transition-all ${
                  step === 3 ? 'bg-[#00D1FF]' : 'bg-white/10'
                }`} />
              </div>
            </div>

            {/* STEP 1: GENDER SELECTION (1/3) */}
            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 15 }}
                className="space-y-6"
              >
                <div className="text-center space-y-1.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00D1FF]">Step 1 / 3</span>
                  <h2 className="text-2xl sm:text-3xl font-display uppercase tracking-tight italic text-white">
                    Select Your Gender
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm font-light">
                    Help us personalize who you see and connect with on PrivyConnect.
                  </p>
                </div>

                {/* Male & Female Vector Cards */}
                <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                  {/* MALE */}
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`relative p-5 sm:p-6 rounded-[28px] border-2 transition-all flex flex-col items-center justify-between gap-4 cursor-pointer text-center group overflow-hidden ${
                      gender === 'male'
                        ? 'bg-gradient-to-b from-[#00D1FF]/20 to-[#0055ff]/10 border-[#00D1FF] shadow-[0_0_25px_rgba(0,209,255,0.25)]'
                        : 'bg-[#0e141f] border-white/10 text-white/60 hover:border-white/20 hover:bg-[#121927]'
                    }`}
                  >
                    {gender === 'male' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#00D1FF] text-black flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                      <svg 
                        viewBox="0 0 100 100" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                      >
                        <circle cx="50" cy="50" r="46" fill="url(#male_bg_grad)" stroke={gender === 'male' ? '#00D1FF' : 'rgba(255,255,255,0.1)'} strokeWidth="2" />
                        <path 
                          d="M50 20C42.8 20 37 25.8 37 33C37 38.6 40.5 43.3 45.4 45.1C34.5 48.2 26 58.5 26 71C26 73.2 27.8 75 30 75H70C72.2 75 74 73.2 74 71C74 58.5 65.5 48.2 54.6 45.1C59.5 43.3 63 38.6 63 33C63 25.8 57.2 20 50 20Z" 
                          fill={gender === 'male' ? 'url(#male_avatar_grad)' : '#94a3b8'} 
                        />
                        <path 
                          d="M37 32C37 24 43 18 50 18C57 18 63 23 63 31C63 33 61 31 57 30C52 29 47 27 42 30C39 31.8 37 33 37 32Z" 
                          fill={gender === 'male' ? '#00D1FF' : '#cbd5e1'} 
                        />
                        <g transform="translate(62, 14)">
                          <circle cx="11" cy="11" r="11" fill="#00D1FF" />
                          <circle cx="10" cy="12" r="5" stroke="#04101e" strokeWidth="2" fill="none" />
                          <path d="M14 8L19 3M19 3H15M19 3V7" stroke="#04101e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                        <defs>
                          <linearGradient id="male_bg_grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#0f172a" />
                            <stop offset="1" stopColor="#0284c7" stopOpacity="0.3" />
                          </linearGradient>
                          <linearGradient id="male_avatar_grad" x1="50" y1="20" x2="50" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#38bdf8" />
                            <stop offset="1" stopColor="#0284c7" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="space-y-1">
                      <span className={`block font-display text-lg uppercase tracking-wider ${
                        gender === 'male' ? 'text-white font-bold' : 'text-white/80'
                      }`}>
                        Male
                      </span>
                      <span className="text-[11px] text-white/40 block font-light">
                        Gentleman
                      </span>
                    </div>
                  </button>

                  {/* FEMALE */}
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`relative p-5 sm:p-6 rounded-[28px] border-2 transition-all flex flex-col items-center justify-between gap-4 cursor-pointer text-center group overflow-hidden ${
                      gender === 'female'
                        ? 'bg-gradient-to-b from-[#ff7ab8]/20 to-[#00D1FF]/10 border-[#ff7ab8] shadow-[0_0_25px_rgba(255,122,184,0.25)]'
                        : 'bg-[#0e141f] border-white/10 text-white/60 hover:border-white/20 hover:bg-[#121927]'
                    }`}
                  >
                    {gender === 'female' && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#ff7ab8] text-black flex items-center justify-center shadow-lg">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
                      <svg 
                        viewBox="0 0 100 100" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        className="w-full h-full drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                      >
                        <circle cx="50" cy="50" r="46" fill="url(#female_bg_grad)" stroke={gender === 'female' ? '#ff7ab8' : 'rgba(255,255,255,0.1)'} strokeWidth="2" />
                        <path 
                          d="M50 22C43.4 22 38 27.4 38 34C38 39.4 41.5 43.9 46.2 45.4C35.8 48.5 28 58.5 28 70.5C28 72.8 29.8 74.5 32 74.5H68C70.2 74.5 72 72.8 72 70.5C72 58.5 64.2 48.5 53.8 45.4C58.5 43.9 62 39.4 62 34C62 27.4 56.6 22 50 22Z" 
                          fill={gender === 'female' ? 'url(#female_avatar_grad)' : '#94a3b8'} 
                        />
                        <path 
                          d="M50 18C41 18 35 24 35 34C35 40 37 43 38 45C39 42 41 38 43 36C45 34 47 32 50 32C53 32 55 34 57 36C59 38 61 42 62 45C63 43 65 40 65 34C65 24 59 18 50 18Z" 
                          fill={gender === 'female' ? '#ff7ab8' : '#cbd5e1'} 
                        />
                        <g transform="translate(62, 14)">
                          <circle cx="11" cy="11" r="11" fill="#ff7ab8" />
                          <circle cx="11" cy="8.5" r="5" stroke="#04101e" strokeWidth="2" fill="none" />
                          <path d="M11 13.5V19M8.5 16.5H13.5" stroke="#04101e" strokeWidth="2" strokeLinecap="round" />
                        </g>
                        <defs>
                          <linearGradient id="female_bg_grad" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#1e1124" />
                            <stop offset="1" stopColor="#ff7ab8" stopOpacity="0.3" />
                          </linearGradient>
                          <linearGradient id="female_avatar_grad" x1="50" y1="20" x2="50" y2="75" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#f472b6" />
                            <stop offset="1" stopColor="#db2777" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>

                    <div className="space-y-1">
                      <span className={`block font-display text-lg uppercase tracking-wider ${
                        gender === 'female' ? 'text-white font-bold' : 'text-white/80'
                      }`}>
                        Female
                      </span>
                      <span className="text-[11px] text-white/40 block font-light">
                        Lady
                      </span>
                    </div>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleNextFromStep1}
                  disabled={!gender}
                  className="w-full py-4 sm:py-4.5 bg-[#00D1FF] hover:bg-[#00b8e6] text-[#00131a] font-bold uppercase tracking-[0.18em] text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(0,209,255,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  <span>Continue to Step 2</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {/* STEP 2: WHAT ARE YOU LOOKING FOR? (2/3) */}
            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00D1FF]">Step 2 / 3</span>
                  <h2 className="text-2xl sm:text-3xl font-display uppercase tracking-tight italic text-white">
                    What are you into?
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm font-light">
                    Single select your arrangement type. This tag shows on your profile & card.
                  </p>
                </div>

                <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                  {VIBE_OPTIONS.map((opt) => {
                    const isSelected = vibe === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setVibe(opt.id)}
                        className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition-all flex items-center justify-between gap-3 cursor-pointer group ${
                          isSelected
                            ? `${opt.bgColor} ${opt.borderColor} shadow-lg ring-1 ring-inset ring-white/10`
                            : 'bg-[#0e141f] border-white/5 hover:border-white/15 hover:bg-[#121927]'
                        }`}
                        style={{
                          borderColor: isSelected ? opt.color : undefined
                        }}
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/10"
                            style={{
                              backgroundColor: isSelected ? `${opt.color}22` : '#161e2b'
                            }}
                          >
                            {opt.icon}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white tracking-wide">
                                {opt.label}
                              </span>
                              <span 
                                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wider uppercase border"
                                style={{
                                  backgroundColor: `${opt.color}18`,
                                  color: opt.color,
                                  borderColor: `${opt.color}33`
                                }}
                              >
                                {opt.badge}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/50 truncate font-light mt-0.5">
                              {opt.tagline}
                            </p>
                          </div>
                        </div>

                        <div 
                          className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: isSelected ? opt.color : 'rgba(255,255,255,0.2)',
                            backgroundColor: isSelected ? opt.color : 'transparent'
                          }}
                        >
                          {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextFromStep2}
                    disabled={!vibe}
                    className="flex-1 py-4 bg-[#00D1FF] hover:bg-[#00b8e6] text-[#00131a] font-bold uppercase tracking-[0.18em] text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(0,209,255,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    <span>Continue to Step 3</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 3: ADD PHOTOS (3/3) - 2 photos minimum */}
            {step === 3 && (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 15 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -15 }}
                className="space-y-5"
              >
                <div className="text-center space-y-1.5">
                  <span className="text-[10px] font-mono tracking-widest uppercase text-[#00D1FF]">Step 3 / 3</span>
                  <h2 className="text-2xl sm:text-3xl font-display uppercase tracking-tight italic text-white">
                    Add Your Photos
                  </h2>
                  <p className="text-white/50 text-xs sm:text-sm font-light">
                    Upload at least 2 clear photos of yourself to activate your profile.
                  </p>
                </div>

                {/* Upload Box */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-[#00D1FF]/50 bg-white/[0.02] hover:bg-white/[0.04] rounded-2xl p-6 text-center cursor-pointer transition-all group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#00D1FF]/10 text-[#00D1FF] flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                    {uploading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <UploadCloud className="w-6 h-6" />
                    )}
                  </div>
                  <p className="text-sm font-medium text-white">
                    {uploading ? 'Compressing & uploading...' : 'Tap to upload photos'}
                  </p>
                  <p className="text-[11px] text-white/40 mt-1 font-mono">
                    JPG, PNG or WEBP · 2 photos minimum
                  </p>
                </div>

                {/* Thumbnails Grid */}
                {photos.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className={photos.length >= 2 ? "text-[#35e0a1] font-bold" : "text-[#f2b04b] font-bold"}>
                        {photos.length >= 2 ? "✓ 2 photos minimum requirement met" : `${photos.length} of 2 photos minimum uploaded`}
                      </span>
                      <span className="text-white/40">{photos.length} photo{photos.length > 1 ? 's' : ''}</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 max-h-[160px] overflow-y-auto p-1">
                      {photos.map((url, idx) => (
                        <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-white/15 bg-white/5 group">
                          <img src={url} alt={`Upload ${idx + 1}`} className="w-full h-full object-cover" />
                          {idx === 0 && (
                            <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/70 text-[#00D1FF] text-[9px] font-mono font-bold uppercase">
                              Main
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(idx);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/80 text-white/80 hover:text-white hover:bg-red-500/80 flex items-center justify-center transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {photos.length < 2 && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-xs text-amber-300 font-mono">
                      ⚠️ 2 photos minimum required to complete your profile
                    </p>
                  </div>
                )}

                {/* Back & Complete Profile Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    disabled={loading || uploading}
                    className="py-4 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={photos.length < 2 || loading || uploading}
                    className="flex-1 py-4 bg-[#00D1FF] hover:bg-[#00b8e6] text-[#00131a] font-bold uppercase tracking-[0.18em] text-xs sm:text-sm rounded-2xl shadow-[0_0_25px_rgba(0,209,255,0.35)] hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-[#00131a] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Complete Profile ({photos.length}/2)</span>
                        <ShieldCheck className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Privacy reassuring footnote */}
            <div className="text-center pt-1 border-t border-white/5">
              <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">
                Encrypted & Private Profile Details
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
