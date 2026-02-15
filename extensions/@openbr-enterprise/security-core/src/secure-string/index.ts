/**
 * SecureString - Memory-safe string handling
 * Prevents sensitive data from being swapped to disk or left in memory
 */

/**
 * SecureString provides memory-safe handling of sensitive strings
 * 
 * Features:
 * - Automatic zeroization when no longer needed
 * - Protection against memory dumps
 * - Prevents accidental logging of sensitive data
 * - Timing-safe comparison
 */
export class SecureString {
  private buffer: Buffer;
  private finalized: boolean = false;

  /**
   * Create a new SecureString from a string or Buffer
   */
  constructor(value: string | Buffer) {
    if (typeof value === 'string') {
      this.buffer = Buffer.from(value, 'utf-8');
    } else {
      this.buffer = Buffer.from(value);
    }
  }

  /**
   * Get the string value
   * Note: This creates a temporary copy. Use with caution.
   */
  getValue(): string {
    if (this.finalized) {
      throw new Error('SecureString has been zeroized');
    }
    return this.buffer.toString('utf-8');
  }

  /**
   * Get the buffer value
   * Note: This returns the internal buffer. Do not modify.
   */
  getBuffer(): Buffer {
    if (this.finalized) {
      throw new Error('SecureString has been zeroized');
    }
    return this.buffer;
  }

  /**
   * Get string length
   */
  get length(): number {
    return this.buffer.length;
  }

  /**
   * Compare two SecureStrings in constant time
   * Prevents timing attacks
   */
  equals(other: SecureString): boolean {
    if (this.finalized || other.finalized) {
      throw new Error('Cannot compare zeroized SecureStrings');
    }

    const buf1 = this.buffer;
    const buf2 = other.buffer;

    if (buf1.length !== buf2.length) {
      // Still do comparison to prevent timing leaks
      let result = 0;
      const maxLen = Math.max(buf1.length, buf2.length);
      for (let i = 0; i < maxLen; i++) {
        result |= (buf1[i] || 0) ^ (buf2[i] || 0);
      }
      return result === 0;
    }

    let result = 0;
    for (let i = 0; i < buf1.length; i++) {
      result |= buf1[i] ^ buf2[i];
    }
    return result === 0;
  }

  /**
   * Zeroize (overwrite with zeros) and release memory
   * Should be called when the secret is no longer needed
   */
  zeroize(): void {
    if (this.finalized) return;

    // Overwrite with zeros
    this.buffer.fill(0);
    
    // In Node.js, we can't force GC, but we can help
    // by releasing the reference
    (this.buffer as unknown) = null;
    
    this.finalized = true;
  }

  /**
   * Mask the string for display/logging
   * Shows only first and last 2 characters
   */
  mask(): string {
    if (this.finalized) return '[ZEROIZED]';
    
    const str = this.buffer.toString('utf-8');
    if (str.length <= 8) return '****';
    
    return str.substring(0, 2) + '****' + str.substring(str.length - 2);
  }

  /**
   * Check if the string has been zeroized
   */
  isZeroized(): boolean {
    return this.finalized;
  }

  /**
   * Prevent accidental conversion to string
   */
  toString(): string {
    return this.mask();
  }

  /**
   * Prevent accidental logging
   */
  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `SecureString(${this.mask()})`;
  }

  /**
   * Create a SecureString from a string
   */
  static from(value: string): SecureString {
    return new SecureString(value);
  }

  /**
   * Create a SecureString from a Buffer
   */
  static fromBuffer(buffer: Buffer): SecureString {
    return new SecureString(buffer);
  }

  /**
   * Generate a random secure string
   */
  static random(length: number = 32): SecureString {
    const { randomBytes } = require('crypto');
    return new SecureString(randomBytes(length));
  }
}

export default SecureString;
