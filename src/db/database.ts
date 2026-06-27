import * as SQLite from 'expo-sqlite';
import { Feedback } from '../types';

const dbPromise = SQLite.openDatabaseAsync('attenary.db');

const toNum = (v: number | null | undefined): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const rowToFeedback = (row: any): Feedback => ({
  id: String(row.id),
  user_id: row.user_id,
  type: row.type,
  email: row.email ?? undefined,
  content: row.content,
  metadata: row.metadata ?? undefined,
  created_at: row.created_at,
});

const init = async (db: SQLite.SQLiteDatabase) => {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS feedbacks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      email TEXT,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backup_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      schema_version INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_feedbacks_user_id ON feedbacks(user_id);
  `);
}

export interface Database {
  feedbacks: {
    getAll: (userId: string) => Promise<Feedback[]>;
    put: (feedback: Feedback) => Promise<void>;
    clear: () => Promise<any>;
  };
  runAsync: (sql: string, params?: any[]) => Promise<any>;
}

export { dbPromise };

export const openDb = async (): Promise<Database> => {
  const db = await dbPromise;
  await init(db);
  return {
    feedbacks: {
      getAll: async (userId: string) => {
        const rows = await db.getAllAsync<any>(
          'SELECT * FROM feedbacks WHERE user_id = ? ORDER BY created_at DESC',
          [userId]
        );
        return rows.map(rowToFeedback);
      },
      put: async (feedback: Feedback) => {
        await db.runAsync(
          `INSERT INTO feedbacks (user_id, type, email, content, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            feedback.user_id,
            feedback.type,
            feedback.email ?? null,
            feedback.content,
            feedback.metadata ?? null,
            feedback.created_at ?? Date.now(),
          ]
        );
      },
      clear: async () => db.runAsync('DELETE FROM feedbacks'),
    },
    runAsync: async (sql: string, params?: any[]) => db.runAsync(sql, params),
  };
};
