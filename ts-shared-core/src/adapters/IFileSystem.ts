/**
 * Platform-agnostic file system interface.
 * Implement with Electron IPC, Node fs, or React Native RNFS.
 */

export interface IFileSystem {
  /** Read file as ArrayBuffer (e.g. for EPUB ZIP) */
  readFile(filePath: string): Promise<ArrayBuffer>;

  /** Read file as UTF-8 text */
  readFileAsText(filePath: string): Promise<string>;

  /** Read file as base64 (e.g. for JSZip.loadAsync with base64) */
  readFileAsBase64?(filePath: string): Promise<string>;

  /** Write file. Optional; used by import/export. */
  writeFile?(filePath: string, content: string | ArrayBuffer, encoding?: 'utf8' | 'base64'): Promise<void>;

  /** Check if path exists */
  fileExists?(filePath: string): Promise<boolean>;

  /** Create directory. Optional. */
  mkdir?(dirPath: string, options?: { recursive?: boolean }): Promise<void>;

  /** Get app data / user data directory. Optional. */
  getAppDataPath?(): Promise<string>;

  /** Delete file or directory. Optional. */
  unlink?(filePath: string): Promise<void>;
}
