import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { emailTemplates } from '../lib/emailTemplates';
import { useToast } from '../components/Toaster';

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof emailTemplates>('confirmation');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const templates = [
    { id: 'confirmation', name: 'Email Confirmation', icon: Mail },
    { id: 'welcome', name: 'Welcome Email', icon: Mail },
    { id: 'subscriptionSuccess', name: 'Subscription Success', icon: Mail },
    { id: 'accountFunded', name: 'Account Funded', icon: Mail },
    { id: 'withdrawal', name: 'Withdrawal Initialized', icon: Mail },
    { id: 'passwordReset', name: 'Password Reset', icon: Mail },
    { id: 'securityAlert', name: 'Security Alert', icon: Mail },
  ];

  const getHtml = () => {
    const t = emailTemplates[selectedTemplate];
    if (typeof t === 'function') {
      // @ts-ignore
      return t('https://example.com/action-link', 'Demo User', '$1,000', 'Premium Plan', 'New York, US', 'iPhone 15 Pro');
    }
    return '';
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(getHtml());
    setCopied(true);
    toast('HTML copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <Link to="/" className="p-2 hover:bg-white/5 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-display uppercase italic tracking-widest">Email Template Gallery</h1>
        </div>
        <button 
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-brand-dark rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          Copy HTML
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-white/10 p-6 space-y-2 overflow-y-auto bg-black/20">
          <p className="text-[10px] uppercase tracking-[0.3em] font-bold text-white/20 mb-6 px-4">System Templates</p>
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTemplate(t.id as any)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all text-left group ${
                selectedTemplate === t.id 
                  ? 'bg-brand-blue/10 border border-brand-blue/20 text-brand-blue' 
                  : 'hover:bg-white/5 text-white/40'
              }`}
            >
              <t.icon className={`w-5 h-5 ${selectedTemplate === t.id ? 'text-brand-blue' : 'text-white/20'}`} />
              <span className="text-xs font-bold uppercase tracking-widest">{t.name}</span>
            </button>
          ))}
        </aside>

        {/* Preview Area */}
        <main className="flex-1 bg-[#111] p-12 overflow-y-auto">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h2 className="text-2xl font-bold uppercase tracking-tight italic">Live Preview</h2>
                <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Responsive HTML Email Template</p>
              </div>
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20" />
                <div className="w-3 h-3 rounded-full bg-green-500/20" />
              </div>
            </div>

            <div className="rounded-[32px] overflow-hidden border border-white/10 shadow-2xl bg-white">
              <iframe 
                srcDoc={getHtml()} 
                title="Email Preview"
                className="w-full h-[800px] border-none"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
