import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db, doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, onSnapshot } from '../lib/firebase';
import { MOCK_CHATS, MOCK_MESSAGES } from '../lib/mockData';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Send, 
  ArrowLeft, 
  MoreVertical, 
  Lock, 
  Check, 
  CheckCheck, 
  Play, 
  Pause, 
  X, 
  Loader2, 
  Volume2, 
  Paperclip,
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useToast } from '../components/Toaster';
import { SubscriptionModal } from '../components/SubscriptionModal';

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
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  const isSubscribed = Boolean(profile?.is_subscribed);

  useEffect(() => {
    if (!chatId || !profile?.id) return;

    const fetchChatData = async () => {
      setLoading(true);
      try {
        const chatSnap = await getDoc(doc(db, 'chats', chatId));
        if (chatSnap.exists()) {
          const chatData = chatSnap.data();
          const otherUid = chatData.participants?.find((id: string) => id !== profile.id);
          if (otherUid) {
            const userSnap = await getDoc(doc(db, 'profiles', otherUid));
            if (userSnap.exists()) {
              setOtherUser({ id: userSnap.id, ...userSnap.data() });
            } else {
              setOtherUser({ username: 'Member', state: 'Lagos', area: 'Victoria Island' });
            }
          }
        }
      } catch (err) {
        console.warn('Error loading chat:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChatData();

    const q = query(collection(db, 'messages'), where('chat_id', '==', chatId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: any[] = [];
      snapshot.forEach((d) => msgs.push({ id: d.id, ...d.data() }));
      msgs.sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, (err) => {
      console.warn('Error fetching messages snapshot:', err);
    });

    return () => unsubscribe();
  }, [chatId, profile?.id]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !chatId) return;
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
      return;
    }

    const textToSend = newMessage.trim();
    setNewMessage('');
    setUploading(true);

    try {
      await addDoc(collection(db, 'messages'), {
        chat_id: chatId,
        sender_id: profile.id,
        content: textToSend,
        message_type: 'text',
        created_at: new Date().toISOString()
      });

      await updateDoc(doc(db, 'chats', chatId), {
        last_message: textToSend,
        last_timestamp: new Date().toISOString()
      });

      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Error sending message:', err);
      toast('Failed to send message', 'error');
    } finally {
      setUploading(false);
    }
  };

  const otherUserName = otherUser?.display_name || otherUser?.username || 'Member';
  const otherUserLocation = `${otherUser?.area || 'Victoria Island'}, ${otherUser?.state || 'Lagos'} · Online now`;

  if (loading) {
    return (
      <div className="h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#00d1ff] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-24 pt-1 space-y-3">
      {/* THREAD CONTAINER */}
      <div className="bg-[#090b0d] border border-[rgba(255,255,255,0.075)] rounded-[24px] flex flex-col h-[640px] overflow-hidden shadow-2xl relative">
        
        {/* Thread Header: avatar, serif name, "Area, State · Online now" */}
        <div className="px-5 py-3.5 border-b border-[rgba(255,255,255,0.075)] flex items-center justify-between bg-[#0f1215]/80 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/chats')}
              className="p-1.5 rounded-full hover:bg-[#171b1f] text-[#8d97a1] hover:text-[#f3f6f8] cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <img 
              src={otherUser?.photo_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`}
              alt={otherUserName}
              className="w-10 h-10 rounded-full object-cover border border-[rgba(255,255,255,0.1)]"
            />

            <div>
              <h3 className="font-serif text-xl text-[#f3f6f8] font-normal leading-tight">
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

        {/* Bubbles: received = surface-3 (#171b1f) tail bottom-left, Sent = cyan with dark text tail bottom-right */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          <div className="text-center py-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#59636d] px-3 py-1 rounded-full bg-[#0f1215] border border-[rgba(255,255,255,0.05)]">
              MESSAGES ARE END-TO-END ENCRYPTED
            </span>
          </div>

          {messages.map((msg, idx) => {
            const isMe = msg.sender_id === profile?.id;
            return (
              <div
                key={msg.id || idx}
                className={cn(
                  "flex flex-col max-w-[80%]",
                  isMe ? "ml-auto items-end" : "mr-auto items-start"
                )}
              >
                <div className={cn(
                  "px-4 py-2.5 text-xs sm:text-sm leading-relaxed",
                  isMe
                    ? "bg-[#00d1ff] text-[#00131a] font-medium rounded-2xl rounded-br-sm shadow-[0_2px_12px_rgba(0,209,255,0.2)]"
                    : "bg-[#171b1f] text-[#f3f6f8] rounded-2xl rounded-bl-sm border border-[rgba(255,255,255,0.075)]"
                )}>
                  {msg.content}
                </div>

                <span className="font-mono text-[9px] uppercase tracking-wider text-[#59636d] mt-1 px-1">
                  {msg.created_at ? format(new Date(msg.created_at), 'HH:mm') : 'Now'}
                </span>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Bottom controls:
            Free users: amber-tinted bar: lock icon, "Pay the monthly fee to reply", "₦2,000 unlocks replies to <first name> and everyone else", small "Pay ₦2,000" button.
            Premium users: normal rounded input and round cyan send button.
        */}
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
            className="p-3.5 bg-[#0f1215]/80 border-t border-[rgba(255,255,255,0.075)] flex items-center gap-2"
          >
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${otherUserName}...`}
              className="flex-1 bg-[#171b1f] border border-[rgba(255,255,255,0.1)] rounded-full px-5 py-2.5 text-xs sm:text-sm text-[#f3f6f8] placeholder-[#59636d] focus:border-[#00d1ff] outline-none"
            />

            <button
              type="submit"
              disabled={!newMessage.trim() || uploading}
              className="w-10 h-10 rounded-full bg-[#00d1ff] hover:bg-[#33daff] disabled:opacity-40 text-[#00131a] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,209,255,0.3)] cursor-pointer transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        profile={profile}
        title="Unlock Message Replies"
        subtitle={`₦2,000 unlocks replies to ${otherUserName} and everyone else across Nigeria.`}
      />
    </div>
  );
}
