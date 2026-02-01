/**
 * Storage Service - Database operations and repositories
 * Host provides IDataStore; use createStorageService(dataStore).
 */

export {StorageService, createStorageService} from './StorageService';
export {DatabaseSchema} from './DatabaseSchema';
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
} from './DataStore.types';

export {BookRepository, VocabularyRepository, SessionRepository} from './repositories';
export type {BookFilter as RepoBookFilter, BookSort as RepoBookSort, VocabularyFilter as RepoVocabularyFilter, VocabularySort as RepoVocabularySort} from './repositories';
