/**
 * Types - Re-export from xenolexia-typescript core + React Native navigation types.
 */

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
} from 'xenolexia-typescript';
export { SUPPORTED_LANGUAGES, getLanguageInfo, getLanguageName } from 'xenolexia-typescript';

// ============================================================================
// Navigation Types (React Native only)
// ============================================================================

import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabsParamList = {
  Library: undefined;
  Vocabulary: { filter?: 'all' | 'learning' | 'mastered' | 'new' };
  Statistics: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: NavigatorScreenParams<MainTabsParamList> | undefined;
  Reader: { bookId: string; initialLocation?: string };
  BookDetail: { bookId: string };
  BookDiscovery: { searchQuery?: string };
  VocabularyDetail: { wordId: string };
  VocabularyQuiz: { wordIds?: string[] };
  Settings: undefined;
  LanguageSettings: undefined;
  ReaderSettings: undefined;
  NotificationSettings: undefined;
  DataManagement: undefined;
  About: undefined;
};
