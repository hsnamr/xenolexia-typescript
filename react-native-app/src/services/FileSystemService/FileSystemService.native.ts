/**
 * File System Service for Native (iOS/Android)
 *
 * Uses react-native-fs (RNFS, FOSS) for book storage under app documents.
 * Same public API as FileSystemService.web for shared callers.
 */

import RNFS from 'react-native-fs';

// ============================================================================
// Constants
// ============================================================================

const BOOKS_DIR = `${RNFS.DocumentDirectoryPath}/.xenolexia/books`;

// ============================================================================
// Helpers
// ============================================================================

async function dataToBytes(
  data: ArrayBuffer | Uint8Array | Blob,
): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  const ab = await data.arrayBuffer();
  return new Uint8Array(ab);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function deleteDirectoryRecursive(dirPath: string): Promise<void> {
  const exists = await RNFS.exists(dirPath);
  if (!exists) return;

  const entries = await RNFS.readDir(dirPath);
  for (const entry of entries) {
    if (entry.isDirectory()) {
      await deleteDirectoryRecursive(entry.path);
    } else {
      await RNFS.unlink(entry.path);
    }
  }
  await RNFS.unlink(dirPath);
}

// ============================================================================
// File System Service
// ============================================================================

export class FileSystemService {
  private static isInitialized = false;

  static isSupported(): boolean {
    return true;
  }

  static async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const exists = await RNFS.exists(BOOKS_DIR);
      if (!exists) {
        await RNFS.mkdir(BOOKS_DIR);
      }
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('[FileSystemService] Failed to initialize:', error);
      return false;
    }
  }

  static async hasDirectoryAccess(): Promise<boolean> {
    await this.initialize();
    return true;
  }

  static async requestDirectoryAccess(): Promise<boolean> {
    await this.initialize();
    return true;
  }

  static async saveBook(
    bookId: string,
    filename: string,
    data: ArrayBuffer | Uint8Array | Blob,
  ): Promise<string> {
    await this.initialize();

    const bookDir = `${BOOKS_DIR}/${bookId}`;
    const exists = await RNFS.exists(bookDir);
    if (!exists) {
      await RNFS.mkdir(bookDir);
    }

    const filePath = `${bookDir}/${filename}`;
    const bytes = await dataToBytes(data);
    const base64 = bytesToBase64(bytes);
    await RNFS.writeFile(filePath, base64, 'base64');

    console.log('[FileSystemService] Saved book:', filePath);
    return filePath;
  }

  static async readBook(bookId: string, filename: string): Promise<ArrayBuffer> {
    await this.initialize();

    const filePath = `${BOOKS_DIR}/${bookId}/${filename}`;
    const exists = await RNFS.exists(filePath);
    if (!exists) {
      throw new Error(`Book file not found: ${bookId}/${filename}`);
    }

    const base64 = await RNFS.readFile(filePath, 'base64');
    return base64ToArrayBuffer(base64);
  }

  static async bookExists(bookId: string, filename: string): Promise<boolean> {
    await this.initialize();
    const filePath = `${BOOKS_DIR}/${bookId}/${filename}`;
    return RNFS.exists(filePath);
  }

  static async deleteBook(bookId: string): Promise<boolean> {
    await this.initialize();

    const bookDir = `${BOOKS_DIR}/${bookId}`;
    try {
      await deleteDirectoryRecursive(bookDir);
      console.log('[FileSystemService] Deleted book:', bookId);
      return true;
    } catch (error: unknown) {
      console.error('[FileSystemService] Failed to delete book:', error);
      return false;
    }
  }

  static async listBooks(): Promise<string[]> {
    await this.initialize();

    const exists = await RNFS.exists(BOOKS_DIR);
    if (!exists) return [];

    const entries = await RNFS.readDir(BOOKS_DIR);
    return entries.filter((e) => e.isDirectory()).map((e) => e.name);
  }

  static getDirectoryName(): string | null {
    return 'books';
  }

  static async saveFileWithDialog(
    data: ArrayBuffer | Uint8Array | Blob,
    suggestedName: string,
    _types?: Array<{ description: string; accept: Record<string, string[]> }>,
  ): Promise<string | null> {
    await this.initialize();

    const filePath = `${RNFS.DocumentDirectoryPath}/${suggestedName}`;
    try {
      const bytes = await dataToBytes(data);
      const base64 = bytesToBase64(bytes);
      await RNFS.writeFile(filePath, base64, 'base64');
      return filePath;
    } catch (error) {
      console.error('[FileSystemService] saveFileWithDialog failed:', error);
      return null;
    }
  }
}

export default FileSystemService;
