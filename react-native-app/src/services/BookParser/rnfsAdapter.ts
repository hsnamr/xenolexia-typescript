/**
 * RNFS adapter implementing IFileSystem for use with xenolexia-typescript parsers (e.g. FB2Parser).
 * FOSS: react-native-fs (RNFS).
 */

import RNFS from 'react-native-fs';
import type { IFileSystem } from 'xenolexia-typescript';

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const rnfsFileSystem: IFileSystem = {
  readFile: async (filePath: string): Promise<ArrayBuffer> => {
    const base64 = await RNFS.readFile(filePath, 'base64');
    return base64ToArrayBuffer(base64);
  },
  readFileAsText: (filePath: string): Promise<string> => {
    return RNFS.readFile(filePath, 'utf8');
  },
  readFileAsBase64: (filePath: string): Promise<string> => {
    return RNFS.readFile(filePath, 'base64');
  },
  fileExists: (filePath: string): Promise<boolean> => RNFS.exists(filePath),
  mkdir: (dirPath: string, options?: { recursive?: boolean }): Promise<void> => {
    return RNFS.mkdir(dirPath).then(() => {});
  },
  unlink: (filePath: string): Promise<void> => RNFS.unlink(filePath),
};
