import { useState, useEffect } from 'react';
import { db, collection, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  MessageSquare, 
  CreditCard, 
  Shield, 
  Eye, 
  Check, 
  Trash2, 
  ChevronRight,
  Clock,
  AlertCircle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toaster';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function NotificationsPage({ profile }: { profile: any }) {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    const q = query(collection(db, 'notifications'), where('user_id', '==', profile.id));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setNotifications(list);
      setLoading(false);
    }, (error) => {
      console.error('Notifications snapshot error:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.id]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      const q = query(collection(db, 'notifications'), where('user_id', '==', profile.id), where('is_read', '==', false));
      const snapshot = await getDocs(q);
      const updates = snapshot.docs.map(d => updateDoc(doc(db, 'notifications', d.id), { is_read: true }));
      await Promise.all(updates);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      toast('All notifications marked as read', 'success');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const clearAll = async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'notifications'), where('user_id', '==', profile.id)));
      const deletes = snapshot.docs.map(d => deleteDoc(doc(db, 'notifications', d.id)));
      await Promise.all(deletes);
      setNotifications([]);
      toast('All notifications cleared', 'success');
    } catch (error: any) {
      toast(error.message, 'error');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'message': return MessageSquare;
      case 'tip': return CreditCard;
      case 'subscription': return Shield;
      case 'view': return Eye;
      default: return Bell;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'message': return 'text-blue-400';
      case 'tip': return 'text-emerald-400';
      case 'subscription': return 'text-brand-blue';
      case 'view': return 'text-purple-400';
      default: return 'text-white/40';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-blue/10 border border-brand-blue/20 flex items-center justify-center">
            <Bell className="w-6 h-6 text-brand-blue" />
          </div>
          <div>
            <h1 className="text-3xl font-display uppercase tracking-tighter italic">Notifications</h1>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Stay updated with your activity</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={markAllAsRead}
            className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-all group"
            title="Mark all as read"
          >
            <Check className="w-4 h-4 text-white/40 group-hover:text-white" />
          </button>
          <button 
            onClick={clearAll}
            className="p-3 bg-red-500/5 rounded-xl border border-red-500/10 hover:bg-red-500/10 transition-all group"
            title="Clear all"
          >
            <Trash2 className="w-4 h-4 text-red-500/40 group-hover:text-red-500" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white/5 rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : notifications.length > 0 ? (
          <AnimatePresence mode="popLayout">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "group relative p-6 rounded-[32px] border transition-all hover:scale-[1.01] active:scale-[0.99]",
                    notification.is_read 
                      ? "bg-white/5 border-white/10" 
                      : "bg-brand-blue/5 border-brand-blue/20"
                  )}
                >
                  <div className="flex items-start gap-6">
                    <div className={cn(
                      "p-4 rounded-2xl bg-black/40 border border-white/5",
                      getIconColor(notification.type)
                    )}>
                      <Icon className="w-6 h-6" />
                    </div>
                    
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h3 className={cn(
                          "font-bold uppercase tracking-widest text-xs",
                          !notification.is_read && "text-brand-blue"
                        )}>
                          {notification.title}
                        </h3>
                        <div className="flex items-center gap-2 text-[10px] text-white/30 uppercase tracking-widest font-bold">
                          <Clock className="w-3 h-3" />
                          {new Date(notification.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-white/60 leading-relaxed">{notification.message}</p>
                      
                      {notification.link && (
                        <Link 
                          to={notification.link}
                          onClick={() => markAsRead(notification.id)}
                          className="inline-flex items-center gap-2 mt-4 text-[10px] font-bold uppercase tracking-widest text-brand-blue hover:underline"
                        >
                          View Details <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>

                    {!notification.is_read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="p-2 bg-brand-blue/10 rounded-lg text-brand-blue hover:bg-brand-blue/20 transition-all"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-6 bg-white/5 rounded-[48px] border border-dashed border-white/10">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <Bell className="w-10 h-10 text-white/10" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-display italic tracking-tight text-white/40">All caught up!</h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-white/20">No new notifications at the moment</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
