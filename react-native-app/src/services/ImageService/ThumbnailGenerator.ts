/**
 * Thumbnail Generator
 *
 * Generates thumbnails for book covers and other images.
 * Uses @bam.tech/react-native-image-resizer (FOSS, MIT) for resizing and
 * React Native Image.getSize for dimensions.
 */

import { Image } from 'react-native';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';

import type {
  ImageDimensions,
  ResizeOptions,
  ThumbnailOptions,
  ThumbnailSize,
} from './types';
import {THUMBNAIL_SIZES} from './types';
import {ImageCache} from './ImageCache';

// ============================================================================
// Constants
// ============================================================================

const THUMBNAILS_DIR = 'thumbnails';

// ============================================================================
// Thumbnail Generator Class
// ============================================================================

export class ThumbnailGenerator {
  private static instance: ThumbnailGenerator;
  private cache: ImageCache;
  private thumbnailsDir: string;
  private initialized: boolean = false;

  private constructor() {
    this.cache = ImageCache.getInstance();
    this.thumbnailsDir = `${RNFS.DocumentDirectoryPath}/${THUMBNAILS_DIR}`;
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ThumbnailGenerator {
    if (!ThumbnailGenerator.instance) {
      ThumbnailGenerator.instance = new ThumbnailGenerator();
    }
    return ThumbnailGenerator.instance;
  }

  /**
   * Initialize thumbnail generator
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.cache.initialize();

      const exists = await RNFS.exists(this.thumbnailsDir);
      if (!exists) {
        await RNFS.mkdir(this.thumbnailsDir);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ThumbnailGenerator:', error);
      throw error;
    }
  }

  /**
   * Generate thumbnail for an image
   */
  async generateThumbnail(
    sourcePath: string,
    options: ThumbnailOptions = {},
  ): Promise<string> {
    await this.ensureInitialized();

    const {size = 'medium', quality = 80, format = 'jpeg'} = options;
    const dimensions = THUMBNAIL_SIZES[size];

    // Generate cache key
    const cacheKey = this.generateCacheKey(sourcePath, size);

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Generate thumbnail
    const thumbnailPath = await this.resizeImage(sourcePath, {
      width: dimensions.width,
      height: dimensions.height,
      quality,
      format,
      mode: 'cover',
    });

    // Store in cache
    const cachedPath = await this.cache.set(cacheKey, thumbnailPath, {move: true});

    return cachedPath;
  }

  /**
   * Generate thumbnails for all sizes
   */
  async generateAllSizes(sourcePath: string): Promise<Record<ThumbnailSize, string>> {
    await this.ensureInitialized();

    const results: Partial<Record<ThumbnailSize, string>> = {};
    const sizes: ThumbnailSize[] = ['small', 'medium', 'large'];

    for (const size of sizes) {
      results[size] = await this.generateThumbnail(sourcePath, {size});
    }

    return results as Record<ThumbnailSize, string>;
  }

  /**
   * Get thumbnail path if it exists
   */
  async getThumbnail(
    sourcePath: string,
    size: ThumbnailSize = 'medium',
  ): Promise<string | null> {
    await this.ensureInitialized();

    const cacheKey = this.generateCacheKey(sourcePath, size);
    return this.cache.get(cacheKey);
  }

  /**
   * Delete thumbnails for an image
   */
  async deleteThumbnails(sourcePath: string): Promise<void> {
    await this.ensureInitialized();

    const sizes: ThumbnailSize[] = ['small', 'medium', 'large'];

    for (const size of sizes) {
      const cacheKey = this.generateCacheKey(sourcePath, size);
      await this.cache.delete(cacheKey);
    }
  }

  /**
   * Resize an image using @bam.tech/react-native-image-resizer (FOSS).
   */
  private async resizeImage(
    sourcePath: string,
    options: ResizeOptions,
  ): Promise<string> {
    const {
      width = 0,
      height = 0,
      format = 'jpeg',
      quality = 80,
      mode = 'cover',
    } = options;

    const extension = format === 'png' ? '.png' : '.jpg';
    const outputPath = `${this.thumbnailsDir}/temp_${Date.now()}${extension}`;

    const w = Math.max(1, width || 1);
    const h = Math.max(1, height || 1);
    const compressFormat = format === 'png' ? 'PNG' : 'JPEG';

    const result = await ImageResizer.createResizedImage(
      sourcePath,
      w,
      h,
      compressFormat,
      quality,
      0,
      outputPath,
      false,
      { mode },
    );

    return result.path ?? result.uri ?? outputPath;
  }

  /**
   * Get dimensions of an image using React Native Image.getSize (no extra deps).
   */
  async getImageDimensions(imagePath: string): Promise<ImageDimensions | null> {
    try {
      const exists = await RNFS.exists(imagePath);
      if (!exists) {
        return null;
      }

      const uri = imagePath.startsWith('file://') ? imagePath : `file://${imagePath}`;
      return new Promise<ImageDimensions | null>((resolve) => {
        Image.getSize(
          uri,
          (width, height) => resolve({ width, height }),
          () => {
            console.warn('Failed to get image dimensions for:', imagePath);
            resolve(null);
          },
        );
      });
    } catch (error) {
      console.warn('Failed to get image dimensions:', error);
      return null;
    }
  }

  /**
   * Calculate scaled dimensions while maintaining aspect ratio
   */
  calculateScaledDimensions(
    original: ImageDimensions,
    target: ImageDimensions,
    mode: 'contain' | 'cover' = 'contain',
  ): ImageDimensions {
    const aspectRatio = original.width / original.height;
    const targetAspectRatio = target.width / target.height;

    let newWidth: number;
    let newHeight: number;

    if (mode === 'contain') {
      // Scale to fit within target bounds
      if (aspectRatio > targetAspectRatio) {
        newWidth = target.width;
        newHeight = target.width / aspectRatio;
      } else {
        newHeight = target.height;
        newWidth = target.height * aspectRatio;
      }
    } else {
      // Scale to cover target bounds
      if (aspectRatio > targetAspectRatio) {
        newHeight = target.height;
        newWidth = target.height * aspectRatio;
      } else {
        newWidth = target.width;
        newHeight = target.width / aspectRatio;
      }
    }

    return {
      width: Math.round(newWidth),
      height: Math.round(newHeight),
    };
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  private generateCacheKey(sourcePath: string, size: ThumbnailSize): string {
    // Create a simple hash from the path
    const hash = this.simpleHash(sourcePath);
    return `thumb_${size}_${hash}`;
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
