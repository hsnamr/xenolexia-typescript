/**
 * Unit tests for VocabularyRepository (getDueForReview, recordReview, CRUD)
 */

import { VocabularyRepository } from '../../services/StorageService/repositories/VocabularyRepository';
import type { IDataStore, VocabularyRow } from '../../adapters';
import type { VocabularyItem } from '../../types';

function makeVocabularyRow(overrides: Partial<VocabularyRow> = {}): VocabularyRow {
  return {
    id: 'v1',
    source_word: 'hello',
    target_word: 'γεια',
    source_lang: 'en',
    target_lang: 'el',
    context_sentence: null,
    book_id: null,
    book_title: null,
    added_at: Date.now() - 86400000,
    last_reviewed_at: null,
    review_count: 0,
    ease_factor: 2.5,
    interval: 0,
    status: 'new',
    ...overrides,
  };
}

function createMockDataStore(initial: {
  vocabularyById?: Record<string, VocabularyRow>;
  vocabularyList?: VocabularyRow[];
} = {}): IDataStore {
  const vocabularyById = new Map<string, VocabularyRow>();
  (initial.vocabularyById && Object.entries(initial.vocabularyById))?.forEach(([id, row]) =>
    vocabularyById.set(id, row)
  );
  const vocabularyList = initial.vocabularyList ?? [];

  const noop = jest.fn().mockResolvedValue(undefined);
  const noopNull = jest.fn().mockResolvedValue(null);
  const noopArray = jest.fn().mockResolvedValue([]);
  const noopNumber = jest.fn().mockResolvedValue(0);

  return {
    initialize: noop,
    close: noop,
    isReady: jest.fn().mockReturnValue(true),
    getSchemaVersion: jest.fn().mockResolvedValue(1),
    getBookById: noopNull,
    getBooks: noopArray,
    addBook: noop,
    updateBook: noop,
    deleteBook: noop,
    deleteAllBooks: noop,
    getBookCount: noopNumber,
    getBookStatistics: jest.fn().mockResolvedValue({ total: 0, in_progress: 0, completed: 0, total_time: 0 }),
    getVocabularyById: jest.fn().mockImplementation((id: string) =>
      Promise.resolve(vocabularyById.get(id) ?? null)
    ),
    getVocabulary: jest.fn().mockImplementation((options?: { dueForReview?: { now: number; limit: number }; limit?: number }) => {
      if (options?.dueForReview) {
        const { limit = 20 } = options.dueForReview;
        return Promise.resolve(vocabularyList.slice(0, limit));
      }
      return Promise.resolve(vocabularyList);
    }),
    addVocabulary: jest.fn().mockImplementation((row: VocabularyRow) => {
      vocabularyById.set(row.id, row);
      vocabularyList.push(row);
      return Promise.resolve();
    }),
    updateVocabulary: jest.fn().mockImplementation((id: string, updates: Partial<VocabularyRow>) => {
      const row = vocabularyById.get(id);
      if (row) {
        const updated = { ...row, ...updates };
        vocabularyById.set(id, updated);
        const idx = vocabularyList.findIndex((r) => r.id === id);
        if (idx >= 0) vocabularyList[idx] = updated;
      }
      return Promise.resolve();
    }),
    deleteVocabulary: noop,
    deleteAllVocabulary: noop,
    getVocabularyDueCount: jest.fn().mockResolvedValue(vocabularyList.length),
    getVocabularyStatistics: jest.fn().mockResolvedValue({
      total: vocabularyList.length,
      new_count: 0,
      learning_count: 0,
      review_count: 0,
      learned_count: 0,
      due: vocabularyList.length,
    }),
    getVocabularyCountByStatus: noopNumber,
    getSessionById: noopNull,
    getSessionsByBookId: noopArray,
    getRecentSessions: noopArray,
    getTodaySessions: noopArray,
    addSession: noop,
    updateSession: noop,
    deleteSession: noop,
    deleteSessionsByBookId: noop,
    deleteAllSessions: noop,
    getSessionStatistics: jest.fn().mockResolvedValue({
      totalBooksRead: 0,
      totalReadingTime: 0,
      totalWordsLearned: 0,
      currentStreak: 0,
      longestStreak: 0,
      averageSessionDuration: 0,
      wordsRevealedToday: 0,
      wordsSavedToday: 0,
    }),
    getReadingTimeForPeriod: noopNumber,
    getDailyReadingTime: noopArray,
    getDistinctSessionDays: noopArray,
    getPreference: noopNull,
    setPreference: noop,
    getWordListEntry: noopNull,
    getWordListEntryByVariant: noopNull,
    getWordListByLevel: noopArray,
    getWordListByLangs: noopArray,
    getWordListCount: noopNumber,
    addWordListEntry: noop,
    deleteWordListByPair: noop,
    getWordListProficiencyCounts: jest.fn().mockResolvedValue({}),
    getWordListPosCounts: jest.fn().mockResolvedValue({}),
    getWordListStats: jest.fn().mockResolvedValue({ total: 0, pairs: [] }),
    getWordListSearch: noopArray,
    runTransaction: noop,
  } as IDataStore;
}

