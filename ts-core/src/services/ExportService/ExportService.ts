/**
 * Export Service - Export vocabulary to various formats
 *
 * Supported formats:
 * - CSV - Standard comma-separated values
 * - TSV/Anki - Tab-separated for Anki import
 * - JSON - Full data export with metadata
 */

import { format } from 'date-fns';
import type { VocabularyItem, Language } from '../../types';
import { getLanguageInfo } from '../../types';
import type { IFileSystem } from '../../adapters';

// ============================================================================
// Types
// ============================================================================

export type ExportFormat = 'csv' | 'anki' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  includeContext?: boolean;
  includeSRSData?: boolean;
  includeBookInfo?: boolean;
  filterByStatus?: string[];
  filterByLanguage?: { source?: Language; target?: Language };
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  /** Content when host does not provide IFileSystem (host writes the file) */
  content?: string;
  itemCount: number;
  error?: string;
}

// ============================================================================
// Export Service
// ============================================================================

export class ExportService {
  /**
   * Export vocabulary items. If fileSystem and exportDir provided, writes file; otherwise returns content in result.
   */
  async export(
    vocabulary: VocabularyItem[],
    options: ExportOptions,
    fileSystem?: IFileSystem,
    exportDir?: string,
  ): Promise<ExportResult> {
    try {
      let filteredVocabulary = [...vocabulary];

      if (options.filterByStatus && options.filterByStatus.length > 0) {
        filteredVocabulary = filteredVocabulary.filter(
          (v) => options.filterByStatus!.includes(v.status)
        );
      }

      if (options.filterByLanguage) {
        if (options.filterByLanguage.source) {
          filteredVocabulary = filteredVocabulary.filter(
            (v) => v.sourceLanguage === options.filterByLanguage!.source
          );
        }
        if (options.filterByLanguage.target) {
          filteredVocabulary = filteredVocabulary.filter(
            (v) => v.targetLanguage === options.filterByLanguage!.target
          );
        }
      }

      if (filteredVocabulary.length === 0) {
        return {
          success: false,
          itemCount: 0,
          error: 'No vocabulary items match the export criteria',
        };
      }

      // Generate content based on format
      let content: string;
      let fileExtension: string;

      switch (options.format) {
        case 'csv':
          content = this.generateCSV(filteredVocabulary, options);
          fileExtension = 'csv';
          break;
        case 'anki':
          content = this.generateAnki(filteredVocabulary, options);
          fileExtension = 'txt';
          break;
        case 'json':
          content = this.generateJSON(filteredVocabulary, options);
          fileExtension = 'json';
          break;
        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const timestamp = format(new Date(), 'yyyy-MM-dd_HHmm');
      const fileName = `xenolexia_vocabulary_${timestamp}.${fileExtension}`;

      if (fileSystem?.writeFile && exportDir) {
        const filePath = `${exportDir.replace(/\/$/, '')}/${fileName}`;
        await fileSystem.writeFile(filePath, content, 'utf8');
        return { success: true, filePath, fileName, itemCount: filteredVocabulary.length };
      }
      return { success: true, fileName, content, itemCount: filteredVocabulary.length };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        itemCount: 0,
        error: error instanceof Error ? error.message : 'Export failed',
      };
    }
  }

  /**
   * Export and share via system share sheet (Electron: opens file location)
   */
  /** Export and optionally open file location (host implements shell.showItemInFolder etc.). */
  async exportAndShare(
    vocabulary: VocabularyItem[],
    options: ExportOptions,
    fileSystem?: IFileSystem,
    exportDir?: string,
  ): Promise<ExportResult> {
    return this.export(vocabulary, options, fileSystem, exportDir);
  }

