/**
 * Unit tests for WordReplacer - word replacement with density and proficiency
 */

import { WordReplacer } from '../services/TranslationEngine/WordReplacer';
import type { Token } from '../services/TranslationEngine/Tokenizer';
import type { WordEntry } from '../types';

describe('WordReplacer', () => {
  let replacer: WordReplacer;

  beforeEach(() => {
    replacer = new WordReplacer({
      density: 0.2,
      maxProficiency: 'beginner',
      minWordSpacing: 3,
      selectionStrategy: 'distributed',
    });
  });

  describe('replace', () => {
    it('should replace words and add foreign-word markers', () => {
      const html = '<p>This is a simple sentence.</p>';
      const tokens: Token[] = [
        { word: 'this', original: 'This', startIndex: 3, endIndex: 7, prefix: '<p>', suffix: ' ', isProtected: false },
        { word: 'is', original: 'is', startIndex: 8, endIndex: 10, prefix: ' ', suffix: ' ', isProtected: false },
        { word: 'a', original: 'a', startIndex: 11, endIndex: 12, prefix: ' ', suffix: ' ', isProtected: false },
        { word: 'simple', original: 'simple', startIndex: 13, endIndex: 19, prefix: ' ', suffix: ' ', isProtected: false },
        { word: 'sentence', original: 'sentence', startIndex: 20, endIndex: 28, prefix: ' ', suffix: '.', isProtected: false },
      ];
      const wordEntries = new Map<string, WordEntry | null>([
        [
          'simple',
          {
            id: '1',
            sourceWord: 'simple',
            targetWord: 'απλό',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'beginner',
            frequencyRank: 100,
            partOfSpeech: 'adjective',
            variants: [],
          },
        ],
        [
          'sentence',
          {
            id: '2',
            sourceWord: 'sentence',
            targetWord: 'πρόταση',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'beginner',
            frequencyRank: 200,
            partOfSpeech: 'noun',
            variants: [],
          },
        ],
      ]);

      const result = replacer.replace(html, tokens, wordEntries);

      expect(result.foreignWords.length).toBeGreaterThan(0);
      expect(result.foreignWords.length).toBeLessThanOrEqual(5);
      expect(result.html).toContain('foreign-word');
      expect(result.stats.totalTokens).toBe(5);
      expect(result.stats.replacedTokens).toBeGreaterThanOrEqual(0);
    });

    it('should respect density setting', () => {
      const html = '<p>One two three four five six seven eight nine ten.</p>';
      const tokens: Token[] = Array.from({ length: 10 }, (_, i) => ({
        word: `word${i}`,
        original: `word${i}`,
        startIndex: i * 6,
        endIndex: i * 6 + 5,
        prefix: i === 0 ? '<p>' : ' ',
        suffix: i === 9 ? '.' : ' ',
        isProtected: false,
      }));
      const wordEntries = new Map<string, WordEntry | null>();
      tokens.forEach((token, i) => {
        wordEntries.set(token.word, {
          id: `id-${i}`,
          sourceWord: token.word,
          targetWord: `target${i}`,
          sourceLanguage: 'en',
          targetLanguage: 'el',
          proficiencyLevel: 'beginner',
          frequencyRank: i,
          partOfSpeech: 'noun',
          variants: [],
        });
      });

      replacer = new WordReplacer({ density: 0.3 });
      const result = replacer.replace(html, tokens, wordEntries);

      expect(result.stats.replacedTokens).toBeGreaterThanOrEqual(2);
      expect(result.stats.replacedTokens).toBeLessThanOrEqual(5);
    });

    it('should not replace protected words', () => {
      const html = '<p>Hello world!</p>';
      const tokens: Token[] = [
        { word: 'hello', original: 'Hello', startIndex: 3, endIndex: 8, prefix: '<p>', suffix: ' ', isProtected: true },
        { word: 'world', original: 'world', startIndex: 9, endIndex: 14, prefix: ' ', suffix: '!', isProtected: false },
      ];
      const wordEntries = new Map<string, WordEntry | null>([
        [
          'hello',
          {
            id: '1',
            sourceWord: 'hello',
            targetWord: 'γεια',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'beginner',
            frequencyRank: 1,
            partOfSpeech: 'interjection',
            variants: [],
          },
        ],
        [
          'world',
          {
            id: '2',
            sourceWord: 'world',
            targetWord: 'κόσμος',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'beginner',
            frequencyRank: 2,
            partOfSpeech: 'noun',
            variants: [],
          },
        ],
      ]);

      const result = replacer.replace(html, tokens, wordEntries);

      expect(result.html).not.toContain('data-original="Hello"');
      expect(result.stats.protectedTokens).toBe(1);
    });

    it('should respect max proficiency level', () => {
      const html = '<p>Simple advanced word.</p>';
      const tokens: Token[] = [
        { word: 'simple', original: 'Simple', startIndex: 3, endIndex: 9, prefix: '<p>', suffix: ' ', isProtected: false },
        { word: 'advanced', original: 'advanced', startIndex: 10, endIndex: 18, prefix: ' ', suffix: ' ', isProtected: false },
        { word: 'word', original: 'word', startIndex: 19, endIndex: 23, prefix: ' ', suffix: '.', isProtected: false },
      ];
      const wordEntries = new Map<string, WordEntry | null>([
        [
          'simple',
          {
            id: '1',
            sourceWord: 'simple',
            targetWord: 'απλό',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'beginner',
            frequencyRank: 1,
            partOfSpeech: 'adjective',
            variants: [],
          },
        ],
        [
          'advanced',
          {
            id: '2',
            sourceWord: 'advanced',
            targetWord: 'προχωρημένο',
            sourceLanguage: 'en',
            targetLanguage: 'el',
            proficiencyLevel: 'advanced',
            frequencyRank: 1000,
            partOfSpeech: 'adjective',
            variants: [],
          },
        ],
      ]);

      replacer = new WordReplacer({ maxProficiency: 'beginner' });
      const result = replacer.replace(html, tokens, wordEntries);

      expect(result.html).not.toContain('data-original="advanced"');
    });
  });
});
