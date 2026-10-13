import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../lib/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import { Logo } from '../components/Logo';
import { useToast } from '../components/Toaster';
import { motion } from 'motion/react';
import { Key, ArrowLeft, ShieldCheck } from 'lucide-react';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      toast('Please enter a valid email address.', 'error');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      toast('Password reset email sent!', 'success');
    } catch (err: any) {
      toast(err.message || 'Failed to send reset email.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden text-white">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#00d1ff]/10 blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8 relative z-10 text-center bg-[#0b1019]/90 border border-white/10 p-8 rounded-3xl backdrop-blur-2xl shadow-2xl"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-5 rounded-3xl bg-white/5 border border-white/10">
            <Key className="w-10 h-10 text-[#00d1ff]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-serif uppercase tracking-tight">Reset Password</h1>
            <p className="text-white/50 text-xs font-light">Enter your email to receive password reset instructions.</p>
          </div>
        </div>

        {resetSent ? (
          <div className="space-y-6">
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400">
              Password reset link sent! Check your inbox and follow the instructions to update your password.
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full py-4 bg-[#00d1ff] text-black font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-[#00b8e6] transition-all cursor-pointer"
            >
              Return to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">Email Address</label>
              <input 
                type="email"
                placeholder="e.g. hauwa@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-[#10141c] border border-white/10 rounded-2xl py-3.5 px-4 text-sm text-white focus:outline-none focus:border-[#00d1ff] transition-colors"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-[#00d1ff] text-black font-bold uppercase tracking-widest text-xs rounded-2xl hover:bg-[#00b8e6] transition-all disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(0,209,255,0.35)]"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-white/60 hover:text-white transition-colors flex items-center justify-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
