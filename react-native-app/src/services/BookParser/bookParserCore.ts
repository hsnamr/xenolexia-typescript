/**
 * React Native book parser core - single instances using ts-shared-core with RNFS adapter.
 * All EPUB/MOBI/TXT/FB2 parsing goes through xenolexia-typescript with rnfsFileSystem.
 */

import {
  createBookParserService,
  ChapterContentService,
} from 'xenolexia-typescript';
import { rnfsFileSystem } from './rnfsAdapter';

export const bookParserService = createBookParserService(rnfsFileSystem);
export const chapterContentService = new ChapterContentService(rnfsFileSystem);
