import { describe, it, expect, beforeEach, vi } from "vitest";
import { PromptCache } from "../cache/prompt-cache.js";
import { ContextPruner } from "../pruning/context-pruner.js";
import { ModelRouter } from "../routing/model-router.js";
import { TokenOptimizer } from "../token-optimizer.js";

describe("Token Optimization System", () => {
  describe("PromptCache", () => {
    let cache: PromptCache;

    beforeEach(() => {
      cache = new PromptCache({ maxSize: 100, ttlMs: 3600000 }); // 1 hour TTL
    });

    it("should cache and retrieve prompts", () => {
      const prompt = "System: You are a helpful assistant";
      const response = "Cached response";

      cache.set(prompt, response);
      const cached = cache.get(prompt);

      expect(cached).toBe(response);
    });

    it("should return null for non-cached prompts", () => {
      const cached = cache.get("Non-existent prompt");
      expect(cached).toBeNull();
    });

    it("should respect TTL and expire old entries", async () => {
      const shortCache = new PromptCache({ maxSize: 100, ttlMs: 100 }); // 100ms TTL
      const prompt = "Test prompt";
      const response = "Test response";

      shortCache.set(prompt, response);
      expect(shortCache.get(prompt)).toBe(response);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(shortCache.get(prompt)).toBeNull();
    });

    it("should respect max size and evict old entries", () => {
      const smallCache = new PromptCache({ maxSize: 3, ttlMs: 3600000 });

      smallCache.set("prompt1", "response1");
      smallCache.set("prompt2", "response2");
      smallCache.set("prompt3", "response3");
      smallCache.set("prompt4", "response4"); // Should evict prompt1

      expect(smallCache.get("prompt1")).toBeNull();
      expect(smallCache.get("prompt4")).toBe("response4");
    });

    it("should track cache statistics", () => {
      cache.set("prompt1", "response1");
      cache.get("prompt1"); // Hit
      cache.get("prompt2"); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(0.5);
    });

    it("should clear all entries", () => {
      cache.set("prompt1", "response1");
      cache.set("prompt2", "response2");

      cache.clear();

      expect(cache.get("prompt1")).toBeNull();
      expect(cache.get("prompt2")).toBeNull();
      expect(cache.getStats().size).toBe(0);
    });
  });

  describe("ContextPruner", () => {
    let pruner: ContextPruner;

    beforeEach(() => {
      pruner = new ContextPruner({ maxMessages: 10, keepSystemMessages: true });
    });

    it("should keep messages under limit", () => {
      const messages = Array(5)
        .fill(null)
        .map((_, i) => ({
          role: "user" as const,
          content: `Message ${i}`,
        }));

      const pruned = pruner.prune(messages);

      expect(pruned).toHaveLength(5);
    });

    it("should prune messages over limit", () => {
      const messages = Array(15)
        .fill(null)
        .map((_, i) => ({
          role: "user" as const,
          content: `Message ${i}`,
        }));

      const pruned = pruner.prune(messages);

      expect(pruned).toHaveLength(10);
    });

    it("should always keep system messages", () => {
      const messages = [
        { role: "system" as const, content: "System prompt" },
        ...Array(15)
          .fill(null)
          .map((_, i) => ({
            role: "user" as const,
            content: `Message ${i}`,
          })),
      ];

      const pruned = pruner.prune(messages);

      expect(pruned.some((m) => m.role === "system")).toBe(true);
    });

    it("should calculate token count", () => {
      const messages = [
        { role: "system" as const, content: "System" },
        { role: "user" as const, content: "Hello" },
      ];

      const count = pruner.estimateTokens(messages);

      // Rough estimate: ~4 tokens per message + ~1 token per 4 chars
      expect(count).toBeGreaterThan(0);
    });

    it("should compress old context when pruning", () => {
      const messages = Array(20)
        .fill(null)
        .map((_, i) => ({
          role: i % 2 === 0 ? ("user" as const) : ("assistant" as const),
          content: `Message ${i}`,
        }));

      const pruned = pruner.prune(messages, { compress: true });

      // Should have summary message for old context
      expect(pruned.some((m) => m.content.includes("summary"))).toBe(true);
    });
  });

  describe("ModelRouter", () => {
    let router: ModelRouter;

    beforeEach(() => {
      router = new ModelRouter();
    });

    it("should route simple queries to smaller models", () => {
      const task = {
        type: "classify" as const,
        content: "Is this positive or negative?",
      };

      const model = router.selectModel(task);

      expect(model).toBe("gpt-4o-mini");
    });

    it("should route complex tasks to larger models", () => {
      const task = {
        type: "generate" as const,
        content: "Write a detailed technical analysis of...",
        complexity: "high" as const,
      };

      const model = router.selectModel(task);

      expect(model).toBe("gpt-4o");
    });

    it("should route code tasks to code-optimized models", () => {
      const task = {
        type: "code" as const,
        content: "Debug this Python function",
      };

      const model = router.selectModel(task);

      expect(model).toBe("gpt-4o");
    });

    it("should provide routing explanation", () => {
      const task = {
        type: "summarize" as const,
        content: "Summarize this article",
      };

      const result = router.getRoutingDecision(task);

      expect(result.model).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.estimatedTokens).toBeGreaterThan(0);
    });

    it("should fallback to safe model on error", () => {
      const task = {
        type: "unknown" as const,
        content: "Some content",
      };

      const model = router.selectModel(task);

      expect(model).toBeDefined(); // Should not throw
    });
  });

  describe("TokenOptimizer Integration", () => {
    let optimizer: TokenOptimizer;

    beforeEach(() => {
      optimizer = new TokenOptimizer();
    });

    it("should optimize prompt with caching", () => {
      const prompt = "System: You are helpful";

      // First call should cache
      const result1 = optimizer.optimizePrompt(prompt);
      expect(result1.cached).toBe(false);

      // Second call should hit cache
      const result2 = optimizer.optimizePrompt(prompt);
      expect(result2.cached).toBe(true);
    });

    it("should optimize context with pruning", () => {
      const messages = Array(20)
        .fill(null)
        .map((_, i) => ({
          role: "user" as const,
          content: `Message ${i}`,
        }));

      const optimized = optimizer.optimizeContext(messages, { maxMessages: 10 });

      expect(optimized.messages).toHaveLength(10);
      expect(optimized.tokensSaved).toBeGreaterThan(0);
    });

    it("should track total savings", () => {
      optimizer.optimizePrompt("Test prompt");
      optimizer.optimizeContext([{ role: "user", content: "Test" }]);

      const stats = optimizer.getStats();
      expect(stats.totalPrompts).toBeGreaterThan(0);
      expect(stats.totalTokensSaved).toBeGreaterThanOrEqual(0);
    });

    it("should provide optimization recommendations", () => {
      const recommendations = optimizer.getRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
    });
  });
});
