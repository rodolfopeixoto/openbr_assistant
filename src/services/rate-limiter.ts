/**
 * Rate Limiter Service
 * Controls API call rates with per-tool configuration and 429 error handling
 */

export interface RateLimitToolConfig {
  minDelay: number; // ms entre calls
  maxBatchSize: number; // Máximo antes de cooldown
  cooldownDuration: number; // ms de cooldown
  batchSimilarWork: boolean; // Agrupar requests similares
}

export interface RateLimitConfig {
  global: {
    minTimeBetweenCalls: number; // ms (default: 5000)
  };
  perTool: Record<string, RateLimitToolConfig>;
  errorHandling: {
    on429: {
      waitTime: number; // ms (default: 300000 = 5min)
      retryAttempts: number; // (default: 3)
      exponentialBackoff: boolean;
    };
  };
}

export interface RateLimitStatus {
  enabled: boolean;
  currentThrottle: "none" | "light" | "heavy" | "blocked";
  recentHits: Array<{
    timestamp: number;
    tool: string;
    type: "throttle" | "429" | "cooldown";
    message: string;
  }>;
  queueSize: number;
  toolStatus: Record<
    string,
    {
      lastCall: number;
      callsInWindow: number;
      inCooldown: boolean;
      cooldownEnd: number | null;
    }
  >;
}

export interface QueuedRequest {
  id: string;
  tool: string;
  timestamp: number;
  resolve: (value: boolean) => void;
  reject: (reason: Error) => void;
}

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  global: {
    minTimeBetweenCalls: 5000,
  },
  perTool: {
    web_search: {
      minDelay: 10000,
      maxBatchSize: 5,
      cooldownDuration: 120000,
      batchSimilarWork: true,
    },
    browser: {
      minDelay: 5000,
      maxBatchSize: 10,
      cooldownDuration: 60000,
      batchSimilarWork: false,
    },
    memory_search: {
      minDelay: 0,
      maxBatchSize: 100,
      cooldownDuration: 0,
      batchSimilarWork: true,
    },
  },
  errorHandling: {
    on429: {
      waitTime: 300000, // 5 minutes
      retryAttempts: 3,
      exponentialBackoff: true,
    },
  },
};

