import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, 
  Heart, 
  ChevronRight, 
  Check,
  Users
} from 'lucide-react';
import { useToast } from '../components/Toaster';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Onboarding({ profile, onComplete }: { profile: any, onComplete: () => void }) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string | null>(null);

  const handleComplete = async () => {
    if (!gender || !lookingFor || !profile?.id) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          gender,
          looking_for: lookingFor,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id);

      if (error) throw error;
      toast('Welcome to PrivyConnect!', 'success');
      onComplete();
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#050505] flex items-center justify-center p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[120px] -mr-64 -mt-64 rounded-full" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-blue/5 blur-[120px] -ml-64 -mb-64 rounded-full" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10 text-center"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-brand-blue/10 rounded-[32px] flex items-center justify-center mx-auto border border-brand-blue/20">
                  <User className="w-10 h-10 text-brand-blue" />
                </div>
                <h2 className="text-4xl font-display uppercase tracking-tighter italic">Tell us about yourself</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Select your gender identity</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'male', label: 'Male', icon: '♂️' },
                  { id: 'female', label: 'Female', icon: '♀️' },
                  { id: 'unspecified', label: 'Prefer not to say', icon: '✨' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setGender(option.id)}
                    className={cn(
                      "p-6 rounded-[32px] border transition-all flex items-center justify-between group",
                      gender === option.id 
                        ? "bg-brand-blue border-brand-blue text-brand-dark" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="uppercase tracking-widest text-xs font-bold">{option.label}</span>
                    </div>
                    {gender === option.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>

              <button
                disabled={!gender}
                onClick={() => setStep(2)}
                className="w-full py-6 bg-white text-black font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                Continue
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-10 text-center"
            >
              <div className="space-y-4">
                <div className="w-20 h-20 bg-brand-blue/10 rounded-[32px] flex items-center justify-center mx-auto border border-brand-blue/20">
                  <Heart className="w-10 h-10 text-brand-blue" />
                </div>
                <h2 className="text-4xl font-display uppercase tracking-tighter italic">Who are you looking for?</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Personalize your discovery experience</p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {[
                  { id: 'male', label: 'Men', icon: '🕺' },
                  { id: 'female', label: 'Women', icon: '💃' },
                  { id: 'everyone', label: 'Everyone', icon: '🌈' }
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setLookingFor(option.id)}
                    className={cn(
                      "p-6 rounded-[32px] border transition-all flex items-center justify-between group",
                      lookingFor === option.id 
                        ? "bg-brand-blue border-brand-blue text-brand-dark" 
                        : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{option.icon}</span>
                      <span className="uppercase tracking-widest text-xs font-bold">{option.label}</span>
                    </div>
                    {lookingFor === option.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-6 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-[0.2em] text-xs rounded-2xl hover:bg-white/10 transition-all"
                >
                  Back
                </button>
                <button
                  disabled={!lookingFor || loading}
                  onClick={handleComplete}
                  className="flex-[2] py-6 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {loading ? 'Setting up...' : 'Start Discovering'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
