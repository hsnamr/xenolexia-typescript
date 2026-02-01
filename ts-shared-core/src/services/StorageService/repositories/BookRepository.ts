/**
 * Book Repository - Database operations for books
 * Uses direct LowDB data API (no SQL).
 */

import type {Book, BookFormat, ProficiencyLevel, Language} from '../../../types';
import type {BookRow, IDataStore} from '../DataStore.types';

// ============================================================================
// Types
// ============================================================================

export interface BookFilter {
  format?: BookFormat;
  targetLanguage?: Language;
  proficiency?: ProficiencyLevel;
  hasProgress?: boolean;
  isDownloaded?: boolean;
}

export interface BookSort {
  by: 'title' | 'author' | 'addedAt' | 'lastReadAt' | 'progress';
  order: 'asc' | 'desc';
}

// Data store filter (snake_case / string)
type DataBookFilter = import('../DataStore.types').BookFilter;

// ============================================================================
// Helpers
// ============================================================================

function toDataFilter(filter?: BookFilter): DataBookFilter | undefined {
  if (!filter) return undefined;
  const f: DataBookFilter = {};
  if (filter.format != null) f.format = filter.format;
  if (filter.targetLanguage != null) f.target_lang = filter.targetLanguage;
  if (filter.proficiency != null) f.proficiency = filter.proficiency;
  if (filter.hasProgress !== undefined) f.hasProgress = filter.hasProgress;
  if (filter.isDownloaded !== undefined) f.is_downloaded = filter.isDownloaded ? 1 : 0;
  return f;
}

function bookToRow(book: Book): BookRow {
  return {
    id: book.id,
    title: book.title,
    author: book.author ?? null,
    description: null,
    cover_path: book.coverPath ?? null,
    file_path: book.filePath,
    format: book.format,
    file_size: book.fileSize ?? 0,
    added_at: book.addedAt.getTime(),
    last_read_at: book.lastReadAt?.getTime() ?? null,
    progress: book.progress,
    current_location: book.currentLocation ?? null,
    current_chapter: book.currentChapter ?? 0,
    total_chapters: book.totalChapters ?? 0,
    current_page: book.currentPage ?? 0,
    total_pages: book.totalPages ?? 0,
    reading_time_minutes: book.readingTimeMinutes ?? 0,
    source_lang: book.languagePair.sourceLanguage,
    target_lang: book.languagePair.targetLanguage,
    proficiency: book.proficiencyLevel,
    word_density: book.wordDensity ?? 0.3,
    source_url: book.sourceUrl ?? null,
    is_downloaded: book.isDownloaded ? 1 : 0,
  };
}

function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author ?? 'Unknown Author',
    coverPath: row.cover_path,
    filePath: row.file_path,
    format: row.format as BookFormat,
    fileSize: row.file_size ?? 0,
    addedAt: new Date(row.added_at),
    lastReadAt: row.last_read_at ? new Date(row.last_read_at) : null,
    languagePair: {
      sourceLanguage: row.source_lang as Language,
      targetLanguage: row.target_lang as Language,
    },
    proficiencyLevel: row.proficiency as ProficiencyLevel,
    wordDensity: row.word_density ?? 0.3,
    progress: row.progress,
    currentLocation: row.current_location,
    currentChapter: row.current_chapter ?? 0,
    totalChapters: row.total_chapters ?? 0,
    currentPage: row.current_page ?? 0,
    totalPages: row.total_pages ?? 0,
    readingTimeMinutes: row.reading_time_minutes ?? 0,
    sourceUrl: row.source_url ?? undefined,
    isDownloaded: row.is_downloaded === 1,
  };
}

// ============================================================================
// Book Repository Class
// ============================================================================

export type RepoBookSort = {by: 'title' | 'author' | 'addedAt' | 'lastReadAt' | 'progress'; order: 'asc' | 'desc'};

export class BookRepository {
  constructor(private db: IDataStore) {}

  async add(book: Book): Promise<void> {
    await this.db.addBook(bookToRow(book));
  }

