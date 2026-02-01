/**
 * Re-export data store types from adapters (single source of truth).
 */
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
} from '../../adapters';
