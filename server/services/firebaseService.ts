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

export { firebaseAdminApp, firestoreDb, adminAuth, messaging, FieldValue };

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