  /**
   * Generate CSV format
   */
  private generateCSV(vocabulary: VocabularyItem[], options: ExportOptions): string {
    const headers = ['source_word', 'target_word', 'source_language', 'target_language'];

    if (options.includeContext) {
      headers.push('context_sentence');
    }
    if (options.includeBookInfo) {
      headers.push('book_title');
    }
    if (options.includeSRSData) {
      headers.push('status', 'review_count', 'ease_factor', 'interval', 'added_at');
    }

    const rows = vocabulary.map((item) => {
      const row: string[] = [
        this.escapeCSV(item.sourceWord),
        this.escapeCSV(item.targetWord),
        item.sourceLanguage,
        item.targetLanguage,
      ];

      if (options.includeContext) {
        row.push(this.escapeCSV(item.contextSentence || ''));
      }
      if (options.includeBookInfo) {
        row.push(this.escapeCSV(item.bookTitle || ''));
      }
      if (options.includeSRSData) {
        row.push(
          item.status,
          item.reviewCount.toString(),
          item.easeFactor.toFixed(2),
          item.interval.toString(),
          format(item.addedAt, 'yyyy-MM-dd')
        );
      }

      return row.join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Generate Anki-compatible TSV format
   *
   * Format: front<TAB>back<TAB>tags
   * - Front: Foreign word
   * - Back: Original word + context (if available)
   * - Tags: language pair + proficiency level
   */
  private generateAnki(vocabulary: VocabularyItem[], options: ExportOptions): string {
    const rows = vocabulary.map((item) => {
      // Front of card (foreign word)
      const front = item.targetWord;

      // Back of card (original word + optional context)
      let back = item.sourceWord;
      if (options.includeContext && item.contextSentence) {
        back += `<br><br><i>"${item.contextSentence}"</i>`;
      }
      if (options.includeBookInfo && item.bookTitle) {
        back += `<br><small>From: ${item.bookTitle}</small>`;
      }

      // Tags
      const tags = [
        `${item.sourceLanguage}-${item.targetLanguage}`,
        item.status,
      ];

      return `${front}\t${back}\t${tags.join(' ')}`;
    });

    // Add Anki header comment
    const header = '#separator:tab\n#html:true\n#tags column:3\n';
    return header + rows.join('\n');
  }

  /**
   * Generate JSON format with full metadata
   */
  private generateJSON(vocabulary: VocabularyItem[], options: ExportOptions): string {
    const exportData = {
      exportedAt: new Date().toISOString(),
      itemCount: vocabulary.length,
      format: 'xenolexia-vocabulary-v1',
      items: vocabulary.map((item) => {
        const exportItem: Record<string, any> = {
          sourceWord: item.sourceWord,
          targetWord: item.targetWord,
          sourceLanguage: item.sourceLanguage,
          targetLanguage: item.targetLanguage,
        };

        if (options.includeContext && item.contextSentence) {
          exportItem.contextSentence = item.contextSentence;
        }

        if (options.includeBookInfo) {
          exportItem.bookId = item.bookId;
          exportItem.bookTitle = item.bookTitle;
        }

        if (options.includeSRSData) {
          exportItem.status = item.status;
          exportItem.reviewCount = item.reviewCount;
          exportItem.easeFactor = item.easeFactor;
          exportItem.interval = item.interval;
          exportItem.addedAt = item.addedAt.toISOString();
          exportItem.lastReviewedAt = item.lastReviewedAt?.toISOString() || null;
        }

        return exportItem;
      }),
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Escape a value for CSV (handle commas, quotes, newlines)
   */
  private escapeCSV(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  /**
   * Get export format description
   */
  static getFormatDescription(format: ExportFormat): string {
    switch (format) {
      case 'csv':
        return 'CSV file that can be opened in Excel or Google Sheets';
      case 'anki':
        return 'Tab-separated file ready for import into Anki flashcard app';
      case 'json':
        return 'JSON file with full vocabulary data and metadata';
      default:
        return '';
    }
  }

  /**
   * Get suggested filename for format
   */
  static getSuggestedFilename(exportFormat: ExportFormat): string {
    const timestamp = format(new Date(), 'yyyy-MM-dd');
    switch (exportFormat) {
      case 'csv':
        return `xenolexia_vocabulary_${timestamp}.csv`;
      case 'anki':
        return `xenolexia_anki_${timestamp}.txt`;
      case 'json':
        return `xenolexia_backup_${timestamp}.json`;
      default:
        return `xenolexia_export_${timestamp}`;
    }
  }
}

// Export singleton instance
export const exportService = new ExportService();
