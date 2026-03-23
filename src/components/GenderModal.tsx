import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './Toaster';

interface GenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export default function GenderModal({ isOpen, onClose, userId, onSuccess }: GenderModalProps) {
  const [gender, setGender] = useState<'male' | 'female' | ''>('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!gender) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ gender })
        .eq('id', userId);

      if (error) throw error;
      
      toast('Profile updated successfully!', 'success');
      onSuccess();
      onClose();
    } catch (error: any) {
      toast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[48px] p-10 space-y-8 text-center"
          >
            <div className="space-y-6">
              <div className="inline-flex items-center justify-center p-6 rounded-[32px] bg-brand-blue/10 border border-brand-blue/20">
                <User className="w-12 h-12 text-brand-blue" />
              </div>
              <div className="space-y-2">
                <h2 className="text-3xl font-display uppercase tracking-tighter italic">Select Your Gender</h2>
                <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold leading-relaxed">
                  Help us personalize your experience on PrivyConnect.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setGender('male')}
                className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${
                  gender === 'male' 
                    ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  gender === 'male' ? 'bg-brand-blue text-brand-dark' : 'bg-white/5'
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Male</span>
              </button>

              <button
                onClick={() => setGender('female')}
                className={`p-6 rounded-3xl border transition-all flex flex-col items-center gap-3 ${
                  gender === 'female' 
                    ? 'bg-brand-blue/20 border-brand-blue text-brand-blue' 
                    : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  gender === 'female' ? 'bg-brand-blue text-brand-dark' : 'bg-white/5'
                }`}>
                  <User className="w-6 h-6" />
                </div>
                <span className="font-bold uppercase tracking-widest text-[10px]">Female</span>
              </button>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!gender || loading}
              className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.2em] text-xs rounded-2xl shadow-[0_0_30px_rgba(0,209,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Complete Profile'}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
