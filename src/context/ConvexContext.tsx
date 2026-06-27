import React, { createContext, useContext, useEffect, useCallback, useState, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useConvex } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { api } from '../../convex/_generated/api';
import { openDb } from '../db/database';
import { Feedback } from '../types';

let clearStaleKeyPromise: Promise<void> | null = null;

export interface ConvexContextType {
  deviceId: string | null;
  isOnline: boolean;
  isConvexHealthy: boolean;
  isSubmittingFeedback: boolean;
  submitFeedback: (args: {
    user_id: string;
    type: string;
    email?: string;
    content: string;
    metadata?: string;
    created_at: number;
  }) => Promise<boolean>;
  drainPendingFeedbacks: () => Promise<void>;
}

const ConvexContext = createContext<ConvexContextType | null>(null);

export function ConvexSyncProvider({ children }: { children: React.ReactNode }) {
  const convex = useConvex();

  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isConvexHealthy, setIsConvexHealthy] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const prevOnlineRef = useRef(true);

  const submitFeedback = useCallback(
    async (args: {
      user_id: string;
      type: string;
      email?: string;
      content: string;
      metadata?: string;
      created_at: number;
    }): Promise<boolean> => {
      if (!convex) return false;
      setIsSubmittingFeedback(true);
      try {
        await convex.mutation(api.feedbacks.insert, {
          user_id: args.user_id,
          type: args.type,
          email: args.email,
          content: args.content,
          metadata: args.metadata,
          created_at: args.created_at,
        });
        return true;
      } catch (e) {
        console.warn('[Convex] direct insert failed, saving to SQLite:', e);
        const db = await openDb();
        await db.feedbacks.put({
          id: undefined,
          user_id: args.user_id,
          type: args.type as Feedback['type'],
          email: args.email,
          content: args.content,
          metadata: args.metadata,
          created_at: args.created_at,
        });
        return false;
      } finally {
        setIsSubmittingFeedback(false);
      }
    },
    [convex],
  );

  const drainPendingFeedbacks = useCallback(async () => {
    if (!deviceId) return;
    const db = await openDb();
    const all = await db.feedbacks.getAll(deviceId);
    if (all.length === 0) return;
    if (!convex || !isConvexHealthy) return;

    for (const row of all) {
      try {
        await convex.mutation(api.feedbacks.insert, {
          user_id: row.user_id,
          type: row.type as string,
          email: row.email,
          content: row.content,
          metadata: typeof row.metadata === 'string' ? row.metadata : row.metadata ? JSON.stringify(row.metadata) : undefined,
          created_at: row.created_at,
        });
        await db.runAsync('DELETE FROM feedbacks WHERE id = ?', [row.id]);
      } catch (err) {
        console.warn('[Convex] drain failed for feedback', row.id, err);
      }
    }
  }, [convex, deviceId, isConvexHealthy]);

  useEffect(() => {
    if (!clearStaleKeyPromise) {
      clearStaleKeyPromise = (async () => {
        try {
          if (Platform.OS === 'web') {
            if (typeof localStorage !== 'undefined') {
              localStorage.removeItem('@convex_sync_queue_v2');
            }
          } else {
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            await AsyncStorage.removeItem('@convex_sync_queue_v2');
          }
        } catch {
          // ignore
        }
      })();
    }
  }, []);

  useEffect(() => {
    getOrCreateDeviceId().then((id) => {
      setDeviceId(id);
      console.log('[Convex] deviceId:', id?.slice(0, 12));
    });
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      const online = !!(state.isConnected && state.isInternetReachable);
      setIsOnline(online);
      if (online && !prevOnlineRef.current) {
        drainPendingFeedbacks();
      }
      prevOnlineRef.current = online;
    });
    return unsub;
  }, [drainPendingFeedbacks]);

  useEffect(() => {
    if (!convex || !deviceId) return;
    convex
      .query(api.feedbacks.get, { user_id: deviceId })
      .then(() => setIsConvexHealthy(true))
      .catch((e) => {
        console.error('[Convex] health-check FAILED:', e?.message ?? e);
        setIsConvexHealthy(false);
      });
  }, [convex, deviceId]);

  useEffect(() => {
    if (!deviceId) return;
    const appStateSub = AppState.addEventListener('change', (next) => {
      if (next === 'active') drainPendingFeedbacks();
    });
    return () => appStateSub.remove();
  }, [deviceId, drainPendingFeedbacks]);

  return (
    <ConvexContext.Provider
      value={{
        deviceId,
        isOnline,
        isConvexHealthy,
        isSubmittingFeedback,
        submitFeedback,
        drainPendingFeedbacks,
      }}
    >
      {children}
    </ConvexContext.Provider>
  );
}

export const useConvexSync = () => {
  const ctx = useContext(ConvexContext);
  if (!ctx) throw new Error('useConvexSync must be inside ConvexSyncProvider');
  return ctx;
};
