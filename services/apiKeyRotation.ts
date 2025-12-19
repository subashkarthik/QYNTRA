/**
 * API Key Rotation Utility
 * Manages multiple API keys with automatic rotation and failure handling
 */

interface KeyStatus {
  index: number;
  failedAt?: number;
  failureCount: number;
}

export class ApiKeyRotation {
  private keys: string[];
  private currentIndex: number = 0;
  private keyStatuses: Map<number, KeyStatus> = new Map();
  private readonly COOLDOWN_MS = 60000; // 1 minute cooldown for failed keys
  private readonly MAX_FAILURES = 3;

  constructor(apiKeys: string | string[]) {
    // Support both single key and comma-separated keys
    if (typeof apiKeys === 'string') {
      this.keys = apiKeys.split(',').map(key => key.trim()).filter(key => key.length > 0);
    } else {
      this.keys = apiKeys;
    }

    // If no keys provided, create a placeholder to prevent errors
    // The service will fail gracefully when trying to use it
    if (this.keys.length === 0) {
      console.warn('⚠️ No API keys provided - service will not function');
      this.keys = ['NO_API_KEY_PROVIDED'];
    }

    // Initialize key statuses
    this.keys.forEach((_, index) => {
      this.keyStatuses.set(index, {
        index,
        failureCount: 0
      });
    });

    if (this.keys[0] !== 'NO_API_KEY_PROVIDED') {
      console.log(`🔑 Initialized API key rotation with ${this.keys.length} key(s)`);
    }
  }

  /**
   * Get the next available API key
   */
  getNextKey(): string {
    const startIndex = this.currentIndex;
    let attempts = 0;

    while (attempts < this.keys.length) {
      const status = this.keyStatuses.get(this.currentIndex)!;

      // Check if key is in cooldown
      if (status.failedAt) {
        const timeSinceFailure = Date.now() - status.failedAt;
        if (timeSinceFailure < this.COOLDOWN_MS) {
          // Key is still in cooldown, try next
          this.currentIndex = (this.currentIndex + 1) % this.keys.length;
          attempts++;
          continue;
        } else {
          // Cooldown expired, reset the key
          this.resetKey(this.currentIndex);
        }
      }

      // Check if key has exceeded max failures
      if (status.failureCount >= this.MAX_FAILURES) {
        this.currentIndex = (this.currentIndex + 1) % this.keys.length;
        attempts++;
        continue;
      }

      // Found a valid key
      const key = this.keys[this.currentIndex];
      console.log(`🔑 Using API key index: ${this.currentIndex} (${this.keys.length} total)`);
      
      // Move to next key for next request (round-robin)
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      
      return key;
    }

    // All keys are in cooldown or failed, return the original starting key as last resort
    console.warn('⚠️ All API keys are in cooldown or failed, using fallback key');
    return this.keys[startIndex];
  }

  /**
   * Mark a key as failed
   */
  markKeyFailed(key: string): void {
    const index = this.keys.indexOf(key);
    if (index === -1) return;

    const status = this.keyStatuses.get(index)!;
    status.failureCount++;
    status.failedAt = Date.now();

    console.warn(`❌ API key ${index} marked as failed (${status.failureCount}/${this.MAX_FAILURES} failures)`);

    // If this was the current key, move to next
    if (this.currentIndex === index) {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
    }
  }

  /**
   * Reset a key's failure status
   */
  resetKey(index: number): void {
    const status = this.keyStatuses.get(index);
    if (status) {
      status.failedAt = undefined;
      status.failureCount = 0;
      console.log(`✅ API key ${index} reset and available again`);
    }
  }

  /**
   * Get total number of keys
   */
  getKeyCount(): number {
    return this.keys.length;
  }

  /**
   * Get available (non-failed) key count
   */
  getAvailableKeyCount(): number {
    let count = 0;
    this.keyStatuses.forEach(status => {
      if (status.failureCount < this.MAX_FAILURES) {
        const timeSinceFailure = status.failedAt ? Date.now() - status.failedAt : Infinity;
        if (!status.failedAt || timeSinceFailure >= this.COOLDOWN_MS) {
          count++;
        }
      }
    });
    return count;
  }
}
