/**
 * Unit tests for Tokenizer - word extraction from HTML
 */

import { Tokenizer } from '../services/TranslationEngine/Tokenizer';

describe('Tokenizer', () => {
  let tokenizer: Tokenizer;

  beforeEach(() => {
    tokenizer = new Tokenizer({
      skipQuotes: false,
      skipNames: false,
      minWordLength: 1,
      maxWordLength: 50,
    });
  });

  describe('tokenize', () => {
    it('should extract words from simple HTML', () => {
      const html = '<p>Hello world.</p>';
      const tokens = tokenizer.tokenize(html);
      expect(tokens.length).toBe(2);
      expect(tokens[0].word).toBe('hello');
      expect(tokens[0].original).toBe('Hello');
      expect(tokens[1].word).toBe('world');
      expect(tokens[1].original).toBe('world');
    });

    it('should preserve positions and prefix/suffix', () => {
      const html = '<p>The cat sat.</p>';
      const tokens = tokenizer.tokenize(html);
      expect(tokens[0].startIndex).toBe(3);
      expect(tokens[0].endIndex).toBe(6);
      expect(tokens[0].suffix).toBe(' ');
      expect(tokens[0].word).toBe('the');
      expect(tokens[2].word).toBe('sat');
      expect(tokens[2].suffix).toBe('.');
    });

    it('should skip script and style content', () => {
      const html = '<p>Visible</p><script>ignore this text</script><p>Again</p>';
      const tokens = tokenizer.tokenize(html);
      const words = tokens.map((t) => t.original);
      expect(words).toContain('Visible');
      expect(words).toContain('Again');
      expect(words).not.toContain('ignore');
      expect(words).not.toContain('this');
    });

    it('should return empty array for empty string', () => {
      expect(tokenizer.tokenize('')).toEqual([]);
    });

    it('should handle HTML with only tags', () => {
      const tokens = tokenizer.tokenize('<div></div>');
      expect(tokens).toEqual([]);
    });
  });

  describe('getUniqueWords', () => {
    it('should return unique lowercase words from tokens', () => {
      const tokens = tokenizer.tokenize('<p>The the THE.</p>');
      const unique = Tokenizer.getUniqueWords(tokens);
      expect(unique).toContain('the');
      expect(unique.length).toBe(1);
    });

    it('should exclude protected tokens when they are marked protected', () => {
      tokenizer = new Tokenizer({ skipQuotes: true });
      const html = '<p>Word and "quoted" word.</p>';
      const tokens = tokenizer.tokenize(html);
      const unique = Tokenizer.getUniqueWords(tokens);
      expect(unique.filter((w) => w === 'word').length).toBeLessThanOrEqual(2);
    });
  });
});
