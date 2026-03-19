import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ArrowRight, Lock, Eye, Zap, Smartphone, Globe, CheckCircle, Star, Users, Bell, Settings, X, ChevronRight, Download, Mail, HelpCircle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { supabase } from '../lib/supabase';

export default function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const menuItems = [
    { name: 'Home', href: '#home' },
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Download App', href: '#download' },
    { name: 'About', href: '#about' },
    { name: 'Privacy', href: '#privacy' },
    { name: 'Contact', href: '#contact' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-brand-blue/30 font-sans">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 h-20 border-b transition-all duration-300 flex items-center justify-between px-6 ${scrolled ? 'bg-[#050505]/90 backdrop-blur-xl border-white/10' : 'bg-transparent border-transparent'}`}>
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="relative">
              <img 
                src="/privylogo.png" 
                alt="PrivyConnect" 
                className="w-10 h-10 drop-shadow-[0_0_10px_rgba(0,209,255,0.3)] group-hover:scale-110 transition-transform" 
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden">
                <Logo className="w-10 h-10" />
              </div>
            </div>
            <span className="text-xl md:text-2xl font-display font-bold tracking-tighter">
              Privy<span className="text-brand-blue">Connect</span>
            </span>
          </Link>
        </div>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-8 text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">
          {menuItems.slice(0, 4).map((item) => (
            <a key={item.name} href={item.href} className="hover:text-brand-blue transition-colors">{item.name}</a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <Link 
            to="/login"
            className="hidden md:block px-6 py-2.5 bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold rounded-xl hover:bg-white/10 transition-all"
          >
            Login / Sign Up
          </Link>
          
          {/* Menu Toggle */}
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:text-brand-blue transition-colors"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" transform="matrix(-1, 0, 0, 1, 0, 0)">
                <path d="M5 17H13M5 12H19M5 7H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 z-40 bg-[#050505] pt-24 px-8 flex flex-col gap-8"
          >
            <div className="flex flex-col gap-6">
              {menuItems.map((item) => (
                <a 
                  key={item.name} 
                  href={item.href} 
                  onClick={() => setIsMenuOpen(false)}
                  className="text-4xl font-display uppercase italic tracking-tighter hover:text-brand-blue transition-colors"
                >
                  {item.name}
                </a>
              ))}
            </div>
            <div className="mt-auto pb-12 space-y-4">
              <Link 
                to="/login" 
                onClick={() => setIsMenuOpen(false)}
                className="block w-full py-4 bg-brand-blue text-brand-dark text-center font-bold uppercase tracking-widest rounded-2xl"
              >
                Get Started
              </Link>
              <p className="text-center text-white/20 text-[10px] uppercase tracking-widest font-bold">
                &copy; 2026 PrivyConnect Ecosystem
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2000" 
            alt="Premium Infrastructure"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/90 via-transparent to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-[#050505]/80" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="space-y-8 md:space-y-12"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-3 px-6 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 backdrop-blur-xl"
            >
              <div className="w-2 h-2 rounded-full bg-brand-blue animate-pulse shadow-[0_0_10px_rgba(0,209,255,1)]" />
              <span className="text-[10px] uppercase tracking-[0.4em] font-bold text-brand-blue">System Status: Optimal</span>
            </motion.div>

            <div className="space-y-6">
              <h1 className="font-display text-5xl md:text-8xl lg:text-[10rem] uppercase leading-[0.9] md:leading-[0.8] tracking-tighter italic drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                The Elite<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-blue-400 to-brand-blue bg-[length:200%_auto] animate-gradient">Social</span><br />
                Infrastructure
              </h1>

              <p className="max-w-2xl mx-auto text-white/80 text-base md:text-xl font-light leading-relaxed uppercase tracking-[0.2em] md:tracking-[0.3em] font-bold drop-shadow-lg">
                Secure. Verified. <span className="text-brand-blue">Uncompromisingly Private.</span>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
              <Link
                to={isLoggedIn ? "/discovery" : "/login"}
                className="group relative px-12 py-6 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.3em] rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,209,255,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-3 text-xs">
                  {isLoggedIn ? "Go to Dashboard" : "Initialize Connection"} <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </span>
              </Link>
              
              <div className="flex items-center gap-4 px-8 py-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-all">
                <div className="flex -space-x-3">
                  {[1, 2, 3].map(i => (
                    <img 
                      key={i}
                      src={`https://picsum.photos/seed/user${i}/100/100`} 
                      className="w-10 h-10 rounded-full border-2 border-brand-dark grayscale group-hover:grayscale-0 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ))}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1 text-brand-blue mb-0.5">
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                    <Star className="w-3 h-3 fill-current" />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">10k+ Verified Nodes</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Minimized Heading, Restored Grid */}
      <section id="features" className="py-24 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-4xl md:text-5xl font-display uppercase tracking-tighter italic">Infrastructure</h2>
            <p className="text-white/30 text-[8px] uppercase tracking-[0.4em] font-bold">Core Benefits</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { 
                icon: Shield, 
                title: "Secure Infrastructure", 
                desc: "Multi-factor authentication and biometric security layers protecting your digital assets." 
              },
              { 
                icon: Lock, 
                title: "Private Communications", 
                desc: "End-to-end encryption for all your data and communications within the elite network." 
              },
              { 
                icon: Zap, 
                title: "High-Speed Sync", 
                desc: "Real-time synchronization across all your devices with zero-latency architecture." 
              },
              { 
                icon: Users, 
                title: "Verified Network", 
                desc: "Strict vetting process for all nodes and users to maintain the highest level of integrity." 
              },
              { 
                icon: Globe, 
                title: "Global Elite Access", 
                desc: "Connect to an elite network of high-performance servers located in strategic global hubs." 
              },
              { 
                icon: CheckCircle, 
                title: "Premium Status", 
                desc: "Exclusive access to premium features and priority support for our most valued members." 
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group"
              >
                <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="text-xl font-bold mb-3 uppercase tracking-wider italic">{feature.title}</h3>
                <p className="text-white/40 text-sm font-light leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic">Pricing</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-bold">Choose your access level</p>
          </div>

          <div className="max-w-md mx-auto p-12 rounded-[48px] bg-gradient-to-br from-brand-blue/20 to-purple-500/20 border border-brand-blue/30 backdrop-blur-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6">
              <div className="px-4 py-1 bg-brand-blue text-brand-dark text-[8px] font-black uppercase tracking-widest rounded-full">Most Popular</div>
            </div>
            <div className="space-y-8">
              <div className="space-y-2">
                <h3 className="text-3xl font-display uppercase italic">Premium Access</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-display italic">₦1,500</span>
                  <span className="text-white/40 uppercase tracking-widest text-[10px] font-bold">/ week</span>
                </div>
              </div>
              <ul className="space-y-4">
                {['Unlimited Profile Views', 'Real-time Chatting', 'Verified Badge', 'Priority Support', 'Exclusive Events'].map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-light">
                    <CheckCircle className="w-4 h-4 text-brand-blue" />
                    {feat}
                  </li>
                ))}
              </ul>
              <Link to="/login" className="block w-full py-5 bg-brand-blue text-brand-dark text-center font-bold uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-[0_20px_40px_rgba(0,209,255,0.3)]">
                Subscribe Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-32 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic leading-none">
                Download<br />
                <span className="text-brand-blue">The App</span>
              </h2>
              <p className="text-white/40 text-lg font-light leading-relaxed">
                Get the full PrivyConnect experience on your mobile device. Scan the QR code or use the store links below.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <button className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                <Smartphone className="w-6 h-6 text-brand-blue" />
                <div className="text-left">
                  <div className="text-[8px] uppercase tracking-widest font-bold text-white/40">Download on</div>
                  <div className="text-sm font-bold">App Store</div>
                </div>
              </button>
              <button className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all">
                <Zap className="w-6 h-6 text-brand-blue" />
                <div className="text-left">
                  <div className="text-[8px] uppercase tracking-widest font-bold text-white/40">Get it on</div>
                  <div className="text-sm font-bold">Google Play</div>
                </div>
              </button>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="p-8 rounded-[48px] bg-white border-8 border-white/10 shadow-2xl">
              <div className="w-64 h-64 bg-black rounded-3xl flex items-center justify-center">
                <div className="text-brand-blue font-display text-2xl uppercase tracking-widest font-bold text-center">
                  QR CODE<br />COMING SOON
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-32 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic">Our Vision</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-bold">About PrivyConnect</p>
          </div>
          <p className="text-xl md:text-2xl font-light leading-relaxed text-white/60 italic">
            "PrivyConnect was founded on the principle that elite social interactions deserve an elite infrastructure. We bridge the gap between digital privacy and human connection, creating a sanctuary for those who value discretion as much as engagement."
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 pt-12">
            <div className="space-y-2">
              <div className="text-sm font-bold uppercase tracking-widest text-brand-blue">Established</div>
              <div className="text-white/40 text-xs">2026</div>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-bold uppercase tracking-widest text-brand-blue">Headquarters</div>
              <div className="text-white/40 text-xs">Global / Decentralized</div>
            </div>
            <div className="space-y-2 col-span-2 md:col-span-1">
              <div className="text-sm font-bold uppercase tracking-widest text-brand-blue">Mission</div>
              <div className="text-white/40 text-xs">Secure Elite Connections</div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic leading-none">
                Contact<br />
                <span className="text-brand-blue">Support</span>
              </h2>
              <p className="text-white/40 text-lg font-light leading-relaxed">
                Have questions or need assistance? Our dedicated support team is available 24/7 to ensure your experience is seamless.
              </p>
            </div>
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                <Mail className="w-6 h-6 text-brand-blue" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">Email Us</div>
                  <div className="text-sm font-bold">support@privyconnect.com</div>
                </div>
              </div>
              <div className="flex items-center gap-6 p-6 rounded-3xl bg-white/5 border border-white/10">
                <HelpCircle className="w-6 h-6 text-brand-blue" />
                <div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-white/40">FAQ</div>
                  <div className="text-sm font-bold">Visit Help Center</div>
                </div>
              </div>
            </div>
          </div>
          <form className="p-12 rounded-[48px] bg-white/5 border border-white/10 backdrop-blur-xl space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Full Name</label>
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Email Address</label>
              <input type="email" className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-colors" placeholder="john@example.com" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest font-bold text-white/40 ml-4">Message</label>
              <textarea rows={4} className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-colors resize-none" placeholder="How can we help you?" />
            </div>
            <button type="submit" className="w-full py-5 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest rounded-2xl hover:scale-[1.02] transition-all">
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Privacy & Terms Section */}
      <section id="privacy" className="py-32 px-6">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic">Legal</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-bold">Privacy & Terms</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
              <FileText className="w-10 h-10 text-brand-blue" />
              <h3 className="text-2xl font-bold uppercase tracking-wider italic">Privacy Policy</h3>
              <p className="text-white/40 text-sm font-light leading-relaxed">
                We take your privacy seriously. Our policy outlines how we collect, use, and protect your personal information. We never sell your data.
              </p>
              <button className="text-brand-blue text-[10px] uppercase tracking-widest font-bold hover:underline">Read Full Policy</button>
            </div>
            <div className="p-10 rounded-[40px] bg-white/5 border border-white/10 space-y-6">
              <Shield className="w-10 h-10 text-brand-blue" />
              <h3 className="text-2xl font-bold uppercase tracking-wider italic">Terms of Service</h3>
              <p className="text-white/40 text-sm font-light leading-relaxed">
                By using PrivyConnect, you agree to our community guidelines and terms. We maintain a high standard of conduct for all members.
              </p>
              <button className="text-brand-blue text-[10px] uppercase tracking-widest font-bold hover:underline">Read Full Terms</button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-20 border-t border-white/5 bg-black">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-brand-blue" />
            </div>
            <span className="font-display text-xl uppercase tracking-[0.2em] font-bold italic">PrivyConnect</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 md:gap-12 text-[10px] uppercase tracking-widest font-bold text-white/20">
            {menuItems.map(item => (
              <a key={item.name} href={item.href} className="hover:text-brand-blue transition-colors">{item.name}</a>
            ))}
          </div>

          <div className="text-white/20 text-[10px] uppercase tracking-widest font-bold">
            &copy; 2026 PrivyConnect &bull; All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
