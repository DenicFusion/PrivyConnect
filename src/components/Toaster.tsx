import React, { useState, useEffect, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              className="pointer-events-auto"
            >
              <div className={`
                min-w-[320px] max-w-md p-4 rounded-2xl border backdrop-blur-xl shadow-2xl flex items-start gap-4
                ${t.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                  t.type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-400' : 
                  'bg-brand-blue/10 border-brand-blue/20 text-brand-blue'}
              `}>
                <div className="mt-0.5">
                  {t.type === 'success' && <CheckCircle className="w-5 h-5" />}
                  {t.type === 'error' && <AlertCircle className="w-5 h-5" />}
                  {t.type === 'info' && <Info className="w-5 h-5" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium leading-relaxed">{t.message}</p>
                </div>
                <button 
                  onClick={() => setToasts((prev) => prev.filter((toast) => toast.id !== t.id))}
                  className="p-1 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 opacity-50" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
