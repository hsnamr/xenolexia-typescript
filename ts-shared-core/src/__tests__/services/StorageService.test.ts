/**
 * Unit tests for StorageService using a stateful in-memory IDataStore mock
 */

import { StorageService, createStorageService } from '../../services/StorageService/StorageService';
import type { IDataStore, BookRow, VocabularyRow, SessionRow } from '../../adapters';
import type { Book, VocabularyItem, UserPreferences, ReadingStats } from '../../types';

function createInMemoryDataStore(): IDataStore {
  const books = new Map<string, BookRow>();
  const vocabulary = new Map<string, VocabularyRow>();
  const sessions = new Map<string, SessionRow>();
  const preferences = new Map<string, string>();

  const defaultReadingStats: ReadingStats = {
    totalBooksRead: 0,
    totalReadingTime: 0,
    totalWordsLearned: 0,
    currentStreak: 0,
    longestStreak: 0,
    averageSessionDuration: 0,
    wordsRevealedToday: 0,
    wordsSavedToday: 0,
  };

  const store = {
    initialize: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    isReady: jest.fn().mockReturnValue(true),
    getSchemaVersion: jest.fn().mockResolvedValue(1),

    getBookById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(books.get(id) ?? null)
    ),
    getBooks: jest.fn().mockImplementation((options?: { limit?: number }) => {
      const limit = options?.limit ?? 999;
      const list = Array.from(books.values()).slice(0, limit);
      return Promise.resolve(list);
    }),
    addBook: jest.fn().mockImplementation((row: BookRow) => {
      books.set(row.id, row);
      return Promise.resolve();
    }),
    updateBook: jest.fn().mockImplementation((id: string, updates: Partial<BookRow>) => {
      const row = books.get(id);
      if (row) books.set(id, { ...row, ...updates });
      return Promise.resolve();
    }),
    deleteBook: jest.fn().mockImplementation((id: string) => {
      books.delete(id);
      return Promise.resolve();
    }),
    deleteAllBooks: jest.fn().mockImplementation(() => {
      books.clear();
      return Promise.resolve();
    }),
    getBookCount: jest.fn().mockResolvedValue(0),
    getBookStatistics: jest.fn().mockResolvedValue({
      total: 0,
      in_progress: 0,
      completed: 0,
      total_time: 0,
    }),

    getVocabularyById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(vocabulary.get(id) ?? null)
    ),
    getVocabulary: jest.fn().mockImplementation((options?: { dueForReview?: { now: number; limit: number }; limit?: number; sort?: unknown }) => {
      const list = Array.from(vocabulary.values());
      if (options?.dueForReview) {
        const { limit = 20 } = options.dueForReview;
        return Promise.resolve(list.slice(0, limit));
      }
      const limit = options?.limit ?? 999;
      return Promise.resolve(list.slice(0, limit));
    }),
    addVocabulary: jest.fn().mockImplementation((row: VocabularyRow) => {
      vocabulary.set(row.id, row);
      return Promise.resolve();
    }),
    updateVocabulary: jest.fn().mockImplementation((id: string, updates: Partial<VocabularyRow>) => {
      const row = vocabulary.get(id);
      if (row) vocabulary.set(id, { ...row, ...updates });
      return Promise.resolve();
    }),
    deleteVocabulary: jest.fn().mockImplementation((id: string) => {
      vocabulary.delete(id);
      return Promise.resolve();
    }),
    deleteAllVocabulary: jest.fn().mockImplementation(() => {
      vocabulary.clear();
      return Promise.resolve();
    }),
    getVocabularyDueCount: jest.fn().mockImplementation(() =>
      Promise.resolve(vocabulary.size)
    ),
    getVocabularyStatistics: jest.fn().mockImplementation(() =>
      Promise.resolve({
        total: vocabulary.size,
        new_count: 0,
        learning_count: 0,
        review_count: 0,
        learned_count: 0,
        due: vocabulary.size,
      })
    ),
    getVocabularyCountByStatus: jest.fn().mockResolvedValue(0),

    getSessionById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(sessions.get(id) ?? null)
    ),
    getSessionsByBookId: jest.fn().mockResolvedValue([]),
    getRecentSessions: jest.fn().mockImplementation((limit: number) => {
      const list = Array.from(sessions.values()).slice(0, limit);
      return Promise.resolve(list);
    }),
    getTodaySessions: jest.fn().mockResolvedValue([]),
    addSession: jest.fn().mockImplementation((row: SessionRow) => {
      sessions.set(row.id, row);
      return Promise.resolve();
    }),
    updateSession: jest.fn().mockImplementation((id: string, updates: Partial<SessionRow>) => {
      const row = sessions.get(id);
      if (row) sessions.set(id, { ...row, ...updates });
      return Promise.resolve();
    }),
    deleteSession: jest.fn().mockImplementation((id: string) => {
      sessions.delete(id);
      return Promise.resolve();
    }),
    deleteSessionsByBookId: jest.fn().mockResolvedValue(undefined),
    deleteAllSessions: jest.fn().mockImplementation(() => {
      sessions.clear();
      return Promise.resolve();
    }),
    getSessionStatistics: jest.fn().mockResolvedValue(defaultReadingStats),
    getReadingTimeForPeriod: jest.fn().mockResolvedValue(0),
    getDailyReadingTime: jest.fn().mockResolvedValue([]),
    getDistinctSessionDays: jest.fn().mockResolvedValue([]),

    getPreference: jest.fn().mockImplementation((key: string) =>
      Promise.resolve(preferences.get(key) ?? null)
    ),
    setPreference: jest.fn().mockImplementation((key: string, value: string) => {
      preferences.set(key, value);
      return Promise.resolve();
    }),

    getWordListEntry: jest.fn().mockResolvedValue(null),
    getWordListEntryByVariant: jest.fn().mockResolvedValue(null),
    getWordListByLevel: jest.fn().mockResolvedValue([]),
    getWordListByLangs: jest.fn().mockResolvedValue([]),
    getWordListCount: jest.fn().mockResolvedValue(0),
    addWordListEntry: jest.fn().mockResolvedValue(undefined),
    deleteWordListByPair: jest.fn().mockResolvedValue(undefined),
    getWordListProficiencyCounts: jest.fn().mockResolvedValue({}),
    getWordListPosCounts: jest.fn().mockResolvedValue({}),
    getWordListStats: jest.fn().mockResolvedValue({ total: 0, pairs: [] }),
    getWordListSearch: jest.fn().mockResolvedValue([]),

    runTransaction: jest.fn(),
  } as IDataStore;

  // runTransaction applies ops using the same store
  (store.runTransaction as jest.Mock).mockImplementation(
    async (ops: Array<{ method: string; args: unknown[] }>) => {
      for (const { method, args } of ops) {
        if (method === 'addBook') await store.addBook(args[0] as BookRow);
        else if (method === 'addVocabulary') await store.addVocabulary(args[0] as VocabularyRow);
        else if (method === 'deleteAllVocabulary') await store.deleteAllVocabulary();
        else if (method === 'deleteAllSessions') await store.deleteAllSessions();
        else if (method === 'deleteAllBooks') await store.deleteAllBooks();
      }
    }
  );
  return store;
}

