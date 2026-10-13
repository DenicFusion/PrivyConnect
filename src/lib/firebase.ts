import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail,
  signOut as fbSignOut, 
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  getDocFromServer,
  setDoc, 
  updateDoc, 
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy,
  getDocs, 
  addDoc, 
  limit,
  serverTimestamp, 
  onSnapshot 
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import rawFirebaseConfig from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: rawFirebaseConfig.apiKey || import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCrdd3_dXQpSYN-4w1ZWaufbf14ZRbkQGs",
  authDomain: rawFirebaseConfig.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0722566132.firebaseapp.com",
  projectId: rawFirebaseConfig.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0722566132",
  storageBucket: rawFirebaseConfig.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0722566132.firebasestorage.app",
  messagingSenderId: rawFirebaseConfig.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "704282212306",
  appId: rawFirebaseConfig.appId || import.meta.env.VITE_FIREBASE_APP_ID || "1:704282212306:web:862e06ef987a203f47ba0b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, rawFirebaseConfig.firestoreDatabaseId || "ai-studio-0b67419f-0a72-4c9c-93e6-26709ff94079");
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}
testConnection();

export {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  fbSignOut as signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  onAuthStateChanged,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  limit,
  serverTimestamp,
  onSnapshot,
  ref,
  uploadBytes,
  getDownloadURL
};
