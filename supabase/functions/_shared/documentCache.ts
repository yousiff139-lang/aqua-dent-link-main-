/**
 * Document Cache Module
 * Provides in-memory caching for frequently accessed documents
 * Reduces redundant PDF/Excel generation and improves performance
 */

interface CacheEntry {
  data: Uint8Array;
  url: string;
  timestamp: number;
  appointmentId: string;
  format: 'pdf' | 'excel';
  size: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  entries: number;
}

class DocumentCache {
  private cache: Map<string, CacheEntry>;
  private maxSize: number; // Maximum cache size in bytes (default: 50MB)
  private maxAge: number; // Maximum age in milliseconds (default: 1 hour)
  private stats: CacheStats;

  constructor(maxSizeMB: number = 50, maxAgeMinutes: number = 60) {
    this.cache = new Map();
    this.maxSize = maxSizeMB * 1024 * 1024; // Convert MB to bytes
    this.maxAge = maxAgeMinutes * 60 * 1000; // Convert minutes to milliseconds
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0
    };
  }

  /**
   * Generate cache key from appointment ID and format
   */
  private getCacheKey(appointmentId: string, format: 'pdf' | 'excel'): string {
    return `${appointmentId}:${format}`;
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age < this.maxAge;
  }

  /**
   * Get current cache size in bytes
   */
  private getCurrentSize(): number {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size;
    }
    return totalSize;
  }

  /**
   * Evict oldest entries to make room for new entry
   */
  private evictOldest(requiredSpace: number): void {
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.cache.entries()).sort(
      (a, b) => a[1].timestamp - b[1].timestamp
    );

    let freedSpace = 0;
    for (const [key, entry] of entries) {
      if (freedSpace >= requiredSpace) break;
      
      this.cache.delete(key);
      freedSpace += entry.size;
      this.stats.size -= entry.size;
      this.stats.entries--;
      
      console.log(`Evicted cache entry: ${key} (freed ${entry.size} bytes)`);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValid(entry)) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.size -= entry.size;
        this.stats.entries--;
        console.log(`Removed expired cache entry: ${key}`);
      }
    }
  }

  /**
   * Get document from cache
   */
  get(appointmentId: string, format: 'pdf' | 'excel'): CacheEntry | null {
    const key = this.getCacheKey(appointmentId, format);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (!this.isValid(entry)) {
      // Entry expired, remove it
      this.cache.delete(key);
      this.stats.size -= entry.size;
      this.stats.entries--;
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    console.log(`Cache hit: ${key} (age: ${Math.round((Date.now() - entry.timestamp) / 1000)}s)`);
    return entry;
  }

  /**
   * Store document in cache
   */
  set(
    appointmentId: string,
    format: 'pdf' | 'excel',
    data: Uint8Array,
    url: string
  ): void {
    const key = this.getCacheKey(appointmentId, format);
    const size = data.byteLength;

    // Check if we need to make room
    const currentSize = this.getCurrentSize();
    if (currentSize + size > this.maxSize) {
      // Evict oldest entries to make room
      this.evictOldest(size);
    }

    // Clean up expired entries periodically
    if (this.cache.size > 10) {
      this.cleanupExpired();
    }

    const entry: CacheEntry = {
      data,
      url,
      timestamp: Date.now(),
      appointmentId,
      format,
      size
    };

    this.cache.set(key, entry);
    this.stats.size += size;
    this.stats.entries++;

    console.log(
      `Cached document: ${key} (size: ${(size / 1024).toFixed(2)} KB, ` +
      `total cache: ${(this.getCurrentSize() / 1024 / 1024).toFixed(2)} MB)`
    );
  }

  /**
   * Invalidate cache entry for an appointment
   */
  invalidate(appointmentId: string, format?: 'pdf' | 'excel'): void {
    if (format) {
      const key = this.getCacheKey(appointmentId, format);
      const entry = this.cache.get(key);
      if (entry) {
        this.cache.delete(key);
        this.stats.size -= entry.size;
        this.stats.entries--;
        console.log(`Invalidated cache entry: ${key}`);
      }
    } else {
      // Invalidate both PDF and Excel
      this.invalidate(appointmentId, 'pdf');
      this.invalidate(appointmentId, 'excel');
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      entries: 0
    };
    console.log('Cache cleared');
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number; sizeMB: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      sizeMB: Math.round((this.stats.size / 1024 / 1024) * 100) / 100
    };
  }
}

// Export singleton instance
export const documentCache = new DocumentCache(50, 60); // 50MB cache, 60 minute TTL

/**
 * Helper function to check if document should be cached
 * Only cache completed appointments to avoid stale data
 */
export function shouldCacheDocument(appointmentStatus: string): boolean {
  return ['completed', 'upcoming'].includes(appointmentStatus.toLowerCase());
}
