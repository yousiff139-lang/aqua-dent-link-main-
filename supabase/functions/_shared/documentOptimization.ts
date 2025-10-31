/**
 * Document Optimization Module
 * Provides utilities for optimizing PDF and Excel file sizes
 * Reduces bandwidth usage and improves download speeds
 */

/**
 * PDF Optimization Options
 */
export interface PDFOptimizationOptions {
  compressImages?: boolean;
  imageQuality?: number; // 0-100
  removeMetadata?: boolean;
  optimizeFonts?: boolean;
  maxImageWidth?: number;
  maxImageHeight?: number;
}

/**
 * Excel Optimization Options
 */
export interface ExcelOptimizationOptions {
  removeEmptyRows?: boolean;
  removeEmptyColumns?: boolean;
  compressImages?: boolean;
  imageQuality?: number; // 0-100
  maxImageWidth?: number;
  maxImageHeight?: number;
}

/**
 * Optimize PDF generation settings for smaller file size
 */
export function getOptimizedPDFSettings(
  options: PDFOptimizationOptions = {}
): any {
  const defaults: PDFOptimizationOptions = {
    compressImages: true,
    imageQuality: 75,
    removeMetadata: false,
    optimizeFonts: true,
    maxImageWidth: 800,
    maxImageHeight: 600
  };

  const settings = { ...defaults, ...options };

  return {
    compress: true,
    precision: 2, // Reduce decimal precision for coordinates
    userUnit: 1.0,
    
    // Image compression settings
    imageCompression: settings.compressImages ? 'JPEG' : 'NONE',
    imageQuality: settings.imageQuality,
    
    // Font optimization
    putOnlyUsedFonts: settings.optimizeFonts,
    
    // Metadata
    title: settings.removeMetadata ? '' : undefined,
    author: settings.removeMetadata ? '' : undefined,
    subject: settings.removeMetadata ? '' : undefined,
    keywords: settings.removeMetadata ? '' : undefined,
    creator: settings.removeMetadata ? '' : undefined,
  };
}

/**
 * Optimize Excel generation settings for smaller file size
 */
export function getOptimizedExcelSettings(
  options: ExcelOptimizationOptions = {}
): any {
  const defaults: ExcelOptimizationOptions = {
    removeEmptyRows: true,
    removeEmptyColumns: true,
    compressImages: true,
    imageQuality: 75,
    maxImageWidth: 800,
    maxImageHeight: 600
  };

  return { ...defaults, ...options };
}

/**
 * Truncate long text to reduce file size
 * Useful for very long medical histories or notes
 */
export function truncateText(
  text: string,
  maxLength: number = 5000,
  suffix: string = '... (truncated)'
): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Optimize text content by removing excessive whitespace
 */
export function optimizeTextContent(text: string): string {
  if (!text) return text;

  return text
    // Replace multiple spaces with single space
    .replace(/  +/g, ' ')
    // Replace multiple newlines with double newline
    .replace(/\n\n+/g, '\n\n')
    // Trim whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Trim overall
    .trim();
}

/**
 * Calculate estimated file size before generation
 * Helps decide whether to use compression or caching
 */
export function estimateDocumentSize(data: any, format: 'pdf' | 'excel'): number {
  // Base size estimates (in bytes)
  const baseSizes = {
    pdf: 50000, // ~50KB base PDF
    excel: 30000 // ~30KB base Excel
  };

  let estimatedSize = baseSizes[format];

  // Add size for text content
  const textFields = [
    data.chiefComplaint,
    data.medicalHistory,
    data.patientNotes,
    data.uncertaintyNote
  ].filter(Boolean);

  for (const text of textFields) {
    // Rough estimate: 1 character ≈ 1 byte in compressed format
    estimatedSize += text.length * 0.5;
  }

  // Add size for documents (metadata only, not actual files)
  if (data.documents && data.documents.length > 0) {
    // Each document reference adds ~500 bytes
    estimatedSize += data.documents.length * 500;
  }

  // Add overhead for formatting and structure
  estimatedSize *= 1.2;

  return Math.round(estimatedSize);
}

/**
 * Determine if document should be compressed based on estimated size
 */
export function shouldCompressDocument(estimatedSize: number): boolean {
  // Compress if estimated size is over 100KB
  return estimatedSize > 100000;
}

/**
 * Get compression level based on file size
 */
export function getCompressionLevel(estimatedSize: number): 'none' | 'low' | 'medium' | 'high' {
  if (estimatedSize < 100000) return 'none'; // < 100KB
  if (estimatedSize < 500000) return 'low'; // < 500KB
  if (estimatedSize < 1000000) return 'medium'; // < 1MB
  return 'high'; // >= 1MB
}

/**
 * Optimize document data before generation
 * Removes unnecessary fields and optimizes content
 */
export function optimizeDocumentData(data: any): any {
  const optimized = { ...data };

  // Optimize text fields
  if (optimized.chiefComplaint) {
    optimized.chiefComplaint = optimizeTextContent(
      truncateText(optimized.chiefComplaint, 2000)
    );
  }

  if (optimized.medicalHistory) {
    optimized.medicalHistory = optimizeTextContent(
      truncateText(optimized.medicalHistory, 3000)
    );
  }

  if (optimized.patientNotes) {
    optimized.patientNotes = optimizeTextContent(
      truncateText(optimized.patientNotes, 2000)
    );
  }

  if (optimized.uncertaintyNote) {
    optimized.uncertaintyNote = optimizeTextContent(
      truncateText(optimized.uncertaintyNote, 1000)
    );
  }

  // Remove null/undefined fields
  Object.keys(optimized).forEach(key => {
    if (optimized[key] === null || optimized[key] === undefined) {
      delete optimized[key];
    }
  });

  // Optimize document references (keep only essential fields)
  if (optimized.documents && Array.isArray(optimized.documents)) {
    optimized.documents = optimized.documents.map((doc: any) => ({
      id: doc.id,
      fileName: doc.fileName,
      fileUrl: doc.fileUrl,
      fileType: doc.fileType,
      fileSize: doc.fileSize
      // Remove uploadedAt and other non-essential fields
    }));
  }

  return optimized;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Log optimization metrics
 */
export function logOptimizationMetrics(
  format: 'pdf' | 'excel',
  originalSize: number,
  optimizedSize: number,
  duration: number
): void {
  const reduction = originalSize > 0 
    ? ((originalSize - optimizedSize) / originalSize * 100).toFixed(2)
    : '0';

  console.log(
    `Document optimization complete:`,
    `\n  Format: ${format.toUpperCase()}`,
    `\n  Original size: ${formatFileSize(originalSize)}`,
    `\n  Optimized size: ${formatFileSize(optimizedSize)}`,
    `\n  Reduction: ${reduction}%`,
    `\n  Duration: ${duration}ms`
  );
}
