/**
 * TXT Parser - Parses plain text files as a single-chapter book
 */

import RNFS from 'react-native-fs';

import type {
  BookMetadata,
  Chapter,
  TableOfContentsItem,
  ParsedBook,
} from '@/types';

import type {IBookParser, SearchResult, ParserOptions} from './types';

const DEFAULT_TITLE = 'Untitled';
const DEFAULT_AUTHOR = 'Unknown Author';

// ============================================================================
// TXT Parser Implementation
// ============================================================================

export class TXTParser implements IBookParser {
  private filePath: string = '';
  private metadata: BookMetadata | null = null;
  private chapters: Chapter[] = [];
  private toc: TableOfContentsItem[] = [];
  private loaded: boolean = false;
  private options: ParserOptions;

  constructor(options?: ParserOptions) {
    this.options = options ?? {};
  }

  /**
   * Parse a TXT file: single chapter with full content as HTML-wrapped text
   */
  async parse(filePath: string): Promise<ParsedBook> {
    this.filePath = filePath;

    try {
      const raw = await RNFS.readFile(filePath, 'utf8');

      // Normalize line endings and trim
      const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

      // Build HTML: wrap paragraphs (double newline) in <p>, single newlines as <br/>
      const html = this.plainTextToHtml(text);
      const wordCount = this.countWords(text);

      this.metadata = {
        title: DEFAULT_TITLE,
        author: DEFAULT_AUTHOR,
      };

      const chapter: Chapter = {
        id: 'ch1',
        title: 'Content',
        index: 0,
        content: html,
        wordCount,
        href: undefined,
      };

      this.chapters = [chapter];
      this.toc = [
        {
          id: 'ch1',
          title: 'Content',
          href: '#ch1',
          level: 0,
        },
      ];
      this.loaded = true;

      return {
        metadata: this.metadata,
        chapters: this.chapters,
        tableOfContents: this.toc,
        totalWordCount: wordCount,
      };
    } catch (error) {
      console.error('Failed to parse TXT:', error);
      throw new Error(
        `Failed to parse TXT: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  /**
   * Convert plain text to simple HTML (paragraphs and line breaks)
   */
  private plainTextToHtml(text: string): string {
    if (!text) return '<p></p>';

    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
    if (paragraphs.length === 0) {
      return '<p>' + this.escapeHtml(text.replace(/\n/g, '<br/>')) + '</p>';
    }

    return paragraphs
      .map(p => '<p>' + this.escapeHtml(p.trim().replace(/\n/g, '<br/>')) + '</p>')
      .join('\n');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  async getChapter(index: number): Promise<Chapter> {
    if (index < 0 || index >= this.chapters.length) {
      throw new Error(`Chapter index out of bounds: ${index}`);
    }
    return this.chapters[index];
  }

  getTableOfContents(): TableOfContentsItem[] {
    return this.toc;
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for (const chapter of this.chapters) {
      const plainText = this.stripHtml(chapter.content);
      let position = 0;

      while (true) {
        const foundPos = plainText.toLowerCase().indexOf(lowerQuery, position);
        if (foundPos === -1) break;

        const start = Math.max(0, foundPos - 50);
        const end = Math.min(plainText.length, foundPos + query.length + 50);
        const excerpt = plainText.substring(start, end);

        results.push({
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          excerpt:
            (start > 0 ? '...' : '') +
            excerpt +
            (end < plainText.length ? '...' : ''),
          position: foundPos,
        });

        position = foundPos + 1;
      }
    }

    return results;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  getMetadata(): BookMetadata {
    if (!this.metadata) throw new Error('Book not parsed yet');
    return this.metadata;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  dispose(): void {
    this.filePath = '';
    this.metadata = null;
    this.chapters = [];
    this.toc = [];
    this.loaded = false;
  }
}
