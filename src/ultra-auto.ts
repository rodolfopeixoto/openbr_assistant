#!/usr/bin/env node
/**
 * Ultra Performance Auto-Initializer
 * Carrega automaticamente o módulo Rust na inicialização do OpenClaw
 * Funciona tanto em desenvolvimento quanto em produção/Docker
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Estado do módulo
let rustModule: any = null;
let isInitialized = false;
let initError: Error | null = null;

// Configuração padrão
const config = {
  // Verifica se as otimizações estão habilitadas via env
  enabled: process.env.USE_ULTRA_PERFORMANCE !== "false",
  rustPath:
    process.env.ULTRA_RUST_PATH || join(__dirname, "../rust/target/release/libopenclaw_core.dylib"),
  fallbackOnError: true,
  logLevel: process.env.ULTRA_LOG_LEVEL || "info", // 'debug', 'info', 'warn', 'error', 'silent'
};

/**
 * Logger interno
 */
function log(level: string, message: string, data?: any) {
  const levels = ["debug", "info", "warn", "error"];
  const configLevelIndex = levels.indexOf(config.logLevel);
  const messageLevelIndex = levels.indexOf(level);

  if (messageLevelIndex >= configLevelIndex) {
    const prefix = `[Ultra:${level.toUpperCase()}]`;
    if (data) {
      console.log(prefix, message, data);
    } else {
      console.log(prefix, message);
    }
  }
}

/**
 * Tenta carregar o módulo Rust
 */
function tryLoadRustModule(): boolean {
  try {
    // Verifica se o arquivo existe
    if (!existsSync(config.rustPath)) {
      log("debug", "Rust module not found at:", config.rustPath);
      return false;
    }

    // Carrega o módulo
    const mod = { exports: {} };
    process.dlopen(mod, config.rustPath);
    rustModule = mod.exports;

    // Verifica se as funções essenciais existem
    if (!rustModule.blake3Hash || !rustModule.xxh3Hash) {
      log("warn", "Rust module loaded but missing essential functions");
      return false;
    }

    log("info", "✅ Ultra Performance module loaded successfully");
    log("debug", "Available exports:", Object.keys(rustModule));
    return true;
  } catch (error) {
    initError = error as Error;
    log("warn", "⚠️  Failed to load Rust module:", (error as Error).message);
    return false;
  }
}

/**
 * Inicializa o sistema de performance
 * Chamada automática na primeira vez que alguma função é usada
 */
export function initializeUltra(): boolean {
  if (isInitialized) {
    return rustModule !== null;
  }

  isInitialized = true;

  if (!config.enabled) {
    log("info", "Ultra Performance disabled via USE_ULTRA_PERFORMANCE=false");
    return false;
  }

  const loaded = tryLoadRustModule();

  if (!loaded && config.fallbackOnError) {
    log("info", "Using Node.js fallback implementations");
  }

  return loaded;
}

/**
 * Força inicialização (útil para warmup no startup)
 */
export function warmupUltra(): void {
  if (!isInitialized) {
    initializeUltra();
  }

  if (rustModule) {
    // Faz uma chamada de teste para aquecer o módulo
    try {
      const testData = Buffer.from("warmup");
      rustModule.xxh3Hash(testData);
      rustModule.blake3Hash(testData);
      log("debug", "Warmup completed");
    } catch (e) {
      log("debug", "Warmup failed (non-critical)");
    }
  }
}

/**
 * Hash Blake3 - Criptograficamente seguro, ultra-rápido
 */
export function blake3Hash(data: Buffer): Buffer {
  initializeUltra();

  if (rustModule?.blake3Hash) {
    return rustModule.blake3Hash(data);
  }

  // Fallback para SHA256 (compatibilidade)
  return createHash("sha256").update(data).digest();
}

/**
 * Hash XXH3 - Ultra-rápido para uso não-cryptográfico
 */