describe('VocabularyRepository', () => {
  describe('getDueForReview', () => {
    it('returns items from db.getVocabulary with dueForReview option', async () => {
      const dueRow = makeVocabularyRow({ id: 'due1', source_word: 'word', status: 'review' });
      const db = createMockDataStore({ vocabularyList: [dueRow] });
      const repo = new VocabularyRepository(db);

      const result = await repo.getDueForReview(10);

      expect(db.getVocabulary).toHaveBeenCalledWith({ dueForReview: { now: expect.any(Number), limit: 10 } });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('due1');
      expect(result[0].sourceWord).toBe('word');
      expect(result[0].status).toBe('review');
    });

    it('defaults limit to 20', async () => {
      const db = createMockDataStore({ vocabularyList: [] });
      const repo = new VocabularyRepository(db);

      await repo.getDueForReview();

      expect(db.getVocabulary).toHaveBeenCalledWith({ dueForReview: { now: expect.any(Number), limit: 20 } });
    });
  });

  describe('recordReview', () => {
    it('updates item with SM-2 when quality >= 3 (first review: interval 1, status learning)', async () => {
      const row = makeVocabularyRow({
        id: 'v1',
        review_count: 0,
        interval: 0,
        ease_factor: 2.5,
        status: 'new',
      });
      const db = createMockDataStore({ vocabularyById: { v1: row }, vocabularyList: [row] });
      const repo = new VocabularyRepository(db);

      await repo.recordReview('v1', 4);

      expect(db.updateVocabulary).toHaveBeenCalledWith(
        'v1',
        expect.objectContaining({
          review_count: 1,
          interval: 1,
          status: 'learning',
          last_reviewed_at: expect.any(Number),
        })
      );
      const call = (db.updateVocabulary as jest.Mock).mock.calls[0][1];
      expect(call.ease_factor).toBeGreaterThanOrEqual(1.3);
    });

    it('when quality < 3 resets interval and sets status to learning', async () => {
      const row = makeVocabularyRow({
        id: 'v2',
        review_count: 5,
        interval: 10,
        ease_factor: 2.6,
        status: 'review',
      });
      const db = createMockDataStore({ vocabularyById: { v2: row }, vocabularyList: [row] });
      const repo = new VocabularyRepository(db);

      await repo.recordReview('v2', 2);

      expect(db.updateVocabulary).toHaveBeenCalledWith(
        'v2',
        expect.objectContaining({
          review_count: 6,
          interval: 0,
          status: 'learning',
          last_reviewed_at: expect.any(Number),
        })
      );
    });

    it('does nothing when item not found', async () => {
      const db = createMockDataStore();
      (db.getVocabularyById as jest.Mock).mockResolvedValue(null);
      const repo = new VocabularyRepository(db);

      await repo.recordReview('nonexistent', 5);

      expect(db.updateVocabulary).not.toHaveBeenCalled();
    });
  });

  describe('add and getById', () => {
    it('adds item and getById returns it', async () => {
      const db = createMockDataStore();
      const repo = new VocabularyRepository(db);
      const item: VocabularyItem = {
        id: 'new1',
        sourceWord: 'test',
        targetWord: 'δοκιμή',
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
      };

      await repo.add(item);
      const stored = await repo.getById('new1');

      expect(db.addVocabulary).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'new1',
          source_word: 'test',
          target_word: 'δοκιμή',
          source_lang: 'en',
          target_lang: 'el',
          status: 'new',
        })
      );
      expect(stored).not.toBeNull();
      expect(stored!.sourceWord).toBe('test');
      expect(stored!.targetWord).toBe('δοκιμή');
    });
  });
});
