import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut, 
  onAuthStateChanged, 
  GoogleAuthProvider, 
  signInWithPopup, 
  sendPasswordResetEmail,
  updatePassword,
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit,
  onSnapshot 
} from './firebase';

// Clear any stale fake/ghost sessions on initialization
if (typeof window !== 'undefined') {
  try {
    const saved = localStorage.getItem('privy_auth_session');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.user?.id === '1dX3RwMTHXNDiw2zxqUmnFADR6y1' || parsed?.user?.id === 'mock-user-123') {
        localStorage.removeItem('privy_auth_session');
      }
    }
  } catch (e) {}
}

/**
 * Universal Query Builder for Firebase Firestore
 */
class FirestoreQueryBuilder {
  private collectionName: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: { field: string; op: any; value: any }[] = [];
  private orderField?: string;
  private orderAsc: boolean = true;
  private limitCount?: number;
  private selectFields: string = '*';

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  select(fields: string = '*', _options?: any): this {
    this.selectFields = fields;
    return this;
  }

  eq(field: string, value: any): this {
    this.filters.push({ field, op: '==', value });
    return this;
  }

  neq(field: string, value: any): this {
    this.filters.push({ field, op: '!=', value });
    return this;
  }

  gt(field: string, value: any): this {
    this.filters.push({ field, op: '>', value });
    return this;
  }

  gte(field: string, value: any): this {
    this.filters.push({ field, op: '>=', value });
    return this;
  }

  lt(field: string, value: any): this {
    this.filters.push({ field, op: '<', value });
    return this;
  }

  lte(field: string, value: any): this {
    this.filters.push({ field, op: '<=', value });
    return this;
  }

  in(field: string, values: any[]): this {
    this.filters.push({ field, op: 'in', value: values });
    return this;
  }

  contains(field: string, value: any): this {
    this.filters.push({ field, op: 'array-contains', value });
    return this;
  }

