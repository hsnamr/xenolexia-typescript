/**
 * Vocabulary Repository - Database operations for vocabulary items
 * Uses direct LowDB data API (no SQL).
 */

import type {VocabularyItem, VocabularyStatus, Language} from '../../../types';
import type {VocabularyRow, VocabularyFilter as DataVocabularyFilter, IDataStore} from '../DataStore.types';

// ============================================================================
// Types
// ============================================================================

export interface VocabularyFilter {
  status?: VocabularyStatus;
  bookId?: string;
  sourceLanguage?: Language;
  targetLanguage?: Language;
}

function toDataFilter(filter?: VocabularyFilter): DataVocabularyFilter | undefined {
  if (!filter) return undefined;
  const f: DataVocabularyFilter = {};
  if (filter.status != null) f.status = filter.status;
  if (filter.bookId != null) f.book_id = filter.bookId;
  if (filter.sourceLanguage != null) f.source_lang = filter.sourceLanguage;
  if (filter.targetLanguage != null) f.target_lang = filter.targetLanguage;
  return f;
}

function itemToRow(item: VocabularyItem): VocabularyRow {
  return {
    id: item.id,
    source_word: item.sourceWord,
    target_word: item.targetWord,
    source_lang: item.sourceLanguage,
    target_lang: item.targetLanguage,
    context_sentence: item.contextSentence ?? null,
    book_id: item.bookId,
    book_title: item.bookTitle ?? null,
    added_at: item.addedAt.getTime(),
    last_reviewed_at: item.lastReviewedAt?.getTime() ?? null,
    review_count: item.reviewCount,
    ease_factor: item.easeFactor,
    interval: item.interval,
    status: item.status,
  };
}

function rowToVocabulary(row: VocabularyRow): VocabularyItem {
  return {
    id: row.id,
    sourceWord: row.source_word,
    targetWord: row.target_word,
    sourceLanguage: row.source_lang as Language,
    targetLanguage: row.target_lang as Language,
    contextSentence: row.context_sentence ?? null,
    bookId: row.book_id ?? null,
    bookTitle: row.book_title ?? null,
    addedAt: new Date(row.added_at),
    lastReviewedAt: row.last_reviewed_at ? new Date(row.last_reviewed_at) : null,
    reviewCount: row.review_count,
    easeFactor: row.ease_factor,
    interval: row.interval,
    status: row.status as VocabularyStatus,
  };
}

// ============================================================================
// Vocabulary Repository Class
// ============================================================================

export interface VocabularySort {
  by: 'addedAt' | 'lastReviewedAt' | 'sourceWord' | 'status';
  order: 'asc' | 'desc';
}

export class VocabularyRepository {
  constructor(private db: IDataStore) {}

  async add(item: VocabularyItem): Promise<void> {
    await this.db.addVocabulary(itemToRow(item));
  }

  async update(itemId: string, updates: Partial<VocabularyItem>): Promise<void> {
    const set: Partial<VocabularyRow> = {};
    if (updates.sourceWord !== undefined) set.source_word = updates.sourceWord;
    if (updates.targetWord !== undefined) set.target_word = updates.targetWord;
    if (updates.contextSentence !== undefined) set.context_sentence = updates.contextSentence;
    if (updates.lastReviewedAt !== undefined)
      set.last_reviewed_at = updates.lastReviewedAt?.getTime() ?? null;
    if (updates.reviewCount !== undefined) set.review_count = updates.reviewCount;
    if (updates.easeFactor !== undefined) set.ease_factor = updates.easeFactor;
    if (updates.interval !== undefined) set.interval = updates.interval;
    if (updates.status !== undefined) set.status = updates.status;
    if (Object.keys(set).length === 0) return;
    await this.db.updateVocabulary(itemId, set);
  }

  async delete(itemId: string): Promise<void> {
    await this.db.deleteVocabulary(itemId);
  }

  async deleteAll(): Promise<void> {
    await this.db.deleteAllVocabulary();
  }

  async getById(itemId: string): Promise<VocabularyItem | null> {
    const row = await this.db.getVocabularyById(itemId);
    return row ? rowToVocabulary(row) : null;
  }

  async getAll(sort?: VocabularySort): Promise<VocabularyItem[]> {
    const rows = await this.db.getVocabulary({sort, limit: 999});
    return rows.map(rowToVocabulary);
  }

  async getFiltered(filter: VocabularyFilter, sort?: VocabularySort): Promise<VocabularyItem[]> {
    const rows = await this.db.getVocabulary({
      filter: toDataFilter(filter),
      sort,
      limit: 999,
    });
    return rows.map(rowToVocabulary);
  }

  async search(query: string): Promise<VocabularyItem[]> {
    const all = await this.db.getVocabulary({sort: {by: 'addedAt', order: 'desc'}, limit: 999});
    const q = (query || '').toLowerCase();
    const filtered = all.filter(
      (r) =>
        String(r.source_word || '').toLowerCase().includes(q) ||
        String(r.target_word || '').toLowerCase().includes(q)
    );
    return filtered.map(rowToVocabulary);
  }

  async getDueForReview(limit: number = 20): Promise<VocabularyItem[]> {
    const now = Date.now();
    const rows = await this.db.getVocabulary({
      dueForReview: {now, limit},
    });
    return rows.map(rowToVocabulary);
  }

  async recordReview(itemId: string, quality: number): Promise<void> {
    const item = await this.getById(itemId);
    if (!item) return;

    let {easeFactor, interval, reviewCount} = item;
    let newStatus: VocabularyStatus = item.status;
    reviewCount += 1;

    if (quality >= 3) {
      if (interval === 0) interval = 1;
      else if (interval === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
      );
      if (reviewCount >= 5 && quality >= 4) newStatus = 'learned';
      else if (reviewCount >= 2) newStatus = 'review';
      else newStatus = 'learning';
    } else {
      interval = 0;
      newStatus = 'learning';
    }

    await this.db.updateVocabulary(itemId, {
      ease_factor: easeFactor,
      interval,
      review_count: reviewCount,
      status: newStatus,
      last_reviewed_at: Date.now(),
    });
  }

  async getStatistics(): Promise<{
    total: number;
    new: number;
    learning: number;
    review: number;
    learned: number;
    dueToday: number;
  }> {
    const s = await this.db.getVocabularyStatistics();
    return {
      total: s.total,
      new: s.new_count,
      learning: s.learning_count,
      review: s.review_count,
      learned: s.learned_count,
      dueToday: s.due,
    };
  }

  async countByStatus(status: VocabularyStatus): Promise<number> {
    return this.db.getVocabularyCountByStatus(status);
  }

  async getAddedToday(): Promise<VocabularyItem[]> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const rows = await this.db.getVocabulary({
      addedAtGte: startOfDay.getTime(),
      sort: {by: 'addedAt', order: 'desc'},
      limit: 999,
    });
    return rows.map(rowToVocabulary);
  }
}
