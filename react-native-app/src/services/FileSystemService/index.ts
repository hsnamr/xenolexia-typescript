/**
 * File System Service
 *
 * Provides file system access for storing books.
 * On web, uses the File System Access API.
 * On native (iOS/Android), uses react-native-fs (RNFS).
 */

import { Platform } from 'react-native';

const FileSystemService =
  Platform.OS === 'web'
    ? require('./FileSystemService.web').FileSystemService
    : require('./FileSystemService.native').FileSystemService;

export { FileSystemService };