  order(field: string, options: { ascending?: boolean } = {}): this {
    this.orderField = field;
    this.orderAsc = options.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  insert(data: any | any[]): this {
    this.action = 'insert';
    this.payload = data;
    return this;
  }

  update(updates: any): this {
    this.action = 'update';
    this.payload = updates;
    return this;
  }

  delete(): this {
    this.action = 'delete';
    return this;
  }

  upsert(data: any | any[]): this {
    return this.insert(data);
  }

  private buildQuery() {
    const colRef = collection(db, this.collectionName);
    const queryConstraints: any[] = [];

    for (const f of this.filters) {
      queryConstraints.push(where(f.field, f.op, f.value));
    }

    if (this.orderField) {
      queryConstraints.push(orderBy(this.orderField, this.orderAsc ? 'asc' : 'desc'));
    }

    if (this.limitCount) {
      queryConstraints.push(firestoreLimit(this.limitCount));
    }

    return query(colRef, ...queryConstraints);
  }

  async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      if (this.action === 'select') {
        const q = this.buildQuery();
        const snap = await getDocs(q);
        const results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        if (this.selectFields && this.selectFields.includes('count')) {
          return { data: results, count: results.length, error: null };
        }

        return { data: results, error: null, count: results.length };
      }

      if (this.action === 'insert') {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const inserted: any[] = [];

        for (const item of items) {
          const docId = item.id;
          if (docId) {
            const docRef = doc(db, this.collectionName, String(docId));
            await setDoc(docRef, { ...item, updated_at: new Date().toISOString() }, { merge: true });
            inserted.push({ id: docId, ...item });
          } else {
            const colRef = collection(db, this.collectionName);
            const ref = await addDoc(colRef, {
              ...item,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
            inserted.push({ id: ref.id, ...item });
          }
        }

        return {
          data: Array.isArray(this.payload) ? inserted : inserted[0],
          error: null
        };
      }

      if (this.action === 'update') {
        const q = this.buildQuery();
        const snap = await getDocs(q);
        const updates: any[] = [];

        for (const d of snap.docs) {
          await updateDoc(d.ref, {
            ...this.payload,
            updated_at: new Date().toISOString()
          });
          updates.push({ id: d.id, ...d.data(), ...this.payload });
        }

        return { data: updates, error: null };
      }

      if (this.action === 'delete') {
        const q = this.buildQuery();
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
        return { data: true, error: null };
      }

      return { data: null, error: null };
    } catch (err: any) {
      console.warn(`Firestore operation failed on ${this.collectionName}:`, err);
      return { data: null, error: err };
    }
  }

  single(): Promise<{ data: any; error: any }> {
    this.limitCount = 1;
    return this.execute().then(res => ({
      data: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
      error: res.error
    }));
  }

  maybeSingle(): Promise<{ data: any; error: any }> {
    this.limitCount = 1;
    return this.execute().then(res => ({
      data: Array.isArray(res.data) && res.data.length > 0 ? res.data[0] : null,
      error: res.error
    }));
  }

  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: { data: any; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }
}

/**
 * Universal backend client wrapping Firebase Firestore and Auth
 */
export const backend = {
  from: (table: string) => new FirestoreQueryBuilder(table),

  channel: (channelName: string) => {
    let unsubscribe: (() => void) | null = null;
    const listeners: any[] = [];

    const colName = channelName.includes('messages') ? 'messages' :
                    channelName.includes('wallet') || channelName.includes('tx') ? 'transactions' :
                    channelName.includes('profiles') ? 'profiles' :
                    channelName.includes('chats') ? 'chats' : 'notifications';

    return {
      on: (_type: string, _filter: any, callback: (payload: any) => void) => {
        listeners.push(callback);
        return {
          subscribe: () => {
            try {
              const colRef = collection(db, colName);
              const q = query(colRef, firestoreLimit(25));
              unsubscribe = onSnapshot(q, (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                  const eventType = change.type === 'added' ? 'INSERT' :
                                    change.type === 'modified' ? 'UPDATE' : 'DELETE';
                  const payload = {
                    eventType,
                    new: { id: change.doc.id, ...change.doc.data() },
                    old: change.type === 'modified' ? { id: change.doc.id } : null
                  };
                  listeners.forEach(fn => fn(payload));
                });
              }, (err) => {
                console.warn(`Snapshot listener warning for ${colName}:`, err);
              });
            } catch (e) {
              console.warn('Realtime subscription error:', e);
            }
            return { unsubscribe: () => { if (unsubscribe) unsubscribe(); } };
          }
        };
      },
      subscribe: () => ({ unsubscribe: () => { if (unsubscribe) unsubscribe(); } }),
      unsubscribe: () => { if (unsubscribe) unsubscribe(); }
    };
  },

  removeChannel: (channel: any) => {
    if (channel && typeof channel.unsubscribe === 'function') {
      channel.unsubscribe();
    }
  },

  rpc: async (fnName: string, params: any = {}) => {
    try {
      if (fnName === 'handle_subscription_renewal') {
        const { user_id, cost, period_days } = params;
        const profileRef = doc(db, 'profiles', user_id);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const currentBal = profileSnap.data().balance || 0;
          if (currentBal >= cost) {
            const expDate = new Date();
            expDate.setDate(expDate.getDate() + (period_days || 30));
            await updateDoc(profileRef, {
              balance: currentBal - cost,
              is_subscribed: true,
              subscription_status: 'active',
              subscription_expires_at: expDate.toISOString()
            });
            await addDoc(collection(db, 'transactions'), {
              profile_id: user_id,
              type: 'subscription',
              amount: cost,
              status: 'completed',
              description: 'Auto-renewal: 30 days subscription',
              created_at: new Date().toISOString()
            });
            return { data: { success: true }, error: null };
          }
        }
      }
      return { data: null, error: null };
    } catch (err: any) {
      return { data: null, error: err };
    }
  },

  auth: {
    getSession: async () => {
      const user = auth.currentUser;
      if (user) {
        const session = {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: {
              display_name: user.displayName,
              photo_url: user.photoURL,
            }
          }
        };
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: null };
    },

    getUser: async () => {
      const user = auth.currentUser;
      if (user) {
        return {
          data: {
            user: {
              id: user.uid,
              email: user.email,
              user_metadata: {
                display_name: user.displayName,
                photo_url: user.photoURL
              }
            }
          },
          error: null
        };
      }
      return { data: { user: null }, error: null };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          const session = {
            user: {
              id: user.uid,
              email: user.email,
              user_metadata: {
                display_name: user.displayName,
                photo_url: user.photoURL
              }
            }
          };
          callback('SIGNED_IN', session);
        } else {
          callback('SIGNED_OUT', null);
        }
      });

      return {
        data: {
          subscription: {
            unsubscribe: () => unsubscribe()
          }
        }
      };
    },

    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      try {
        let authEmail = email.trim();
        // Support sign in with username if no '@' present
        if (!authEmail.includes('@')) {
          const q = query(collection(db, 'profiles'), where('username', '==', authEmail), firestoreLimit(1));
          const snap = await getDocs(q);
          if (!snap.empty && snap.docs[0].data().email) {
            authEmail = snap.docs[0].data().email;
          } else {
            authEmail = `${authEmail.toLowerCase()}@privyconnect.app`;
          }
        }

        const cred = await signInWithEmailAndPassword(auth, authEmail, password);
        const user = cred.user;

        const session = {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: {
              display_name: user.displayName,
              photo_url: user.photoURL
            }
          }
        };

        return { data: { user: session.user, session }, error: null };
      } catch (error: any) {
        console.error('Password sign in error:', error);
        return { data: null, error: { message: error.message || 'Invalid email or password' } };
      }
    },

    signUp: async ({ email, password, options }: { email: string; password: string; options?: any }) => {
      try {
        const metadata = options?.data || {};
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = cred.user;

        const profileRef = doc(db, 'profiles', user.uid);
        await setDoc(profileRef, {
          id: user.uid,
          email: user.email,
          username: metadata.username || email.split('@')[0],
          display_name: metadata.full_name || metadata.username || 'Member',
          state: metadata.state || 'Lagos',
          vibe: metadata.vibe || 'BESTIE',
          role: email.toLowerCase() === 'denic9426@gmail.com' ? 'admin' : 'user',
          is_verified: true,
          is_subscribed: false,
          subscription_status: 'inactive',
          profile_mode: 'public',
          balance: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

        const walletRef = doc(db, 'wallet', user.uid);
        await setDoc(walletRef, {
          profile_id: user.uid,
          balance: 0,
          updated_at: new Date().toISOString()
        });

        const session = {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: metadata
          }
        };

        return {
          data: { user: session.user, session },
          error: null
        };
      } catch (error: any) {
        console.error('Signup error:', error);
        return { data: null, error: { message: error.message || 'Signup failed' } };
      }
    },

    signInWithOAuth: async (_params: { provider: string; options?: any }) => {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const userCredential = await signInWithPopup(auth, provider);
        const user = userCredential.user;

        const profileRef = doc(db, 'profiles', user.uid);
        const profileSnap = await getDoc(profileRef);
        if (!profileSnap.exists()) {
          await setDoc(profileRef, {
            id: user.uid,
            email: user.email,
            username: user.email ? user.email.split('@')[0] : `user_${user.uid.slice(0, 6)}`,
            display_name: user.displayName || 'Member',
            photo_url: user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`,
            role: user.email?.toLowerCase() === 'denic9426@gmail.com' ? 'admin' : 'user',
            is_verified: true,
            is_subscribed: false,
            subscription_status: 'inactive',
            profile_mode: 'public',
            balance: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

          const walletRef = doc(db, 'wallet', user.uid);
          await setDoc(walletRef, {
            profile_id: user.uid,
            balance: 0,
            updated_at: new Date().toISOString()
          });
        }

        const session = {
          user: {
            id: user.uid,
            email: user.email,
            user_metadata: {
              display_name: user.displayName,
              photo_url: user.photoURL
            }
          }
        };

        return {
          data: { user: session.user, session },
          error: null
        };
      } catch (error: any) {
        console.error('Google OAuth error:', error);
        let message = error?.message || 'Google sign-in failed.';
        if (error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
          message = 'Google sign-in was cancelled. Please select your account to continue.';
        } else if (error?.code === 'auth/popup-blocked') {
          message = 'Popup was blocked by your browser. Please allow popups or use email & password.';
        } else if (error?.code === 'auth/unauthorized-domain') {
          message = 'Domain not authorized in Firebase Console. Please sign in using email & password.';
        }
        return { data: null, error: { message, code: error?.code } };
      }
    },

    resetPasswordForEmail: async (email: string) => {
      try {
        await sendPasswordResetEmail(auth, email.trim());
        return { data: true, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    updateUser: async ({ password }: { password?: string; data?: any }) => {
      try {
        if (password && auth.currentUser) {
          await updatePassword(auth.currentUser, password);
        }
        return { data: { user: auth.currentUser }, error: null };
      } catch (error: any) {
        return { data: null, error: { message: error.message } };
      }
    },

    signOut: async () => {
      try {
        await firebaseSignOut(auth);
        localStorage.removeItem('privy_auth_session');
        return { error: null };
      } catch (error: any) {
        return { error };
      }
    }
  }
};

// Helpers
export const signIn = async () => backend.auth.signInWithOAuth({ provider: 'google' });
export const logOut = async () => backend.auth.signOut();
export const signInWithEmail = async (email: string, pass: string) => backend.auth.signInWithPassword({ email, password: pass });
export const signUpWithEmail = async (email: string, pass: string, meta: any) => backend.auth.signUp({ email, password: pass, options: { data: meta } });
