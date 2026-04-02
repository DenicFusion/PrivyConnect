import { createClient } from '@supabase/supabase-js';
import { APP_CONFIG } from '../config';
import { db as firebaseDb, auth as firebaseAuth } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc, query, where, orderBy, limit, addDoc, onSnapshot } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseActive = APP_CONFIG.USE_SUPABASE && 
  Boolean(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'YOUR_SUPABASE_URL' && !supabaseUrl.includes('placeholder'));

const realSupabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);

class FirebaseChannel {
  private name: string;
  private callbacks: any = {};
  private unsubscribes: any[] = [];
  private state: any = {};

  constructor(name: string) {
    this.name = name;
  }

  on(type: string, filter: any, callback: any) {
    if (type === 'postgres_changes') {
      this.callbacks[`${filter.event}_${filter.table}`] = callback;
    } else if (type === 'presence') {
      this.callbacks['presence'] = callback;
    }
    return this;
  }

  subscribe(callback?: any) {
    if (this.name.startsWith('chat-')) {
      const chatId = this.name.replace('chat-', '');
      const q = query(collection(firebaseDb, 'messages'), where('chat_id', '==', chatId));
      const unsub = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && this.callbacks['INSERT_messages']) {
            this.callbacks['INSERT_messages']({ new: { id: change.doc.id, ...change.doc.data() } });
          }
          if (change.type === 'modified' && this.callbacks['UPDATE_messages']) {
            this.callbacks['UPDATE_messages']({ new: { id: change.doc.id, ...change.doc.data() } });
          }
        });
      });
      this.unsubscribes.push(unsub);

      const presenceQ = query(collection(firebaseDb, 'presence'), where('chat_id', '==', chatId));
      const unsubPresence = onSnapshot(presenceQ, (snapshot) => {
        this.state = {};
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          this.state[data.user_id] = [data];
        });
        if (this.callbacks['presence']) {
          this.callbacks['presence']();
        }
      });
      this.unsubscribes.push(unsubPresence);
    }
    if (callback) callback('SUBSCRIBED');
    return this;
  }

  async track(data: any) {
    const chatId = this.name.replace('chat-', '');
    await setDoc(doc(firebaseDb, 'presence', `${chatId}_${data.user_id}`), {
      ...data,
      chat_id: chatId,
      updated_at: new Date().toISOString()
    });
  }

  presenceState() {
    return this.state;
  }

  unsubscribe() {
    this.unsubscribes.forEach(unsub => unsub());
  }
}

class QueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' | 'upsert' | null = null;
  private data: any = null;
  private filters: any[] = [];
  private orderings: any[] = [];
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private sbQuery: any;

  constructor(table: string, sbQuery: any) {
    this.table = table;
    this.sbQuery = sbQuery;
  }

  select(columns?: string) {
    this.action = 'select';
    this.sbQuery = this.sbQuery.select(columns);
    return this;
  }

  insert(data: any) {
    this.action = 'insert';
    this.data = data;
    this.sbQuery = this.sbQuery.insert(data);
    return this;
  }

  update(data: any) {
    this.action = 'update';
    this.data = data;
    this.sbQuery = this.sbQuery.update(data);
    return this;
  }

  delete() {
    this.action = 'delete';
    this.sbQuery = this.sbQuery.delete();
    return this;
  }

  upsert(data: any) {
    this.action = 'upsert';
    this.data = data;
    this.sbQuery = this.sbQuery.upsert(data);
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, op: '==', value });
    this.sbQuery = this.sbQuery.eq(column, value);
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, op: '!=', value });
    this.sbQuery = this.sbQuery.neq(column, value);
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, op: 'in', value: values });
    this.sbQuery = this.sbQuery.in(column, values);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderings.push({ column, direction: options?.ascending === false ? 'desc' : 'asc' });
    this.sbQuery = this.sbQuery.order(column, options);
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    this.sbQuery = this.sbQuery.limit(count);
    return this;
  }

  single() {
    this.isSingle = true;
    this.sbQuery = this.sbQuery.single();
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    this.sbQuery = this.sbQuery.maybeSingle();
    return this;
  }

  async then(resolve: any, reject: any) {
    try {
      const result = await this.execute();
      resolve(result);
    } catch (e) {
      reject(e);
    }
  }

  private async executeFirebase() {
    try {
      if (this.action === 'select') {
        let q: any = collection(firebaseDb, this.table);
        for (const f of this.filters) {
          q = query(q, where(f.column, f.op, f.value));
        }
        for (const o of this.orderings) {
          q = query(q, orderBy(o.column, o.direction));
        }
        if (this.limitCount) {
          q = query(q, limit(this.limitCount));
        }
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        if (this.isSingle) {
          if (data.length === 0) return { data: null, error: new Error('No rows found') };
          if (data.length > 1) return { data: null, error: new Error('Multiple rows found') };
          return { data: data[0], error: null };
        }
        if (this.isMaybeSingle) {
          if (data.length > 1) return { data: null, error: new Error('Multiple rows found') };
          return { data: data[0] || null, error: null };
        }
        return { data, error: null };
      }

      if (this.action === 'insert') {
        if (Array.isArray(this.data)) {
          const results = [];
          for (const item of this.data) {
            if (item.id) {
              await setDoc(doc(firebaseDb, this.table, item.id), item);
              results.push(item);
            } else {
              const docRef = await addDoc(collection(firebaseDb, this.table), item);
              results.push({ id: docRef.id, ...item });
            }
          }
          return { data: results, error: null };
        } else {
          if (this.data.id) {
            await setDoc(doc(firebaseDb, this.table, this.data.id), this.data);
            return { data: this.data, error: null };
          } else {
            const docRef = await addDoc(collection(firebaseDb, this.table), this.data);
            return { data: { id: docRef.id, ...this.data }, error: null };
          }
        }
      }

      if (this.action === 'update' || this.action === 'delete') {
        let q: any = collection(firebaseDb, this.table);
        for (const f of this.filters) {
          q = query(q, where(f.column, f.op, f.value));
        }
        const snapshot = await getDocs(q);
        
        if (this.action === 'update') {
          for (const d of snapshot.docs) {
            await updateDoc(d.ref, this.data);
          }
        } else {
          for (const d of snapshot.docs) {
            await deleteDoc(d.ref);
          }
        }
        return { data: null, error: null };
      }

      if (this.action === 'upsert') {
        if (Array.isArray(this.data)) {
          for (const item of this.data) {
            if (item.id) {
              await setDoc(doc(firebaseDb, this.table, item.id), item, { merge: true });
            }
          }
        } else {
          if (this.data.id) {
            await setDoc(doc(firebaseDb, this.table, this.data.id), this.data, { merge: true });
          }
        }
        return { data: this.data, error: null };
      }

      return { data: null, error: new Error('Unknown action') };
    } catch (e) {
      console.error('Firebase DB Error:', e);
      return { data: null, error: e };
    }
  }

  private async execute() {
    const mode = APP_CONFIG.backendMode;
    
    if (mode === 'supabase') {
      return await this.sbQuery;
    } else if (mode === 'firebase') {
      return await this.executeFirebase();
    } else if (mode === 'hybrid') {
      if (this.action === 'select') {
        return await this.executeFirebase();
      } else {
        // Write to both
        const [fbResult, sbResult] = await Promise.all([
          this.executeFirebase(),
          this.sbQuery
        ]);
        // Return Firebase result as primary
        return fbResult;
      }
    }
  }
}

