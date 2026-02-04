/**
 * MOBI / KF8 Parser - Uses @lingo-reader/mobi-parser (FOSS)
 *
 * Supports .mobi and .azw3 (KF8) via Uint8Array input (React Native).
 */

import {initKf8File, initMobiFile} from '@lingo-reader/mobi-parser';
import RNFS from 'react-native-fs';

import type {
  BookMetadata,
  Chapter,
  TableOfContentsItem,
  ParsedBook,
} from '@/types';

import type {IBookParser, SearchResult, ParserOptions} from './types';

const DEFAULT_TITLE = 'Unknown';
const DEFAULT_AUTHOR = 'Unknown Author';

/** Decode base64 to Uint8Array (React Native: use atob; no File/path for mobi-parser) */
function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Detect KF8 (AZW3) by file extension or try MOBI first */
function isKf8Path(filePath: string): boolean {
  const ext = filePath.split('.').pop()?.toLowerCase();
  return ext === 'azw3' || ext === 'kf8';
}

// ============================================================================
// MOBI Parser Implementation
// ============================================================================

type MobiLike = {
  getSpine(): Array<{id: string; text?: string}>;
  getMetadata(): {title?: string; author?: string[]; description?: string; language?: string; subject?: string[]};
  getToc(): Array<{label: string; href: string; children?: Array<{label: string; href: string}>}>;
  loadChapter(id: string): {html: string; css?: Array<{href: string}>} | undefined;
  destroy(): void;
};

export class MOBIParser implements IBookParser {
  private mobi: MobiLike | null = null;
  private metadata: BookMetadata | null = null;
  private chapters: Chapter[] = [];
  private toc: TableOfContentsItem[] = [];
  private loaded: boolean = false;
  private options: ParserOptions;

  constructor(options?: ParserOptions) {
    this.options = options ?? {};
  }

  async parse(filePath: string): Promise<ParsedBook> {
    try {
      const base64 = await RNFS.readFile(filePath, 'base64');
      const bytes = base64ToUint8Array(base64);

      if (isKf8Path(filePath)) {
        this.mobi = (await initKf8File(bytes)) as MobiLike;
      } else {
        this.mobi = (await initMobiFile(bytes)) as MobiLike;
      }

      const meta = this.mobi.getMetadata();
      this.metadata = {
        title: meta.title || DEFAULT_TITLE,
        author: Array.isArray(meta.author) ? meta.author.join(', ') : (meta.author as string) || DEFAULT_AUTHOR,
        description: meta.description,
        language: meta.language,
        subjects: meta.subject,
      };

      const spine = this.mobi.getSpine();
      const rawToc = this.mobi.getToc();
      this.chapters = [];
      let totalWordCount = 0;

      for (let i = 0; i < spine.length; i++) {
        const item = spine[i];
        const loaded = this.mobi.loadChapter(item.id);
        const html = loaded?.html ?? (item.text || '');
        const wordCount = this.countWords(this.stripHtml(html));
        totalWordCount += wordCount;
        const chId = `ch${i}`;
        const tocItem = rawToc[i];
        const title = tocItem?.label ?? `Chapter ${i + 1}`;
        this.chapters.push({
          id: chId,
          title,
          index: i,
          content: html,
          wordCount,
          href: item.id,
        });
      }

      this.toc = rawToc.map((item, i) => ({
        id: `ch${i}`,
        title: item.label,
        href: item.href,
        level: 0,
        children: item.children?.map((c, j) => ({
          id: `ch${i}-${j}`,
          title: c.label,
          href: c.href,
          level: 1,
        })),
      }));

      this.loaded = true;

      return {
        metadata: this.metadata,
        chapters: this.chapters,
        tableOfContents: this.toc,
        totalWordCount,
      };
    } catch (error) {
      console.error('Failed to parse MOBI:', error);
      this.dispose();
      throw new Error(
        `Failed to parse MOBI: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(w => w.length > 0).length;
  }

  async getChapter(index: number): Promise<Chapter> {
    if (index < 0 || index >= this.chapters.length) throw new Error(`Chapter index out of bounds: ${index}`);
    return this.chapters[index];
  }

  getTableOfContents(): TableOfContentsItem[] {
    return this.toc;
  }

  async search(query: string): Promise<SearchResult[]> {
    const results: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();
    for (const chapter of this.chapters) {
      const plain = this.stripHtml(chapter.content);
      let pos = 0;
      for (;;) {
        const found = plain.toLowerCase().indexOf(lowerQuery, pos);
        if (found === -1) break;
        const start = Math.max(0, found - 50);
        const end = Math.min(plain.length, found + query.length + 50);
        results.push({
          chapterIndex: chapter.index,
          chapterTitle: chapter.title,
          excerpt: (start > 0 ? '...' : '') + plain.slice(start, end) + (end < plain.length ? '...' : ''),
          position: found,
        });
        pos = found + 1;
      }
    }
    return results;
  }

  getMetadata(): BookMetadata {
    if (!this.metadata) throw new Error('Book not parsed yet');
    return this.metadata;
  }

  dispose(): void {
    if (this.mobi) {
      try {
        this.mobi.destroy();
      } catch (_) {}
      this.mobi = null;
    }
    this.metadata = null;
    this.chapters = [];
    this.toc = [];
    this.loaded = false;
  }
}