function makeBook(overrides: Partial<Book> = {}): Book {
  return {
    id: 'b1',
    title: 'Test Book',
    author: 'Author',
    coverPath: null,
    filePath: '/path/to/book.epub',
    format: 'epub',
    fileSize: 1000,
    addedAt: new Date(),
    lastReadAt: null,
    languagePair: { sourceLanguage: 'en', targetLanguage: 'el' },
    proficiencyLevel: 'intermediate',
    wordDensity: 0.3,
    progress: 0,
    currentLocation: null,
    currentChapter: 0,
    totalChapters: 10,
    currentPage: 0,
    totalPages: 100,
    readingTimeMinutes: 0,
    isDownloaded: true,
    ...overrides,
  };
}

function makeVocabularyItem(overrides: Partial<VocabularyItem> = {}): VocabularyItem {
  return {
    id: 'v1',
    sourceWord: 'hello',
    targetWord: 'γεια',
    sourceLanguage: 'en',
    targetLanguage: 'el',
    contextSentence: null,
    bookId: null,
    bookTitle: null,
    addedAt: new Date(),
    lastReviewedAt: null,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
    status: 'new',
    ...overrides,
  };
}

describe('StorageService', () => {
  describe('createStorageService', () => {
    it('returns a StorageService instance', () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      expect(service).toBeInstanceOf(StorageService);
      expect(service.getBookRepository()).toBeDefined();
      expect(service.getVocabularyRepository()).toBeDefined();
      expect(service.getSessionRepository()).toBeDefined();
    });
  });

  describe('initialize', () => {
    it('calls db.initialize once', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);

      await service.initialize();
      await service.initialize();

      expect(db.initialize).toHaveBeenCalledTimes(1);
    });
  });

  describe('books', () => {
    it('addBook and getBook round-trip', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      const book = makeBook({ id: 'b1', title: 'My Book' });

      await service.addBook(book);
      const got = await service.getBook('b1');

      expect(got).not.toBeNull();
      expect(got!.title).toBe('My Book');
      expect(got!.id).toBe('b1');
    });

    it('getAllBooks returns added books', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addBook(makeBook({ id: 'b1' }));
      await service.addBook(makeBook({ id: 'b2', title: 'Second' }));

      const list = await service.getAllBooks();

      expect(list.length).toBe(2);
      expect(list.some((b) => b.title === 'Second')).toBe(true);
    });
  });

  describe('vocabulary', () => {
    it('addVocabulary and getAllVocabulary round-trip', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      const item = makeVocabularyItem({ id: 'v1', sourceWord: 'test' });

      await service.addVocabulary(item);
      const list = await service.getAllVocabulary();

      expect(list).toHaveLength(1);
      expect(list[0].sourceWord).toBe('test');
    });

    it('getVocabularyDueForReview returns items from repository', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addVocabulary(makeVocabularyItem({ id: 'v1' }));

      const due = await service.getVocabularyDueForReview();

      expect(db.getVocabulary).toHaveBeenCalledWith(
        expect.objectContaining({ dueForReview: { now: expect.any(Number), limit: 20 } })
      );
      expect(Array.isArray(due)).toBe(true);
    });
  });

  describe('sessions', () => {
    it('startSession returns session id', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addBook(makeBook({ id: 'b1' }));

      const sessionId = await service.startSession('b1');

      expect(sessionId).toBeDefined();
      expect(typeof sessionId).toBe('string');
      expect(db.addSession).toHaveBeenCalled();
    });

    it('endSession does not throw', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addBook(makeBook({ id: 'b1' }));
      const sessionId = await service.startSession('b1');

      await expect(
        service.endSession(sessionId, { pagesRead: 1, wordsRevealed: 5, wordsSaved: 2 })
      ).resolves.not.toThrow();
    });
  });

  describe('preferences', () => {
    it('savePreferences and loadPreferences round-trip', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      const prefs: UserPreferences = {
        defaultSourceLanguage: 'en',
        defaultTargetLanguage: 'el',
        defaultProficiencyLevel: 'intermediate',
        defaultWordDensity: 0.3,
        readerSettings: {
          theme: 'light',
          fontFamily: 'serif',
          fontSize: 16,
          lineHeight: 1.5,
          marginHorizontal: 20,
          marginVertical: 20,
          textAlign: 'left',
          brightness: 1,
        },
        hasCompletedOnboarding: true,
        notificationsEnabled: false,
        dailyGoal: 10,
      };

      await service.savePreferences(prefs);
      const loaded = await service.loadPreferences();

      expect(loaded).not.toBeNull();
      expect(loaded!.defaultSourceLanguage).toBe('en');
      expect(loaded!.hasCompletedOnboarding).toBe(true);
    });
  });

  describe('exportData and clearAllData', () => {
    it('exportData returns JSON with books, vocabulary, sessions', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addBook(makeBook({ id: 'b1' }));
      await service.addVocabulary(makeVocabularyItem({ id: 'v1' }));

      const json = await service.exportData();
      const parsed = JSON.parse(json);

      expect(parsed.books).toBeDefined();
      expect(parsed.vocabulary).toBeDefined();
      expect(parsed.sessions).toBeDefined();
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.version).toBe('1.0.0');
    });

    it('clearAllData calls runTransaction with delete operations', async () => {
      const db = createInMemoryDataStore();
      const service = createStorageService(db);
      await service.addBook(makeBook({ id: 'b1' }));

      await service.clearAllData();

      expect(db.runTransaction).toHaveBeenCalledWith(
        expect.arrayContaining([
          { method: 'deleteAllVocabulary', args: [] },
          { method: 'deleteAllSessions', args: [] },
          { method: 'deleteAllBooks', args: [] },
        ])
      );
    });
  });
});