export const supabase = new Proxy(realSupabase, {
  get(target, prop) {
    if (prop === 'from') {
      return (table: string) => {
        return new QueryBuilder(table, target.from(table));
      };
    }
    if (prop === 'channel') {
      return (name: string) => {
        if (APP_CONFIG.backendMode === 'firebase' || APP_CONFIG.backendMode === 'hybrid') {
          return new FirebaseChannel(name);
        }
        return target.channel(name);
      };
    }
    if (prop === 'removeChannel') {
      return (channel: any) => {
        if (channel instanceof FirebaseChannel) {
          channel.unsubscribe();
          return;
        }
        return target.removeChannel(channel);
      };
    }
    return (target as any)[prop];
  }
});

// Auth Helpers
export const signInWithOtp = async (email: string) => {
  if (APP_CONFIG.authMode === 'firebase') {
    try {
      await sendSignInLinkToEmail(firebaseAuth, email, {
        url: window.location.origin + '/verify-success',
        handleCodeInApp: true,
      });
      window.localStorage.setItem('emailForSignIn', email);
      return { data: {}, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  return await realSupabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + '/verify-success' },
  });
};

export const verifyOtp = async (email: string, token: string) => {
  if (APP_CONFIG.authMode === 'firebase') {
    try {
      if (isSignInWithEmailLink(firebaseAuth, window.location.href)) {
        let emailToUse = email || window.localStorage.getItem('emailForSignIn');
        if (!emailToUse) {
          emailToUse = window.prompt('Please provide your email for confirmation');
        }
        const result = await signInWithEmailLink(firebaseAuth, emailToUse!, window.location.href);
        window.localStorage.removeItem('emailForSignIn');
        return { data: result, error: null };
      }
      return { data: null, error: new Error('Invalid link') };
    } catch (error) {
      return { data: null, error };
    }
  }
  return await realSupabase.auth.verifyOtp({ email, token, type: 'email' });
};

export const signIn = async () => {
  if (APP_CONFIG.authMode === 'firebase') {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(firebaseAuth, provider);
      return result.user;
    } catch (error) {
      throw error;
    }
  }
  const { data, error } = await realSupabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: window.location.origin + '/discovery' },
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string, metadata: any) => {
  if (APP_CONFIG.authMode === 'firebase') {
    try {
      const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // We also need to store metadata in the profiles table
      await supabase.from('profiles').insert({
        id: result.user.uid,
        ...metadata
      });
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  return await realSupabase.auth.signUp({
    email,
    password,
    options: { data: metadata, emailRedirectTo: window.location.origin + '/verify-success' }
  });
};

export const signInWithEmail = async (email: string, password: string) => {
  if (APP_CONFIG.authMode === 'firebase') {
    try {
      const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
      return { data: result, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
  return await realSupabase.auth.signInWithPassword({ email, password });
};

export const logOut = async () => {
  if (APP_CONFIG.authMode === 'firebase') {
    await signOut(firebaseAuth);
    return;
  }
  const { error } = await realSupabase.auth.signOut();
  if (error) throw error;
};
