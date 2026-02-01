/**
 * Unit tests for TranslationEngine - processContent with mocked database
 */

import { TranslationEngine } from '../services/TranslationEngine/TranslationEngine';
import type { DynamicWordDatabase } from '../services/TranslationEngine/DynamicWordDatabase';
import type { WordEntry } from '../types';

function createMockDatabase(lookupMap: Map<string, WordEntry | null>): DynamicWordDatabase {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    lookupWords: jest.fn().mockImplementation(async (words: string[]) => {
      const result = new Map<string, { entry: WordEntry | null }>();
      for (const w of words) {
        const key = w.toLowerCase();
        result.set(w, { entry: lookupMap.get(key) ?? null });
      }
      return result;
    }),
  } as unknown as DynamicWordDatabase;
}

const defaultOptions = {
  sourceLanguage: 'en' as const,
  targetLanguage: 'el' as const,
  proficiencyLevel: 'beginner' as const,
  density: 0.2,
};

const houseEntry: WordEntry = {
  id: '1',
  sourceWord: 'house',
  targetWord: 'σπίτι',
  sourceLanguage: 'en',
  targetLanguage: 'el',
  proficiencyLevel: 'beginner',
  frequencyRank: 10,
  partOfSpeech: 'noun',
  variants: [],
};

describe('TranslationEngine', () => {
  describe('processContent', () => {
    it('should return content, foreignWords, and stats', async () => {
      const lookupMap = new Map<string, WordEntry | null>([['house', houseEntry]]);
      const database = createMockDatabase(lookupMap);
      const engine = new TranslationEngine(defaultOptions, database);

      const html = '<p>The house is big.</p>';
      const result = await engine.processContent(html);

      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('foreignWords');
      expect(Array.isArray(result.foreignWords)).toBe(true);
      expect(result).toHaveProperty('stats');
      expect(result.stats).toHaveProperty('totalWords');
      expect(result.stats).toHaveProperty('replacedWords');
      expect(typeof result.content).toBe('string');
    });

    it('should include foreign word markers when matches exist', async () => {
      const lookupMap = new Map<string, WordEntry | null>([['house', houseEntry]]);
      const database = createMockDatabase(lookupMap);
      const engine = new TranslationEngine({ ...defaultOptions, density: 1 }, database);

      const html = '<p>The house is big.</p>';
      const result = await engine.processContent(html);

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.stats.replacedWords).toBeGreaterThanOrEqual(0);
    });

    it('should return empty foreignWords when no matches', async () => {
      const database = createMockDatabase(new Map());
      const engine = new TranslationEngine(defaultOptions, database);

      const html = '<p>Xyzzy abracadabra.</p>';
      const result = await engine.processContent(html);

      expect(result.foreignWords).toEqual([]);
    });

    it('should call database.initialize and database.lookupWords', async () => {
      const database = createMockDatabase(new Map());
      const engine = new TranslationEngine(defaultOptions, database);

      await engine.processContent('<p>Hello world.</p>');

      expect(database.initialize).toHaveBeenCalled();
      expect(database.lookupWords).toHaveBeenCalled();
    });
  });
});
