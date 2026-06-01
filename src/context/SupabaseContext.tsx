import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth, useSignIn, useSignUp } from '@clerk/clerk-expo';
import { openDb } from '../db/database';
import NetInfo from '@react-native-community/netinfo';
import { Profile, Session, Feedback } from '../types';
import { Database } from '../db/database';
import { createSupabaseClient } from '../config/supabase';

export interface SupabaseContextValue {
  session: any | null;
  profile: Profile | null;
  loading: boolean;
  isOnline: boolean;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  resendOtp: (email: string) => Promise<{ error: any | null }>;
  checkEmailRegistered: (email: string) => Promise<{ registered: boolean; error: any | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: any | null }>;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: any | null }>;
  uploadAvatar: (fileUri: string) => Promise<{ url: string | null; error: any | null }>;
  refreshProfile: () => Promise<void>;
  fetchSessions: () => Promise<Session[]>;
  checkIn: () => Promise<{ session: Session | null; error: any | null }>;
  checkOut: (sessionId: string, reason?: string) => Promise<{ error: any | null }>;
  createFeedback: (feedback: { type: Feedback['type']; email?: string; content: string; metadata?: Record<string, any>; }) => Promise<{ error: any | null }>;
}

const SupabaseContext = createContext<SupabaseContextValue | undefined>(undefined);

export const useSupabase = () => {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase must be used within a SupabaseProvider');
  return ctx;
};

