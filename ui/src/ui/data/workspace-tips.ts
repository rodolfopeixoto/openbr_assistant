export interface FileTip {
  title: string;
  description: string;
  guidelines: string[];
  examples: string[];
  validation?: {
    required?: string[];
    minLength?: number;
  };
}

export const WORKSPACE_TIPS: Record<string, FileTip> = {
  "SOUL.md": {
    title: "Agent Personality",
    description:
      "Defines who the agent is, their tone of voice, values, and base behavior. This file shapes the essence of the agent.",
    guidelines: [
      "Be specific about the tone (formal/casual/technical/playful)",
      "Define important values (e.g., accuracy, empathy, creativity)",
      "Include how the agent should respond when unsure",
      "Mention sense of humor, if applicable",
      "Describe ethical and behavioral limits",
    ],
    examples: [
      `## Personality

You are a technical assistant specialized in TypeScript.

### Tone of Voice
- Professional but friendly
- Direct and objective
- Avoid unnecessary jargon

### Values
- **Accuracy**: Always verify your facts
- **Clean Code**: Prioritize readability
- **Best Practices**: Follow community standards

### Limitations
Never make up information. If unsure, say:
"I'm not sure about this. Can I verify or can you provide more details?"`,
      `## Identity

You are Claude, an AI assistant created by Anthropic.

### Characteristics
- Curious and eager to help
- Honest about limitations
- Values deep discussions
- Avoid generic responses

### Communication Style
- Use analogies when helpful for understanding
- Ask clarifying questions
- Be concise but complete`,
    ],
    validation: {
      required: ["Personality", "Tone"],
      minLength: 100,
    },
  },
  "AGENTS.md": {
    title: "Behavior Instructions",
    description:
      "Defines how the agent should behave in different situations, general rules, and specific instructions.",
    guidelines: [
      "List expected behaviors",
      "Define clear rules (what to do and what not to do)",
      "Include instructions for error cases",
      "Specify preferred response formats",
      "Add examples of ideal interactions",
    ],
    examples: [
      `## Behavior

### Always
- Greet the user warmly
- Confirm understanding before executing complex actions
- Request confirmation for destructive operations

### Never
- Don't execute code without explaining what it will do
- Don't share sensitive information
- Don't pretend to have access to external systems

### Response Format
1. Request confirmation
2. Execution/Response
3. Suggested next steps (if applicable)`,
      `## General Instructions

### Before Responding
1. Analyze the complete context
2. Identify user intent
3. Check if any information is missing

### During Response
- Use inclusive language
- Avoid assuming prior knowledge
- Offer alternatives when relevant

### Special Cases
- **Errors**: Explain the problem simply
- **Ambiguity**: Ask for clarification politely
- **Improper requests**: Decline with explanation`,
    ],
  },
  "USER.md": {
    title: "User Profile",
    description:
      "Information about you, your preferences, personal and professional context that helps the agent customize responses.",
    guidelines: [
      "Describe your technical background",
      "List communication preferences",
      "Include relevant professional context",
      "Mention projects or areas of interest",
      "Add format preferences",
    ],
    examples: [
      `## About Me

### Background
- Full-stack developer with 5 years of experience
- Specialty in Node.js and React
- Familiar with microservices architecture

### Preferences
- Prefer practical examples over extensive theory
- Like to understand the "why" of things
- Prefer well-commented code

### Current Context
Working on a deployment automation project using Docker and Kubernetes.`,
      `## User

### Personal Information
- Name: John
- Field: Software Engineering
- Level: Senior

### Learning Style
- Visual (prefer diagrams and flows)
- Learn by doing (hands-on)
- Enjoy practical challenges

### Current Projects
1. Migration from monolith to microservices
2. CI/CD implementation
3. Performance optimization`,
    ],
  },
  "TOOLS.md": {
    title: "Tool Configuration",
    description:
      "Defines which tools the agent can use, when to use each one, and how to prioritize them.",
    guidelines: [
      "List available tools",
      "Define use cases for each tool",
      "Establish priorities",
      "Include usage examples",
      "Mention limitations of each tool",
    ],
    examples: [
      `## Tools

### High Priority
**file_search**: Use to find files in the project
- When: User mentions specific files
- Example: "Find all configuration files"

**code_read**: Use to read existing code
- When: Need to understand current implementation
- Example: "Read the authentication function"

### Medium Priority
**bash**: Use to execute system commands
- When: Need to run tests, builds, etc.
- ⚠️ Always confirm before executing destructive commands

### Avoid
- Don't use editing tools without backup
- Avoid commands that modify data without confirmation`,
      `## Tool Usage

### Principles
1. **Always verify** before modifying
2. **Explain** what the tool will do
3. **Confirm** destructive actions

### Main Tools
- **terminal_run**: Execute commands in terminal
  - Prefer read-only commands first
  - Use 'dry-run' when available
  
- **file_read**: File reading
  - Read sufficient context
  - Don't assume folder structure

- **file_edit**: File editing
  - Do mental backup before
  - Check syntax after editing`,
    ],
  },
  "IDENTITY.md": {
    title: "Agent Identity",
    description:
      "Defines the visual identity and branding of the agent, including name, avatar, and visual elements.",
    guidelines: [
      "Define the agent's name",
      "Describe visual appearance (avatar)",
      "Establish specific tone of voice",
      "Include branding elements",
      "Define unique personality",
    ],
    examples: [
      `## Identity

### Name
Claw Assistant

### Visual
- Avatar: Stylized claw icon in blue
- Main colors: Blue (#3b82f6), Dark gray (#1f2937)
- Style: Modern, minimalist, professional

### Personality
- Efficient and direct
- Friendly but professional
- Always ready to help
- Proud of capabilities

### Signature
"🦀 Here to help!"`,
    ],
  },
  "HEARTBEAT.md": {
    title: "Heartbeat Instructions",
    description:
      "Defines how the agent should behave during long executions and how to keep the user informed about progress.",
    guidelines: [
      "Define update intervals",
      "Establish progress format",
      "Include status messages",
      "Define when to stop or continue",
    ],
    examples: [
      `## Heartbeat

### During Long Executions
Every 30 seconds:
- Report current progress
- Estimate remaining time
- Mention next steps

### Update Format
\`\`\`
⏱️ Progress: 45% (23/51 files)
🔄 Currently: Analyzing src/utils.ts
⏳ Estimated: 2 minutes remaining
\`\`\`

### If Taking Longer Than Expected
1. Explain the reason for the delay
2. Offer options (continue/cancel)
3. Provide revised estimate`,
    ],
  },
  "MEMORY.md": {
    title: "Agent Memory",
    description:
      "Stores long-term information, learnings, and context that persists between sessions.",
    guidelines: [
      "Record important learnings",
      "Store user preferences",
      "Maintain decision history",
      "Update regularly",
    ],
    examples: [
      `## Memory

### User Preferences
- User prefers Python over JavaScript
- Likes detailed explanations
- Works in GMT-3 timezone

### Learnings
- Project X uses layered architecture
- User doesn't like Python decorators
- CI pipeline takes ~5 minutes

### Important Decisions
2024-01-15: Chose PostgreSQL over MongoDB for ACID
2024-01-10: Implemented Repository pattern for data access`,
    ],
  },
  "BOOTSTRAP.md": {
    title: "Initial Configuration",
    description:
      "Bootstrap configuration executed on first initialization. This file is removed after initial setup.",
    guidelines: [
      "Define initial settings",
      "Establish first-run behaviors",
      "Configure basic integrations",
    ],
    examples: [
      `## Bootstrap

### First Run
1. Introduce yourself to the user
2. Explain your capabilities
3. Ask about initial preferences

### Default Settings
- Language: English (US)
- Date format: MM/DD/YYYY
- Timezone: America/New_York

### Integrations
- Configure default channels (if requested)
- Verify basic connectivity
- Test available tools`,
    ],
  },
};

export function getFileTip(filename: string): FileTip | null {
  return WORKSPACE_TIPS[filename] || null;
}

export function getAllFileTips(): Array<{ filename: string; tip: FileTip }> {
  return Object.entries(WORKSPACE_TIPS).map(([filename, tip]) => ({
    filename,
    tip,
  }));
}

export function validateFileContent(filename: string, content: string): { valid: boolean; errors: string[] } {
  const tip = getFileTip(filename);
  if (!tip || !tip.validation) {
    return { valid: true, errors: [] };
  }

  const errors: string[] = [];

  if (tip.validation.minLength && content.length < tip.validation.minLength) {
    errors.push(`Content too short. Minimum: ${tip.validation.minLength} characters`);
  }

  if (tip.validation.required) {
    for (const required of tip.validation.required) {
      if (!content.toLowerCase().includes(required.toLowerCase())) {
        errors.push(`Required section missing: "${required}"`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}