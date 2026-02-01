/**
 * xenolexia-typescript - Shared core logic for Xenolexia (React Native, Electron)
 * Platform-agnostic types, algorithms, and services. Host provides IFileSystem, IDataStore, IKeyValueStore.
 */

// Types (export types only to avoid duplicate SUPPORTED_LANGUAGES with constants)
export type {
  Language,
  ProficiencyLevel,
  LanguagePair,
  LanguageInfo,
  BookFormat,
  Book,
  BookMetadata,
  Chapter,
  TableOfContentsItem,
  ParsedBook,
  PartOfSpeech,
  WordEntry,
  VocabularyItem,
  VocabularyStatus,
  ReaderTheme,
  ReaderSettings,
  ForeignWordData,
  ProcessedChapter,
  ReadingSession,
  ReadingStats,
  UserPreferences,
  AppState,
} from './types';
export {
  SUPPORTED_LANGUAGES,
  getLanguageInfo,
  getLanguageName,
} from './types';

// Adapters (interfaces + in-memory defaults)
export * from './adapters';

// Constants & data (exclude SUPPORTED_LANGUAGES to avoid duplicate)
export {
  APP_NAME,
  APP_VERSION,
  PROFICIENCY_LEVELS,
  SUPPORTED_FORMATS,
  READER_THEMES,
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  ROUTES,
  API_ENDPOINTS,
  SRS,
} from './constants';
export * from './data';

// Storage (host provides IDataStore)
export {
  StorageService,
  createStorageService,
  BookRepository,
  VocabularyRepository,
  SessionRepository,
  DatabaseSchema,
} from './services/StorageService';
export type {
  IDataStore,
  BookRow,
  VocabularyRow,
  SessionRow,
  WordListRow,
  BookSort,
  BookFilter,
  VocabularySort,
  VocabularyFilter,
  QueryResult,
  MigrationDefinition,
} from './services/StorageService';

// Translation engine (host provides IDataStore + IKeyValueStore for DynamicWordDatabase, TranslationAPIService, FrequencyListService)
export {
  TranslationEngine,
  createTranslationEngine,
  createDefaultEngine,
  Tokenizer,
  WordReplacer,
  WordMatcher,
  TranslationAPIService,
  translationAPI,
  FrequencyListService,
  frequencyListService,
  DynamicWordDatabase,
  WordDatabaseService,
  PROFICIENCY_THRESHOLDS,
  PROFICIENCY_RANKS,
  getProficiencyFromRank,
  generateInjectedScript,
  generateForeignWordStyles,
  getFullInjectedContent,
  injectedScript,
  foreignWordStyles,
} from './services/TranslationEngine';
export type { TranslationOptions, ProcessedText, InjectedScriptOptions } from './services/TranslationEngine';

export type { ExportFormat, ExportOptions, ExportResult } from './services/ExportService';

// Book parser (host provides IFileSystem)
export {
  BookParserService,
  EPUBParser,
  TXTParser,
  MOBIParser,
  ChapterContentService,
  TextProcessingService,
  EPUBExtractor,
  MetadataExtractor,
  extractEPUBMetadata,
  extractEPUBInfo,
  extractEPUBCover,
} from './services/BookParser';
export type { IBookParser, ParserOptions, SearchResult } from './services/BookParser';

// Factory: create core services with host adapters
import type { IFileSystem, IDataStore, IKeyValueStore } from './adapters';
import { memoryKeyValueStore } from './adapters';
import { StorageService, createStorageService } from './services/StorageService';
import { BookParserService } from './services/BookParser';
import { TranslationAPIService } from './services/TranslationEngine/TranslationAPIService';
import { FrequencyListService } from './services/TranslationEngine/FrequencyListService';
import { DynamicWordDatabase } from './services/TranslationEngine/DynamicWordDatabase';
import { TranslationEngine, createTranslationEngine } from './services/TranslationEngine/TranslationEngine';
import { WordMatcher } from './services/TranslationEngine/WordMatcher';
import { ExportService } from './services/ExportService/ExportService';
import { ChapterContentService } from './services/BookParser/ChapterContentService';
import type { TranslationOptions } from './services/TranslationEngine/types';

export interface XenolexiaCoreAdapters {
  fileSystem: IFileSystem;
  dataStore: IDataStore;
  keyValueStore?: IKeyValueStore;
}

export interface XenolexiaCore {
  storageService: StorageService;
  bookParserService: BookParserService;
  translationAPIService: TranslationAPIService;
  frequencyListService: FrequencyListService;
  createDynamicWordDatabase: () => DynamicWordDatabase;
  createTranslationEngine: (options: TranslationOptions) => TranslationEngine;
  createChapterContentService: (engineFactory?: (opts: TranslationOptions) => TranslationEngine) => ChapterContentService;
  exportService: ExportService;
}

export { ExportService, exportService } from './services/ExportService';
export {
  ReaderStyleService,
  setReaderStyleStorage,
  READER_FONTS,
  generateStylesheet,
  getThemeCSSVariables,
  getFontCSS,
  saveSettings,
  loadSettings,
  saveBookSettings,
  loadBookSettings,
  getMergedSettings,
  resetSettings,
  resetBookSettings,
} from './services/ReaderStyleService';
export type { ReaderStyleConfig, ThemeColors } from './services/ReaderStyleService';

/**
 * Create core services with host-provided adapters.
 * Call this once at app startup with your IFileSystem, IDataStore, and optional IKeyValueStore.
 */
export function createXenolexiaCore(adapters: XenolexiaCoreAdapters): XenolexiaCore {
  const { fileSystem, dataStore, keyValueStore } = adapters;
  const kv = keyValueStore ?? memoryKeyValueStore;

  const storageService = createStorageService(dataStore);
  const bookParserService = new BookParserService(fileSystem);
  const translationAPIService = new TranslationAPIService(undefined, kv);
  const frequencyListService = new FrequencyListService(kv);

  const createDynamicWordDatabase = () =>
    new DynamicWordDatabase(dataStore, translationAPIService, frequencyListService);

  const createTranslationEngine = (options: TranslationOptions) => {
    const db = createDynamicWordDatabase();
    const wordMatcher = new WordMatcher(options.sourceLanguage, options.targetLanguage);
    return new TranslationEngine(options, db, wordMatcher);
  };

  const createChapterContentService = (engineFactory?: (opts: TranslationOptions) => TranslationEngine) =>
    new ChapterContentService(fileSystem, engineFactory);

  const exportService = new ExportService();

  return {
    storageService,
    bookParserService,
    translationAPIService,
    frequencyListService,
    createDynamicWordDatabase,
    createTranslationEngine,
    createChapterContentService,
    exportService,
  };
}
