/**
 * Rust Performance Module Integration
 * Loads and provides TypeScript interface to Rust N-API modules
 */

import { existsSync } from "fs";
import { join } from "path";

// Dynamic import for the native module
let rustModule: any = null;

/**
 * Load the Rust native module
 */
export async function loadRustModule(): Promise<any> {
  if (rustModule) {
    return rustModule;
  }

  // Try to load from different locations
  const possiblePaths = [
    join(process.cwd(), "openclaw-rs", "dist", "openclaw_rs.node"),
    join(process.cwd(), "node_modules", "openclaw-rs", "dist", "openclaw_rs.node"),
    join(__dirname, "..", "..", "openclaw-rs", "dist", "openclaw_rs.node"),
  ];

  for (const path of possiblePaths) {
    if (existsSync(path)) {
      try {
        rustModule = require(path);
        rustModule.initRustRuntime();
        return rustModule;
      } catch (error) {
        console.warn(`Failed to load Rust module from ${path}:`, error);
      }
    }
  }

  throw new Error('Rust native module not found. Run "npm run build:rust" to build it.');
}

/**
 * Check if Rust module is available
 */
export function isRustAvailable(): boolean {
  try {
    const paths = [
      join(process.cwd(), "openclaw-rs", "dist", "openclaw_rs.node"),
      join(process.cwd(), "node_modules", "openclaw-rs", "dist", "openclaw_rs.node"),
    ];

    return paths.some((p) => existsSync(p));
  } catch {
    return false;
  }
}

/**
 * Rust Crypto Operations
 */
export class RustCrypto {
  private static module: any = null;

  static async init() {
    if (!this.module) {
      this.module = await loadRustModule();
    }
  }

  static sha256(input: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized. Call RustCrypto.init() first.");
    }
    return this.module.sha256(input);
  }

  static hashBatch(inputs: string[], algorithm: "sha256" | "sha384" | "sha512"): string[] {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.hashBatch(inputs, algorithm);
  }

  static base64Encode(input: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.base64Encode(input);
  }

  static base64Decode(input: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.base64Decode(input);
  }
}

/**
 * Rust JSON Operations
 */
export class RustJson {
  private static module: any = null;

  static async init() {
    if (!this.module) {
      this.module = await loadRustModule();
    }
  }

  static parse(input: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.jsonParse(input);
  }

  static stringify(value: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.jsonStringify(value);
  }

  static prettify(input: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.jsonPrettify(input);
  }

  static getPath(input: string, path: string): string {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.jsonGet(input, path);
  }

  static validate(input: string): boolean {
    if (!this.module) {
      throw new Error("Rust module not initialized");
    }
    return this.module.jsonValidate(input);
  }
}

/**
 * Rust Cache Operations
 */
export class RustCache {
  private static module: any = null;
  private static cache: any = null;

  static async init() {
    if (!this.module) {
      this.module = await loadRustModule();
      this.cache = new this.module.Cache();
    }
  }

  static set(key: string, value: string, ttlMs?: number): void {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    this.cache.set(key, value, ttlMs || null);
  }

  static get(key: string): string | null {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    return this.cache.get(key);
  }

  static delete(key: string): boolean {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    return this.cache.delete(key);
  }

  static has(key: string): boolean {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    return this.cache.has(key);
  }

  static size(): number {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    return this.cache.size();
  }

  static clear(): void {
    if (!this.cache) {
      throw new Error("Rust cache not initialized");
    }
    this.cache.clear();
  }
}

/**
 * Get Rust version info
 */
export async function getRustVersion(): Promise<string> {
  const module = await loadRustModule();
  return module.getRustVersion();
}

/**
 * Check SIMD support
 */
export async function hasSimdSupport(): Promise<boolean> {
  const module = await loadRustModule();
  return module.hasSimdSupport();
}
