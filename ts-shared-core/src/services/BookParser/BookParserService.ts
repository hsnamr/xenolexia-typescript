/**
 * Book Parser Service - Factory for creating appropriate parsers
 * Requires IFileSystem from host (Electron/React Native).
 */

import type {BookFormat, ParsedBook} from '../../types';
import type {IBookParser, ParserOptions} from './types';
import type { IFileSystem } from '../../adapters';
import {EPUBParser} from './EPUBParser';
import {FB2Parser} from './FB2Parser';
import {TXTParser} from './TXTParser';
import {MOBIParser} from './MOBIParser';

export class BookParserService {
  private parsers: Map<string, IBookParser> = new Map();

  constructor(private fileSystem: IFileSystem) {}

  /**
   * Parse a book file based on its format
   */
  async parse(
    filePath: string,
    format: BookFormat,
    options?: ParserOptions,
  ): Promise<ParsedBook> {
    const parser = this.getParser(filePath, format, options);
    return parser.parse(filePath);
  }

  /**
   * Get or create a parser for the given file
   */
  getParser(
    filePath: string,
    format: BookFormat,
    options?: ParserOptions,
  ): IBookParser {
    const existingParser = this.parsers.get(filePath);
    if (existingParser) return existingParser;

    let parser: IBookParser;
    switch (format) {
      case 'epub':
        parser = new EPUBParser(options, this.fileSystem);
        break;
      case 'mobi':
        parser = new MOBIParser(this.fileSystem);
        break;
      case 'txt':
        parser = new TXTParser(this.fileSystem);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
    this.parsers.set(filePath, parser);
    return parser;
  }

  /**
   * Detect book format from file extension
   */
  static detectFormat(filePath: string): BookFormat {
    const extension = filePath.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'epub':
        return 'epub';
      case 'fb2':
        return 'fb2';
      case 'mobi':
      case 'azw':
      case 'azw3':
        return 'mobi';
      case 'txt':
        return 'txt';
      default:
        throw new Error(`Unknown file extension: ${extension}`);
    }
  }

  /**
   * Clean up a specific parser
   */
  dispose(filePath: string): void {
    const parser = this.parsers.get(filePath);
    if (parser) {
      parser.dispose();
      this.parsers.delete(filePath);
    }
  }

  /**
   * Clean up all parsers
   */
  disposeAll(): void {
    this.parsers.forEach(parser => parser.dispose());
    this.parsers.clear();
  }
}
