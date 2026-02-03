/**
 * Unit tests for ExportService (CSV, Anki, JSON output)
 */

import { ExportService } from '../../services/ExportService/ExportService';
import type { VocabularyItem } from '../../types';

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
    addedAt: new Date('2025-01-15T12:00:00Z'),
    lastReviewedAt: null,
    reviewCount: 0,
    easeFactor: 2.5,
    interval: 0,
    status: 'new',
    ...overrides,
  };
}

describe('ExportService', () => {
  const service = new ExportService();

  describe('CSV export', () => {
    it('returns content with header and rows when no fileSystem', async () => {
      const items = [makeVocabularyItem({ sourceWord: 'test', targetWord: 'δοκιμή' })];
      const result = await service.export(items, { format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.content).toBeDefined();
      expect(result.itemCount).toBe(1);
      expect(result.content).toContain('source_word,target_word,source_language,target_language');
      expect(result.content).toContain('test');
      expect(result.content).toContain('δοκιμή');
    });

    it('includes context and SRS columns when options set', async () => {
      const items = [
        makeVocabularyItem({
          contextSentence: 'Hello world',
          bookTitle: 'My Book',
          status: 'review',
          reviewCount: 3,
          easeFactor: 2.6,
          interval: 6,
        }),
      ];
      const result = await service.export(items, {
        format: 'csv',
        includeContext: true,
        includeSRSData: true,
        includeBookInfo: true,
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('context_sentence');
      expect(result.content).toContain('book_title');
      expect(result.content).toContain('status');
      expect(result.content).toContain('Hello world');
      expect(result.content).toContain('My Book');
      expect(result.content).toContain('review');
    });

    it('escapes commas and quotes in CSV', async () => {
      const items = [
        makeVocabularyItem({
          sourceWord: 'word, with comma',
          targetWord: 'word "quoted"',
        }),
      ];
      const result = await service.export(items, { format: 'csv' });

      expect(result.success).toBe(true);
      expect(result.content).toContain('"word, with comma"');
      expect(result.content).toMatch(/"word ""quoted"""/);
    });
  });

  describe('Anki export', () => {
    it('returns tab-separated content with Anki header', async () => {
      const items = [makeVocabularyItem({ sourceWord: 'front', targetWord: 'back' })];
      const result = await service.export(items, { format: 'anki' });

      expect(result.success).toBe(true);
      expect(result.content).toContain('#separator:tab');
      expect(result.content).toContain('#html:true');
      expect(result.content).toContain('#tags column:3');
      expect(result.content).toContain('back');
      expect(result.content).toContain('front');
      expect(result.content).toMatch(/\t.*\t/);
      expect(result.content).toContain('en-el');
      expect(result.content).toContain('new');
    });

    it('includes context and book on back when options set', async () => {
      const items = [
        makeVocabularyItem({
          sourceWord: 'original',
          targetWord: 'foreign',
          contextSentence: 'In context.',
          bookTitle: 'Book Title',
        }),
      ];
      const result = await service.export(items, {
        format: 'anki',
        includeContext: true,
        includeBookInfo: true,
      });

      expect(result.success).toBe(true);
      expect(result.content).toContain('In context.');
      expect(result.content).toContain('Book Title');
    });
  });

  describe('JSON export', () => {
    it('returns JSON with exportedAt, itemCount, and items', async () => {
      const items = [makeVocabularyItem()];
      const result = await service.export(items, { format: 'json' });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content!);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.itemCount).toBe(1);
      expect(parsed.format).toBe('xenolexia-vocabulary-v1');
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].sourceWord).toBe('hello');
      expect(parsed.items[0].targetWord).toBe('γεια');
    });

    it('includes SRS and book info when options set', async () => {
      const items = [
        makeVocabularyItem({
          status: 'learned',
          reviewCount: 10,
          easeFactor: 2.7,
          interval: 21,
          lastReviewedAt: new Date('2025-02-01T00:00:00Z'),
          bookId: 'b1',
          bookTitle: 'Title',
        }),
      ];
      const result = await service.export(items, {
        format: 'json',
        includeSRSData: true,
        includeBookInfo: true,
      });

      const parsed = JSON.parse(result.content!);
      expect(parsed.items[0].status).toBe('learned');
      expect(parsed.items[0].reviewCount).toBe(10);
      expect(parsed.items[0].easeFactor).toBe(2.7);
      expect(parsed.items[0].interval).toBe(21);
      expect(parsed.items[0].lastReviewedAt).toBe('2025-02-01T00:00:00.000Z');
      expect(parsed.items[0].bookId).toBe('b1');
      expect(parsed.items[0].bookTitle).toBe('Title');
    });
  });

  describe('filtering', () => {
    it('filters by status when filterByStatus provided', async () => {
      const items = [
        makeVocabularyItem({ id: 'a', status: 'new' }),
        makeVocabularyItem({ id: 'b', status: 'learned' }),
      ];
      const result = await service.export(items, {
        format: 'json',
        filterByStatus: ['learned'],
        includeSRSData: true,
      });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content!);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].status).toBe('learned');
    });

    it('filters by language when filterByLanguage provided', async () => {
      const items = [
        makeVocabularyItem({ id: 'a', sourceLanguage: 'en', targetLanguage: 'el' }),
        makeVocabularyItem({ id: 'b', sourceLanguage: 'en', targetLanguage: 'es' }),
      ];
      const result = await service.export(items, {
        format: 'json',
        filterByLanguage: { source: 'en', target: 'el' },
      });

      expect(result.success).toBe(true);
      const parsed = JSON.parse(result.content!);
      expect(parsed.items).toHaveLength(1);
      expect(parsed.items[0].targetLanguage).toBe('el');
    });

    it('returns error when no items match criteria', async () => {
      const items = [makeVocabularyItem({ status: 'new' })];
      const result = await service.export(items, {
        format: 'csv',
        filterByStatus: ['learned'],
      });

      expect(result.success).toBe(false);
      expect(result.itemCount).toBe(0);
      expect(result.error).toContain('No vocabulary items match');
    });
  });

  describe('static helpers', () => {
    it('getFormatDescription returns description for each format', () => {
      expect(ExportService.getFormatDescription('csv')).toContain('Excel');
      expect(ExportService.getFormatDescription('anki')).toContain('Anki');
      expect(ExportService.getFormatDescription('json')).toContain('JSON');
    });

    it('getSuggestedFilename returns filename with timestamp', () => {
      const csv = ExportService.getSuggestedFilename('csv');
      expect(csv).toMatch(/xenolexia_vocabulary_\d{4}-\d{2}-\d{2}\.csv/);
      const anki = ExportService.getSuggestedFilename('anki');
      expect(anki).toMatch(/xenolexia_anki_.*\.txt/);
      const json = ExportService.getSuggestedFilename('json');
      expect(json).toMatch(/xenolexia_backup_.*\.json/);
    });
  });
});
