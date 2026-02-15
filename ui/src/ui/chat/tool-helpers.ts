/**
 * Helper functions for tool card rendering.
 */

import { PREVIEW_MAX_CHARS, PREVIEW_MAX_LINES } from "./constants";

/**
 * Extract a human-readable error message from tool output.
 * Handles both plain text and JSON-formatted errors.
 */
export function extractErrorMessage(text: string): string | null {
  const trimmed = text.trim();

  // Try to parse as JSON error
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      // Check for various error message fields
      if (parsed.error && typeof parsed.error === "string") {
        return parsed.error;
      }
      if (parsed.message && typeof parsed.message === "string") {
        return parsed.message;
      }
      // If it's an error status but no message, return generic error
      if (parsed.status === "error") {
        return parsed.error || "An error occurred while executing the tool";
      }
    } catch {
      // Not valid JSON, continue with plain text
    }
  }

  // Check for plain text error patterns
  const errorPatterns = [
    /^Error:\s*(.+)/i,
    /^error:\s*(.+)/i,
    /^(?:command exited|exit|exited)(?:\s+with)?\s+(?:code|status)?\s*\d+[;:.,]?\s*(.+)?/i,
  ];

  for (const pattern of errorPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] || text;
    }
  }

  // Check if it looks like a shell error
  if (trimmed.includes("no matches found") || trimmed.includes("command not found") || trimmed.includes("No such file")) {
    return trimmed;
  }

  return null;
}

/**
 * Format tool output content for display in the sidebar.
 * Detects JSON and formats errors cleanly, wrapping code in markdown code blocks.
 */
export function formatToolOutputForSidebar(text: string): string {
  const trimmed = text.trim();

  // Check if it's an error first
  const errorMessage = extractErrorMessage(text);
  if (errorMessage && trimmed.startsWith("{")) {
    // It's a JSON error - show clean error message
    return `**Error:** ${errorMessage}`;
  }

  // Try to detect and format JSON (non-errors)
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      // Check if it's an error response
      if (parsed.status === "error" && parsed.error) {
        return `**Error:** ${parsed.error}`;
      }
      // Regular JSON - format nicely
      return "```json\n" + JSON.stringify(parsed, null, 2) + "\n```";
    } catch {
      // Not valid JSON, return as-is
    }
  }

  return text;
}

/**
 * Get a truncated preview of tool output text.
 * Truncates to first N lines or first N characters, whichever is shorter.
 */
export function getTruncatedPreview(text: string): string {
  const allLines = text.split("\n");
  const lines = allLines.slice(0, PREVIEW_MAX_LINES);
  const preview = lines.join("\n");
  if (preview.length > PREVIEW_MAX_CHARS) {
    return preview.slice(0, PREVIEW_MAX_CHARS) + "…";
  }
  return lines.length < allLines.length ? preview + "…" : preview;
}
