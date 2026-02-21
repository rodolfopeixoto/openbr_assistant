import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "lit";
import "./ThinkingIndicator";
import type { ThinkingIndicator, ThinkingStep, ThinkingLevel } from "./ThinkingIndicator";

describe("ThinkingIndicator", () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
    vi.clearAllTimers();
  });

  it("renders with default props", async () => {
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    container.appendChild(element);
    
    await element.updateComplete;
    
    expect(element.shadowRoot?.querySelector(".thinking-container")).toBeTruthy();
    expect(element.shadowRoot?.textContent).toContain("Thinking");
  });

  it("displays correct thinking level badge", async () => {
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.level = "high" as ThinkingLevel;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const badge = element.shadowRoot?.querySelector(".thinking-badge");
    expect(badge?.textContent).toContain("High");
  });

  it("cycles through thinking levels with correct colors", async () => {
    const levels: Array<{ level: ThinkingLevel; label: string; color: string }> = [
      { level: "minimal" as ThinkingLevel, label: "Min", color: "#9ca3af" },
      { level: "low" as ThinkingLevel, label: "Low", color: "#60a5fa" },
      { level: "medium" as ThinkingLevel, label: "Medium", color: "#c084fc" },
      { level: "high" as ThinkingLevel, label: "High", color: "#f472b6" },
    ];

    for (const { level, label, color } of levels) {
      const element = document.createElement("thinking-indicator") as ThinkingIndicator;
      element.level = level;
      container.appendChild(element);
      
      await element.updateComplete;
      
      const badge = element.shadowRoot?.querySelector(".thinking-badge");
      expect(badge?.textContent).toContain(label);
      expect((badge as HTMLElement)?.style.color).toBe(color);
      
      container.innerHTML = "";
    }
  });

  it("renders thinking steps correctly", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Analyzing request", timestamp: Date.now(), completed: true },
      { id: "2", text: "Processing context", timestamp: Date.now(), completed: false },
      { id: "3", text: "Generating response", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.currentStepIndex = 1;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const stepElements = element.shadowRoot?.querySelectorAll(".thinking-step");
    expect(stepElements?.length).toBe(3);
    expect(element.shadowRoot?.textContent).toContain("Analyzing request");
    expect(element.shadowRoot?.textContent).toContain("Processing context");
    expect(element.shadowRoot?.textContent).toContain("Generating response");
  });

  it("shows active step with animation", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now(), completed: true },
      { id: "2", text: "Step 2", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.currentStepIndex = 1;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const activeStep = element.shadowRoot?.querySelector(".thinking-step.active");
    expect(activeStep).toBeTruthy();
    expect(activeStep?.querySelector(".step-text")?.textContent).toBe("Step 2");
  });

  it("marks completed steps correctly", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now(), completed: true },
      { id: "2", text: "Step 2", timestamp: Date.now(), completed: true },
      { id: "3", text: "Step 3", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.currentStepIndex = 2;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const completedSteps = element.shadowRoot?.querySelectorAll(".thinking-step.completed");
    expect(completedSteps?.length).toBe(2);
  });

  it("updates progress bar based on current step", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now() },
      { id: "2", text: "Step 2", timestamp: Date.now() },
      { id: "3", text: "Step 3", timestamp: Date.now() },
      { id: "4", text: "Step 4", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.currentStepIndex = 2;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const progressBar = element.shadowRoot?.querySelector(".thinking-progress-bar") as HTMLElement;
    expect(progressBar?.style.width).toBe("50%");
  });

  it("shows 100% progress when complete", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now() },
      { id: "2", text: "Step 2", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.currentStepIndex = 1;
    element.isComplete = true;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const progressBar = element.shadowRoot?.querySelector(".thinking-progress-bar") as HTMLElement;
    expect(progressBar?.style.width).toBe("100%");
  });

  it("displays timer that updates during processing", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.startedAt = startTime;
    container.appendChild(element);
    
    await element.updateComplete;
    
    // Timer should show 0.0s initially
    expect(element.shadowRoot?.textContent).toContain("0.0s");
    
    // Advance time by 1.5 seconds
    vi.advanceTimersByTime(1500);
    await element.updateComplete;
    
    // Timer should show approximately 1.5s
    expect(element.shadowRoot?.textContent).toContain("1.5s");
    
    vi.useRealTimers();
  });

  it("stops timer when complete", async () => {
    vi.useFakeTimers();
    const startTime = Date.now();
    
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.startedAt = startTime;
    container.appendChild(element);
    
    await element.updateComplete;
    
    // Advance time
    vi.advanceTimersByTime(2000);
    await element.updateComplete;
    
    // Mark as complete
    element.isComplete = true;
    await element.updateComplete;
    
    // Advance time more
    vi.advanceTimersByTime(1000);
    await element.updateComplete;
    
    // Timer should still show 2.0s (when it was completed)
    expect(element.shadowRoot?.textContent).toContain("Completed in 2.0s");
    
    vi.useRealTimers();
  });

  it("shows summary after completion", async () => {
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.isComplete = true;
    element.summary = "Analysis complete: Found 3 relevant documents";
    container.appendChild(element);
    
    await element.updateComplete;
    
    const summary = element.shadowRoot?.querySelector(".thinking-summary");
    expect(summary).toBeTruthy();
    expect(summary?.textContent).toContain("Analysis complete: Found 3 relevant documents");
  });

  it("shows completion message without summary", async () => {
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.isComplete = true;
    container.appendChild(element);
    
    await element.updateComplete;
    
    expect(element.shadowRoot?.textContent).toContain("Thinking complete");
  });

  it("renders in compact mode", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.compact = true;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const thinkingContainer = element.shadowRoot?.querySelector(".thinking-container");
    expect(thinkingContainer?.classList.contains("compact")).toBe(true);
  });

  it("hides steps in compact mode", async () => {
    const steps: ThinkingStep[] = [
      { id: "1", text: "Step 1", timestamp: Date.now() },
    ];

    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.steps = steps;
    element.compact = true;
    container.appendChild(element);
    
    await element.updateComplete;
    
    const stepsContainer = element.shadowRoot?.querySelector(".thinking-steps");
    expect(stepsContainer).toBeFalsy();
  });

  it("updates when level changes", async () => {
    const element = document.createElement("thinking-indicator") as ThinkingIndicator;
    element.level = "low" as ThinkingLevel;
    container.appendChild(element);
    
    await element.updateComplete;
    
    let badge = element.shadowRoot?.querySelector(".thinking-badge");
    expect(badge?.textContent).toContain("Low");
    
    // Change level
    element.level = "high" as ThinkingLevel;
    await element.updateComplete;
    
    badge = element.shadowRoot?.querySelector(".thinking-badge");
    expect(badge?.textContent).toContain("High");
  });

  it("formats duration correctly for different time ranges", async () => {
    const testCases = [
      { ms: 500, expected: "0.5s" },
      { ms: 1500, expected: "1.5s" },
      { ms: 60000, expected: "1:00.0" },
      { ms: 90500, expected: "1:30.5" },
    ];

    for (const { ms, expected } of testCases) {
      const element = document.createElement("thinking-indicator") as ThinkingIndicator;
      element.startedAt = Date.now() - ms;
      element.isComplete = true;
      container.appendChild(element);
      
      await element.updateComplete;
      
      expect(element.shadowRoot?.textContent).toContain(`Completed in ${expected}`);
      container.innerHTML = "";
    }
  });
});
