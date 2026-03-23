import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, isSupabaseActive } from '../lib/supabase';
import { MOCK_CHATS, MOCK_MESSAGES, MOCK_USERS } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Send, ArrowLeft, MoreVertical, CheckCircle, Clock, Image, Mic, Paperclip, Lock, Eye, Zap, MoreHorizontal, Check, CheckCheck, Play, Pause, X, Loader2, Volume2, Trash2 } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { uploadBlobToR2, uploadToR2 } from '../lib/storage';
import imageCompression from 'browser-image-compression';
import { useToast } from '../components/Toaster';

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
        setRecordingError('Microphone access denied. Please enable it in your browser settings.');
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

export default function ChatRoomPage({ profile }: { profile: any }) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewFile, setPreviewFile] = useState<{ file: File, url: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);
  
  const { isRecording, recordingTime, audioBlob, recordingError, startRecording, stopRecording, cancelRecording, setAudioBlob } = useVoiceRecorder();

  const { toast } = useToast();

  useEffect(() => {
    if (recordingError) {
      toast(recordingError, 'error');
    }
  }, [recordingError, toast]);

  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [playingPreview, setPlayingPreview] = useState(false);
  const [playbackProgress, setPlaybackProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlayAudio = (url: string, id: string, isPreview: boolean = false) => {
    if (audioRef.current) {
      if (playingAudioId === id || (isPreview && playingPreview)) {
        audioRef.current.pause();
        setPlayingAudioId(null);
        setPlayingPreview(false);
        setPlaybackProgress(0);
        return;
      }
      audioRef.current.pause();
    }

    const audio = new Audio(url);
    audioRef.current = audio;
    
    if (isPreview) {
      setPlayingPreview(true);
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      setPlayingPreview(false);
    }

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPlaybackProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.play();
    audio.onended = () => {
      setPlayingAudioId(null);
      setPlayingPreview(false);
      setPlaybackProgress(0);
    };
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior });
    }, 100);
  }, []);

  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

  const markMessagesAsRead = useCallback(async (msgs: any[]) => {
    if (!isSupabaseActive || !profile?.id || !chatId) return;
    
    const unreadMsgs = msgs.filter(m => m.sender_id !== profile.id && m.status !== 'read');
    if (unreadMsgs.length === 0) return;

    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .in('id', unreadMsgs.map(m => m.id))
      .eq('chat_id', chatId);
    
    if (!error) {
      setMessages(prev => prev.map(m => 
        unreadMsgs.find(um => um.id === m.id) ? { ...m, status: 'read' } : m
      ));
    }
  }, [chatId, profile?.id]);

  const markMessagesAsDelivered = useCallback(async (msgs: any[]) => {
    if (!isSupabaseActive || !profile?.id || !chatId) return;
    
    const undeliveredMsgs = msgs.filter(m => m.sender_id !== profile.id && !m.status);
    if (undeliveredMsgs.length === 0) return;

    await supabase
      .from('messages')
      .update({ status: 'delivered' })
      .in('id', undeliveredMsgs.map(m => m.id))
      .eq('chat_id', chatId);
  }, [chatId, profile?.id]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!isSupabaseActive) {
      setMessages(prev => prev.map(m => {
        if (m.id === messageId) {
          const reactions = m.reactions || {};
          reactions[profile.id] = emoji;
          return { ...m, reactions };
        }
        return m;
      }));
      setActiveReactionMenu(null);
      return;
    }

    const msg = messages.find(m => m.id === messageId);
    const reactions = msg?.reactions || {};
    
    // Toggle reaction
    if (reactions[profile.id] === emoji) {
      delete reactions[profile.id];
    } else {
      reactions[profile.id] = emoji;
    }

    const { error } = await supabase
      .from('messages')
      .update({ reactions })
      .eq('id', messageId);
    
    if (!error) {
      setActiveReactionMenu(null);
    }
  };

  useEffect(() => {
    if (!chatId || !profile?.id) return;

    const fetchChatData = async () => {
      if (!isSupabaseActive) {
        const mockChat = MOCK_CHATS.find(c => c.id === chatId) || MOCK_CHATS[0];
        const otherUser = mockChat.participants.find(p => p.id !== profile.id) || mockChat.participants[1];
        setOtherUser(otherUser);
        setMessages(MOCK_MESSAGES.filter(m => m.chat_id === chatId));
        setLoading(false);
        scrollToBottom('auto');
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
        .order('created_at', { ascending: true });
      
      if (msgs) {
        setMessages(msgs);
        markMessagesAsRead(msgs);
      }
      setLoading(false);
      scrollToBottom('auto');
    };

    fetchChatData();

    if (!isSupabaseActive) return;

    // Real-time messages and presence
    const channel = supabase
      .channel(`chat-${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
        if (payload.new.sender_id !== profile.id) {
          markMessagesAsDelivered([payload.new]);
          markMessagesAsRead([payload.new]);
        }
        scrollToBottom();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, (payload) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = Object.values(state).flat().map((p: any) => p.user_id);
        const typing = Object.values(state).flat()
          .filter((p: any) => p.is_typing)
          .map((p: any) => p.user_id);
        
        setOnlineUsers(online);
        setTypingUsers(typing);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: profile.id,
            online_at: new Date().toISOString(),
            is_typing: false
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, profile?.id, scrollToBottom, markMessagesAsRead]);

  const sendTypingStatus = async (typing: boolean) => {
    if (!isSupabaseActive || !chatId) return;
    const channel = supabase.channel(`chat-${chatId}`);
    await channel.track({
      user_id: profile.id,
      online_at: new Date().toISOString(),
      is_typing: typing
    });
  };

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTypingStatus(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTypingStatus(false);
    }, 2000);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Strict file type check
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'audio/mpeg'];
    if (!allowedTypes.includes(file.type)) {
      toast('Only images (JPG, PNG, WEBP), videos (MP4), and audio (MP3) are allowed.', 'error');
      return;
    }

    // Max size 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast('Max file size is 10MB.', 'error');
      return;
    }

    setPreviewFile({ file, url: URL.createObjectURL(file) });
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!profile?.is_subscribed) return;
    if (!newMessage.trim() && !audioBlob && !previewFile) return;

    setUploading(true);
    setUploadProgress(10);

    let fileUrl = '';
    let voiceUrl = '';
    let messageType = 'text';

    try {
      if (audioBlob) {
        voiceUrl = await uploadBlobToR2(audioBlob, `chats/${chatId}/voice`, 'voice.mp3');
        messageType = 'voice';
        setAudioBlob(null);
      } else if (previewFile) {
        let fileToUpload = previewFile.file;
        
        // Auto compress images
        if (fileToUpload.type.startsWith('image/')) {
          const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
          fileToUpload = await imageCompression(fileToUpload, options);
        }

        fileUrl = await uploadToR2(fileToUpload, `chats/${chatId}/files`);
        messageType = fileToUpload.type.startsWith('image/') ? 'image' : fileToUpload.type.startsWith('video/') ? 'video' : 'audio';
        setPreviewFile(null);
      }

      const messageContent = newMessage.trim();
      const tempId = `temp-${Date.now()}`;
      const optimisticMsg = {
        id: tempId,
        chat_id: chatId,
        sender_id: profile.id,
        content: messageContent,
        file_url: fileUrl,
        voice_url: voiceUrl,
        message_type: messageType,
        created_at: new Date().toISOString(),
        status: 'sending'
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setNewMessage('');
      setUploadProgress(100);
      scrollToBottom();

      if (!isSupabaseActive) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'sent' } : m));
        return;
      }

      const { data: sentMsg, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: profile.id,
          content: messageContent,
          file_url: fileUrl,
          voice_url: voiceUrl,
          message_type: messageType,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        toast('Failed to send message', 'error');
        throw error;
      }

      // Replace optimistic message with real one
      setMessages(prev => prev.map(m => m.id === tempId ? sentMsg : m));

      if (!error) {
        await supabase
          .from('chats')
          .update({
            last_message: messageType === 'text' ? messageContent : `Sent a ${messageType}`,
            last_timestamp: new Date().toISOString()
          })
          .eq('id', chatId);

        // Send Push Notification to other user
        if (otherUser?.push_token) {
          try {
            await fetch('/api/send-notification', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: otherUser.push_token,
                title: `New message from ${profile.username}`,
                body: messageType === 'text' ? messageContent : `Sent a ${messageType}`,
                data: { chatId }
              })
            });
          } catch (err) {
            console.error('Error triggering push notification:', err);
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-brand-dark">
      <div className="w-12 h-12 border-4 border-brand-blue border-t-transparent rounded-full animate-spin shadow-[0_0_20px_rgba(0,209,255,0.3)]" />
    </div>
  );

  const isSubscribed = profile?.is_subscribed;

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-160px)] max-w-[600px] mx-auto bg-black/40 border border-white/10 rounded-[40px] overflow-hidden shadow-2xl relative backdrop-blur-3xl">
      {/* Premium Background Animation */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
            opacity: [0.1, 0.2, 0.1]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-gradient-to-br from-brand-blue/20 via-blue-600/10 to-purple-600/20 blur-[120px] rounded-full"
        />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
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
              <span className={cn(
                "text-[10px] uppercase tracking-widest font-bold transition-all",
                onlineUsers.includes(otherUser?.id) ? "text-brand-blue animate-pulse" : "text-white/20"
              )}>
                {onlineUsers.includes(otherUser?.id) ? 'Online' : 'Offline'}
              </span>
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
      <div className={cn(
        "flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide z-10 transition-all duration-500",
        !isSubscribed && "blur-sm pointer-events-none"
      )}>
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
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn(
                  "flex flex-col max-w-[80%] group",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div 
                  onDoubleClick={() => setActiveReactionMenu(msg.id)}
                  className={cn(
                    "relative p-4 rounded-[20px] text-sm leading-relaxed font-medium transition-all group-hover:scale-[1.02] shadow-xl cursor-pointer",
                    isMe 
                      ? "bg-gradient-to-br from-brand-blue to-purple-600 text-white rounded-tr-none" 
                      : "bg-white/10 text-white/90 rounded-tl-none border border-white/10 backdrop-blur-xl"
                  )}
                >
                  {msg.message_type === 'text' && msg.content}
                  
                  {msg.message_type === 'voice' && (
                    <div className="flex items-center gap-3 min-w-[180px]">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlayAudio(msg.voice_url, msg.id);
                        }}
                        className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                      >
                        {playingAudioId === msg.id ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-1" />
                        )}
                      </button>
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: playingAudioId === msg.id ? `${playbackProgress}%` : '0%' }}
                          transition={{ duration: 0.1, ease: "linear" }}
                          className="h-full bg-white/60" 
                        />
                      </div>
                      <Volume2 className="w-4 h-4 opacity-50" />
                    </div>
                  )}

                  {msg.message_type === 'image' && (
                    <div className="space-y-2">
                      <img 
                        src={msg.file_url} 
                        className="rounded-xl max-h-60 object-cover cursor-pointer hover:opacity-90 transition-opacity" 
                        alt="Shared media"
                        onClick={() => window.open(msg.file_url, '_blank')}
                      />
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                  )}

                  {msg.message_type === 'video' && (
                    <div className="space-y-2">
                      <video 
                        src={msg.file_url} 
                        className="rounded-xl max-h-60 object-cover" 
                        controls
                      />
                      {msg.content && <p>{msg.content}</p>}
                    </div>
                  )}

                  {/* Reactions Display */}
                  {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                    <div className={cn(
                      "absolute -bottom-3 flex gap-1",
                      isMe ? "right-0" : "left-0"
                    )}>
                      {Object.entries(msg.reactions).map(([uid, emoji]: [string, any]) => (
                        <div key={uid} className="bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-0.5 text-[10px] shadow-lg">
                          {emoji}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reaction Menu */}
                  <AnimatePresence>
                    {activeReactionMenu === msg.id && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        className={cn(
                          "absolute -top-12 z-50 flex gap-2 p-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl",
                          isMe ? "right-0" : "left-0"
                        )}
                      >
                        {['❤️', '👍', '🔥', '😂', '😮', '😢'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReaction(msg.id, emoji);
                            }}
                            className="hover:scale-125 transition-transform text-lg"
                          >
                            {emoji}
                          </button>
                        ))}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReactionMenu(null);
                          }}
                          className="ml-1 p-1 hover:bg-white/10 rounded-full"
                        >
                          <X className="w-3 h-3 text-white/40" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                <div className="flex items-center gap-2 mt-1.5 px-1">
                  <span className="text-[9px] font-bold text-white/20">
                    {msg.created_at ? format(new Date(msg.created_at), 'h:mm a') : '...'}
                  </span>
                  {isMe && (
                    <div className="flex items-center">
                      {msg.status === 'read' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-brand-blue" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-white/40" />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-white/20" />
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {typingUsers.includes(otherUser?.id) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 mr-auto"
          >
            <div className="flex items-center gap-1 p-3 rounded-full bg-white/5 border border-white/10">
              <div className="w-1 h-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 rounded-full bg-brand-blue animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-brand-blue animate-bounce" />
            </div>
            <span className="text-[8px] uppercase tracking-widest font-bold text-white/20">{otherUser?.username} is typing...</span>
          </motion.div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Subscription Overlay */}
      {!isSubscribed && (
        <div className="absolute inset-x-0 bottom-0 top-24 z-20 flex items-center justify-center bg-black/20 backdrop-blur-md">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center p-12 space-y-6"
          >
            <div className="w-20 h-20 rounded-[32px] bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center mx-auto mb-8">
              <Lock className="w-10 h-10 text-brand-blue" />
            </div>
            <h3 className="text-3xl font-display uppercase italic tracking-tighter">Subscription Required</h3>
            <p className="text-white/40 text-sm max-w-[280px] mx-auto leading-relaxed">
              Unlock the full premium experience and start chatting with elite members.
            </p>
            <button 
              onClick={() => navigate('/wallet')}
              className="px-12 py-5 bg-brand-blue text-brand-dark font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-[0_20px_40px_rgba(0,209,255,0.3)] hover:scale-105 active:scale-95 transition-all"
            >
              Subscribe to Start Chatting
            </button>
          </motion.div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-6 bg-black/60 backdrop-blur-3xl border-t border-white/5 z-30">
        {/* File Preview */}
        {previewFile && (
          <div className="mb-4 p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {previewFile.file.type.startsWith('image/') ? (
                <img src={previewFile.url} className="w-12 h-12 rounded-xl object-cover" alt="Preview" />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center">
                  <Paperclip className="w-6 h-6 text-brand-blue" />
                </div>
              )}
              <div className="text-left">
                <p className="text-xs font-bold truncate max-w-[150px]">{previewFile.file.name}</p>
                <p className="text-[10px] text-white/20 uppercase tracking-widest">Ready to send</p>
              </div>
            </div>
            <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>
        )}

        {/* Voice Recording UI */}
        {isRecording && (
          <div className="mb-4 p-6 rounded-3xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-between animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
              <span className="text-sm font-mono font-bold text-brand-blue">
                {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
              </span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ height: [4, 16, 4] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1 bg-brand-blue rounded-full"
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={cancelRecording} className="p-3 hover:bg-red-500/10 rounded-2xl transition-colors">
                <Trash2 className="w-5 h-5 text-red-500" />
              </button>
              <button onClick={stopRecording} className="px-6 py-2 bg-brand-blue text-brand-dark font-bold uppercase tracking-widest text-[10px] rounded-xl">
                Done
              </button>
            </div>
          </div>
        )}

        {/* Audio Preview */}
        {audioBlob && !isRecording && (
          <div className="mb-4 p-4 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <button 
                onClick={() => handlePlayAudio(URL.createObjectURL(audioBlob), 'preview', true)}
                className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center hover:bg-brand-blue/20 transition-colors"
              >
                {playingPreview ? (
                  <Pause className="w-6 h-6 text-brand-blue" />
                ) : (
                  <Play className="w-6 h-6 text-brand-blue ml-1" />
                )}
              </button>
              <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                  <p className="text-xs font-bold">Voice Note Preview</p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest">Listen before sending</p>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: playingPreview ? `${playbackProgress}%` : '0%' }}
                    className="h-full bg-brand-blue"
                  />
                </div>
              </div>
            </div>
            <button onClick={() => setAudioBlob(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors ml-4">
              <X className="w-5 h-5 text-white/40" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            accept="image/*,video/mp4,audio/mpeg"
          />
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()}
            disabled={!isSubscribed || isRecording}
            className="p-4 text-white/20 hover:text-brand-blue transition-all hover:scale-110 active:scale-90 disabled:opacity-20"
          >
            <Paperclip className="w-6 h-6" />
          </button>
          
          <div className="flex-1 relative group">
            <input 
              type="text" 
              value={newMessage}
              onChange={handleTyping}
              disabled={!isSubscribed || isRecording}
              placeholder={isSubscribed ? "Type a premium message..." : "Subscribe to start chatting"}
              className="w-full bg-white/5 border border-white/10 rounded-[24px] py-4 px-6 focus:outline-none focus:border-brand-blue/50 transition-all text-sm font-bold placeholder:text-white/10 disabled:opacity-50"
            />
            
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {uploading ? (
                <Loader2 className="w-6 h-6 text-brand-blue animate-spin" />
              ) : (
                <button 
                  type="button" 
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  disabled={!isSubscribed}
                  className={cn(
                    "p-3 transition-all hover:scale-110 active:scale-90 disabled:opacity-20",
                    isRecording ? "text-red-500" : "text-white/20 hover:text-brand-blue"
                  )}
                >
                  <Mic className="w-6 h-6" />
                </button>
              )}
            </div>
          </div>

          <button 
            type="submit"
            disabled={!isSubscribed || (!newMessage.trim() && !audioBlob && !previewFile) || uploading}
            className="p-4 bg-brand-blue text-brand-dark rounded-[20px] shadow-[0_10px_30px_rgba(0,209,255,0.3)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 disabled:shadow-none"
          >
            <Send className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
}

