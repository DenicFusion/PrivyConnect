import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_CHATS, MOCK_MESSAGES, MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Send, ArrowLeft, MoreVertical, CheckCircle, Clock, Image, Mic, Paperclip, Lock, Eye, Zap, MoreHorizontal, Check, CheckCheck } from 'lucide-react';
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
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatId || !profile?.id) return;

    const fetchChatData = async () => {
      if (!isSupabaseActive) {
        const mockChat = MOCK_CHATS.find(c => c.id === chatId) || MOCK_CHATS[0];
        const otherUser = mockChat.participants.find(p => p.id !== profile.id) || mockChat.participants[1];
        setOtherUser(otherUser);
        setMessages(MOCK_MESSAGES.filter(m => m.chat_id === chatId));
        setLoading(false);
        return;
      }

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

    if (!isSupabaseActive) return;

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
        // Scroll to bottom on new message
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
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

    if (!isSupabaseActive) {
      const newMsg = {
        id: `msg-${Date.now()}`,
        chat_id: chatId,
        sender_id: profile.id,
        text: messageText,
        timestamp: new Date().toISOString(),
        status: 'sent'
      };
      setMessages(prev => [...prev, newMsg]);
      
      // Simulate reply
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          const reply = {
            id: `msg-${Date.now() + 1}`,
            chat_id: chatId,
            sender_id: otherUser.id,
            text: "That sounds great! PrivyConnect is amazing.",
            timestamp: new Date().toISOString(),
            status: 'read'
          };
          setMessages(prev => [...prev, reply]);
        }, 2000);
      }, 1000);
      return;
    }

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

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-brand-dark">
      <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,209,255,0.3)]" />
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] max-w-4xl mx-auto bg-white/[0.02] border border-white/10 rounded-[48px] overflow-hidden shadow-2xl relative">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-blue/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-black/40 backdrop-blur-3xl z-10">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-3 hover:bg-white/5 rounded-2xl transition-all hover:scale-110 active:scale-90">
            <ArrowLeft className="w-6 h-6 text-white/70" />
          </button>
          <div className="flex items-center gap-4">
            <div className="relative">
              <img 
                src={otherUser?.photo_url || `https://picsum.photos/seed/${otherUser?.id}/100/100`} 
                className="w-12 h-12 rounded-2xl object-cover border border-white/10 shadow-lg"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-brand-blue border-[3px] border-brand-dark shadow-[0_0_10px_rgba(0,209,255,0.5)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-display text-lg tracking-tight text-white italic">{otherUser?.username}</span>
                {otherUser?.is_verified && (
                  <div className="bg-brand-blue rounded-full p-0.5 shadow-[0_0_10px_rgba(0,209,255,0.5)]">
                    <CheckCircle className="w-3 h-3 text-brand-dark" />
                  </div>
                )}
              </div>
              <span className="text-[10px] uppercase tracking-widest font-bold text-brand-blue animate-pulse">Online</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-3 hover:bg-white/5 rounded-2xl transition-all hover:scale-110 active:scale-90">
            <MoreHorizontal className="w-6 h-6 text-white/20" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide z-10">
        <div className="text-center py-4">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/5 border border-white/10 text-[9px] uppercase tracking-[0.3em] font-bold text-white/20 backdrop-blur-xl">
            <Lock className="w-3 h-3" />
            End-to-end encrypted
          </div>
        </div>

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => {
            const isMe = msg.sender_id === profile.id;
            return (
              <motion.div
                key={msg.id || i}
                initial={{ opacity: 0, y: 20, x: isMe ? 20 : -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
                className={cn(
                  "flex flex-col max-w-[85%] group",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "relative p-5 rounded-[32px] text-sm leading-relaxed font-medium transition-all group-hover:scale-[1.02]",
                  isMe 
                    ? "bg-gradient-to-br from-brand-blue to-blue-600 text-brand-dark rounded-tr-none shadow-[0_10px_30px_rgba(0,209,255,0.2)]" 
                    : "bg-white/5 text-white/90 rounded-tl-none border border-white/10 backdrop-blur-xl"
                )}>
                  {msg.text}
                  
                  {/* Message Tail */}
                  <div className={cn(
                    "absolute top-0 w-4 h-4",
                    isMe ? "-right-2 bg-blue-600 [clip-path:polygon(0_0,0%_100%,100%_0)]" : "-left-2 bg-white/5 border-l border-t border-white/10 [clip-path:polygon(0_0,100%_100%,100%_0)]"
                  )} />
                </div>
                
                <div className="flex items-center gap-2 mt-2 px-2">
                  <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">
                    {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                  </span>
                  {isMe && (
                    <div className="flex items-center text-brand-blue">
                      {msg.status === 'read' ? <CheckCheck className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex items-center gap-3 mr-auto"
            >
              <div className="flex items-center gap-1.5 p-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
                <div className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-bounce" />
              </div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-white/20 italic">Typing...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="p-8 bg-black/40 backdrop-blur-3xl border-t border-white/5 z-10">
        <form onSubmit={handleSendMessage} className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <button type="button" className="p-4 text-white/20 hover:text-brand-blue transition-all hover:scale-110 active:scale-90">
              <Paperclip className="w-6 h-6" />
            </button>
            <button type="button" className="p-4 text-white/20 hover:text-brand-blue transition-all hover:scale-110 active:scale-90">
              <Image className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 relative group">
            <input 
              type="text" 
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a premium message..."
              className="w-full bg-white/5 border border-white/10 rounded-[24px] py-5 px-8 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold placeholder:text-white/10"
            />
            <button type="button" className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-brand-blue transition-all hover:scale-110 active:scale-90">
              <Mic className="w-6 h-6" />
            </button>
          </div>

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-5 bg-brand-blue text-brand-dark rounded-[24px] shadow-[0_10px_30px_rgba(0,209,255,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}
