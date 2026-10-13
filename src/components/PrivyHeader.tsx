import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  X, 
  Compass, 
  MessageSquare, 
  Wallet, 
  User, 
  Settings, 
  Sparkles, 
  ArrowRight, 
  ShieldCheck, 
  LogOut, 
  Bell,
  Crown,
  ChevronRight,
  ExternalLink
} from 'lucide-react';
import { auth, signOut } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface PrivyHeaderProps {
  profile?: any;
  unreadCount?: number;
}

export function PrivyHeader({ profile, unreadCount = 0 }: PrivyHeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isSubscribed = profile?.is_subscribed || false;

  // Close dropdown on route change
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const scrollToSection = (id: string) => {
    setIsMenuOpen(false);
    if (location.pathname !== '/') {
      navigate(`/#${id}`);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSignOut = async () => {
    setIsMenuOpen(false);
    try {
      await signOut(auth);
      navigate('/login');
    } catch (e) {
      console.error(e);
      navigate('/login');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-[#050505]/95 backdrop-blur-xl border-b border-white/5 transition-all">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 max-w-7xl mx-auto relative">
        {/* Brand Logo */}
        <Link to={profile ? "/discovery" : "/"} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#0055ff] to-[#00d1ff] p-[1.5px] shadow-[0_0_15px_rgba(0,209,255,0.35)] group-hover:scale-105 transition-transform">
            <div className="w-full h-full rounded-full bg-[#070b12] flex items-center justify-center">
              <span className="font-serif italic text-white text-base font-semibold leading-none -translate-y-[1px]">
                p
              </span>
            </div>
          </div>
          <div className="flex items-baseline">
            <span className="text-2xl font-serif text-white tracking-tight font-normal">
              Privy
            </span>
            <span className="text-2xl font-serif italic text-[#00D1FF] font-light tracking-tight ml-1">
              Connect
            </span>
          </div>
        </Link>

        {/* Desktop Quick Links */}
        <div className="hidden md:flex items-center gap-6 text-xs font-mono uppercase tracking-wider text-white/70">
          <Link to="/discovery" className="hover:text-[#00D1FF] transition-colors flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5" />
            <span>Discover</span>
          </Link>
          <Link to="/chats" className="hover:text-[#00D1FF] transition-colors flex items-center gap-1.5 relative">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Messages</span>
            {unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-[#00D1FF] text-black text-[9px] font-bold flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Link>
          <Link to="/settings" className="hover:text-[#00D1FF] transition-colors flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-[#00d1ff]" />
            <span>Subscription</span>
          </Link>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {profile ? (
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-2 p-1.5 rounded-full hover:bg-white/5 border border-white/10 transition-colors cursor-pointer"
            >
              {profile.photo_url ? (
                <img src={profile.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0055ff] to-[#00d1ff] flex items-center justify-center text-xs font-serif text-white font-bold">
                  {profile.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-xs text-white/90 font-medium pr-1.5">
                {profile.username || 'My Profile'}
              </span>
            </button>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <button
                onClick={() => navigate('/login')}
                className="px-3.5 py-1.5 rounded-full text-xs text-white/80 hover:text-white hover:bg-white/5 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/signup')}
                className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#00D1FF] text-black hover:bg-[#00b8e6] shadow-[0_0_12px_rgba(0,209,255,0.3)] transition-all"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Minimal 2-Line Hamburger Menu Toggle */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:opacity-80 transition-opacity flex flex-col items-end gap-1.5 cursor-pointer ml-1"
            aria-label="Toggle navigation menu"
          >
            <span className={`h-[2px] bg-white rounded-full transition-all duration-200 ${isMenuOpen ? 'w-6 rotate-45 translate-y-2' : 'w-6'}`}></span>
            <span className={`h-[2px] bg-[#00D1FF] rounded-full transition-all duration-200 ${isMenuOpen ? 'opacity-0' : 'w-4'}`}></span>
            {isMenuOpen && <span className="w-6 h-[2px] bg-white rounded-full -rotate-45 -translate-y-1"></span>}
          </button>
        </div>

        {/* Dropdown Menu Backdrop */}
        {isMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />
        )}

        {/* Floating Dropdown View */}
        {isMenuOpen && (
          <div 
            ref={dropdownRef}
            className="absolute top-full right-3 sm:right-6 mt-2 w-[calc(100vw-24px)] sm:w-96 max-w-sm z-50 bg-[#080d16]/95 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(0,209,255,0.1)] transition-all animate-in fade-in slide-in-from-top-2 duration-200"
          >
            {/* User Profile Header Card if logged in */}
            {profile ? (
              <div className="pb-4 border-b border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {profile.photo_url ? (
                      <img src={profile.photo_url} alt="" className="w-11 h-11 rounded-full object-cover border border-[#00D1FF]/40" />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0055ff] to-[#00d1ff] flex items-center justify-center text-sm font-serif text-white font-bold">
                        {profile.username?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-serif text-white font-medium text-base">
                          {profile.display_name || profile.username || 'Member'}
                        </span>
                        {profile.is_verified && (
                          <ShieldCheck className="w-3.5 h-3.5 text-[#00D1FF]" />
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-white/50 block">
                        @{profile.username || 'member'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Plan status & Wallet preview */}
                <div className="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-2xl p-2.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    {isSubscribed ? (
                      <span className="flex items-center gap-1 text-[#00D1FF] font-semibold text-[10px] font-mono uppercase">
                        <Crown className="w-3 h-3 fill-[#00D1FF]" /> VIP Active
                      </span>
                    ) : (
                      <span className="text-white/60 text-[10px] font-mono uppercase">
                        Free Plan · Lagos
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="pb-4 border-b border-white/10 flex items-center justify-between">
                <div>
                  <div className="flex items-baseline">
                    <span className="text-lg font-serif text-white">Privy</span>
                    <span className="text-lg font-serif italic text-[#00D1FF] ml-1">Connect</span>
                  </div>
                  <p className="text-[11px] text-white/50">Private, verified companionship across Nigeria.</p>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Navigation Options */}
            <div className="py-3 space-y-1">
              <button
                onClick={() => { navigate('/discovery'); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/5 text-white/90 hover:text-white text-sm transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-[#00D1FF]" />
                  <span className="font-serif text-base">Discover Members</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              </button>

              <button
                onClick={() => { navigate('/chats'); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/5 text-white/90 hover:text-white text-sm transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4 text-[#00D1FF]" />
                  <span className="font-serif text-base">Messages</span>
                </div>
                {unreadCount > 0 ? (
                  <span className="px-2 py-0.5 rounded-full bg-[#00D1FF] text-black text-[10px] font-mono font-bold">
                    {unreadCount} new
                  </span>
                ) : (
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                )}
              </button>

              <button
                onClick={() => { navigate('/settings'); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/5 text-white/90 hover:text-white text-sm transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Crown className="w-4 h-4 text-[#00D1FF]" />
                  <span className="font-serif text-base">VIP Subscription</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              </button>

              {profile && (
                <button
                  onClick={() => { navigate(profile?.id ? `/profile/${profile.id}` : '/settings'); setIsMenuOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/5 text-white/90 hover:text-white text-sm transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <User className="w-4 h-4 text-[#00D1FF]" />
                    <span className="font-serif text-base">My Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
                </button>
              )}

              <button
                onClick={() => { navigate('/settings'); setIsMenuOpen(false); }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl hover:bg-white/5 text-white/90 hover:text-white text-sm transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-[#00D1FF]" />
                  <span className="font-serif text-base">Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white transition-colors" />
              </button>
            </div>

            {/* Public Info Links */}
            <div className="pt-2 pb-3 border-t border-white/10 grid grid-cols-2 gap-2 text-xs text-white/60">
              <button
                onClick={() => scrollToSection('how-it-works')}
                className="text-left px-2 py-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('pricing')}
                className="text-left px-2 py-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Pricing & Plans
              </button>
              <button
                onClick={() => scrollToSection('vision')}
                className="text-left px-2 py-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Our Vision
              </button>
              <button
                onClick={() => scrollToSection('contact')}
                className="text-left px-2 py-1.5 hover:text-white transition-colors rounded-lg hover:bg-white/5"
              >
                Support & Contact
              </button>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-white/10">
              {profile ? (
                <button
                  onClick={handleSignOut}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-medium rounded-2xl py-3 text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => { navigate('/signup'); setIsMenuOpen(false); }}
                    className="w-full bg-[#00D1FF] hover:bg-[#00b8e6] text-black font-semibold rounded-2xl py-3 text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,209,255,0.3)] transition-all cursor-pointer"
                  >
                    <span>Create Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { navigate('/login'); setIsMenuOpen(false); }}
                    className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium rounded-2xl py-2.5 text-xs transition-colors cursor-pointer"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
