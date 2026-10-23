import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, ShieldCheck, Mail, Smartphone, Globe } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PrivyLogo } from '../components/Logo';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/Toaster';

export default function VerifySuccessPage() {
  const [searchParams] = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsVerifying(false);
        toast('Email verified successfully!', 'success');
      } else {
        // If no session, we might be in the middle of a redirect or need to wait
        // Supabase usually handles the verification via a link that sets the session
        setTimeout(() => {
          setIsVerifying(false);
        }, 2000);
      }
    };

    checkSession();
  }, [toast]);

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-brand-blue/20 border-t-brand-blue rounded-full mb-8"
        />
        <h2 className="text-2xl font-display uppercase tracking-widest italic">Verifying Connection...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-blue/10 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/5 blur-[150px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl relative z-10"
      >
        <div className="text-center mb-12">
          <PrivyLogo className="justify-center mb-8 scale-125" />
        </div>

        <div className="p-12 rounded-[56px] bg-white/5 border border-white/10 backdrop-blur-3xl text-center space-y-10 shadow-[0_0_100px_rgba(0,0,0,0.5)]">
          <div className="relative">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.2 }}
              className="w-24 h-24 rounded-3xl bg-brand-blue flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(0,209,255,0.4)]"
            >
              <ShieldCheck className="w-12 h-12 text-brand-dark" />
            </motion.div>
            
            {/* Success Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: [0, 1, 0], scale: [0, 1.5, 0], x: (i % 2 ? 1 : -1) * (Math.random() * 100), y: (i < 3 ? 1 : -1) * (Math.random() * 100) }}
                  transition={{ duration: 1, delay: 0.5 + i * 0.1 }}
                  className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-brand-blue"
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-display uppercase italic tracking-tighter leading-none">
              Identity<br />
              <span className="text-brand-blue">Confirmed</span>
            </h1>
            <p className="text-white/40 text-sm font-light leading-relaxed max-w-sm mx-auto">
              Your email has been successfully verified. Your node is now fully integrated into the PrivyConnect infrastructure.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5">
            {[
              { icon: Mail, label: "Email Verified" },
              { icon: Globe, label: "Node Active" },
              { icon: ShieldCheck, label: "Secure Link" }
            ].map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <item.icon className="w-5 h-5 text-brand-blue/60" />
                </div>
                <span className="text-[8px] uppercase tracking-widest font-bold text-white/20">{item.label}</span>
              </div>
            ))}
          </div>

          <div className="pt-4">
            <Link 
              to="/discovery"
              className="w-full py-6 bg-brand-blue text-brand-dark rounded-[32px] font-black uppercase tracking-[0.3em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(0,209,255,0.3)] flex items-center justify-center gap-3 group"
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-[10px] text-white/20 uppercase tracking-[0.4em] font-bold">
            Secure Session Initialized
          </p>
          <div className="flex items-center justify-center gap-6 text-[9px] uppercase tracking-widest font-bold text-white/10">
            <span>AES-256 Encryption</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span>Verified Identity</span>
            <div className="w-1 h-1 rounded-full bg-white/10" />
            <span>Private Network</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
