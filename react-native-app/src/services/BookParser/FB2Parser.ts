/**
 * FB2 Parser - Parses FictionBook 2 using fast-xml-parser (FOSS)
 *
 * Uses fast-xml-parser for XML parsing; maps FB2 structure to ParsedBook.
 */

import {XMLParser} from 'fast-xml-parser';
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

type XmlValue = string | XmlObj | XmlValue[];
type XmlObj = Record<string, XmlValue>;

function textOf(val: XmlValue | undefined): string {
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (Array.isArray(val)) return val.map(textOf).join(' ').trim();
  if (typeof val === 'object' && val !== null && '#text' in val)
    return String((val as XmlObj)['#text'] ?? '').trim();
  if (typeof val === 'object' && val !== null) {
    const t = (val as XmlObj)['#text'];
    return t != null ? String(t).trim() : '';
  }
  return '';
}

function one<T>(val: T | T[] | undefined): T | undefined {
  if (val == null) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

function arrayOf<T>(val: T | T[] | undefined): T[] {
  if (val == null) return [];
  return Array.isArray(val) ? val : [val];
}

// ============================================================================
// FB2 Parser Implementation
// ============================================================================

export class FB2Parser implements IBookParser {
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
      const raw = await RNFS.readFile(filePath, 'utf8');
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        isArray: (name) =>
          ['body', 'section', 'p', 'empty-line', 'title', 'v', 'stanza', 'author', 'genre'].includes(name),
      });
      const parsed = parser.parse(raw) as XmlObj;
      const fb = parsed?.FictionBook as XmlObj | undefined;
      if (!fb) throw new Error('Invalid FB2: missing FictionBook root');

      const description = one(fb.description as XmlObj | XmlObj[]) as XmlObj | undefined;
      const titleInfo = description?.['title-info'] as XmlObj | undefined;
      this.metadata = this.extractMetadata(titleInfo);

      const bodies = arrayOf(fb.body as XmlObj | XmlObj[]);
      const firstBody = bodies[0];
      if (!firstBody) throw new Error('Invalid FB2: no body');

      const sections = arrayOf(firstBody.section as XmlObj | XmlObj[]);
      if (sections.length === 0) {
        const singleChapter = this.bodyToHtml(firstBody);
        const wordCount = this.countWords(this.stripHtml(singleChapter));
        this.chapters = [
          {
            id: 'ch0',
            title: this.metadata.title || 'Content',
            index: 0,
            content: singleChapter,
            wordCount,
          },
        ];
        this.toc = [{id: 'ch0', title: this.chapters[0].title, href: '#ch0', level: 0}];
      } else {
        this.chapters = [];
        this.toc = [];
        let idx = 0;
        for (const section of sections) {
          const title = this.sectionTitle(section);
          const html = this.sectionToHtml(section);
          const wordCount = this.countWords(this.stripHtml(html));
          const id = `ch${idx}`;
          this.chapters.push({
            id,
            title: title || `Chapter ${idx + 1}`,
            index: idx,
            content: html,
            wordCount,
          });
          this.toc.push({id, title: this.chapters[idx].title, href: `#${id}`, level: 0});
          idx++;
        }
      }

      const totalWordCount = this.chapters.reduce((s, ch) => s + ch.wordCount, 0);
      this.loaded = true;

      return {
        metadata: this.metadata,
        chapters: this.chapters,
        tableOfContents: this.toc,
        totalWordCount,
      };
    } catch (error) {
      console.error('Failed to parse FB2:', error);
      throw new Error(
        `Failed to parse FB2: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private extractMetadata(titleInfo: XmlObj | undefined): BookMetadata {
    if (!titleInfo) return {title: DEFAULT_TITLE, author: DEFAULT_AUTHOR};
    const title = textOf(titleInfo['book-title']) || DEFAULT_TITLE;
    const authors = arrayOf(titleInfo.author as XmlObj | XmlObj[]);
    const parts: string[] = [];
    for (const a of authors) {
      const first = textOf((a as XmlObj)['first-name']);
      const middle = textOf((a as XmlObj)['middle-name']);
      const last = textOf((a as XmlObj)['last-name']);
      const name = [first, middle, last].filter(Boolean).join(' ');
      if (name) parts.push(name);
    }
    const author = parts.length > 0 ? parts.join(', ') : DEFAULT_AUTHOR;
    const lang = textOf(titleInfo.lang);
    const genres = arrayOf(titleInfo.genre as XmlValue[]).map(g => textOf(g)).filter(Boolean);
    return {
      title,
      author,
      language: lang || undefined,
      subjects: genres.length > 0 ? genres : undefined,
    };
  }

  private sectionTitle(section: XmlObj): string {
    const titleBlock = one(section.title as XmlObj | XmlObj[]);
    if (!titleBlock || typeof titleBlock !== 'object') return '';
    const p = one((titleBlock as XmlObj).p as XmlValue | XmlValue[]);
    return textOf(p);
  }

  private bodyToHtml(body: XmlObj): string {
    const sections = arrayOf(body.section as XmlObj | XmlObj[]);
    if (sections.length === 0) return this.inlineContentToHtml(body);
    return sections.map(s => this.sectionToHtml(s)).join('\n');
  }

  private sectionToHtml(section: XmlObj): string {
    const parts: string[] = [];
    const titleBlock = one(section.title as XmlObj | XmlObj[]);
    if (titleBlock && typeof titleBlock === 'object') {
      const p = one((titleBlock as XmlObj).p as XmlValue | XmlValue[]);
      const t = textOf(p);
      if (t) parts.push(`<h2>${this.escapeHtml(t)}</h2>`);
    }
    parts.push(this.inlineContentToHtml(section));
    return parts.join('\n');
  }

  private inlineContentToHtml(node: XmlObj): string {
    const parts: string[] = [];
    const order = ['p', 'empty-line', 'subtitle', 'poem', 'cite', 'epigraph', 'table', 'section', 'image', 'annotation'];
    for (const tag of order) {
      const raw = node[tag];
      if (raw == null) continue;
      const items = arrayOf(raw as XmlValue | XmlValue[]);
      for (const item of items) {
        if (tag === 'p') parts.push('<p>' + this.inlineToHtml(item as XmlObj) + '</p>');
        else if (tag === 'empty-line') parts.push('<br/>');
        else if (tag === 'subtitle') parts.push('<h2>' + this.inlineToHtml(item as XmlObj) + '</h2>');
        else if (tag === 'section') parts.push(this.sectionToHtml(item as XmlObj));
        else if (tag === 'poem' || tag === 'cite' || tag === 'epigraph') parts.push('<blockquote>' + this.poemOrCiteToHtml(item as XmlObj) + '</blockquote>');
        else if (typeof item === 'object' && item !== null) parts.push(this.inlineToHtml(item as XmlObj));
      }
    }
    return parts.join('\n');
  }

  private poemOrCiteToHtml(node: XmlObj): string {
    const parts: string[] = [];
    const stanzas = arrayOf(node.stanza as XmlObj | XmlObj[]);
    for (const s of stanzas) {
      const lines = arrayOf((s as XmlObj).v as XmlValue | XmlValue[]);
      for (const line of lines) parts.push('<p>' + this.escapeHtml(textOf(line)) + '</p>');
    }
    const ps = arrayOf(node.p as XmlValue | XmlValue[]);
    for (const p of ps) parts.push('<p>' + this.inlineToHtml(p as XmlObj) + '</p>');
    return parts.join('\n');
  }

  private inlineToHtml(node: XmlValue): string {
    if (node == null) return '';
    if (typeof node === 'string') return this.escapeHtml(node);
    if (Array.isArray(node)) return node.map(n => this.inlineToHtml(n as XmlObj)).join('');
    const obj = node as XmlObj;
    const text = textOf(obj['#text']);
    const parts: string[] = text ? [this.escapeHtml(text)] : [];
    const tagMap: Record<string, string> = {
      strong: 'strong',
      emphasis: 'em',
      style: 'span',
      strikethrough: 's',
      sub: 'sub',
      sup: 'sup',
      code: 'code',
      a: 'a',
    };
    for (const [fbTag, htmlTag] of Object.entries(tagMap)) {
      const raw = obj[fbTag];
      if (raw == null) continue;
      const items = arrayOf(raw as XmlValue | XmlValue[]);
      for (const item of items) {
        const inner = typeof item === 'string' ? this.escapeHtml(item) : this.inlineToHtml(item as XmlObj);
        if (htmlTag === 'a') {
          const o = item as XmlObj;
          const href = o?.['@_href'] ?? o?.['@_xlink:href'] ?? '';
          parts.push('<a href="' + this.escapeHtml(String(href)) + '">' + inner + '</a>');
        } else parts.push('<' + htmlTag + '>' + inner + '</' + htmlTag + '>');
      }
    }
    return parts.join('');
  }

  private escapeHtml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
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
    this.metadata = null;
    this.chapters = [];
    this.toc = [];
    this.loaded = false;
  }
}
