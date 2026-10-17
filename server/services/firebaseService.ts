import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Firestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import fs from 'fs';
import path from 'path';

let firebaseConfig: any = {};
try {
  const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json', e);
}

// In-memory fallback cache if server environment lacks Admin IAM credentials
const memoryStore = {
  wallet: new Map<string, number>(),
  transactions: new Set<string>(),
  subscriptions: new Map<string, any>(),
  profileViews: new Set<string>(),
  profiles: new Map<string, any>(),
  chats: new Map<string, any>(),
  messages: new Map<string, any[]>(),
  userDailyStats: new Map<string, any>(),
};

// Initialize Firebase Admin
let firebaseAdminApp: App;
if (!getApps().length) {
  firebaseAdminApp = initializeApp({
    projectId: firebaseConfig.projectId,
  });
} else {
  firebaseAdminApp = getApps()[0];
}

const firestoreDb: Firestore = getFirestore(
  firebaseAdminApp,
  firebaseConfig.firestoreDatabaseId || undefined
);

const adminAuth: Auth = getAuth(firebaseAdminApp);
const messaging: Messaging = getMessaging(firebaseAdminApp);

console.log(`Firebase Admin initialized. Project: ${firebaseConfig.projectId}, Database: ${firebaseConfig.firestoreDatabaseId}`);

export { firebaseAdminApp, firestoreDb, adminAuth, messaging, FieldValue, memoryStore };

/**
 * Increment a user's wallet balance atomically (with fallback)
 */
