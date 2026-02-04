/**
 * Storage Service - Unified facade for all database operations
 *
 * Uses FOSS stack:
 * - react-native-sqlite-storage (DatabaseService) for SQLite
 * - Delegates to BookRepository, VocabularyRepository, SessionRepository
 * - Preferences stored in SQLite preferences table (key/value JSON)
 */

import type {
  Book,
  VocabularyItem,
  ReadingSession,
  ReadingStats,
  UserPreferences,
} from '@types/index';

import {databaseService} from './DatabaseService';
import {bookRepository} from './repositories/BookRepository';
import {vocabularyRepository} from './repositories/VocabularyRepository';
import {sessionRepository} from './repositories/SessionRepository';

const PREFERENCES_KEY = 'user_preferences';

export class StorageService {
  private static isInitialized = false;

  /**
   * Initialize the database (via DatabaseService - react-native-sqlite-storage)
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await databaseService.initialize();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      throw error;
    }
  }

  // ============================================================================
  // Book Operations (delegate to BookRepository)
  // ============================================================================

  static async addBook(book: Book): Promise<void> {
    await this.initialize();
    await bookRepository.add(book);
  }

  static async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    await this.initialize();
    await bookRepository.update(bookId, updates);
  }

  static async deleteBook(bookId: string): Promise<void> {
    await this.initialize();
    await bookRepository.delete(bookId);
  }

  static async getBook(bookId: string): Promise<Book | null> {
    await this.initialize();
    return bookRepository.getById(bookId);
  }

  static async getAllBooks(): Promise<Book[]> {
    await this.initialize();
    return bookRepository.getAll();
  }

  // ============================================================================
  // Vocabulary Operations (delegate to VocabularyRepository)
  // ============================================================================

  static async addVocabulary(item: VocabularyItem): Promise<void> {
    await this.initialize();
    await vocabularyRepository.add(item);
  }

  static async updateVocabulary(
    itemId: string,
    updates: Partial<VocabularyItem>,
  ): Promise<void> {
    await this.initialize();
    await vocabularyRepository.update(itemId, updates);
  }

  static async deleteVocabulary(itemId: string): Promise<void> {
    await this.initialize();
    await vocabularyRepository.delete(itemId);
  }

  static async getAllVocabulary(): Promise<VocabularyItem[]> {
    await this.initialize();
    return vocabularyRepository.getAll();
  }

  static async getVocabularyDueForReview(): Promise<VocabularyItem[]> {
    await this.initialize();
    return vocabularyRepository.getDueForReview();
  }

  // ============================================================================
  // Session Operations (delegate to SessionRepository)
  // ============================================================================

  static async startSession(bookId: string): Promise<string> {
    await this.initialize();
    return sessionRepository.startSession(bookId);
  }

  static async endSession(
    sessionId: string,
    stats: {pagesRead: number; wordsRevealed: number; wordsSaved: number},
  ): Promise<void> {
    await this.initialize();
    await sessionRepository.endSession(sessionId, {
      pagesRead: stats.pagesRead,
      wordsRevealed: stats.wordsRevealed,
      wordsSaved: stats.wordsSaved,
    });
  }

  static async getReadingStats(): Promise<ReadingStats> {
    await this.initialize();
    return sessionRepository.getStatistics();
  }

  // ============================================================================
  // Preferences Operations (SQLite preferences table)
  // ============================================================================

  static async savePreferences(preferences: UserPreferences): Promise<void> {
    await this.initialize();
    const value = JSON.stringify(preferences);
    const now = Date.now();
    await databaseService.execute(
      `INSERT OR REPLACE INTO preferences (key, value, updated_at) VALUES (?, ?, ?)`,
      [PREFERENCES_KEY, value, now],
    );
  }

  static async loadPreferences(): Promise<UserPreferences | null> {
    await this.initialize();
    const row = await databaseService.getOne<{value: string}>(
      'SELECT value FROM preferences WHERE key = ?',
      [PREFERENCES_KEY],
    );
    if (!row?.value) return null;
    try {
      return JSON.parse(row.value) as UserPreferences;
    } catch {
      return null;
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  static async exportData(): Promise<string> {
    await this.initialize();
    const [books, vocabulary, preferences] = await Promise.all([
      bookRepository.getAll(),
      vocabularyRepository.getAll(),
      this.loadPreferences(),
    ]);
    const sessions = await sessionRepository.getRecent(1000);
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      books,
      vocabulary,
      sessions,
      preferences,
    };
    return JSON.stringify(payload, null, 2);
  }

  static async importData(jsonData: string): Promise<void> {
    await this.initialize();
    let data: {
      books?: Book[];
      vocabulary?: VocabularyItem[];
      preferences?: UserPreferences | null;
    };
    try {
      data = JSON.parse(jsonData) as typeof data;
    } catch {
      throw new Error('Invalid JSON data');
    }
    if (data.books?.length) {
      for (const book of data.books) {
        try {
          await bookRepository.add(book);
        } catch (e) {
          console.warn('Skip duplicate or invalid book:', book.id, e);
        }
      }
    }
    if (data.vocabulary?.length) {
      for (const item of data.vocabulary) {
        try {
          await vocabularyRepository.add(item);
        } catch (e) {
          console.warn('Skip duplicate or invalid vocabulary:', item.id, e);
        }
      }
    }
    if (data.preferences) {
      await this.savePreferences(data.preferences);
    }
  }

  static async clearAllData(): Promise<void> {
    await this.initialize();
    await databaseService.transaction(async () => {
      await bookRepository.deleteAll();
      await vocabularyRepository.deleteAll();
      await databaseService.execute('DELETE FROM reading_sessions');
      await databaseService.execute('DELETE FROM preferences');
    });
  }
}
