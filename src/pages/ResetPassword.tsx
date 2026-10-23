import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { useToast } from '../components/Toaster';
import { motion } from 'motion/react';
import { Key, ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'otp' | 'password'>('otp');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // We need the email, but it's not passed here. 
      // Assuming we can get it from somewhere or it was passed in state.
      // For now, let's assume it's in localStorage or similar.
      const email = localStorage.getItem('reset_email');
      if (!email) throw new Error('Email not found. Please restart the process.');

      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'recovery',
      });
      if (error) throw error;
      
      setStep('password');
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast('Passwords do not match.', 'error');
      return;
    }
    if (password.length < 6) {
      toast('Password must be at least 6 characters.', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      if (error) throw error;
      
      toast('Password updated successfully!', 'success');
      localStorage.removeItem('reset_email');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-12 relative z-10 text-center"
      >
        <div className="space-y-6">
          <div className="inline-flex items-center justify-center p-6 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl shadow-[0_0_50px_rgba(0,209,255,0.1)]">
            <Logo className="w-20 h-20" />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-display font-black uppercase tracking-tighter italic leading-none">
              {step === 'otp' ? 'Verify OTP' : 'New Password'}
            </h1>
          </div>
        </div>

        {step === 'otp' ? (
          <form onSubmit={handleVerifyOtp} className="space-y-4 text-left">
            <input 
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              required
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
            />
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
              />
            </div>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
              />
            </div>
            {error && <div className="text-red-400 text-xs">{error}</div>}
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
