import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase, signIn, isSupabaseActive } from '../lib/supabase';
import { Logo } from '../components/Logo';
import { useToast } from '../components/Toaster';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, User, Key, ArrowLeft, Shield, Smartphone, Globe, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup' | 'select' | 'forgot'>('select');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendAttempts, setResendAttempts] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already logged in
  useEffect(() => {
    if (!isSupabaseActive) {
      navigate('/discovery');
      return;
    }
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/discovery');
      }
    };
    checkSession();
  }, [navigate]);

  useEffect(() => {
    let timer: any;
    if (resendTimer > 0) {
      timer = setInterval(() => setResendTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [resendTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resendAttempts >= 5) {
      toast('Too many attempts. Please try again later.', 'error');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      let loginEmail = email;

      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              username,
              full_name: fullName
            },
            emailRedirectTo: window.location.origin + '/verify-success'
          }
        });
        if (error) throw error;
        
        // Send initial notification
        if (data.user) {
          const { sendInitialNotification } = await import('../services/notificationService');
          await sendInitialNotification(data.user.id);
        }

        toast('Verification code sent to your email!', 'success');
      } else {
        // Login flow: If it's a username, find the email
        if (!email.includes('@')) {
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('email')
            .eq('username', email)
            .single();
          
          if (profileError || !profileData?.email) {
            throw new Error('Username not found. Please use your email.');
          }
          loginEmail = profileData.email;
        }

        // Login flow: First verify password
        const { error: pwdError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password
        });
        if (pwdError) throw pwdError;

        // Password correct, now send OTP for "two-factor" verification
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: loginEmail,
          options: {
            emailRedirectTo: window.location.origin + '/verify-success'
          }
        });
        if (otpError) throw otpError;
        setEmail(loginEmail); // Update email state to the actual email for OTP verification
        toast('Security code sent to your email!', 'success');
      }
      
      setOtpSent(true);
      setResendTimer(30);
      setResendAttempts(prev => prev + 1);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = otp.join('');
    if (token.length !== 6) {
      toast('Please enter the 6-digit code.', 'error');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: mode === 'signup' ? 'signup' : 'email'
      });
      if (error) throw error;
      toast('Verified successfully!', 'success');
      
      // Get the redirect path from state or default to discovery
      const from = (location.state as any)?.from?.pathname || '/discovery';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message);
      toast('Invalid or expired code. Try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < otp.length - 1) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      toast('Password reset link sent to your email!', 'success');
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    if (!email || !email.includes('@')) {
      toast('Please enter a valid email address first.', 'error');
      setMode('login');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin + '/discovery',
        },
      });
      if (error) throw error;
      toast('Magic link sent to your email!', 'success');
      setMagicLinkSent(true);
    } catch (err: any) {
      setError(err.message);
      toast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mx-auto">
            <Mail className="w-10 h-10 text-brand-blue" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-display uppercase italic">Check Your Email</h2>
            <p className="text-white/40 text-sm font-light leading-relaxed">
              We've sent a secure link to <span className="text-white font-medium">{email}</span>. 
              Click the link in the email to continue.
            </p>
          </div>

          <button 
            onClick={() => setMagicLinkSent(false)}
            className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
          >
            Back to Login
          </button>
        </motion.div>
      </div>
    );
  }

  if (otpSent) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md p-12 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl text-center space-y-8"
        >
          <div className="w-20 h-20 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mx-auto">
            <Key className="w-10 h-10 text-brand-blue" />
          </div>
          <div className="space-y-4">
            <h2 className="text-3xl font-display uppercase italic">Verify Your Account</h2>
            <p className="text-white/40 text-sm font-light leading-relaxed">
              A code has been sent to <span className="text-white font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleVerifyOtp} className="space-y-8">
            <div className="flex justify-center gap-2 sm:gap-3">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  inputMode="numeric"
                  value={digit}
                  onChange={(e) => handleOtpChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-10 h-14 sm:w-12 sm:h-16 bg-white/5 border border-white/10 rounded-xl text-center text-xl sm:text-2xl font-bold focus:outline-none focus:border-brand-blue transition-colors"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_rgba(0,209,255,0.3)] disabled:opacity-50"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="space-y-2">
              <button 
                type="button"
                disabled={resendTimer > 0 || loading}
                onClick={handleSendOtp}
                className="text-[10px] text-brand-blue uppercase tracking-widest font-bold disabled:text-white/20 transition-colors"
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend Code'}
              </button>
              <br />
              <Link 
                to="/email-preview"
                className="text-[10px] text-white/20 uppercase tracking-widest font-bold hover:text-brand-blue transition-colors"
              >
                Not receiving a code?
              </Link>
              <br />
              <button 
                type="button"
                onClick={() => setOtpSent(false)}
                className="text-[10px] text-white/20 uppercase tracking-widest font-bold hover:text-white transition-colors"
              >
                Back to email
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/5 blur-[120px]" />
      </div>

      <Link 
        to="/" 
        className="absolute top-8 left-8 flex items-center gap-2 text-white/40 hover:text-white transition-colors uppercase tracking-widest text-[10px] font-bold z-20"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

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
            <h1 className="text-5xl font-display font-black uppercase tracking-tighter italic leading-none">
              Privy<span className="text-brand-blue">Connect</span>
            </h1>
            <p className="text-[10px] text-white/40 uppercase tracking-[0.5em] font-bold">Premium Social Infrastructure</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {mode === 'select' ? (
            <motion.div 
              key="select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              <button 
                onClick={() => signIn()}
                className="w-full py-5 bg-white text-black rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Continue with Google
              </button>
              <div className="flex items-center gap-4 py-2">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/20">or</span>
                <div className="h-px flex-1 bg-white/10" />
              </div>
              <button 
                onClick={() => setMode('login')}
                className="w-full py-5 bg-white/5 border border-white/10 text-white rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
              >
                Login with Email
              </button>
              <button 
                onClick={handleMagicLink}
                className="w-full py-5 bg-brand-blue/5 border border-brand-blue/10 text-brand-blue rounded-2xl font-bold uppercase tracking-widest text-xs hover:bg-brand-blue/10 transition-all flex items-center justify-center gap-3"
              >
                <Smartphone className="w-4 h-4" />
                Send Magic Link
              </button>
              <button 
                onClick={() => setMode('signup')}
                className="w-full py-5 text-brand-blue font-bold uppercase tracking-widest text-[10px] hover:underline"
              >
                Create an account
              </button>
            </motion.div>
          ) : (
            <motion.form 
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleSendOtp}
              className="space-y-4 text-left"
            >
              <div className="space-y-4">
                {mode === 'signup' && (
                  <>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text"
                        placeholder="Full Name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                      />
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                      <input 
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                      />
                    </div>
                  </>
                )}
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type={mode === 'signup' || mode === 'forgot' ? 'email' : 'text'}
                    placeholder={mode === 'signup' || mode === 'forgot' ? 'Email Address' : 'Username or Email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                  />
                </div>
                {mode !== 'forgot' && (
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-brand-blue/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>

              {mode === 'login' && (
                <button 
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[10px] text-white/20 uppercase tracking-widest font-bold hover:text-brand-blue transition-colors ml-4"
                >
                  Forgot Password?
                </button>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] uppercase tracking-widest font-bold">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                onClick={mode === 'forgot' ? handleForgotPassword : undefined}
                disabled={loading}
                className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? 'Processing...' : mode === 'forgot' ? 'Reset Password' : 'Continue'}
              </button>

              <button 
                type="button"
                onClick={() => setMode('select')}
                className="w-full py-2 text-white/20 font-bold uppercase tracking-widest text-[9px] hover:text-white transition-colors"
              >
                Back to options
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-[9px] text-white/20 uppercase tracking-widest leading-relaxed">
          By continuing, you agree to our <br />
          <span className="text-white/40">Terms of Service</span> & <span className="text-white/40">Privacy Policy</span>
        </p>
      </motion.div>
    </div>
  );
}