export async function incrementUserWallet(userId: string, amount: number): Promise<number> {
  try {
    const walletRef = firestoreDb.collection('wallet').doc(userId);
    const profileRef = firestoreDb.collection('profiles').doc(userId);

    return await firestoreDb.runTransaction(async (transaction) => {
      const walletDoc = await transaction.get(walletRef);
      let currentBalance = 0;

      if (walletDoc.exists) {
        currentBalance = Number(walletDoc.data()?.balance) || 0;
      }

      const newBalance = currentBalance + amount;

      transaction.set(
        walletRef,
        {
          profile_id: userId,
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      transaction.set(
        profileRef,
        {
          balance: newBalance,
          updated_at: new Date().toISOString(),
        },
        { merge: true }
      );

      memoryStore.wallet.set(userId, newBalance);
      return newBalance;
    });
  } catch (error: any) {
    console.warn('Firestore Admin transaction fallback to local cache:', error.message);
    const prev = memoryStore.wallet.get(userId) || 0;
    const next = prev + amount;
    memoryStore.wallet.set(userId, next);
    return next;
  }
}

/**
 * Check if transaction reference was already recorded (Idempotency)
 */
export async function isTransactionProcessed(reference: string): Promise<boolean> {
  if (memoryStore.transactions.has(reference)) {
    return true;
  }

  try {
    const snapshot = await firestoreDb
      .collection('transactions')
      .where('reference', '==', reference)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error: any) {
    console.warn('Firestore Admin read fallback to memory cache:', error.message);
    return memoryStore.transactions.has(reference);
  }
}

/**
 * Save a new transaction record
 */
export async function saveTransaction(txData: {
  profile_id?: string;
  user_id?: string;
  amount: number;
  reference: string;
  status: string;
  type: string;
  description?: string;
  metadata?: any;
}) {
  const normalizedData = {
    ...txData,
    profile_id: txData.profile_id || txData.user_id,
    user_id: txData.user_id || txData.profile_id,
    created_at: new Date().toISOString(),
  };

  memoryStore.transactions.add(txData.reference);

  try {
    const docRef = await firestoreDb.collection('transactions').add(normalizedData);
    return { id: docRef.id, ...normalizedData };
  } catch (error: any) {
    console.warn('Firestore Admin write fallback to memory cache:', error.message);
    return { id: `local-${Date.now()}`, ...normalizedData };
  }
}

/**
 * Update user subscription status
 */
export async function updateUserSubscription(
  userId: string,
  updates: {
    is_subscribed: boolean;
    subscription_status: string;
    subscription_expiry?: string;
    authorization_code?: string | null;
    next_billing_date?: string | null;
  }
) {
  memoryStore.subscriptions.set(userId, updates);

  try {
    const profileRef = firestoreDb.collection('profiles').doc(userId);
    await profileRef.set(
      {
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error: any) {
    console.warn('Firestore Admin update fallback to memory cache:', error.message);
  }
}

/**
 * Pure calculation of profile completeness score (0 to 100%)
 */
export function calculateProfileStrength(profile: any): number {
  if (!profile) return 0;
  let score = 0;

  // 1. Gender chosen: 10
  if (profile.gender && typeof profile.gender === 'string' && profile.gender.trim() !== '') {
    score += 10;
  }

  // 2. Desired companionship tag chosen: 15
  const vibe = 
    (typeof profile.vibe === 'string' && profile.vibe.trim()) ||
    (typeof profile.looking_for === 'string' && profile.looking_for.trim()) ||
    (profile.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences) && typeof (profile.preferences as any).vibe === 'string' && (profile.preferences as any).vibe.trim()) ||
    '';
  if (vibe) {
    score += 15;
  }

  // 3. Location set (state and city): 15
  const stateVal = typeof profile.state === 'string' ? profile.state.trim() : '';
  const cityVal = 
    (typeof profile.city === 'string' && profile.city.trim()) ||
    (typeof profile.area === 'string' && profile.area.trim()) ||
    (profile.location && typeof profile.location === 'object' && typeof profile.location.city === 'string' && profile.location.city.trim()) ||
    (typeof profile.location === 'string' && profile.location.trim().toLowerCase() !== stateVal.toLowerCase() ? profile.location.trim() : '') ||
    '';

  if (stateVal !== '' && cityVal !== '') {
    score += 15;
  }

  // 4. Photos: 20 for first 2, then 5 for each extra photo up to 6 photos (max 40)
  const photoSet = new Set<string>();
  if (Array.isArray(profile.photos)) {
    profile.photos.forEach((p: any) => {
      if (typeof p === 'string' && p.trim()) photoSet.add(p.trim());
    });
  }
  if (Array.isArray(profile.gallery)) {
    profile.gallery.forEach((p: any) => {
      if (typeof p === 'string' && p.trim()) photoSet.add(p.trim());
    });
  }
  if (typeof profile.photo_url === 'string' && profile.photo_url.trim()) {
    photoSet.add(profile.photo_url.trim());
  }

  const photoCount = photoSet.size;
  if (photoCount >= 2) {
    score += 20 + Math.min(4, photoCount - 2) * 5;
  } else if (photoCount === 1) {
    score += 10;
  }

  // 5. Bio filled in (at least 20 characters): 15
  if (profile.bio && typeof profile.bio === 'string' && profile.bio.trim().length >= 20) {
    score += 15;
  }

  // 6. Active subscriber: 5
  if (profile.is_subscribed === true || profile.subscription_status === 'active') {
    score += 5;
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * 1. Record Profile View Server-side (Deduplicated 1 per viewer per owner per day)
 */
export async function recordProfileViewServer(viewerId: string, ownerId: string): Promise<{ incremented: boolean; views?: number; reason?: string }> {
  if (!viewerId || !ownerId || viewerId === ownerId) {
    return { incremented: false, reason: 'self_or_invalid' };
  }

  const today = new Date().toISOString().slice(0, 10);
  const docId = `${viewerId}_${ownerId}_${today}`;

  // Check in-memory store
  if (memoryStore.profileViews.has(docId)) {
    return { incremented: false, reason: 'already_viewed_today' };
  }

  try {
    const viewRef = firestoreDb.collection('profileViews').doc(docId);
    const viewDoc = await viewRef.get();

    if (viewDoc.exists) {
      memoryStore.profileViews.add(docId);
      return { incremented: false, reason: 'already_viewed_today' };
    }

    // Save view record
    await viewRef.set({
      id: docId,
      viewer_id: viewerId,
      owner_id: ownerId,
      date: today,
      created_at: new Date().toISOString()
    });
    memoryStore.profileViews.add(docId);

    // Atomically increment views counter on owner's profile
    const profileRef = firestoreDb.collection('profiles').doc(ownerId);
    await profileRef.set({
      views: FieldValue.increment(1),
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Also update daily stats for chart
    const dailyStatRef = firestoreDb.collection('user_daily_stats').doc(`${ownerId}_${today}`);
    await dailyStatRef.set({
      user_id: ownerId,
      date: today,
      views: FieldValue.increment(1),
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Read updated views
    const updatedSnap = await profileRef.get();
    const updatedViews = updatedSnap.data()?.views || 1;
    return { incremented: true, views: updatedViews };
  } catch (error: any) {
    console.warn('Firestore Admin view record fallback to memoryStore:', error.message);
    memoryStore.profileViews.add(docId);

    const prevProfile = memoryStore.profiles.get(ownerId) || { views: 0 };
    prevProfile.views = (prevProfile.views || 0) + 1;
    memoryStore.profiles.set(ownerId, prevProfile);

    const statKey = `${ownerId}_${today}`;
    const prevStat = memoryStore.userDailyStats.get(statKey) || { user_id: ownerId, date: today, views: 0 };
    prevStat.views = (prevStat.views || 0) + 1;
    memoryStore.userDailyStats.set(statKey, prevStat);

    return { incremented: true, views: prevProfile.views };
  }
}

/**
 * 2. Check and evaluate conversation connection (Both sides sent at least 1 message)
 */
export async function checkAndUpdateConversationConnectionServer(chatId: string): Promise<{ is_connected: boolean; newlyConnected: boolean }> {
  if (!chatId) return { is_connected: false, newlyConnected: false };

  try {
    const chatRef = firestoreDb.collection('chats').doc(chatId);
    const chatDoc = await chatRef.get();

    let chatData: any = null;
    if (chatDoc.exists) {
      chatData = chatDoc.data();
    } else {
      chatData = memoryStore.chats.get(chatId);
    }

    if (!chatData) {
      return { is_connected: false, newlyConnected: false };
    }

    if (chatData.is_connected === true) {
      return { is_connected: true, newlyConnected: false };
    }

    // Read messages for this chat
    const messagesSnap = await firestoreDb.collection('messages').where('chat_id', '==', chatId).get();
    const senders = new Set<string>();

    messagesSnap.forEach(d => {
      const s = d.data()?.sender_id;
      if (s) senders.add(s);
    });

    // Also check memoryStore fallback
    const memMsgs = memoryStore.messages.get(chatId) || [];
    memMsgs.forEach(m => {
      if (m.sender_id) senders.add(m.sender_id);
    });

    const participants: string[] = chatData.participants || [];
    const bothHaveMessaged = participants.length >= 2 && participants.every(p => senders.has(p));

    if (bothHaveMessaged) {
      const today = new Date().toISOString().slice(0, 10);
      
      // Update chat document to mark connected
      await chatRef.set({
        is_connected: true,
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { merge: true });

      chatData.is_connected = true;
      memoryStore.chats.set(chatId, chatData);

      // Increment connections counter for both participants
      for (const p of participants) {
        const profileRef = firestoreDb.collection('profiles').doc(p);
        await profileRef.set({
          connections: FieldValue.increment(1),
          updated_at: new Date().toISOString()
        }, { merge: true });

        // Update daily stats for chart
        const statRef = firestoreDb.collection('user_daily_stats').doc(`${p}_${today}`);
        await statRef.set({
          user_id: p,
          date: today,
          new_connections: FieldValue.increment(1),
          updated_at: new Date().toISOString()
        }, { merge: true });

        // Memory fallback
        const memP = memoryStore.profiles.get(p) || { connections: 0 };
        memP.connections = (memP.connections || 0) + 1;
        memoryStore.profiles.set(p, memP);

        const statKey = `${p}_${today}`;
        const memStat = memoryStore.userDailyStats.get(statKey) || { user_id: p, date: today, new_connections: 0 };
        memStat.new_connections = (memStat.new_connections || 0) + 1;
        memoryStore.userDailyStats.set(statKey, memStat);
      }

      return { is_connected: true, newlyConnected: true };
    }

    return { is_connected: false, newlyConnected: false };
  } catch (error: any) {
    console.warn('Firestore Admin connection check fallback:', error.message);
    const chatData = memoryStore.chats.get(chatId);
    if (!chatData) return { is_connected: false, newlyConnected: false };
    if (chatData.is_connected) return { is_connected: true, newlyConnected: false };

    const memMsgs = memoryStore.messages.get(chatId) || [];
    const senders = new Set(memMsgs.map(m => m.sender_id));
    const participants: string[] = chatData.participants || [];
    if (participants.length >= 2 && participants.every(p => senders.has(p))) {
      chatData.is_connected = true;
      memoryStore.chats.set(chatId, chatData);
      participants.forEach(p => {
        const memP = memoryStore.profiles.get(p) || { connections: 0 };
        memP.connections = (memP.connections || 0) + 1;
        memoryStore.profiles.set(p, memP);
      });
      return { is_connected: true, newlyConnected: true };
    }
    return { is_connected: false, newlyConnected: false };
  }
}

/**
 * 2b. Delete conversation and subtract connections if was connected
 */
export async function handleDeleteConversationServer(chatId: string, requestedByUserId?: string) {
  if (!chatId) return { success: false, error: 'chatId is required' };

  try {
    const chatRef = firestoreDb.collection('chats').doc(chatId);
    let chatData: any = null;
    try {
      const chatDoc = await chatRef.get();
      if (chatDoc.exists) {
        chatData = chatDoc.data();
      }
    } catch (e) {
      // fallback
    }

    if (!chatData) {
      chatData = memoryStore.chats.get(chatId);
    }

    const wasConnected = chatData?.is_connected === true;
    const participants: string[] = chatData?.participants || [];
    const today = new Date().toISOString().slice(0, 10);

    if (wasConnected && participants.length > 0) {
      for (const p of participants) {
        try {
          const profileRef = firestoreDb.collection('profiles').doc(p);
          const pDoc = await profileRef.get();
          if (pDoc.exists) {
            const cur = Number(pDoc.data()?.connections) || 0;
            const next = Math.max(0, cur - 1);
            await profileRef.set({ connections: next, updated_at: new Date().toISOString() }, { merge: true });
          }
        } catch (e) {
          // ignore
        }

        try {
          const statRef = firestoreDb.collection('user_daily_stats').doc(`${p}_${today}`);
          await statRef.set({
            user_id: p,
            date: today,
            new_connections: FieldValue.increment(-1),
            updated_at: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          // ignore
        }

        const memP = memoryStore.profiles.get(p);
        if (memP) {
          memP.connections = Math.max(0, (memP.connections || 0) - 1);
          memoryStore.profiles.set(p, memP);
        }
      }
    }

    // Delete chat and its messages
    try {
      await chatRef.delete();
      const msgs = await firestoreDb.collection('messages').where('chat_id', '==', chatId).get();
      const batch = firestoreDb.batch();
      msgs.forEach(m => batch.delete(m.ref));
      await batch.commit();
    } catch (e) {
      // fallback
    }

    memoryStore.chats.delete(chatId);
    memoryStore.messages.delete(chatId);

    return { success: true, wasConnected };
  } catch (error: any) {
    console.error('Error deleting conversation on server:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 2c. Delete account and subtract connections from partner in connected conversations
 */
export async function handleDeleteAccountServer(userId: string) {
  if (!userId) return { success: false, error: 'userId is required' };

  try {
    const today = new Date().toISOString().slice(0, 10);

    let connectedChats: any[] = [];
    try {
      const snap = await firestoreDb.collection('chats').where('participants', 'array-contains', userId).get();
      snap.forEach(d => {
        const data = d.data();
        if (data?.is_connected === true) {
          connectedChats.push({ id: d.id, ...data });
        }
      });
    } catch (e) {
      for (const [cId, chat] of memoryStore.chats.entries()) {
        if (chat.participants?.includes(userId) && chat.is_connected) {
          connectedChats.push({ id: cId, ...chat });
        }
      }
    }

    for (const chat of connectedChats) {
      const otherParticipant = (chat.participants || []).find((p: string) => p !== userId);
      if (otherParticipant) {
        try {
          const profileRef = firestoreDb.collection('profiles').doc(otherParticipant);
          const pDoc = await profileRef.get();
          if (pDoc.exists) {
            const cur = Number(pDoc.data()?.connections) || 0;
            const next = Math.max(0, cur - 1);
            await profileRef.set({ connections: next, updated_at: new Date().toISOString() }, { merge: true });
          }

          const statRef = firestoreDb.collection('user_daily_stats').doc(`${otherParticipant}_${today}`);
          await statRef.set({
            user_id: otherParticipant,
            date: today,
            new_connections: FieldValue.increment(-1),
            updated_at: new Date().toISOString()
          }, { merge: true });
        } catch (e) {
          // ignore
        }

        const memOther = memoryStore.profiles.get(otherParticipant);
        if (memOther) {
          memOther.connections = Math.max(0, (memOther.connections || 0) - 1);
          memoryStore.profiles.set(otherParticipant, memOther);
        }
      }

      try {
        await firestoreDb.collection('chats').doc(chat.id).delete();
      } catch (e) {}
      memoryStore.chats.delete(chat.id);
    }

    try {
      await firestoreDb.collection('profiles').doc(userId).delete();
      await firestoreDb.collection('users').doc(userId).delete();
    } catch (e) {}
    memoryStore.profiles.delete(userId);

    return { success: true };
  } catch (error: any) {
    console.error('Error deleting account on server:', error);
    return { success: false, error: error.message };
  }
}


/**
 * 3. Recalculate and update profile strength
 */
export async function recalculateProfileStrengthServer(userId: string, profileData?: any): Promise<number> {
  if (!userId) return 0;
  try {
    let data = profileData;
    const profileRef = firestoreDb.collection('profiles').doc(userId);
    if (!data) {
      const snap = await profileRef.get();
      data = snap.data();
    }
    if (!data) {
      data = memoryStore.profiles.get(userId) || {};
    }

    const strengthScore = calculateProfileStrength(data);
    const today = new Date().toISOString().slice(0, 10);

    await profileRef.set({
      strength: strengthScore,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // Update today's daily stat
    const statRef = firestoreDb.collection('user_daily_stats').doc(`${userId}_${today}`);
    await statRef.set({
      user_id: userId,
      date: today,
      strength: strengthScore,
      updated_at: new Date().toISOString()
    }, { merge: true });

    // In-memory fallback sync
    const memP = memoryStore.profiles.get(userId) || {};
    memP.strength = strengthScore;
    memoryStore.profiles.set(userId, memP);

    return strengthScore;
  } catch (error: any) {
    console.warn('Firestore Admin strength update fallback:', error.message);
    const score = calculateProfileStrength(profileData);
    const memP = memoryStore.profiles.get(userId) || {};
    memP.strength = score;
    memoryStore.profiles.set(userId, memP);
    return score;
  }
}

/**
 * 7. Fetch user daily stats for private chart
 */
export async function getUserStatsServer(
  userId: string,
  range: 'week' | 'month' | 'all' = 'week',
  metric: 'views' | 'connections' | 'strength' = 'views'
) {
  const today = new Date();
  const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

  // Read current profile totals
  let profileViews = 0;
  let profileConnections = 0;
  let profileStrength = 0;

  try {
    const profSnap = await firestoreDb.collection('profiles').doc(userId).get();
    if (profSnap.exists) {
      const p = profSnap.data() || {};
      profileViews = Number(p.views) || 0;
      profileConnections = Number(p.connections) || 0;
      profileStrength = Number(p.strength) || calculateProfileStrength(p);
    } else {
      const memP = memoryStore.profiles.get(userId) || {};
      profileViews = Number(memP.views) || 0;
      profileConnections = Number(memP.connections) || 0;
      profileStrength = Number(memP.strength) || 0;
    }
  } catch (e) {
    const memP = memoryStore.profiles.get(userId) || {};
    profileViews = Number(memP.views) || 0;
    profileConnections = Number(memP.connections) || 0;
    profileStrength = Number(memP.strength) || 0;
  }

  // Fetch daily stats records for this user
  const dailyStatsMap = new Map<string, any>();
  try {
    const statsSnap = await firestoreDb.collection('user_daily_stats')
      .where('user_id', '==', userId)
      .get();
    
    statsSnap.forEach(d => {
      const s = d.data();
      if (s?.date) {
        dailyStatsMap.set(s.date, s);
      }
    });
  } catch (e) {
    // memory store fallback
    for (const [key, val] of memoryStore.userDailyStats.entries()) {
      if (val.user_id === userId && val.date) {
        dailyStatsMap.set(val.date, val);
      }
    }
  }

  // Also include in-memory entries if not in snapshot
  for (const [key, val] of memoryStore.userDailyStats.entries()) {
    if (val.user_id === userId && val.date && !dailyStatsMap.has(val.date)) {
      dailyStatsMap.set(val.date, val);
    }
  }

  const allTimeTotal = 
    metric === 'views' ? profileViews :
    metric === 'connections' ? profileConnections :
    profileStrength;

  let points: { label: string; date: string; value: number }[] = [];
  let totalInRange = 0;
  let previousPeriodTotal = 0;

  if (range === 'week') {
    // Last 7 days
    const currentDates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      currentDates.push(formatYMD(d));
    }

    const prevDates: string[] = [];
    for (let i = 13; i >= 7; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      prevDates.push(formatYMD(d));
    }

    points = currentDates.map(dateStr => {
      const stat = dailyStatsMap.get(dateStr) || {};
      const d = new Date(dateStr);
      const label = d.toLocaleDateString('en-US', { weekday: 'short' });
      const value = 
        metric === 'views' ? (Number(stat.views) || 0) :
        metric === 'connections' ? (Number(stat.new_connections) || 0) :
        (Number(stat.strength) || profileStrength);
      totalInRange += metric === 'strength' ? 0 : value;
      return { label, date: dateStr, value };
    });

    if (metric === 'strength') {
      totalInRange = profileStrength;
    }

    prevDates.forEach(dateStr => {
      const stat = dailyStatsMap.get(dateStr) || {};
      const value = 
        metric === 'views' ? (Number(stat.views) || 0) :
        metric === 'connections' ? (Number(stat.new_connections) || 0) :
        (Number(stat.strength) || 0);
      previousPeriodTotal += metric === 'strength' ? 0 : value;
    });

  } else if (range === 'month') {
    // Last 30 days
    const currentDates: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      currentDates.push(formatYMD(d));
    }

    const prevDates: string[] = [];
    for (let i = 59; i >= 30; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      prevDates.push(formatYMD(d));
    }

    points = currentDates.map(dateStr => {
      const stat = dailyStatsMap.get(dateStr) || {};
      const d = new Date(dateStr);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const value = 
        metric === 'views' ? (Number(stat.views) || 0) :
        metric === 'connections' ? (Number(stat.new_connections) || 0) :
        (Number(stat.strength) || profileStrength);
      totalInRange += metric === 'strength' ? 0 : value;
      return { label, date: dateStr, value };
    });

    if (metric === 'strength') {
      totalInRange = profileStrength;
    }

    prevDates.forEach(dateStr => {
      const stat = dailyStatsMap.get(dateStr) || {};
      const value = 
        metric === 'views' ? (Number(stat.views) || 0) :
        metric === 'connections' ? (Number(stat.new_connections) || 0) :
        (Number(stat.strength) || 0);
      previousPeriodTotal += metric === 'strength' ? 0 : value;
    });

  } else {
    // All time: grouped by month
    // Determine user creation date or fallback to 6 months
    const monthsBack = 6;
    const monthBuckets: { key: string; label: string; values: number[] }[] = [];

    for (let i = monthsBack - 1; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short' });
      monthBuckets.push({ key, label, values: [] });
    }

    // Fill points from daily records
    dailyStatsMap.forEach((stat, dateStr) => {
      const monthKey = dateStr.slice(0, 7);
      const bucket = monthBuckets.find(b => b.key === monthKey);
      if (bucket) {
        const val = 
          metric === 'views' ? (Number(stat.views) || 0) :
          metric === 'connections' ? (Number(stat.new_connections) || 0) :
          (Number(stat.strength) || profileStrength);
        bucket.values.push(val);
      }
    });

    points = monthBuckets.map(b => {
      let val = 0;
      if (metric === 'strength') {
        val = b.values.length > 0 ? b.values[b.values.length - 1] : profileStrength;
      } else {
        val = b.values.reduce((sum, v) => sum + v, 0);
      }
      return { label: b.label, date: b.key, value: val };
    });

    totalInRange = allTimeTotal;
    previousPeriodTotal = 0;
  }

  const delta = totalInRange - previousPeriodTotal;
  const hasActivity = allTimeTotal > 0 || totalInRange > 0 || (metric === 'strength' && profileStrength > 0);

  return {
    points,
    totalInRange,
    previousPeriodTotal,
    delta,
    allTimeTotal,
    hasActivity
  };
}
