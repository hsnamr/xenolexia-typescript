/**
 * Book Parser - Re-export from xenolexia-typescript core.
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
export type { IBookParser, ParserOptions, SearchResult } from 'xenolexia-typescript';
