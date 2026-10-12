import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_CHATS, MOCK_MESSAGES } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Check, 
  CheckCheck, 
  Lock, 
  Search, 
  Mic, 
  Paperclip, 
  Play, 
  Pause, 
  X, 
  Loader2, 
  Volume2, 
  Trash2,
  Crown
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../components/Toaster';
import { SubscriptionModal } from '../components/SubscriptionModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Voice Recorder Hook
function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<any>(null);

  const startRecording = async () => {
    try {
      setRecordingError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      mediaRecorder.current.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        setAudioBlob(blob);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('Error starting recording:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecordingError('Microphone access denied. Please enable it in browser settings.');
      } else {
        setRecordingError('Could not start recording. Please check your microphone.');
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      mediaRecorder.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const cancelRecording = () => {
    stopRecording();
    setAudioBlob(null);
    setRecordingError(null);
  };

  return { isRecording, recordingTime, audioBlob, recordingError, startRecording, stopRecording, cancelRecording, setAudioBlob };
}

export default function ChatListPage({ profile }: { profile: any }) {
  const { chatId: routeChatId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [chats, setChats] = useState<any[]>([]);
  const [loadingChats, setLoadingChats] = useState(true);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(routeChatId || null);

  // Active chat state
  const [messages, setMessages] = useState<any[]>([]);
  const [activeOtherUser, setActiveOtherUser] = useState<any>(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ file: File, url: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Audio Playback
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { isRecording, recordingTime, audioBlob, startRecording, stopRecording, cancelRecording, setAudioBlob } = useVoiceRecorder();

  const isSubscribed = Boolean(profile?.is_subscribed);

  // Keep route synced with selectedChatId on mobile / wide screens
  useEffect(() => {
    if (routeChatId) {
      setSelectedChatId(routeChatId);
    }
  }, [routeChatId]);

  // Fetch conversations list
  useEffect(() => {
    if (!profile?.id) return;

    const fetchChats = async () => {
      setLoadingChats(true);

      if (!isSupabaseActive) {
        const chatsWithUsers = MOCK_CHATS.map(chat => {
          const otherUser = chat.participants.find(p => p.id !== profile.id) || chat.participants[1];
          return {
            ...chat,
            unread: true,
            otherUser: {
              ...otherUser,
              location: 'VICTORIA ISLAND, LAGOS',
              online: true,
              is_verified: true
            }
          };
        });
        setChats(chatsWithUsers);
        if (!selectedChatId && window.innerWidth >= 860 && chatsWithUsers.length > 0) {
          setSelectedChatId(chatsWithUsers[0].id);
        }
        setLoadingChats(false);
        return;
      }

      try {
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
              otherUser: otherUser || { 
                id: otherUid, 
                username: 'Member', 
                photo_url: '', 
                state: 'Lagos',
                area: 'VICTORIA ISLAND',
                is_online: true,
                is_verified: true
              }
            };
          }));

          setChats(chatsWithUsers);
          if (!selectedChatId && window.innerWidth >= 860 && chatsWithUsers.length > 0) {
            setSelectedChatId(chatsWithUsers[0].id);
          }
        }
      } catch (err) {
        console.warn('Error fetching chats:', err);
      } finally {
        setLoadingChats(false);
      }
    };

    fetchChats();

    if (!isSupabaseActive) return;

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

  // Load active conversation messages when selectedChatId changes
  useEffect(() => {
    if (!selectedChatId || !profile?.id) return;

    const currentChat = chats.find(c => c.id === selectedChatId);
    if (currentChat?.otherUser) {
      setActiveOtherUser(currentChat.otherUser);
    }

    const fetchMessages = async () => {
      setLoadingMessages(true);

      if (!isSupabaseActive) {
        const msgs = MOCK_MESSAGES.filter(m => m.chat_id === selectedChatId || selectedChatId === 'chat-1');
        setMessages(msgs.length > 0 ? msgs : [
          {
            id: 'm1',
            chat_id: selectedChatId,
            sender_id: currentChat?.otherUser?.id || 'other',
            content: 'Hey there! How is your week going?',
            created_at: new Date(Date.now() - 3600000).toISOString()
          },
          {
            id: 'm2',
            chat_id: selectedChatId,
            sender_id: profile.id,
            content: 'Hey! Doing great, thanks for checking in.',
            created_at: new Date(Date.now() - 1800000).toISOString()
          }
        ]);
        setLoadingMessages(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('chat_id', selectedChatId)
          .order('created_at', { ascending: true });

        if (!error && data) {
          setMessages(data);
        }
      } catch (err) {
        console.warn('Error fetching messages:', err);
      } finally {
        setLoadingMessages(false);
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    };

    fetchMessages();

    if (!isSupabaseActive) return;

    const channel = supabase
      .channel(`chat-room-${selectedChatId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${selectedChatId}` },
        (payload) => {
          setMessages(prev => [...prev, payload.new]);
          setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedChatId, chats, profile?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() && !audioBlob && !previewFile) return;
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }

    const textToSend = newMessage.trim();
    setNewMessage('');
    setUploading(true);

    if (!isSupabaseActive) {
      const optimisticMsg = {
        id: `mock-${Date.now()}`,
        chat_id: selectedChatId,
        sender_id: profile.id,
        content: textToSend,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticMsg]);
      setUploading(false);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      return;
    }

    try {
      await supabase.from('messages').insert({
        chat_id: selectedChatId,
        sender_id: profile.id,
        content: textToSend,
        message_type: 'text',
        created_at: new Date().toISOString()
      });

      await supabase.from('chats').update({
        last_message: textToSend,
        last_timestamp: new Date().toISOString()
      }).eq('id', selectedChatId);

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      toast('Failed to send message', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handlePlayAudio = (url: string, id: string) => {
    if (audioRef.current) {
      if (playingAudioId === id) {
        audioRef.current.pause();
        setPlayingAudioId(null);
        setPlaybackProgress(0);
        return;
      }
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    setPlayingAudioId(id);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.play();
    audio.onended = () => {
      setPlayingAudioId(null);
      setPlaybackProgress(0);
    };
  };

  const filteredChats = chats.filter(chat => {
    if (!searchQuery.trim()) return true;
    const name = chat.otherUser?.username || chat.otherUser?.display_name || '';
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const otherUserName = activeOtherUser?.display_name || activeOtherUser?.username || 'Member';
  const otherUserLocation = `${activeOtherUser?.area || 'Victoria Island'}, ${activeOtherUser?.state || 'Lagos'} · Online now`;

  return (
    <div className="space-y-4 pb-24 pt-1 max-w-6xl mx-auto">
      {/* ========================================================================= */}
      {/* 1. PAGE HEADER                                                            */}
      {/* ========================================================================= */}
      <div>
        {/* Mono Label */}
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#59636d] font-semibold mb-1 flex items-center gap-2">
          {!isSubscribed ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#f2b04b]" />
              <span>READING IS FREE · REPLYING NEEDS PREMIUM</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#00d1ff] shadow-[0_0_8px_#00d1ff]" />
              <span>END-TO-END ENCRYPTED</span>
            </>
          )}
        </div>

        {/* Serif Title */}
        <h1 className="font-serif text-4xl sm:text-[52px] leading-none text-[#f3f6f8] font-normal tracking-tight">
          Messages
        </h1>
      </div>

      {/* ========================================================================= */}
      {/* 2. FREE USERS BANNER ABOVE LIST                                           */}
      {/* ========================================================================= */}
      {!isSubscribed && (
        <div className="p-3.5 sm:p-4 rounded-2xl bg-[#00d1ff]/10 border border-[#00d1ff]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#00d1ff]/20 flex items-center justify-center text-[#00d1ff] shrink-0">
              <Crown className="w-4 h-4" />
            </div>
            <p className="text-[#f3f6f8] font-medium leading-relaxed">
              <span className="text-[#00d1ff] font-semibold">{chats.length} people</span> messaged you. Read them free. Pay the ₦2,000 monthly fee to reply.
            </p>
          </div>
          <button
            onClick={() => setShowSubscriptionModal(true)}
            className="bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold px-4 py-2 rounded-xl text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(0,209,255,0.3)] shrink-0 cursor-pointer text-center"
          >
            Pay to reply
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. LAYOUT: Phone toggle list/thread | Wide screen: 320px list + thread    */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 min-[860px]:grid-cols-[320px_1fr] gap-4 items-start min-h-[560px]">
        
        {/* ======================================================================= */}
        {/* CONVERSATION LIST (Hidden on phone when chat selected)                  */}
        {/* ======================================================================= */}
        <div className={cn(
          "bg-[#090b0d] border border-[rgba(255,255,255,0.075)] rounded-[24px] p-3 flex flex-col h-[580px] overflow-hidden",
          selectedChatId ? "hidden min-[860px]:flex" : "flex"
        )}>
          {/* Search Box */}
          <div className="relative mb-3 shrink-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#59636d]" />
            <input 
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f1215] border border-[rgba(255,255,255,0.075)] rounded-xl pl-9 pr-3 py-2 text-xs text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] outline-none"
            />
          </div>

          {/* List Rows */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
            {loadingChats ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 rounded-2xl bg-[#0f1215] animate-pulse" />
              ))
            ) : filteredChats.length > 0 ? (
              filteredChats.map((chat) => {
                const isSelected = selectedChatId === chat.id;
                const other = chat.otherUser || {};
                const name = other.username || other.display_name || 'Member';
                const avatarUrl = other.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`;
                const isUnread = Boolean(chat.unread);

                return (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setSelectedChatId(chat.id);
                      if (window.innerWidth < 860) {
                        navigate(`/chat/${chat.id}`);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all border",
                      isSelected 
                        ? "bg-[#00d1ff]/10 border-[#00d1ff]/50 shadow-[0_0_16px_rgba(0,209,255,0.1)]"
                        : "bg-[#090b0d] hover:bg-[#0f1215] border-transparent"
                    )}
                  >
                    {/* Round Avatar */}
                    <div className="relative shrink-0">
                      <img 
                        src={avatarUrl}
                        alt={name}
                        className="w-11 h-11 rounded-full object-cover border border-[rgba(255,255,255,0.1)]"
                      />
                      {/* Cyan Glowing Dot for Unread */}
                      {isUnread && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#00d1ff] border-2 border-[#090b0d] shadow-[0_0_8px_#00d1ff]" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={cn(
                          "truncate text-xs sm:text-sm font-medium",
                          isUnread ? "text-[#f3f6f8] font-bold" : "text-[#f3f6f8]"
                        )}>
                          {name}
                        </span>
                        {/* Time in Mono on right */}
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#59636d] shrink-0 ml-1">
                          {chat.last_timestamp 
                            ? formatDistanceToNow(new Date(chat.last_timestamp), { addSuffix: false }) 
                            : '2m'}
                        </span>
                      </div>

                      {/* One line last message */}
                      <p className={cn(
                        "text-xs truncate",
                        isUnread ? "text-[#f3f6f8] font-medium" : "text-[#8d97a1]"
                      )}>
                        {chat.last_message || 'Start a conversation...'}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-12 text-[#59636d] font-mono text-xs uppercase tracking-wider">
                NO CONVERSATIONS
              </div>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* CHAT THREAD (Full-screen on phone with back arrow, right pane on wide)  */}
        {/* ======================================================================= */}
        <div className={cn(
          "bg-[#090b0d] border border-[rgba(255,255,255,0.075)] rounded-[24px] flex flex-col h-[580px] overflow-hidden relative",
          !selectedChatId ? "hidden min-[860px]:flex" : "flex"
        )}>
          {selectedChatId ? (
            <>
              {/* THREAD HEADER: Avatar, serif name, Area, State · Online now */}
              <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.075)] flex items-center justify-between bg-[#0f1215]/60 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  {/* Phone Back Arrow */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedChatId(null);
                      navigate('/chats');
                    }}
                    className="p-1.5 rounded-full hover:bg-[#171b1f] text-[#8d97a1] hover:text-[#f3f6f8] min-[860px]:hidden cursor-pointer"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  {/* Avatar */}
                  <img 
                    src={activeOtherUser?.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`}
                    alt={otherUserName}
                    className="w-10 h-10 rounded-full object-cover border border-[rgba(255,255,255,0.1)]"
                  />

                  {/* Details */}
                  <div>
                    <h3 className="font-serif text-lg sm:text-xl text-[#f3f6f8] font-normal leading-tight">
                      {otherUserName}
                    </h3>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-[#8d97a1]">
                      {otherUserLocation}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#35e0a1] shadow-[0_0_6px_#35e0a1]" />
                </div>
              </div>

              {/* MESSAGES BUBBLE AREA */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
                {/* Top encryption pill */}
                <div className="text-center py-1">
                  <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#59636d] px-3 py-1 rounded-full bg-[#0f1215] border border-[rgba(255,255,255,0.05)]">
                    MESSAGES ARE END-TO-END ENCRYPTED
                  </span>
                </div>

                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 text-[#00d1ff] animate-spin" />
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMe = msg.sender_id === profile?.id;
                    return (
                      <div
                        key={msg.id || idx}
                        className={cn(
                          "flex flex-col max-w-[80%]",
                          isMe ? "ml-auto items-end" : "mr-auto items-start"
                        )}
                      >
                        {/* Message Bubble */}
                        <div className={cn(
                          "px-4 py-2.5 text-xs sm:text-sm leading-relaxed",
                          isMe
                            ? "bg-[#00d1ff] text-[#00131a] font-medium rounded-2xl rounded-br-sm shadow-[0_2px_12px_rgba(0,209,255,0.2)]"
                            : "bg-[#171b1f] text-[#f3f6f8] rounded-2xl rounded-bl-sm border border-[rgba(255,255,255,0.075)]"
                        )}>
                          {msg.content}
                        </div>

                        {/* Timestamp in mono */}
                        <span className="font-mono text-[9px] uppercase tracking-wider text-[#59636d] mt-1 px-1">
                          {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Now'}
                        </span>
                      </div>
                    );
                  })
                )}
                <div ref={scrollRef} />
              </div>

              {/* =================================================================== */}
              {/* THREAD BOTTOM CONTROLS                                              */}
              {/* Free users: Amber-tinted bar to pay ₦2,000 to reply                 */}
              {/* Premium users: Rounded input + Round cyan send button               */}
              {/* =================================================================== */}
              {!isSubscribed ? (
                <div className="p-4 bg-[#f2b04b]/10 border-t border-[#f2b04b]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#f2b04b]/20 flex items-center justify-center text-[#f2b04b] shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-[#f3f6f8]">
                        Pay the monthly fee to reply
                      </p>
                      <p className="text-[11px] text-[#f2b04b]/90">
                        ₦2,000 unlocks replies to {otherUserName} and everyone else.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSubscriptionModal(true)}
                    className="bg-[#00d1ff] hover:bg-[#33daff] text-[#00131a] font-bold px-4 py-2.5 rounded-xl text-xs tracking-wider uppercase shadow-[0_0_12px_rgba(0,209,255,0.3)] shrink-0 cursor-pointer text-center"
                  >
                    Pay ₦2,000
                  </button>
                </div>
              ) : (
                <form 
                  onSubmit={handleSendMessage}
                  className="p-3.5 bg-[#0f1215]/70 border-t border-[rgba(255,255,255,0.075)] flex items-center gap-2"
                >
                  <input 
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={`Message ${otherUserName}...`}
                    className="flex-1 bg-[#171b1f] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-2.5 text-xs sm:text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] outline-none"
                  />

                  {/* Round Cyan Send Button */}
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || uploading}
                    className="w-10 h-10 rounded-full bg-[#00d1ff] hover:bg-[#33daff] disabled:opacity-40 text-[#00131a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,209,255,0.3)] cursor-pointer transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#171b1f] flex items-center justify-center text-[#59636d]">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="font-serif text-2xl text-[#f3f6f8]">Select a conversation</h3>
              <p className="font-mono text-xs uppercase tracking-wider text-[#59636d] max-w-xs">
                CHOOSE A CONVERSATION FROM THE LEFT RAIL TO READ OR REPLY
              </p>
            </div>
          )}
        </div>
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        profile={profile}
        title="Unlock Message Replies"
        subtitle="Upgrade to VIP for ₦2,000 / month to send unlimited replies to all conversations."
      />
    </div>
  );
}