  async update(bookId: string, updates: Partial<Book>): Promise<void> {
    const set: Partial<BookRow> = {};
    if (updates.title !== undefined) set.title = updates.title;
    if (updates.author !== undefined) set.author = updates.author;
    if (updates.coverPath !== undefined) set.cover_path = updates.coverPath;
    if (updates.lastReadAt !== undefined) set.last_read_at = updates.lastReadAt?.getTime() ?? null;
    if (updates.progress !== undefined) set.progress = updates.progress;
    if (updates.currentLocation !== undefined) set.current_location = updates.currentLocation;
    if (updates.currentChapter !== undefined) set.current_chapter = updates.currentChapter;
    if (updates.totalChapters !== undefined) set.total_chapters = updates.totalChapters;
    if (updates.currentPage !== undefined) set.current_page = updates.currentPage;
    if (updates.totalPages !== undefined) set.total_pages = updates.totalPages;
    if (updates.readingTimeMinutes !== undefined) set.reading_time_minutes = updates.readingTimeMinutes;
    if (updates.proficiencyLevel !== undefined) set.proficiency = updates.proficiencyLevel;
    if (updates.wordDensity !== undefined) set.word_density = updates.wordDensity;
    if (updates.isDownloaded !== undefined) set.is_downloaded = updates.isDownloaded ? 1 : 0;
    if (updates.languagePair !== undefined) {
      set.source_lang = updates.languagePair.sourceLanguage;
      set.target_lang = updates.languagePair.targetLanguage;
    }
    if (Object.keys(set).length === 0) return;
    await this.db.updateBook(bookId, set);
  }

  async delete(bookId: string): Promise<void> {
    await this.db.deleteBook(bookId);
  }

  async deleteAll(): Promise<void> {
    await this.db.deleteAllBooks();
  }

  async getById(bookId: string): Promise<Book | null> {
    const row = await this.db.getBookById(bookId);
    return row ? rowToBook(row) : null;
  }

  async getAll(sort?: RepoBookSort): Promise<Book[]> {
    const rows = await this.db.getBooks({sort, limit: 999});
    return rows.map(rowToBook);
  }

  async getFiltered(filter: BookFilter, sort?: BookSort): Promise<Book[]> {
    const rows = await this.db.getBooks({
      filter: toDataFilter(filter),
      sort,
      limit: 999,
    });
    return rows.map(rowToBook);
  }

  async search(query: string): Promise<Book[]> {
    const rows = await this.db.getBooks({
      filter: {searchQuery: query},
      sort: {by: 'lastReadAt', order: 'desc'},
      limit: 999,
    });
    return rows.map(rowToBook);
  }

  async getRecentlyRead(limit: number = 5): Promise<Book[]> {
    const rows = await this.db.getBooks({
      filter: {recentlyRead: true},
      sort: {by: 'lastReadAt', order: 'desc'},
      limit,
    });
    return rows.map(rowToBook);
  }

  async getInProgress(): Promise<Book[]> {
    const rows = await this.db.getBooks({
      filter: {inProgress: true},
      sort: {by: 'lastReadAt', order: 'desc'},
    });
    return rows.map(rowToBook);
  }

  async count(): Promise<number> {
    return this.db.getBookCount();
  }

  async updateProgress(
    bookId: string,
    progress: number,
    location: string | null,
    chapter?: number,
    page?: number
  ): Promise<void> {
    const set: Partial<BookRow> = {
      progress: Math.min(100, Math.max(0, progress)),
      last_read_at: Date.now(),
    };
    if (location !== undefined) set.current_location = location;
    if (chapter !== undefined) set.current_chapter = chapter;
    if (page !== undefined) set.current_page = page;
    await this.db.updateBook(bookId, set);
  }

  async addReadingTime(bookId: string, minutes: number): Promise<void> {
    const book = await this.db.getBookById(bookId);
    if (!book) return;
    const current = Number(book.reading_time_minutes) || 0;
    await this.db.updateBook(bookId, {
      reading_time_minutes: current + minutes,
      last_read_at: Date.now(),
    });
  }

  async getStatistics(): Promise<{
    totalBooks: number;
    booksInProgress: number;
    booksCompleted: number;
    totalReadingTime: number;
  }> {
    const s = await this.db.getBookStatistics();
    return {
      totalBooks: s.total,
      booksInProgress: s.in_progress,
      booksCompleted: s.completed,
      totalReadingTime: s.total_time,
    };
  }
}
