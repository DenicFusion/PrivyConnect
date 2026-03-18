import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { motion } from 'motion/react';
import { MessageSquare, Shield, Zap, Search, MoreVertical, CheckCircle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function ChatListPage({ profile }: { profile: any }) {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const fetchChats = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .contains('participants', [profile.id])
        .order('last_timestamp', { ascending: false });

      if (!error && data) {
        const chatsWithUsers = await Promise.all(data.map(async (chat) => {
          const otherUid = chat.participants.find((id: string) => id !== profile.id);
          const { data: otherUser } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', otherUid)
            .single();
          
          return {
            ...chat,
            otherUser: otherUser || { username: 'Unknown', photo_url: '' }
          };
        }));
        setChats(chatsWithUsers);
      }
      setLoading(false);
    };

    fetchChats();

    // Real-time subscription
    const channel = supabase
      .channel('chats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => {
        fetchChats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display uppercase tracking-tighter mb-2">Messages</h1>
          <p className="text-white/40 font-light text-sm uppercase tracking-widest">End-to-end encrypted conversations</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Shield className="w-6 h-6 text-emerald-500" />
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within:text-emerald-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Search conversations..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-emerald-500/50 transition-all text-sm"
        />
      </div>

      <div className="space-y-2">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="h-24 rounded-3xl bg-white/5 animate-pulse" />
          ))
        ) : chats.length > 0 ? (
          chats.map((chat, i) => (
            <motion.div
              key={chat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link 
                to={`/chat/${chat.id}`}
                className="flex items-center gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group"
              >
                <div className="relative">
                  <img 
                    src={chat.otherUser.photo_url || `https://picsum.photos/seed/${chat.otherUser.id}/100/100`} 
                    className="w-16 h-16 rounded-2xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-[#050505]" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg tracking-tight truncate">{chat.otherUser.username}</span>
                      {chat.otherUser.is_verified && (
                        <div className="bg-emerald-500 rounded-full p-0.5">
                          <Shield className="w-2.5 h-2.5 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-white/30">
                      {formatDistanceToNow(new Date(chat.last_timestamp), { addSuffix: true })}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-white/50 text-sm truncate max-w-[200px] md:max-w-md">
                      {chat.last_message || "Start a conversation..."}
                    </p>
                  </div>
                </div>

                <button className="p-2 text-white/20 group-hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </Link>
            </motion.div>
          ))
        ) : (
          <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
            <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/40 uppercase tracking-widest text-sm">No messages yet</p>
          </div>
        )}
      </div>
    </div>
  );
}
