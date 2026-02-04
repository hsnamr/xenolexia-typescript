/**
 * Book Parser - Re-export from xenolexia-typescript core + RN instances (RNFS adapter).
 */

export {
  BookParserService,
  EPUBParser,
  FB2Parser,
  TXTParser,
  MOBIParser,
  ChapterContentService,
  TextProcessingService,
  EPUBExtractor,
  MetadataExtractor,
  extractEPUBMetadata,
  extractEPUBInfo,
  extractEPUBCover,
} from 'xenolexia-typescript';
export type {
  IBookParser,
  ParserOptions,
  SearchResult,
  ChapterStyles,
  ProcessedChapterContent,
} from 'xenolexia-typescript';

export { bookParserService, chapterContentService } from './bookParserCore';
export { rnfsFileSystem } from './rnfsAdapter';
