import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { APP_CONFIG } from '../config';

export default function VerifySubscription() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your subscription...');

  useEffect(() => {
    const reference = searchParams.get('reference');
    const trxref = searchParams.get('trxref'); // Paystack sometimes uses trxref
    
    const refToVerify = reference || trxref;

    if (!refToVerify) {
      setStatus('error');
      setMessage('No reference found in the URL.');
      return;
    }

    const verifyPayment = async () => {
      try {
        const backendUrl = APP_CONFIG.BACKEND_URL || '';
        const res = await fetch(`${backendUrl}/api/verify-subscription?reference=${refToVerify}`);
        
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStatus('success');
            setMessage('Subscription activated successfully!');
            setTimeout(() => {
              navigate('/discovery');
            }, 3000);
          } else {
            setStatus('error');
            setMessage(data.message || 'Verification failed.');
          }
        } else {
          setStatus('error');
          setMessage('Failed to verify subscription with the server.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setStatus('error');
        setMessage('An error occurred during verification.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-brand-dark flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/5 border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6"
      >
        {status === 'loading' && (
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="w-16 h-16 text-brand-blue animate-spin" />
            <h2 className="text-xl font-display font-bold text-white">Verifying Payment</h2>
            <p className="text-white/50 text-sm">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Payment Successful!</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <p className="text-xs text-white/30 mt-4">Redirecting you to the app...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h2 className="text-xl font-display font-bold text-white">Verification Failed</h2>
            <p className="text-white/50 text-sm">{message}</p>
            <button 
              onClick={() => navigate('/settings')}
              className="mt-6 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-colors"
            >
              Return to Settings
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
