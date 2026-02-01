/**
 * Unit tests for createXenolexiaCore - factory with mock adapters
 */

import { createXenolexiaCore } from '../index';
import type { IFileSystem, IDataStore } from '../adapters';

const mockFileSystem: IFileSystem = {
  readFile: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  readFileAsText: jest.fn().mockResolvedValue(''),
  writeFile: jest.fn().mockResolvedValue(undefined),
  fileExists: jest.fn().mockResolvedValue(false),
  mkdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
};

function createMockDataStore(): IDataStore {
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
    getVocabularyById: noopNull,
    getVocabulary: noopArray,
    addVocabulary: noop,
    updateVocabulary: noop,
    deleteVocabulary: noop,
    deleteAllVocabulary: noop,
    getVocabularyDueCount: noopNumber,
    getVocabularyStatistics: jest.fn().mockResolvedValue({
      total: 0,
      new_count: 0,
      learning_count: 0,
      review_count: 0,
      learned_count: 0,
      due: 0,
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

describe('createXenolexiaCore', () => {
  it('should return an object with all core services', () => {
    const core = createXenolexiaCore({
      fileSystem: mockFileSystem,
      dataStore: createMockDataStore(),
    });

    expect(core).toHaveProperty('storageService');
    expect(core).toHaveProperty('bookParserService');
    expect(core).toHaveProperty('translationAPIService');
    expect(core).toHaveProperty('frequencyListService');
    expect(core).toHaveProperty('createDynamicWordDatabase');
    expect(core).toHaveProperty('createTranslationEngine');
    expect(core).toHaveProperty('createChapterContentService');
    expect(core).toHaveProperty('exportService');
  });

  it('createTranslationEngine should return a TranslationEngine instance', () => {
    const core = createXenolexiaCore({
      fileSystem: mockFileSystem,
      dataStore: createMockDataStore(),
    });

    const engine = core.createTranslationEngine({
      sourceLanguage: 'en',
      targetLanguage: 'el',
      proficiencyLevel: 'beginner',
      density: 0.2,
    });

    expect(engine).toBeDefined();
    expect(typeof engine.processContent).toBe('function');
  });

  it('createDynamicWordDatabase should return an instance with initialize and lookupWords', () => {
    const core = createXenolexiaCore({
      fileSystem: mockFileSystem,
      dataStore: createMockDataStore(),
    });

    const db = core.createDynamicWordDatabase();

    expect(db).toBeDefined();
    expect(typeof db.initialize).toBe('function');
    expect(typeof db.lookupWords).toBe('function');
  });
});
