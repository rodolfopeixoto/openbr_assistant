/**
 * PRD Manager Implementation
 * Manages Product Requirements Documents and user stories
 */

import type { PRDDocument, UserStory, PRDTemplate } from "./types.js";
import { createSubsystemLogger } from "../../logging/subsystem.js";

const log = createSubsystemLogger("ralph:prd");

// Default templates
const DEFAULT_TEMPLATES: PRDTemplate[] = [
  {
    id: "web-app",
    name: "Web Application",
    description: "Modern web application with frontend and backend",
    category: "web",
    content: `# Web Application PRD

## Overview
A modern web application built with best practices.

## Technical Stack
- Frontend: React/Vue/Svelte
- Backend: Node.js/Express
- Database: PostgreSQL/MongoDB
- Container: Docker

## User Stories
1. As a user, I want to sign up so I can use the application
2. As a user, I want to log in so I can access my account
3. As a user, I want to reset my password if I forget it
`,
    defaultStories: [
      {
        id: "auth-signup",
        title: "User Registration",
        description: "Allow users to create accounts",
        acceptanceCriteria: [
          "User can enter email and password",
          "Email validation is performed",
          "Password requirements are enforced",
          "Confirmation email is sent",
        ],
        priority: "high",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
      {
        id: "auth-login",
        title: "User Login",
        description: "Allow users to authenticate",
        acceptanceCriteria: [
          "User can enter credentials",
          "JWT token is issued on success",
          "Failed attempts are rate-limited",
          "Session is maintained",
        ],
        priority: "high",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
    ],
  },
  {
    id: "api-service",
    name: "API Service",
    description: "RESTful API service with documentation",
    category: "api",
    content: `# API Service PRD

## Overview
A RESTful API service with comprehensive documentation.

## Technical Stack
- Runtime: Node.js/Express or Python/FastAPI
- Documentation: OpenAPI/Swagger
- Authentication: JWT
- Rate Limiting: Redis

## Endpoints
- GET /health - Health check
- POST /auth/login - Authentication
- CRUD operations for main resources
`,
    defaultStories: [
      {
        id: "api-health",
        title: "Health Check Endpoint",
        description: "Simple health check endpoint",
        acceptanceCriteria: [
          "Returns 200 OK when healthy",
          "Returns service version",
          "Checks database connectivity",
        ],
        priority: "high",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
      {
        id: "api-docs",
        title: "API Documentation",
        description: "Auto-generated API documentation",
        acceptanceCriteria: [
          "OpenAPI spec is generated",
          "Swagger UI is available",
          "All endpoints are documented",
        ],
        priority: "medium",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
    ],
  },
  {
    id: "cli-tool",
    name: "CLI Tool",
    description: "Command-line interface tool",
    category: "cli",
    content: `# CLI Tool PRD

## Overview
A powerful command-line tool for developers.

## Technical Stack
- Language: TypeScript/Node.js
- Framework: Commander.js
- Testing: Vitest
- Packaging: pkg

## Commands
- init - Initialize project
- build - Build the project
- test - Run tests
- deploy - Deploy to production
`,
    defaultStories: [
      {
        id: "cli-init",
        title: "Initialize Command",
        description: "Initialize a new project",
        acceptanceCriteria: [
          "Creates project structure",
          "Generates configuration files",
          "Installs dependencies",
        ],
        priority: "high",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
      {
        id: "cli-help",
        title: "Help System",
        description: "Comprehensive help documentation",
        acceptanceCriteria: [
          "Global --help flag works",
          "Command-specific help works",
          "Examples are provided",
        ],
        priority: "medium",
        passes: false,
        attempts: 0,
        maxAttempts: 3,
      },
    ],
  },
];

export class PRDManager {
  private templates: Map<string, PRDTemplate>;

  constructor() {
    this.templates = new Map();

    // Load default templates
    for (const template of DEFAULT_TEMPLATES) {
      this.templates.set(template.id, template);
    }
  }

  /**
   * Get all available templates
   */
  getTemplates(): PRDTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): PRDTemplate[] {
    return this.getTemplates().filter((t) => t.category === category);
  }

  /**
   * Get a specific template
   */
  getTemplate(id: string): PRDTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: PRDTemplate): void {
    this.templates.set(template.id, template);
    log.info(`Registered template: ${template.id}`);
  }

  /**
   * Create a PRD from a template
   */
  createFromTemplate(templateId: string, overrides: Partial<PRDDocument> = {}): PRDDocument {
    const template = this.templates.get(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const now = new Date();
    const id = `prd-${now.getTime()}`;

    return {
      id,
      title: overrides.title || template.name,
      description: overrides.description || template.description,
      version: "1.0.0",
      branchName: this.generateBranchName(overrides.title || template.name),
      userStories: template.defaultStories.map((story) => ({
        ...story,
        id: `${id}-${story.id}`,
      })),
      technicalRequirements: overrides.technicalRequirements || [],
      dependencies: overrides.dependencies || [],
    };
  }

  /**
   * Create a custom PRD from scratch
   */
  createCustomPRD(params: {
    title: string;
    description: string;
    userStories: UserStory[];
    technicalRequirements?: string[];
    dependencies?: string[];
  }): PRDDocument {
    const now = new Date();
    const id = `prd-${now.getTime()}`;

    return {
      id,
      title: params.title,
      description: params.description,
      version: "1.0.0",
      branchName: this.generateBranchName(params.title),
      userStories: params.userStories.map((story, index) => ({
        ...story,
        id: `${id}-story-${index}`,
      })),
      technicalRequirements: params.technicalRequirements || [],
      dependencies: params.dependencies || [],
    };
  }

  /**
   * Parse a PRD from markdown content
   */
  parseFromMarkdown(content: string): Partial<PRDDocument> {
    const prd: Partial<PRDDocument> = {};

    // Extract title
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      prd.title = titleMatch[1];
    }

    // Extract description (first paragraph after overview)
    const overviewMatch = content.match(/##\s+Overview\s*\n\n(.+?)(?=\n##|$)/s);
    if (overviewMatch) {
      prd.description = overviewMatch[1].trim();
    }

    // Extract user stories
    const storiesMatch = content.match(/##\s+User Stories\s*\n\n(.+?)(?=\n##|$)/s);
    if (storiesMatch) {
      prd.userStories = this.parseUserStories(storiesMatch[1]);
    }

    // Extract technical requirements
    const techReqMatch = content.match(/##\s+Technical Requirements?\s*\n\n(.+?)(?=\n##|$)/s);
    if (techReqMatch) {
      prd.technicalRequirements = techReqMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim());
    }

    // Extract dependencies
    const depsMatch = content.match(/##\s+Dependencies?\s*\n\n(.+?)(?=\n##|$)/s);
    if (depsMatch) {
      prd.dependencies = depsMatch[1]
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.replace(/^-\s*/, "").trim());
    }

    return prd;
  }

  /**
   * Export PRD to markdown
   */
  exportToMarkdown(prd: PRDDocument): string {
    let markdown = `# ${prd.title}\n\n`;
    markdown += `## Overview\n\n${prd.description}\n\n`;

    if (prd.technicalRequirements?.length) {
      markdown += `## Technical Requirements\n\n`;
      for (const req of prd.technicalRequirements) {
        markdown += `- ${req}\n`;
      }
      markdown += "\n";
    }

    if (prd.dependencies?.length) {
      markdown += `## Dependencies\n\n`;
      for (const dep of prd.dependencies) {
        markdown += `- ${dep}\n`;
      }
      markdown += "\n";
    }

    markdown += `## User Stories\n\n`;
    for (const story of prd.userStories) {
      markdown += `### ${story.title}\n\n`;
      markdown += `${story.description}\n\n`;
      markdown += `**Priority:** ${story.priority}\n\n`;
      markdown += `**Acceptance Criteria:**\n`;
      for (const criteria of story.acceptanceCriteria) {
        markdown += `- [ ] ${criteria}\n`;
      }
      markdown += "\n";
    }

    return markdown;
  }

  /**
   * Validate a PRD
   */
  validatePRD(prd: PRDDocument): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!prd.title?.trim()) {
      errors.push("Title is required");
    }

    if (!prd.description?.trim()) {
      errors.push("Description is required");
    }

    if (!prd.userStories?.length) {
      errors.push("At least one user story is required");
    } else {
      for (const story of prd.userStories) {
        if (!story.title?.trim()) {
          errors.push("User story title is required");
        }
        if (!story.description?.trim()) {
          errors.push("User story description is required");
        }
        if (!story.acceptanceCriteria?.length) {
          errors.push("User story must have acceptance criteria");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Update a user story status
   */
  updateStoryStatus(prd: PRDDocument, storyId: string, updates: Partial<UserStory>): PRDDocument {
    const storyIndex = prd.userStories.findIndex((s) => s.id === storyId);

    if (storyIndex === -1) {
      throw new Error(`Story not found: ${storyId}`);
    }

    const updatedStories = [...prd.userStories];
    updatedStories[storyIndex] = {
      ...updatedStories[storyIndex],
      ...updates,
    };

    return {
      ...prd,
      userStories: updatedStories,
    };
  }

  /**
   * Get PRD progress summary
   */
  getProgress(prd: PRDDocument): {
    total: number;
    passed: number;
    failed: number;
    pending: number;
  } {
    const total = prd.userStories.length;
    const passed = prd.userStories.filter((s) => s.passes).length;
    const failed = prd.userStories.filter((s) => s.attempts >= s.maxAttempts && !s.passes).length;
    const pending = total - passed - failed;

    return { total, passed, failed, pending };
  }

  private parseUserStories(content: string): UserStory[] {
    const stories: UserStory[] = [];
    const lines = content.split("\n");

    for (const line of lines) {
      const match = line.match(/^\d+\.\s+(.+)$/);
      if (match) {
        stories.push({
          id: `story-${stories.length}`,
          title: match[1].substring(0, 50),
          description: match[1],
          acceptanceCriteria: [],
          priority: "medium",
          passes: false,
          attempts: 0,
          maxAttempts: 3,
        });
      }
    }

    return stories;
  }

  generateBranchName(title: string): string {
    // Convert title to kebab-case
    const kebab = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .substring(0, 30);

    const timestamp = Date.now().toString(36);
    return `ralph/${kebab}-${timestamp}`;
  }
}
