/**
 * Storage Service - Handles all database operations
 * Facade that delegates to repositories. Host provides IDataStore.
 */

import type {Book, VocabularyItem, ReadingStats, UserPreferences} from '../../types';
import type {BookRow, VocabularyRow, IDataStore} from './DataStore.types';
import {BookRepository} from './repositories/BookRepository';
import {VocabularyRepository} from './repositories/VocabularyRepository';
import {SessionRepository} from './repositories/SessionRepository';

export class StorageService {
  private bookRepository: BookRepository;
  private vocabularyRepository: VocabularyRepository;
  private sessionRepository: SessionRepository;
  private initialized = false;

  constructor(private db: IDataStore) {
    this.bookRepository = new BookRepository(db);
    this.vocabularyRepository = new VocabularyRepository(db);
    this.sessionRepository = new SessionRepository(db);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.db.initialize();
    this.initialized = true;
  }

  getBookRepository(): BookRepository {
    return this.bookRepository;
  }
  getVocabularyRepository(): VocabularyRepository {
    return this.vocabularyRepository;
  }
  getSessionRepository(): SessionRepository {
    return this.sessionRepository;
  }

  async addBook(book: Book): Promise<void> {
    await this.initialize();
    await this.bookRepository.add(book);
  }

  async updateBook(bookId: string, updates: Partial<Book>): Promise<void> {
    await this.initialize();
    await this.bookRepository.update(bookId, updates);
  }

  async deleteBook(bookId: string): Promise<void> {
    await this.initialize();
    await this.bookRepository.delete(bookId);
  }

  async getBook(bookId: string): Promise<Book | null> {
    await this.initialize();
    return await this.bookRepository.getById(bookId);
  }

  async getAllBooks(): Promise<Book[]> {
    await this.initialize();
    return await this.bookRepository.getAll();
  }

  async addVocabulary(item: VocabularyItem): Promise<void> {
    await this.initialize();
    await this.vocabularyRepository.add(item);
  }

  async updateVocabulary(itemId: string, updates: Partial<VocabularyItem>): Promise<void> {
    await this.initialize();
    await this.vocabularyRepository.update(itemId, updates);
  }

  async deleteVocabulary(itemId: string): Promise<void> {
    await this.initialize();
    await this.vocabularyRepository.delete(itemId);
  }

  async getAllVocabulary(): Promise<VocabularyItem[]> {
    await this.initialize();
    return await this.vocabularyRepository.getAll();
  }

  async getVocabularyDueForReview(): Promise<VocabularyItem[]> {
    await this.initialize();
    return await this.vocabularyRepository.getDueForReview();
  }

  async startSession(bookId: string): Promise<string> {
    await this.initialize();
    return await this.sessionRepository.startSession(bookId);
  }

  async endSession(
    sessionId: string,
    stats: {pagesRead: number; wordsRevealed: number; wordsSaved: number},
  ): Promise<void> {
    await this.initialize();
    await this.sessionRepository.endSession(sessionId, stats);
  }

  async getReadingStats(): Promise<ReadingStats> {
    await this.initialize();
    return await this.sessionRepository.getStatistics();
  }

  async savePreferences(preferences: UserPreferences): Promise<void> {
    await this.initialize();
    await this.db.setPreference('userPreferences', JSON.stringify(preferences));
  }

  async loadPreferences(): Promise<UserPreferences | null> {
    await this.initialize();
    const value = await this.db.getPreference('userPreferences');
    return value ? JSON.parse(value) : null;
  }

  async exportData(): Promise<string> {
    await this.initialize();
    const books = await this.bookRepository.getAll();
    const vocabulary = await this.vocabularyRepository.getAll();
    const sessions = await this.sessionRepository.getRecent(1000);
    return JSON.stringify(
      {books, vocabulary, sessions, exportedAt: new Date().toISOString(), version: '1.0.0'},
      null,
      2
    );
  }

  async importData(jsonData: string): Promise<void> {
    await this.initialize();
    const data = JSON.parse(jsonData);
    const operations: Array<{method: string; args: unknown[]}> = [];
    const toMs = (v: unknown): number =>
      typeof v === 'number' ? v : v ? new Date(v as string).getTime() : Date.now();

    if (data.books && Array.isArray(data.books)) {
      for (const book of data.books) {
        try {
          const row: BookRow = {
            id: book.id,
            title: book.title,
            author: book.author ?? null,
            description: null,
            cover_path: book.coverPath ?? null,
            file_path: book.filePath,
            format: book.format,
            file_size: book.fileSize ?? 0,
            added_at: toMs(book.addedAt),
            last_read_at: book.lastReadAt != null ? toMs(book.lastReadAt) : null,
            progress: book.progress ?? 0,
            current_location: book.currentLocation ?? null,
            current_chapter: book.currentChapter ?? 0,
            total_chapters: book.totalChapters ?? 0,
            current_page: book.currentPage ?? 0,
            total_pages: book.totalPages ?? 0,
            reading_time_minutes: book.readingTimeMinutes ?? 0,
            source_lang: book.languagePair?.sourceLanguage ?? 'en',
            target_lang: book.languagePair?.targetLanguage ?? 'el',
            proficiency: book.proficiencyLevel ?? 'intermediate',
            word_density: book.wordDensity ?? 0.3,
            source_url: book.sourceUrl ?? null,
            is_downloaded: book.isDownloaded ? 1 : 0,
          };
          operations.push({method: 'addBook', args: [row]});
        } catch (e) {
          console.warn('Failed to import book:', book?.id, e);
        }
      }
    }

    if (data.vocabulary && Array.isArray(data.vocabulary)) {
      for (const word of data.vocabulary) {
        try {
          const row: VocabularyRow = {
            id: word.id,
            source_word: word.sourceWord,
            target_word: word.targetWord,
            source_lang: word.sourceLanguage,
            target_lang: word.targetLanguage,
            context_sentence: word.contextSentence ?? null,
            book_id: word.bookId ?? null,
            book_title: word.bookTitle ?? null,
            added_at: toMs(word.addedAt),
            last_reviewed_at: word.lastReviewedAt != null ? toMs(word.lastReviewedAt) : null,
            review_count: word.reviewCount ?? 0,
            ease_factor: word.easeFactor ?? 2.5,
            interval: word.interval ?? 0,
            status: word.status ?? 'new',
          };
          operations.push({method: 'addVocabulary', args: [row]});
        } catch (e) {
          console.warn('Failed to import vocabulary:', word?.id, e);
        }
      }
    }

    if (operations.length > 0) await this.db.runTransaction(operations);
  }

  async clearAllData(): Promise<void> {
    await this.initialize();
    await this.db.runTransaction([
      {method: 'deleteAllVocabulary', args: []},
      {method: 'deleteAllSessions', args: []},
      {method: 'deleteAllBooks', args: []},
    ]);
  }
}

/** Create a StorageService with the host's IDataStore implementation */
export function createStorageService(db: IDataStore): StorageService {
  return new StorageService(db);
}
