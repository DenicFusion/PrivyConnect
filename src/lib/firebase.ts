import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  doc, 
  getDocFromServer, 
  collection, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  updateProfile as updateAuthProfile
} from 'firebase/auth';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firestore with specific database ID if configured
export const db = getFirestore(
  app, 
  (firebaseConfig as any).firestoreDatabaseId || undefined
);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Messaging (browser only)
export const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

// Validate Connection to Firestore on boot (Mandatory per Firebase Skill)
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log('Connected to Firestore successfully.');
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

if (typeof window !== 'undefined') {
  testConnection();
}

// Push notification helpers
export const requestNotificationPermission = async () => {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const token = await getToken(messaging);
      return token;
    }
  } catch (error) {
    console.error('An error occurred while retrieving FCM token: ', error);
  }
  return null;
};

export const onForegroundMessage = (callback: (payload: any) => void) => {
  if (!messaging) return;
  return onMessage(messaging, callback);
};

// Re-export core Firestore & Auth methods for convenience
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updatePassword,
  updateAuthProfile,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
};

export default app;