export const SupabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { getToken, signOut: clerkSignOut, isLoaded, isSignedIn, userId } = useAuth();
  const { signIn: signInResource } = useSignIn();
  const { signUp: signUpResource } = useSignUp();

  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [db, setDb] = useState<Database | null>(null);
  const dbPromiseRef = useRef<Promise<Database> | null>(null);

  const getDb = useCallback(async () => {
    if (!dbPromiseRef.current) {
      dbPromiseRef.current = openDb().then(database => {
        setDb(database);
        return database;
      });
    }
    return dbPromiseRef.current;
  }, []);

  const updateOnlineStatus = useCallback(async () => {
    try {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected ?? false);
    } catch (e) {
      console.log('NetInfo fetch error:', e);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const res = await supabase.from('profiles').select('*').eq('id', userId).single();
      if (res.error) throw res.error;
      const p = res.data as Profile;
      setProfile(p);
      void getDb().then(currentDb => currentDb.profiles.put(p).catch((e) => console.log('Local profile cache error (non-critical):', e))).catch((e) => console.log('getDb error (non-critical):', e));
    } catch (e) {
      console.log('refreshProfile error (non-critical):', e);
    }
  }, [userId, getToken, getDb]);

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn && userId) {
      setSession({ user: { id: userId } });
      void refreshProfile();
    } else {
      setSession(null);
      setProfile(null);
    }
    setLoading(false);
  }, [isLoaded, isSignedIn, userId, refreshProfile]);

  useEffect(() => {
    const unsubscribeNetInfo = NetInfo.addEventListener(state => setIsOnline(state.isConnected ?? false));
    void updateOnlineStatus();
    return () => {
      unsubscribeNetInfo();
    };
  }, [updateOnlineStatus]);

  const signUp = async (email: string, password: string) => {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const result = await signUpResource.create({
        emailAddress: normalizedEmail,
        password,
      });
      if (result.status === 'complete') {
        return { error: null };
      }
      return { error: new Error('Verification email sent') };
    } catch (e) {
      console.log('signUp error:', e);
      return { error: e || 'Sign up failed' };
    }
  };

  const checkEmailRegistered = async (email: string) => {
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { data, error } = await supabase.from('profiles').select('id').eq('email', email.toLowerCase().trim()).limit(1);
      if (error) return { registered: false, error };
      if (data && data.length > 0) return { registered: true, error: null };
      return { registered: false, error: null };
    } catch (e) {
      return { registered: false, error: e };
    }
  };

  const resendOtp = async (email: string) => {
    return { error: new Error('Clerk handles email verification automatically via magic link') };
  };

  const verifyOtp = async (email: string, token: string) => {
    return { error: new Error('Clerk handles email verification automatically via magic link') };
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await signInResource.create({
        identifier: email.trim().toLowerCase(),
        password,
      });
      if (result.status === 'complete') {
        return { error: null };
      }
      return { error: new Error('Sign in incomplete') };
    } catch (e) {
      console.log('signIn error:', e);
      return { error: e || 'Sign in failed' };
    }
  };

  const handleSignOut = async () => {
    try {
      await clerkSignOut();
    } catch {}
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return { error: 'Not authenticated' };
    const profilePayload = { ...updates, id: userId, updated_at: Date.now() } as any;
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { error } = await supabase.from('profiles').update(profilePayload).eq('id', userId);
      if (error) {
        try {
          const currentDb = await getDb();
          await currentDb.syncQueue.insert({ user_id: userId, entity_type: 'profile', entity_id: userId, operation: 'upsert', payload: profilePayload, file_path: '', retry_count: 0 });
        } catch (e) {
          console.log('syncQueue insert error (non-critical):', e);
        }
        return { error };
      }
      setProfile(p => (p ? { ...p, ...profilePayload } : p));
      return { error: null };
    } catch (e) {
      console.log('updateProfile error:', e);
      return { error: e || 'Update failed' };
    }
  };

  const uploadAvatar = async (fileUri: string) => {
    if (!userId) return { url: null, error: 'Not authenticated' };
    const path = `avatars/${userId}.jpg`;
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { error } = await supabase.storage.from('avatars').upload(path, {
        uri: fileUri,
        type: 'image/jpeg',
      } as any, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/jpeg',
      });
      if (error) {
        try {
          const currentDb = await getDb();
          await currentDb.syncQueue.insert({ user_id: userId, entity_type: 'avatar', entity_id: userId, operation: 'upload', payload: { path }, file_path: fileUri, retry_count: 0 });
        } catch (e) {
          console.log('syncQueue insert error (non-critical):', e);
        }
        return { url: null, error };
      }
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      void updateProfile({ avatar_url: data.publicUrl });
      return { url: data.publicUrl, error: null };
    } catch (e) {
      console.log('uploadAvatar error:', e);
      return { url: null, error: e || 'Upload failed' };
    }
  };

  const fetchSessions = async () => {
    if (!userId) return [];
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { data, error } = await supabase.from('sessions').select('*').eq('user_id', userId).order('check_in_time', { ascending: false });
      if (error) return [];
      return (data as any[]).map((s: any) => ({
        sessionId: s.id,
        checkInTime: new Date(s.check_in_time).getTime(),
        checkOutTime: s.check_out_time ? new Date(s.check_out_time).getTime() : null,
        reason: s.reason,
      })) as Session[];
    } catch (e) {
      console.log('fetchSessions error:', e);
      return [];
    }
  };

  const checkIn = async () => {
    if (!userId) return { session: null, error: 'Not authenticated' };
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { data, error } = await supabase.from('sessions').insert({ user_id: userId, check_in_time: new Date().toISOString() }).select().single();
      if (error) {
        try {
          const currentDb = await getDb();
          await currentDb.syncQueue.insert({ user_id: userId, entity_type: 'session', entity_id: '', operation: 'upsert', payload: { user_id: userId, check_in_time: new Date().toISOString() }, file_path: '', retry_count: 0 });
        } catch (e) {
          console.log('syncQueue insert error (non-critical):', e);
        }
        return { session: null, error };
      }
      if (!data) return { session: null, error: 'No data returned' };
      const newSession: Session = { sessionId: data.id, checkInTime: new Date(data.check_in_time).getTime(), checkOutTime: null, reason: null };
      try {
        const currentDb = await getDb();
        await currentDb.sessions.put({ ...newSession, checkInTime: newSession.checkInTime, checkOutTime: null, reason: null });
      } catch (e) {
        console.log('Local session cache error (non-critical):', e);
      }
      return { session: newSession, error: null };
    } catch (e) {
      console.log('checkIn error:', e);
      return { session: null, error: e };
    }
  };

  const checkOut = async (sessionId: string, reason?: string) => {
    if (!userId) return { error: 'Not authenticated' };
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { error } = await supabase.from('sessions').update({ check_out_time: new Date().toISOString(), reason: reason ?? null }).eq('id', sessionId).eq('user_id', userId);
      if (error) {
        try {
          const currentDb = await getDb();
          await currentDb.syncQueue.insert({ user_id: userId, entity_type: 'session', entity_id: sessionId, operation: 'upsert', payload: { check_out_time: new Date().toISOString(), reason }, file_path: '', retry_count: 0 });
        } catch (e) {
          console.log('syncQueue insert error (non-critical):', e);
        }
        return { error };
      }
      return { error: null };
    } catch (e) {
      console.log('checkOut error:', e);
      return { error: e };
    }
  };

  const createFeedback = async (feedback: { type: Feedback['type']; email?: string; content: string; metadata?: Record<string, any> }) => {
    if (!userId) return { error: 'Not authenticated' };
    const payload = {
      user_id: userId,
      type: feedback.type,
      email: feedback.email ?? null,
      content: feedback.content,
      metadata: feedback.metadata ?? null,
    };
    try {
      const token = await getToken({ template: 'supabase' });
      const supabase = createSupabaseClient(token);
      const { error } = await supabase.from('feedbacks').insert(payload);
      return { error };
    } catch (e) {
      console.log('createFeedback error:', e);
      return { error: e };
    }
  };

  return (
    <SupabaseContext.Provider value={{
      session,
      profile,
      loading,
      isOnline,
      signUp,
      resendOtp,
      checkEmailRegistered,
      verifyOtp,
      signIn,
      signOut: handleSignOut,
      updateProfile,
      uploadAvatar,
      refreshProfile,
      fetchSessions,
      checkIn,
      checkOut,
      createFeedback,
    }}>
      {children}
    </SupabaseContext.Provider>
  );
};
