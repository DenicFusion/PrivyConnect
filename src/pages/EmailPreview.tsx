import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Copy, Check, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EMAIL_TEMPLATES } from '../lib/emailTemplates';
import { useToast } from '../components/Toaster';

export default function EmailPreviewPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof EMAIL_TEMPLATES>('OTP_CODE');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const templates = [
    { id: 'OTP_CODE', name: 'OTP Verification', icon: Mail },
    { id: 'ACCOUNT_VERIFICATION', name: 'Account Verified', icon: Mail },
    { id: 'SUBSCRIPTION_CONFIRMATION', name: 'Subscription Active', icon: Mail },
    { id: 'PAYMENT_SUCCESSFUL', name: 'Payment Successful', icon: Mail },
    { id: 'WALLET_FUNDED', name: 'Wallet Funded', icon: Mail },
    { id: 'WITHDRAWAL_REQUEST', name: 'Withdrawal Requested', icon: Mail },
    { id: 'PASSWORD_RESET', name: 'Password Reset', icon: Mail },
  ];

  const getHtml = (isForCopy = false) => {
    const t = EMAIL_TEMPLATES[selectedTemplate];
    if (typeof t === 'function') {
      if (isForCopy) {
        // Replace demo values with Supabase variables for the copy version
        // @ts-ignore
        return t('{{ .Token }}', '{{ .Data.full_name }}', '{{ .Data.amount }}', '{{ .Data.plan_name }}', '{{ .Data.location }}', '{{ .Data.device }}')
          .replace('href="#"', 'href="{{ .ConfirmationURL }}"');
      }
      // @ts-ignore
      return t('123456', 'Demo User', '1,500', 'Premium Weekly', 'Lagos, NG', 'iPhone 15 Pro');
    }
    return '';
  };

  const copyToClipboard = () => {
    const html = getHtml(true);
    navigator.clipboard.writeText(html);
    setCopied(true);
    toast('HTML copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const currentHtmlForCopy = getHtml(true);

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
        <div className="flex gap-4">
          <button 
            onClick={() => {
              const guide = document.getElementById('supabase-guide');
              guide?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="px-6 py-2.5 bg-white/5 border border-white/10 text-white/60 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
          >
            Supabase Setup Guide
          </button>
          <button 
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-6 py-2.5 bg-brand-blue text-brand-dark rounded-xl font-bold uppercase tracking-widest text-[10px] hover:scale-105 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            Copy HTML
          </button>
        </div>
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
          <div className="max-w-3xl mx-auto space-y-12">
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
                className="w-full h-[600px] border-none"
              />
            </div>

            {/* Code Export Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-lg font-bold uppercase tracking-tight italic text-brand-blue">Template Source Code</h3>
                  <p className="text-white/20 text-[10px] uppercase tracking-widest font-bold">Copy this into Supabase Email Body</p>
                </div>
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-2 px-4 py-2 bg-brand-blue/10 border border-brand-blue/20 text-brand-blue rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-brand-blue/20 transition-all"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy HTML'}
                </button>
              </div>
              <div className="relative group">
                <textarea
                  readOnly
                  value={currentHtmlForCopy}
                  className="w-full h-64 bg-black/40 border border-white/10 rounded-2xl p-6 font-mono text-[10px] text-white/60 focus:outline-none focus:border-brand-blue/30 transition-all resize-none leading-relaxed"
                />
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="px-3 py-1 bg-brand-blue/20 border border-brand-blue/30 rounded-lg text-[8px] font-bold text-brand-blue uppercase tracking-widest">
                    Ready to copy
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Guide Section */}
            <div id="supabase-guide" className="pt-12 border-t border-white/10 space-y-8">
              <div className="space-y-2">
                <h2 className="text-3xl font-display uppercase italic text-brand-blue">Supabase Configuration Guide</h2>
                <p className="text-white/40 text-sm">Follow these steps to enable 6-digit codes and custom branding for your authentication emails.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold">1</div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Enable OTP Codes</h3>
                  <p className="text-white/40 text-xs leading-relaxed">
                    By default, Supabase sends a magic link. To send a 6-digit code instead:
                  </p>
                  <ul className="text-[10px] text-white/60 space-y-2 list-disc pl-4 uppercase tracking-widest font-bold">
                    <li>Go to Authentication {'>'} Email Templates</li>
                    <li>Select "Magic Link" or "Confirm Signup"</li>
                    <li>Replace <code className="text-brand-blue">{'{{ .ConfirmationURL }}'}</code> with <code className="text-brand-blue">{'{{ .Token }}'}</code></li>
                    <li className="text-brand-blue border border-brand-blue/20 bg-brand-blue/5 p-2 rounded-lg">
                      <strong>CRITICAL:</strong> Go to <strong>Authentication {'>'} Providers {'>'} Email</strong> and set <code className="font-bold">OTP Length</code> to <code className="font-bold">6</code>. 
                      <p className="mt-1 text-[8px] normal-case font-normal">If this is set to 8, your users will receive 8-digit codes like in your screenshot.</p>
                    </li>
                  </ul>
                </div>

                <div className="p-8 rounded-[32px] bg-white/5 border border-white/10 space-y-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center text-brand-blue font-bold">2</div>
                  <h3 className="text-lg font-bold uppercase tracking-tight">Apply Branding</h3>
                  <p className="text-white/40 text-xs leading-relaxed">
                    To use the premium templates shown above in your Supabase emails:
                  </p>
                  <ul className="text-[10px] text-white/60 space-y-2 list-disc pl-4 uppercase tracking-widest font-bold">
                    <li>Select the "OTP Verification" template on the left</li>
                    <li>Click "Copy HTML" at the top of this page</li>
                    <li>Paste the HTML into the Supabase Email Body editor</li>
                  </ul>
                </div>
              </div>

              <div className="p-8 rounded-[32px] bg-brand-blue/5 border border-brand-blue/20 flex items-center justify-between gap-8">
                <div className="space-y-2">
                  <h4 className="text-sm font-bold uppercase tracking-widest text-brand-blue">Pro Tip: Custom SMTP</h4>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest leading-relaxed">
                    To avoid "Sent via Supabase" footers, configure your Resend SMTP credentials in <br />
                    <span className="text-white">Project Settings {'>'} Authentication {'>'} SMTP</span>.
                  </p>
                </div>
                <ExternalLink className="w-6 h-6 text-brand-blue/40" />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