export class RateLimiter {
  private config: RateLimitConfig = { ...DEFAULT_CONFIG };
  private lastCallTime: number = 0;
  private toolCalls: Map<
    string,
    {
      lastCall: number;
      calls: number[];
      inCooldown: boolean;
      cooldownEnd: number;
    }
  > = new Map();
  private recentHits: RateLimitStatus["recentHits"] = [];
  private queue: QueuedRequest[] = [];
  private enabled: boolean = true;
  private blockedUntil: number = 0;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    // Load from persistent storage if available
    try {
      const stored = process.env.RATE_LIMIT_CONFIG;
      if (stored) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Use defaults
    }
  }

  private saveConfig(): void {
    // Save to persistent storage
    try {
      process.env.RATE_LIMIT_CONFIG = JSON.stringify(this.config);
    } catch {
      // Ignore save errors
    }
  }

  /**
   * Check if a call is allowed and wait if necessary
   */
  async checkAndWait(tool: string): Promise<boolean> {
    if (!this.enabled) {
      return true;
    }

    const now = Date.now();

    // Check if globally blocked (429 handling)
    if (now < this.blockedUntil) {
      const waitTime = this.blockedUntil - now;
      this.addHit(
        tool,
        "429",
        `Blocked for ${Math.round(waitTime / 1000)}s due to rate limit error`,
      );
      throw new Error(`Rate limited: blocked for ${Math.round(waitTime / 1000)} seconds`);
    }

    // Get tool config
    const toolConfig = this.config.perTool[tool] || {
      minDelay: this.config.global.minTimeBetweenCalls,
      maxBatchSize: 10,
      cooldownDuration: 60000,
      batchSimilarWork: false,
    };

    // Get or initialize tool tracking
    let toolStatus = this.toolCalls.get(tool);
    if (!toolStatus) {
      toolStatus = {
        lastCall: 0,
        calls: [],
        inCooldown: false,
        cooldownEnd: 0,
      };
      this.toolCalls.set(tool, toolStatus);
    }

    // Check if tool is in cooldown
    if (toolStatus.inCooldown && now < toolStatus.cooldownEnd) {
      const waitTime = toolStatus.cooldownEnd - now;
      this.addHit(tool, "cooldown", `Cooldown: ${Math.round(waitTime / 1000)}s remaining`);
      throw new Error(
        `Rate limited: ${tool} in cooldown for ${Math.round(waitTime / 1000)} seconds`,
      );
    }

    // Clear expired cooldown
    if (toolStatus.inCooldown && now >= toolStatus.cooldownEnd) {
      toolStatus.inCooldown = false;
      toolStatus.calls = [];
    }

    // Clean old calls (older than window)
    const windowStart = now - toolConfig.cooldownDuration;
    toolStatus.calls = toolStatus.calls.filter((t) => t > windowStart);

    // Check if we need to enter cooldown
    if (toolStatus.calls.length >= toolConfig.maxBatchSize) {
      toolStatus.inCooldown = true;
      toolStatus.cooldownEnd = now + toolConfig.cooldownDuration;
      const waitTime = toolStatus.cooldownEnd - now;
      this.addHit(tool, "cooldown", `Entering cooldown: ${Math.round(waitTime / 1000)}s`);
      throw new Error(
        `Rate limited: ${tool} entering cooldown for ${Math.round(waitTime / 1000)} seconds`,
      );
    }

    // Calculate wait time
    const globalDelay = Math.max(
      0,
      this.config.global.minTimeBetweenCalls - (now - this.lastCallTime),
    );
    const toolDelay = Math.max(0, toolConfig.minDelay - (now - toolStatus.lastCall));
    const waitTime = Math.max(globalDelay, toolDelay);

    if (waitTime > 0) {
      this.addHit(tool, "throttle", `Throttled: waiting ${Math.round(waitTime)}ms`);
      await this.delay(waitTime);
    }

    // Record the call
    toolStatus.calls.push(Date.now());
    toolStatus.lastCall = Date.now();
    this.lastCallTime = Date.now();

    return true;
  }

  /**
   * Handle 429 error - block all calls for specified time
   */
  handle429Error(): void {
    const now = Date.now();
    this.blockedUntil = now + this.config.errorHandling.on429.waitTime;
    this.addHit("global", "429", `Blocked for 5 minutes due to rate limit error`);
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      perTool: {
        ...this.config.perTool,
        ...config.perTool,
      },
      errorHandling: {
        ...this.config.errorHandling,
        ...config.errorHandling,
        on429: {
          ...this.config.errorHandling.on429,
          ...config.errorHandling?.on429,
        },
      },
    };
    this.saveConfig();
  }

  /**
   * Get current status
   */
  getStatus(): RateLimitStatus {
    const now = Date.now();
    const toolStatus: RateLimitStatus["toolStatus"] = {};

    for (const [tool, status] of this.toolCalls.entries()) {
      const config = this.config.perTool[tool];
      if (!config) {
        continue;
      }

      const windowStart = now - config.cooldownDuration;
      const callsInWindow = status.calls.filter((t) => t > windowStart).length;

      toolStatus[tool] = {
        lastCall: status.lastCall,
        callsInWindow,
        inCooldown: status.inCooldown && now < status.cooldownEnd,
        cooldownEnd: status.cooldownEnd,
      };
    }

    // Determine throttle level
    let currentThrottle: RateLimitStatus["currentThrottle"] = "none";
    if (now < this.blockedUntil) {
      currentThrottle = "blocked";
    } else if (this.recentHits.some((h) => h.type === "cooldown" && now - h.timestamp < 60000)) {
      currentThrottle = "heavy";
    } else if (this.recentHits.some((h) => h.type === "throttle" && now - h.timestamp < 60000)) {
      currentThrottle = "light";
    }

    return {
      enabled: this.enabled,
      currentThrottle,
      recentHits: this.recentHits.slice(-20), // Last 20 hits
      queueSize: this.queue.length,
      toolStatus,
    };
  }

  /**
   * Enable/disable rate limiting
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Reset all tracking data
   */
  reset(): void {
    this.lastCallTime = 0;
    this.toolCalls.clear();
    this.recentHits = [];
    this.queue = [];
    this.blockedUntil = 0;
  }

  private addHit(
    tool: string,
    type: RateLimitStatus["recentHits"][0]["type"],
    message: string,
  ): void {
    this.recentHits.push({
      timestamp: Date.now(),
      tool,
      type,
      message,
    });

    // Keep only last 100 hits
    if (this.recentHits.length > 100) {
      this.recentHits = this.recentHits.slice(-100);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

export function getRateLimiter(): RateLimiter {
  if (!rateLimiter) {
    rateLimiter = new RateLimiter();
  }
  return rateLimiter;
}
