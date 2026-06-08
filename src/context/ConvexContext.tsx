import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { ConvexReactClient } from 'convex/react';
import NetInfo from '@react-native-community/netinfo';
import { getOrCreateDeviceId } from '../utils/deviceId';
import { dbPromise } from '../db/database';
import { api } from '../../convex/_generated/api';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

interface ConvexContextType {
  deviceId: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  queueMutation: (entityType: string, entityId: string, operation: 'upsert' | 'delete', payload: any) => Promise<void>;
  forceSync: () => Promise<void>;
}

const ConvexContext = createContext<ConvexContextType | null>(null);

const SYNC_INTERVAL_MS = 10000;
const MAX_RETRIES = 5;

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  const [deviceId, setDeviceId] = React.useState<string | null>(null);
  const [isOnline, setIsOnline] = React.useState(true);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const syncTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getOrCreateDeviceId().then(setDeviceId);
  }, []);

  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return unsub;
  }, []);

  const queueMutation = useCallback(async (
    entityType: string,
    entityId: string,
    operation: 'upsert' | 'delete',
    payload: any
  ) => {
    const uid = deviceId || await getOrCreateDeviceId();
    const database = await dbPromise;
    await database.runAsync(
      `INSERT INTO sync_queue (user_id, entity_type, entity_id, operation, payload, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uid, entityType, entityId, operation, JSON.stringify(payload), Date.now()]
    );
  }, [deviceId]);

  const drainQueue = useCallback(async () => {
    if (!deviceId || !isOnline || isSyncing) return;

    setIsSyncing(true);
    let pending: any[] = [];
    try {
      const database = await dbPromise;

      // Backfill: find local rows newer than watermark and queue them
      const watermarks = await database.getAllAsync<{ entity_type: string; last_synced_ts: number }>(
        `SELECT * FROM sync_watermark WHERE user_id = ?`,
        [deviceId]
      );
      const watermarkMap = new Map(watermarks.map((w) => [w.entity_type, w.last_synced_ts]));

      for (const entityType of ['profiles', 'sessions', 'app_settings', 'feedbacks']) {
        const wm = watermarkMap.get(entityType) || 0;
        let backfillRows: any[] = [];
        if (entityType === 'sessions') {
          backfillRows = await database.getAllAsync(
            `SELECT * FROM sessions WHERE user_id = ? AND updated_at > ?`,
            [deviceId, wm]
          );
        } else if (entityType === 'profiles') {
          backfillRows = await database.getAllAsync(
            `SELECT * FROM profiles WHERE id = ? AND updated_at > ?`,
            [deviceId, wm]
          );
        } else if (entityType === 'app_settings') {
          backfillRows = await database.getAllAsync(
            `SELECT * FROM app_settings WHERE user_id = ? AND updated_at > ?`,
            [deviceId, wm]
          );
        } else if (entityType === 'feedbacks') {
          backfillRows = await database.getAllAsync(
            `SELECT * FROM feedbacks WHERE user_id = ? AND created_at > ?`,
            [deviceId, wm]
          );
        }

        for (const row of backfillRows) {
          const entityId = entityType === 'sessions' ? String(row.id) : deviceId;
          const alreadyQueued = await database.getFirstAsync(
            `SELECT 1 FROM sync_queue WHERE entity_id = ? AND operation = 'upsert' AND processed_at IS NULL`,
            [entityId]
          );
          if (!alreadyQueued) {
            await database.runAsync(
              `INSERT INTO sync_queue (user_id, entity_type, entity_id, operation, payload, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
              [deviceId, entityType, entityId, 'upsert', JSON.stringify(row), Date.now()]
            );
          }
        }
      }

      pending = await database.getAllAsync<any>(
        `SELECT * FROM sync_queue 
         WHERE user_id = ? AND processed_at IS NULL AND retry_count < ?
         ORDER BY created_at ASC
         LIMIT 50`,
        [deviceId, MAX_RETRIES]
      );

      if (pending.length === 0) {
        setIsSyncing(false);
        return;
      }

      const result = await convex.action(api.sync.processQueue, {
        user_id: deviceId,
        items: pending.map((p) => ({
          entity_type: p.entity_type,
          entity_id: p.entity_id,
          operation: p.operation,
          payload: p.payload,
          created_at: p.created_at,
        })),
      });

      const now = Date.now();
      for (const item of pending) {
        await database.runAsync(
          `UPDATE sync_queue SET processed_at = ? WHERE id = ?`,
          [now, item.id]
        );
      }

      const watermarksResult = result.watermarks as Record<string, number>;
      for (const [entityType, ts] of Object.entries(watermarksResult)) {
        await database.runAsync(
          `INSERT INTO sync_watermark (entity_type, user_id, last_synced_ts)
           VALUES (?, ?, ?)
           ON CONFLICT(entity_type) DO UPDATE SET last_synced_ts = excluded.last_synced_ts`,
          [entityType, deviceId, ts]
        );
      }

    } catch (err) {
      console.error('Sync drain failed:', err);
      if (pending.length > 0) {
        const database = await dbPromise;
        for (const item of pending) {
          await database.runAsync(
            `UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`,
            [item.id]
          );
        }
      }
    } finally {
      setIsSyncing(false);
    }
  }, [deviceId, isOnline, isSyncing]);

  useEffect(() => {
    if (!deviceId) return;

    drainQueue();

    syncTimerRef.current = setInterval(drainQueue, SYNC_INTERVAL_MS);
    return () => {
      if (syncTimerRef.current) clearInterval(syncTimerRef.current);
    };
  }, [deviceId, drainQueue]);

  const forceSync = useCallback(async () => {
    await drainQueue();
  }, [drainQueue]);

  return (
    <ConvexContext.Provider value={{ deviceId, isOnline, isSyncing, queueMutation, forceSync }}>
      {children}
    </ConvexContext.Provider>
  );
}

export const useConvexSync = () => {
  const ctx = useContext(ConvexContext);
  if (!ctx) throw new Error('useConvexSync must be inside ConvexProvider');
  return ctx;
};
