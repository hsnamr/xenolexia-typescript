/**
 * Session Repository - Database operations for reading sessions
 * Uses direct LowDB data API (no SQL).
 */

import type {ReadingSession, ReadingStats} from '../../../types';
import type {SessionRow, IDataStore} from '../DataStore.types';
import {v4 as uuidv4} from 'uuid';

// ============================================================================
// Session Repository Class
// ============================================================================

export class SessionRepository {
  constructor(private db: IDataStore) {}

  async startSession(bookId: string): Promise<string> {
    const sessionId = uuidv4();
    const now = Date.now();
    await this.db.addSession({
      id: sessionId,
      book_id: bookId,
      started_at: now,
      ended_at: null,
      pages_read: 0,
      words_revealed: 0,
      words_saved: 0,
    });
    return sessionId;
  }

  async endSession(
    sessionId: string,
    stats: {pagesRead: number; wordsRevealed: number; wordsSaved: number}
  ): Promise<void> {
    const now = Date.now();
    const session = await this.db.getSessionById(sessionId);
    const duration = session ? Math.floor((now - session.started_at) / 1000) : 0;
    await this.db.updateSession(sessionId, {
      ended_at: now,
      pages_read: stats.pagesRead,
      words_revealed: stats.wordsRevealed,
      words_saved: stats.wordsSaved,
      duration,
    });
  }

  async getById(sessionId: string): Promise<ReadingSession | null> {
    const row = await this.db.getSessionById(sessionId);
    return row ? this.rowToSession(row) : null;
  }

  async getByBookId(bookId: string): Promise<ReadingSession[]> {
    const rows = await this.db.getSessionsByBookId(bookId);
    return rows.map((row) => this.rowToSession(row));
  }

  async getRecent(limit: number = 10): Promise<ReadingSession[]> {
    const rows = await this.db.getRecentSessions(limit);
    return rows.map((row) => this.rowToSession(row));
  }

  async getToday(): Promise<ReadingSession[]> {
    const rows = await this.db.getTodaySessions();
    return rows.map((row) => this.rowToSession(row));
  }

  async delete(sessionId: string): Promise<void> {
    await this.db.deleteSession(sessionId);
  }

  async deleteByBookId(bookId: string): Promise<void> {
    await this.db.deleteSessionsByBookId(bookId);
  }

  async deleteAll(): Promise<void> {
    await this.db.deleteAllSessions();
  }

  async getStatistics(): Promise<ReadingStats> {
    return this.db.getSessionStatistics();
  }

  async getReadingTimeForPeriod(startDate: Date, endDate: Date): Promise<number> {
    return this.db.getReadingTimeForPeriod(startDate.getTime(), endDate.getTime());
  }

  async getDailyReadingTime(days: number = 7): Promise<Array<{date: string; minutes: number}>> {
    return this.db.getDailyReadingTime(days);
  }

  private rowToSession(row: SessionRow): ReadingSession {
    return {
      id: row.id,
      bookId: row.book_id,
      startedAt: new Date(row.started_at),
      endedAt: row.ended_at ? new Date(row.ended_at) : null,
      pagesRead: row.pages_read,
      wordsRevealed: row.words_revealed,
      wordsSaved: row.words_saved,
      duration: row.duration ?? 0,
    };
  }
}
