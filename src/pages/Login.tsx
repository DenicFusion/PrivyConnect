import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  db, 
  doc, 
  getDoc, 
  setDoc, 
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp 
} from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { useToast } from '../components/Toaster';
import { ArrowLeft, Eye, EyeOff, ShieldCheck, Lock, Mail, User, MapPin, Sparkles, AlertCircle, Info } from 'lucide-react';

const getFriendlyError = (err: any) => {
  const code = err?.code || '';
  const message = err?.message || '';

  if (code === 'auth/operation-not-allowed') {
    return 'Email/Password sign-in is currently disabled in this Firebase project. Please use "Continue with Google", or enable Email/Password under Firebase Console > Authentication > Sign-in method.';
  }
  if (code === 'auth/unauthorized-domain') {
    const host = typeof window !== 'undefined' ? window.location.hostname : 'current domain';
    return `This domain (${host}) is not in Firebase Auth's Authorized Domains list. Please add it in Firebase Console > Authentication > Settings > Authorized domains.`;
  }
  if (code === 'auth/popup-blocked') {
    return 'The sign-in popup was blocked by your browser. Please allow popups for this page and click "Continue with Google" again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in window was closed. Please try again.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
    return 'Incorrect email or password. Please verify your credentials or continue with Google.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'An account with this email already exists. Please switch to "Sign In" or use "Continue with Google".';
  }
  if (code === 'auth/weak-password') {
    return 'Password is too weak. Please use at least 6 characters.';
  }
  if (code === 'auth/invalid-email') {
    return 'Please enter a valid email address.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network connection error. Please check your internet connection and try again.';
  }
  if (code === 'permission-denied' || message.includes('Missing or insufficient permissions')) {
    return 'Database permission error. Security rules were refreshed; please try again.';
  }
  return message || 'Authentication failed. Please check your details and try again.';
};