export function xxh3Hash(data: Buffer): bigint {
  initializeUltra();

  if (rustModule?.xxh3Hash) {
    return BigInt(rustModule.xxh3Hash(data));
  }

  // Fallback simples
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data[i];
    hash |= 0;
  }
  return BigInt.asUintN(64, BigInt(hash));
}

/**
 * Parse JSON com simd-json (se disponível)
 */
export function ultraParseJson(json: string): any {
  initializeUltra();

  if (rustModule?.parseJson) {
    try {
      const result = rustModule.parseJson(json);
      return JSON.parse(result);
    } catch {
      // Fallback se falhar
    }
  }

  return JSON.parse(json);
}

/**
 * Stringify JSON otimizado
 */
export function ultraStringifyJson(obj: any): string {
  initializeUltra();

  if (rustModule?.stringifyJson && typeof obj === "object") {
    try {
      const input = JSON.stringify(obj);
      return rustModule.stringifyJson(input);
    } catch {
      // Fallback se falhar
    }
  }

  return JSON.stringify(obj);
}

/**
 * Batch hash - Processa múltiplos hashes em paralelo
 */
export function batchHash(dataArray: Buffer[]): Buffer[] {
  initializeUltra();

  if (rustModule?.hashBatch) {
    return rustModule.hashBatch(dataArray);
  }

  // Fallback sequencial
  return dataArray.map((data) => blake3Hash(data));
}

/**
 * Cria um hasher Blake3 para streaming
 */
export function createBlake3Hasher(): any {
  initializeUltra();

  if (rustModule?.Blake3Hasher) {
    return new rustModule.Blake3Hasher();
  }

  // Fallback: acumula dados e faz hash no final
  const chunks: Buffer[] = [];
  return {
    update: (data: Buffer) => chunks.push(data),
    finalize: () => {
      const combined = Buffer.concat(chunks);
      return blake3Hash(combined);
    },
  };
}

/**
 * Cria cache com TTL
 */
export function createTimedCache(capacity: number, ttlSeconds: number): any {
  initializeUltra();

  if (rustModule?.TimedCache) {
    return new rustModule.TimedCache(capacity, ttlSeconds);
  }

  // Fallback JS
  const cache = new Map<string, { value: string; expires: number }>();
  return {
    get: (key: string) => {
      const entry = cache.get(key);
      if (entry && entry.expires > Date.now()) {
        return entry.value;
      }
      if (entry) cache.delete(key);
      return undefined;
    },
    set: (key: string, value: string) => {
      cache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
    },
    len: () => cache.size,
    clear: () => cache.clear(),
  };
}

/**
 * Cria cache de histórico de grupos
 */
export function createGroupHistoryCache(maxEntries: number): any {
  initializeUltra();

  if (rustModule?.GroupHistoryCache) {
    return new rustModule.GroupHistoryCache(maxEntries);
  }

  // Fallback JS
  const cache = new Map<string, Array<{ timestamp: number; content: string }>>();
  return {
    add: (groupId: string, entry: { timestamp: number; content: string }) => {
      let history = cache.get(groupId) || [];
      history.push(entry);
      if (history.length > maxEntries) {
        history = history.slice(-maxEntries);
      }
      cache.set(groupId, history);
    },
    get: (groupId: string) => cache.get(groupId) || [],
    clearGroup: (groupId: string) => cache.delete(groupId),
  };
}

/**
 * Verifica se o módulo Rust está carregado
 */
export function isUltraLoaded(): boolean {
  return rustModule !== null;
}

/**
 * Retorna informações do módulo
 */
export function getUltraInfo(): { loaded: boolean; version?: string; error?: string } {
  return {
    loaded: rustModule !== null,
    version: rustModule?.getCoreVersion?.(),
    error: initError?.message,
  };
}

// Auto-inicialização silenciosa no import
// Não bloqueia o startup, carrega lazy na primeira chamada
if (config.enabled) {
  log("debug", "Ultra Performance module ready (lazy load)");
}
