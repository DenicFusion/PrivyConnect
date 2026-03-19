import { motion } from 'motion/react';
import { Shield, ArrowRight, Lock, Eye, Zap, Smartphone, Globe, CheckCircle, Star, Users, Bell, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Logo } from '../components/Logo';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden selection:bg-brand-blue/30">
      {/* Navigation - Matching Dashboard Header Exactly */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 border-b border-white/10 flex items-center justify-between px-6 backdrop-blur-xl bg-[#050505]/80">
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
            <span className="text-2xl font-display font-bold tracking-tighter">
              Privy<span className="text-brand-blue">Connect</span>
            </span>
          </Link>
        </div>

        <div className="hidden lg:flex items-center gap-12 text-[10px] uppercase tracking-[0.3em] font-bold text-white/40">
          <a href="#features" className="hover:text-brand-blue transition-colors">Infrastructure</a>
          <a href="#app" className="hover:text-brand-blue transition-colors">Ecosystem</a>
          <a href="#safety" className="hover:text-brand-blue transition-colors">Security</a>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3">
            <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors relative group">
              <Bell className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
              <span className="absolute top-3 right-3 w-2 h-2 bg-brand-blue rounded-full border-2 border-[#050505] shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
            </button>
            <button className="p-3 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
              <Settings className="w-5 h-5 text-white/70 group-hover:text-brand-blue transition-colors" />
            </button>
          </div>
          <Link 
            to="/discovery"
            className="px-8 py-3 bg-brand-blue text-brand-dark text-[10px] uppercase tracking-widest font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(0,209,255,0.3)]"
          >
            Access Portal
          </Link>
        </div>
      </nav>

      {/* Hero Section - Full Width Banner with Overlaid Text */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Full Width Banner Background */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=2000" 
            alt="Premium Infrastructure"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          {/* Dark Overlays for Readability - Multi-layered for depth */}
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#050505]/90 via-transparent to-[#050505]" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505]/80 via-transparent to-[#050505]/80" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
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
                to="/discovery"
                className="group relative px-12 py-6 bg-brand-blue text-brand-dark font-bold uppercase tracking-[0.3em] rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-[0_0_50px_rgba(0,209,255,0.4)]"
              >
                <span className="relative z-10 flex items-center gap-3 text-xs">
                  Initialize Connection <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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

        {/* Scroll Indicator */}
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-20"
        >
          <div className="w-px h-12 bg-gradient-to-b from-brand-blue to-transparent" />
          <span className="text-[10px] uppercase tracking-[0.5em] font-bold">Scroll</span>
        </motion.div>
      </section>

      {/* Stats Section */}
      <section className="py-24 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
          {[
            { label: "Active Users", value: "10K+" },
            { label: "Daily Matches", value: "2.5K" },
            { label: "Verified Profiles", value: "98%" },
            { label: "Privacy Score", value: "100" }
          ].map((stat, i) => (
            <div key={i} className="space-y-2">
              <div className="text-4xl font-display uppercase italic text-brand-blue">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-white/30">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* App vs Web Section */}
      <section id="app" className="py-32 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div className="space-y-6">
              <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic leading-none">
                One Platform.<br />
                <span className="text-white/30">Dual Experience.</span>
              </h2>
              <p className="text-white/40 text-lg font-light leading-relaxed">
                Experience PrivyConnect across all your devices. Our web platform handles your account, while our mobile app delivers the full immersive product experience.
              </p>
            </div>

            <div className="grid gap-6">
              {[
                { icon: Globe, title: "Web Experience", desc: "Landing, conversion, and account management." },
                { icon: Smartphone, title: "Mobile App", desc: "Full product experience, real-time chats, and discovery." }
              ].map((item, i) => (
                <div key={i} className="p-8 rounded-[32px] bg-white/5 border border-white/10 flex gap-6 items-start">
                  <div className="p-4 rounded-2xl bg-brand-blue/10 border border-brand-blue/20">
                    <item.icon className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-widest">{item.title}</h3>
                    <p className="text-white/40 text-sm font-light leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-brand-blue/20 blur-[100px] rounded-full" />
            <motion.div 
              initial={{ rotate: -5, y: 20 }}
              whileInView={{ rotate: 0, y: 0 }}
              className="relative aspect-[9/16] max-w-[400px] mx-auto bg-brand-dark border-[12px] border-white/10 rounded-[60px] overflow-hidden shadow-2xl"
            >
              <img 
                src="https://picsum.photos/seed/app-preview/800/1400" 
                className="w-full h-full object-cover opacity-50 grayscale"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center space-y-8">
                <div className="w-20 h-20 rounded-3xl bg-brand-blue flex items-center justify-center shadow-[0_0_40px_rgba(0,209,255,0.5)]">
                  <Shield className="w-10 h-10 text-brand-dark" />
                </div>
                <div className="space-y-4">
                  <h4 className="text-2xl font-display uppercase italic">PrivyConnect App</h4>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Coming soon to iOS & Android</p>
                </div>
                <button className="px-8 py-4 bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-all">
                  Join Waitlist
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 bg-white/[0.01]">
        <div className="max-w-7xl mx-auto space-y-20">
          <div className="text-center space-y-4">
            <h2 className="text-5xl md:text-7xl font-display uppercase tracking-tighter italic">Premium Features</h2>
            <p className="text-white/30 text-[10px] uppercase tracking-[0.4em] font-bold">Built for the elite</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Lock, title: "Total Privacy", desc: "End-to-end encrypted chats and blur previews for non-subscribers." },
              { icon: Eye, title: "Verification", desc: "AI-powered face verification ensures you only connect with real people." },
              { icon: Zap, title: "Monetization", desc: "Earn from tips and exclusive content with instant wallet withdrawals." },
              { icon: Users, title: "Discovery", desc: "Advanced 2-column grid with live activity and engagement triggers." },
              { icon: CheckCircle, title: "Verified Badges", desc: "Stand out with our premium verification system and trust scores." },
              { icon: Shield, title: "Safety First", desc: "Advanced moderation and reporting tools to keep the community safe." }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all group"
              >
                <div className="w-14 h-14 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-6 h-6 text-brand-blue" />
                </div>
                <h3 className="text-2xl font-bold mb-4 uppercase tracking-wider italic">{feature.title}</h3>
                <p className="text-white/40 font-light leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 px-6">
        <div className="max-w-5xl mx-auto p-10 md:p-24 rounded-[40px] md:rounded-[60px] bg-gradient-to-br from-brand-blue/20 to-blue-600/20 border border-brand-blue/30 relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(0,209,255,0.1),transparent)] pointer-events-none" />
          <div className="relative z-10 space-y-8 md:space-y-12">
            <h2 className="text-4xl md:text-8xl font-display uppercase tracking-tighter italic leading-none">
              Ready to<br />
              <span className="text-brand-blue">Connect?</span>
            </h2>
            <p className="max-w-xl mx-auto text-white/40 text-base md:text-lg font-light leading-relaxed">
              Join the most exclusive social network today. Your privacy is our priority.
            </p>
            <Link 
              to="/discovery"
              className="inline-block px-10 py-5 md:px-12 md:py-6 bg-white text-brand-dark font-bold uppercase tracking-[0.2em] rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-2xl text-xs md:text-sm"
            >
              Get Started Now
            </Link>
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
          
          <div className="flex gap-12 text-[10px] uppercase tracking-widest font-bold text-white/20">
            <a href="#" className="hover:text-brand-blue transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-brand-blue transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-brand-blue transition-colors">Contact Us</a>
          </div>

          <div className="text-white/20 text-[10px] uppercase tracking-widest font-bold">
            &copy; 2026 PrivyConnect &bull; All Rights Reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
