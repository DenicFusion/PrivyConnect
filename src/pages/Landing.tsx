import { motion } from 'motion/react';
import { Shield, ArrowRight, Lock, Eye, Zap } from 'lucide-react';
import { signIn } from '../lib/supabase';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#050505] overflow-hidden">
      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20">
        {/* Background Accents */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/10 blur-[120px] rounded-full" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center z-10"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl uppercase tracking-[0.2em] font-bold">PrivyConnect</span>
          </div>

          <h1 className="font-display text-6xl md:text-8xl lg:text-9xl uppercase leading-[0.85] tracking-tighter mb-8">
            Premium<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">Private</span><br />
            Secure
          </h1>

          <p className="max-w-xl mx-auto text-white/50 text-lg md:text-xl mb-12 font-light leading-relaxed">
            The exclusive social platform for verified connections. Discover people nearby with total privacy and control.
          </p>

          <div className="flex flex-col md:flex-row items-center justify-center gap-6">
            <button
              onClick={async () => {
                const btn = document.getElementById('signin-btn') as HTMLButtonElement;
                if (btn) btn.disabled = true;
                try {
                  await signIn();
                } finally {
                  if (btn) btn.disabled = false;
                }
              }}
              id="signin-btn"
              className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100"
            >
              <span className="relative z-10 flex items-center gap-2">
                Get Started <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            
            <div className="flex items-center gap-4 text-white/40 text-sm uppercase tracking-widest font-medium">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <img 
                    key={i}
                    src={`https://picsum.photos/seed/user${i}/100/100`} 
                    className="w-8 h-8 rounded-full border-2 border-[#050505]"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <span>Join 10k+ verified users</span>
            </div>
          </div>
        </motion.div>

        {/* Floating Features */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl w-full px-6">
          {[
            { icon: Lock, title: "Total Privacy", desc: "End-to-end encrypted chats and blur previews." },
            { icon: Eye, title: "Verification", desc: "AI-powered face verification for real users." },
            { icon: Zap, title: "Monetization", desc: "Earn from tips with instant wallet withdrawals." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
            >
              <feature.icon className="w-8 h-8 text-emerald-500 mb-4" />
              <h3 className="text-xl font-bold mb-2 uppercase tracking-wider">{feature.title}</h3>
              <p className="text-white/40 font-light">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5 text-center text-white/20 text-xs uppercase tracking-[0.3em]">
        &copy; 2026 PrivyConnect &bull; All Rights Reserved
      </footer>
    </div>
  );
}
