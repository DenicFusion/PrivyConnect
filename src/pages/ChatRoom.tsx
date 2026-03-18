import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Send, ArrowLeft, MoreVertical, CheckCircle, Clock, Image, Mic, Paperclip, Lock, Eye, Zap, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatRoomPage({ profile }: { profile: any }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !profile?.id) return;

    const fetchChatData = async () => {
      // Get other user info
      const { data: chat } = await supabase
        .from('chats')
        .select('*')
        .eq('id', chatId)
        .single();
      
      if (chat) {
        const otherUid = chat.participants.find((id: string) => id !== profile.id);
        const { data: user } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUid)
          .single();
        setOtherUser(user);
      }

      // Get messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('timestamp', { ascending: true });
      
      if (msgs) setMessages(msgs);
      setLoading(false);
      
      // Scroll to bottom
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };

    fetchChatData();

    // Real-time messages
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, profile?.id]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !profile?.id) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    const { error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: profile.id,
        text: messageText,
        timestamp: new Date().toISOString()
      });

    if (!error) {
      await supabase
        .from('chats')
        .update({
          last_message: messageText,
          last_timestamp: new Date().toISOString()
        })
        .eq('id', chatId);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] max-w-4xl mx-auto bg-white/5 border border-white/10 rounded-[40px] overflow-hidden">
      {/* Header */}
      <header className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-white/5 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={otherUser?.photo_url || `https://picsum.photos/seed/${otherUser?.id}/100/100`} 
                className="w-10 h-10 rounded-xl object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#050505]" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <span className="font-bold text-sm tracking-tight">{otherUser?.username}</span>
                {otherUser?.is_verified && <Shield className="w-3 h-3 text-emerald-500" />}
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-500">Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-white/5 rounded-full transition-colors">
            <MoreHorizontal className="w-6 h-6 text-white/30" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-[10px] uppercase tracking-widest font-bold text-white/30">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </div>
        </div>

        {messages.map((msg, i) => {
          const isMe = msg.sender_id === profile.id;
          return (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={cn(
                "flex flex-col max-w-[80%]",
                isMe ? "ml-auto items-end" : "mr-auto items-start"
              )}
            >
              <div className={cn(
                "p-4 rounded-3xl text-sm leading-relaxed",
                isMe 
                  ? "bg-emerald-500 text-white rounded-tr-none shadow-lg shadow-emerald-500/10" 
                  : "bg-white/10 text-white/90 rounded-tl-none border border-white/10"
              )}>
                {msg.text}
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/20 mt-2">
                {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
              </span>
            </motion.div>
          );
        })}
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white/5 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button type="button" className="p-3 text-white/30 hover:text-white transition-colors">
              <Paperclip className="w-5 h-5" />
            </button>
            <button type="button" className="p-3 text-white/30 hover:text-white transition-colors">
              <Image className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex-1 relative group">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
            />
            <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-emerald-500 transition-colors">
              <Mic className="w-5 h-5" />
            </button>
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}