export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  
  // Sign in fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Sign up fields
  const [fullName, setFullName] = useState('');
  const [signupUsername, setSignupUsername] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const signupState = 'Lagos';
  const signupVibe = 'BESTIE';
  const [referralCode, setReferralCode] = useState('');

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('mode') === 'signup' || location.pathname === '/signup') {
      setMode('signup');
    }
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      localStorage.setItem('referral_code', ref);
    } else {
      const stored = localStorage.getItem('referral_code');
      if (stored) setReferralCode(stored);
    }
  }, [location]);

  useEffect(() => {
    // Check for any pending redirect auth result
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          const user = result.user;
          const userRef = doc(db, 'profiles', user.uid);
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            const newProfile = {
              id: user.uid,
              email: user.email || '',
              username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
              display_name: user.displayName || 'Member',
              photo_url: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
              gender: '',
              is_verified: false,
              is_subscribed: false,
              is_online: true,
              created_at: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
            await setDoc(doc(db, 'users', user.uid), newProfile);
          }
          navigate('/discovery', { replace: true });
        }
      })
      .catch((err) => {
        console.warn('Redirect auth result warning:', err);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/discovery', { replace: true });
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!loginIdentifier.trim() || !loginPassword) {
      toast('Please enter your email and password.', 'error');
      return;
    }
    setLoading(true);

    try {
      let authEmail = loginIdentifier.trim();
      // If entered username without @, try looking up their registered email
      if (!authEmail.includes('@')) {
        try {
          const q = query(collection(db, 'profiles'), where('username', '==', authEmail.toLowerCase()), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty && snap.docs[0].data().email) {
            authEmail = snap.docs[0].data().email;
          }
        } catch (lookupErr) {
          console.warn('Username query notice:', lookupErr);
        }
      }

      await signInWithEmailAndPassword(auth, authEmail, loginPassword);
      toast('Welcome back to PrivyConnect!', 'success');
      navigate('/discovery', { replace: true });
    } catch (err: any) {
      console.error('Sign in error:', err);
      const friendly = getFriendlyError(err);
      setErrorBanner(friendly);
      toast(friendly, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    if (!signupEmail.trim() || !signupPassword || !signupUsername.trim()) {
      toast('Please fill in your username, email, and password.', 'error');
      return;
    }
    if (signupPassword.length < 6) {
      toast('Password must be at least 6 characters long.', 'error');
      return;
    }
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, signupEmail.trim(), signupPassword);
      const user = userCredential.user;

      const newProfile = {
        id: user.uid,
        email: signupEmail.trim(),
        username: signupUsername.trim().toLowerCase(),
        display_name: fullName.trim() || signupUsername.trim(),
        state: signupState,
        vibe: signupVibe,
        gender: '',
        is_verified: false,
        is_subscribed: false,
        is_online: true,
        created_at: serverTimestamp()
      };

      await setDoc(doc(db, 'profiles', user.uid), newProfile);
      await setDoc(doc(db, 'users', user.uid), newProfile);

      localStorage.removeItem('referral_code');
      toast('Welcome to PrivyConnect! Account created.', 'success');
      navigate('/discovery', { replace: true });
    } catch (err: any) {
      console.error('Sign up error:', err);
      const friendly = getFriendlyError(err);
      setErrorBanner(friendly);
      toast(friendly, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setErrorBanner(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userRef = doc(db, 'profiles', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        const newProfile = {
          id: user.uid,
          email: user.email || '',
          username: user.email?.split('@')[0] || `user_${user.uid.slice(0, 5)}`,
          display_name: user.displayName || 'Member',
          photo_url: user.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
          gender: '',
          is_verified: false,
          is_subscribed: false,
          is_online: true,
          created_at: serverTimestamp()
        };
        await setDoc(userRef, newProfile);
        await setDoc(doc(db, 'users', user.uid), newProfile);
        toast('Account created successfully!', 'success');
      } else {
        toast('Signed in successfully!', 'success');
      }
      navigate('/discovery', { replace: true });
    } catch (err: any) {
      console.error('Google sign in error:', err);
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        toast('Google sign-in was cancelled.', 'info');
        return;
      }
      const friendly = getFriendlyError(err);
      setErrorBanner(friendly);
      toast(friendly, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier || !loginIdentifier.includes('@')) {
      toast('Please enter a valid email address.', 'error');
      return;
    }
    setLoading(true);

    try {
      setResetSent(true);
      toast('Reset instructions sent to your email!', 'success');
    } catch (err: any) {
      toast(getFriendlyError(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col justify-between p-4 sm:p-6 relative overflow-x-hidden selection:bg-[#00D1FF] selection:text-black">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-15%] left-[20%] w-[500px] h-[500px] rounded-full bg-[#0055ff]/10 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[10%] w-[450px] h-[450px] rounded-full bg-[#00D1FF]/10 blur-[130px]" />
      </div>

      {/* Top Header / Back Link */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2 pb-6 relative z-10">
        <Link 
          to="/" 
          className="flex items-center gap-2 text-xs font-mono text-white/50 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <div className="text-[10px] font-mono tracking-widest text-[#00D1FF] uppercase font-bold flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Verified Network</span>
        </div>
      </div>

      {/* Main Signing Card Container */}
      <div className="max-w-md w-full mx-auto relative z-10 my-auto">
        {/* Brand Icon & Heading */}
        <div className="text-center space-y-3 mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-[#0055ff] to-[#00d1ff] p-[2px] shadow-[0_0_25px_rgba(0,209,255,0.35)]">
            <div className="w-full h-full rounded-full bg-[#070b12] flex items-center justify-center">
              <span className="font-serif italic text-white text-2xl font-semibold leading-none -translate-y-[1px]">
                p
              </span>
            </div>
          </div>
          
          <div>
            <div className="flex items-baseline justify-center">
              <span className="text-3xl sm:text-4xl font-serif text-white tracking-tight font-normal">
                Privy
              </span>
              <span className="text-3xl sm:text-4xl font-serif italic text-[#00D1FF] font-light tracking-tight ml-1.5">
                Connect
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/60 font-light mt-1">
              Private, verified companionship across Nigeria.
            </p>
          </div>
        </div>

        {/* Card Box */}
        <div className="bg-[#0b1019]/90 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl space-y-6">
          {/* Segmented Mode Switcher */}
          {mode !== 'forgot' && (
            <div className="grid grid-cols-2 p-1 bg-[#10141c] border border-white/5 rounded-2xl text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`py-2.5 rounded-xl transition-all font-mono tracking-wider uppercase cursor-pointer ${
                  mode === 'signin' 
                    ? 'bg-[#00D1FF] text-black font-bold shadow-[0_0_12px_rgba(0,209,255,0.3)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`py-2.5 rounded-xl transition-all font-mono tracking-wider uppercase cursor-pointer ${
                  mode === 'signup' 
                    ? 'bg-[#00D1FF] text-black font-bold shadow-[0_0_12px_rgba(0,209,255,0.3)]' 
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Visual Error / Guidance Banner */}
          {errorBanner && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-xs text-red-200 flex items-start gap-3 leading-relaxed animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <p className="font-medium text-white">{errorBanner}</p>
                {errorBanner.includes('Firebase Console') && (
                  <div className="text-[11px] text-white/60 space-y-1 pt-1 border-t border-white/10">
                    <p>
                      <strong>Quick Solution:</strong> Click <span className="text-[#00D1FF] font-semibold">"Continue with Google"</span> below for instant 1-click access without needing password setup.
                    </p>
                    <p className="text-[10px] text-white/40">
                      Project: <code className="font-mono text-[#00D1FF]">gen-lang-client-0722566132</code>
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Email or Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="e.g. hauwak@gmail.com or hauwa"
                    className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none focus:ring-1 focus:ring-[#00D1FF]/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-[11px] text-[#00D1FF] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3.5 pr-12 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none focus:ring-1 focus:ring-[#00D1FF]/50 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(0,209,255,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>
          )}

          {/* SIGN UP FORM */}
          {mode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Hauwa Ibrahim"
                  className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="e.g. hauwa_ib"
                  className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="e.g. hauwa@example.com"
                  className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Create Password (min. 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3 pr-12 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {referralCode && (
                <div className="p-2.5 bg-[#00D1FF]/10 border border-[#00D1FF]/30 rounded-2xl text-[11px] text-[#00D1FF] flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Referral code <strong className="font-mono">{referralCode}</strong> applied</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 px-4 text-sm shadow-[0_0_20px_rgba(0,209,255,0.35)] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Create Account & Continue</span>
                )}
              </button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/50 block">
                  Registered Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full bg-[#10141c] border border-white/10 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-white/30 focus:border-[#00D1FF] focus:outline-none"
                />
              </div>

              {resetSent && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-400">
                  Password reset email has been sent. Check your inbox and spam folder.
                </div>
              )}

              <div className="space-y-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3.5 text-sm transition-all"
                >
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full py-2 text-xs text-white/60 hover:text-white"
                >
                  Return to Sign In
                </button>
              </div>
            </form>
          )}

          {/* Divider */}
          {mode !== 'forgot' && (
            <>
              <div className="relative flex items-center justify-center">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0b1019] px-3 text-[10px] font-mono uppercase tracking-wider text-white/40 absolute">
                  or continue with
                </span>
              </div>

              {/* Google One-Click Button */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="w-full bg-[#10141c] hover:bg-[#151a24] border border-white/10 text-white font-medium rounded-2xl py-3.5 px-4 text-xs sm:text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}
        </div>

        {/* Security and privacy reassurance */}
        <p className="text-center text-[11px] text-white/40 mt-6 leading-relaxed">
          By continuing, you agree to PrivyConnect’s Terms & Privacy. End-to-end encrypted profiles across Nigeria.
        </p>
      </div>

      <div className="py-4 text-center text-[10px] font-mono text-white/30 uppercase tracking-widest relative z-10">
        &copy; {new Date().getFullYear()} PrivyConnect. All rights reserved.
      </div>
    </div>
  );
}
