/**
 * Reader Store - Manages reading state, content loading, and progress tracking
 */

import { create } from 'zustand';
import type {
  Book,
  Chapter,
  ForeignWordData,
  ReaderSettings,
  ProcessedChapter,
  TableOfContentsItem,
} from '@types/index';
import {
  BookParserService,
  bookParserService,
  chapterContentService,
} from '@services/BookParser';
import type { IBookParser, ChapterContentService } from 'xenolexia-typescript';
import { ReaderStyleService } from '@services/ReaderStyleService';
import { BrightnessService } from '@services/BrightnessService';

// ============================================================================
// Types
// ============================================================================

interface ReaderState {
  // Current book state
  currentBook: Book | null;
  chapters: Chapter[];
  tableOfContents: TableOfContentsItem[];
  currentChapterIndex: number;
  currentChapter: Chapter | null;

  // Processed content
  processedHtml: string;
  foreignWords: ForeignWordData[];

  // Progress tracking
  scrollPosition: number;
  chapterProgress: number;
  overallProgress: number;

  // Reader settings (session copy)
  settings: ReaderSettings & {
    targetLanguage?: string;
    proficiencyLevel?: string;
    wordDensity?: number;
  };

  // UI state
  isLoading: boolean;
  isLoadingChapter: boolean;
  error: string | null;

  // Internal references
  parser: IBookParser | null;
  contentService: ChapterContentService;

  // Actions
  loadBook: (book: Book) => Promise<void>;
  goToChapter: (index: number) => Promise<void>;
  goToNextChapter: () => Promise<void>;
  goToPreviousChapter: () => Promise<void>;
  updateSettings: (settings: Partial<ReaderState['settings']>) => void;
  updateProgress: (chapterProgress: number) => void;
  updateScrollPosition: (scrollY: number) => void;
  closeBook: () => void;
}

// ============================================================================
// Default Settings
// ============================================================================

const defaultSettings: ReaderState['settings'] = {
  theme: 'light',
  fontFamily: 'Georgia',
  fontSize: 18,
  lineHeight: 1.6,
  marginHorizontal: 24,
  marginVertical: 24,
  textAlign: 'left',
  brightness: 1.0,
  targetLanguage: 'el',
  proficiencyLevel: 'beginner',
  wordDensity: 0.3,
};

// ============================================================================
// Reader Store
// ============================================================================

export const useReaderStore = create<ReaderState>((set, get) => ({
  // Initial state
  currentBook: null,
  chapters: [],
  tableOfContents: [],
  currentChapterIndex: 0,
  currentChapter: null,
  processedHtml: '',
  foreignWords: [],
  scrollPosition: 0,
  chapterProgress: 0,
  overallProgress: 0,
  settings: defaultSettings,
  isLoading: false,
  isLoadingChapter: false,
  error: null,
  parser: null,
  contentService: chapterContentService,

  /**
   * Load a book and parse its content (EPUB, FB2, MOBI, TXT via BookParserService)
   */
  loadBook: async (book: Book) => {
    set({ isLoading: true, error: null, currentBook: book });

    try {
      const parser = bookParserService.getParser(book.filePath, book.format);

      const parsedBook = await parser.parse(book.filePath);

      // Load EPUB in content service only for EPUB (image extraction from ZIP)
      if (book.format === 'epub') {
        await get().contentService.loadEpub(book.filePath);
      }

      const merged = await ReaderStyleService.getMergedSettings(book.id, defaultSettings);
      const settingsWithBook = {
        ...defaultSettings,
        ...merged,
        targetLanguage: book.languagePair.targetLanguage,
        proficiencyLevel: book.proficiencyLevel,
        wordDensity: book.wordDensity,
      };

      set({
        parser,
        chapters: parsedBook.chapters,
        tableOfContents: parsedBook.tableOfContents,
        isLoading: false,
        settings: settingsWithBook,
      });

      BrightnessService.setBrightness(settingsWithBook.brightness ?? 1);

      const startChapter = book.currentChapter || 0;
      await get().goToChapter(startChapter);
    } catch (error) {
      console.error('Failed to load book:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load book',
        isLoading: false,
      });
    }
  },

  /**
   * Navigate to a specific chapter
   */
  goToChapter: async (index: number) => {
    const { chapters, settings, contentService } = get();

    if (index < 0 || index >= chapters.length) {
      return;
    }

    set({ isLoadingChapter: true, scrollPosition: 0, chapterProgress: 0 });

    try {
      const chapter = chapters[index];

      // Generate HTML with styles
      const processedContent = await contentService.getChapterHtml(chapter, {
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        lineHeight: settings.lineHeight,
        textAlign: settings.textAlign,
        marginHorizontal: settings.marginHorizontal,
        theme: settings.theme,
        foreignWordColor: '#6366f1',
      });

      // Calculate overall progress
      const overallProgress = ((index + 1) / chapters.length) * 100;

      set({
        currentChapterIndex: index,
        currentChapter: chapter,
        processedHtml: processedContent.html,
        foreignWords: [], // Will be populated by translation engine
        isLoadingChapter: false,
        overallProgress,
      });
    } catch (error) {
      console.error('Failed to load chapter:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load chapter',
        isLoadingChapter: false,
      });
    }
  },

  /**
   * Go to next chapter
   */
  goToNextChapter: async () => {
    const { currentChapterIndex, chapters } = get();
    if (currentChapterIndex < chapters.length - 1) {
      await get().goToChapter(currentChapterIndex + 1);
    }
  },

  /**
   * Go to previous chapter
   */
  goToPreviousChapter: async () => {
    const { currentChapterIndex } = get();
    if (currentChapterIndex > 0) {
      await get().goToChapter(currentChapterIndex - 1);
    }
  },

  /**
   * Update reader settings
   */
  updateSettings: (newSettings: Partial<ReaderState['settings']>) => {
    set((state) => ({
      settings: { ...state.settings, ...newSettings },
    }));
  },

  /**
   * Update reading progress within current chapter
   */
  updateProgress: (chapterProgress: number) => {
    const { currentChapterIndex, chapters } = get();

    // Calculate overall book progress
    const chapterWeight = 1 / chapters.length;
    const overallProgress =
      currentChapterIndex * chapterWeight * 100 +
      chapterProgress * chapterWeight;

    set({
      chapterProgress,
      overallProgress: Math.min(100, Math.max(0, overallProgress)),
    });
  },

  /**
   * Update scroll position for restoring later
   */
  updateScrollPosition: (scrollY: number) => {
    set({ scrollPosition: scrollY });
  },

  /**
   * Close the current book and clean up
   */
  closeBook: () => {
    const { parser, contentService, currentBook } = get();

    parser?.dispose();
    if (currentBook?.filePath) {
      bookParserService.dispose(currentBook.filePath);
    }
    contentService.dispose();

    set({
      currentBook: null,
      chapters: [],
      tableOfContents: [],
      currentChapterIndex: 0,
      currentChapter: null,
      processedHtml: '',
      foreignWords: [],
      scrollPosition: 0,
      chapterProgress: 0,
      overallProgress: 0,
      parser: null,
      error: null,
    });
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentChapterTitle = (state: ReaderState) =>
  state.currentChapter?.title || '';

export const selectHasNextChapter = (state: ReaderState) =>
  state.currentChapterIndex < state.chapters.length - 1;

export const selectHasPreviousChapter = (state: ReaderState) =>
  state.currentChapterIndex > 0;

export const selectChapterCount = (state: ReaderState) =>
  state.chapters.length;
