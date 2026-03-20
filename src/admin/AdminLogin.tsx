import { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { PrivyLogo } from '../components/Logo';

interface AdminLoginProps {
  onLogin: (password: string) => void;
  isLoading: boolean;
  error: boolean;
}

export default function AdminLogin({ onLogin, isLoading, error }: AdminLoginProps) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 border border-white/10 rounded-[48px] p-12 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
          
          <div className="text-center space-y-8 relative z-10">
            <div className="flex justify-center">
              <div className="w-24 h-24 rounded-[32px] bg-brand-blue/10 flex items-center justify-center border border-brand-blue/20 shadow-lg shadow-brand-blue/10">
                <Shield className="w-12 h-12 text-brand-blue" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-center mb-4">
                <PrivyLogo className="scale-125" />
              </div>
              <h1 className="text-4xl font-display font-black uppercase tracking-tighter italic">
                Secure <span className="text-brand-blue">Terminal</span>
              </h1>
              <p className="text-[10px] text-white/30 uppercase tracking-[0.4em] font-bold">Authorized Personnel Only</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20 group-focus-within:text-brand-blue transition-colors" />
                  <input 
                    type="password" 
                    placeholder="System Access Key"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-14 pr-6 focus:outline-none focus:border-brand-blue/50 focus:bg-white/10 transition-all text-sm font-mono tracking-widest"
                    autoFocus
                  />
                </div>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2 text-red-500 text-[10px] font-bold uppercase tracking-widest px-2"
                  >
                    <AlertCircle className="w-3 h-3" />
                    Invalid Access Credentials
                  </motion.div>
                )}
              </div>

              <button 
                type="submit"
                disabled={isLoading || !password}
                className="w-full py-5 bg-brand-blue text-brand-dark rounded-2xl font-bold uppercase tracking-[0.2em] text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:hover:scale-100"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-brand-dark/30 border-t-brand-dark rounded-full animate-spin" />
                ) : (
                  <>
                    Initialize Session
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="pt-8 border-t border-white/5">
              <div className="flex items-center justify-center gap-2 text-[9px] uppercase tracking-widest font-bold text-white/20">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Global Security Protocol Active
              </div>
            </div>
          </div>
        </div>

        <p className="text-center mt-8 text-[10px] text-white/20 uppercase tracking-widest font-bold">
          IP Address: <span className="text-white/40 font-mono">192.168.1.1</span> • Session: <span className="text-white/40 font-mono">AES-256</span>
        </p>
      </motion.div>
    </div>
  );
}
