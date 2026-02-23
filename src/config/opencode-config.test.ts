import { describe, expect, it } from "vitest";
import { OpenClawSchema } from "./zod-schema.js";

describe("OpenCode config validation", () => {
  it("validates minimal opencode configuration", () => {
    const config = {
      opencode: {
        enabled: true,
        container: {
          runtime: "docker",
          image: "opencode:latest",
          resources: {
            memory: 2048,
            cpus: 2,
            timeout: 1800,
          },
          network: {
            enabled: false,
          },
          security: {
            readOnly: true,
            dropCapabilities: true,
            seccompProfile: "strict",
          },
        },
        workspace: {
          basePath: "/tmp/opencode",
          allowedProjects: {
            mode: "all",
            whitelist: [],
          },
          protectedPatterns: ["*.key", "*.secret"],
        },
        security: {
          approvalMode: "on-miss",
          autoApproveSafe: true,
          commands: {
            allowlist: {
              enabled: false,
              commands: [],
            },
            blocklist: {
              enabled: true,
              commands: ["rm -rf /", "sudo"],
            },
          },
          paths: {
            whitelist: [],
            blacklist: ["/etc", "/root"],
          },
        },
        notifications: {
          desktop: true,
          mobile: false,
          email: false,
        },
        audit: {
          enabled: true,
          retentionDays: 30,
          logLevel: "info",
        },
      },
    };

    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates opencode with podman runtime", () => {
    const config = {
      opencode: {
        enabled: true,
        container: {
          runtime: "podman",
          image: "opencode:latest",
          resources: {
            memory: 4096,
            cpus: 4,
            timeout: 3600,
          },
          network: {
            enabled: true,
            ports: [8080, 3000],
          },
          security: {
            readOnly: false,
            dropCapabilities: true,
            seccompProfile: "default",
          },
        },
        workspace: {
          basePath: "/home/user/opencode",
          allowedProjects: {
            mode: "whitelist",
            whitelist: ["my-project", "another-project"],
          },
          protectedPatterns: [],
        },
        security: {
          approvalMode: "always",
          autoApproveSafe: false,
          commands: {
            allowlist: {
              enabled: true,
              commands: ["git", "npm", "node"],
            },
            blocklist: {
              enabled: true,
              commands: [],
            },
          },
          paths: {
            whitelist: ["/home/user/projects"],
            blacklist: [],
          },
        },
        notifications: {
          desktop: true,
          mobile: true,
          email: true,
        },
        audit: {
          enabled: true,
          retentionDays: 90,
          logLevel: "debug",
        },
      },
    };

    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("rejects invalid runtime type", () => {
    const config = {
      opencode: {
        enabled: true,
        container: {
          runtime: "invalid-runtime",
          image: "opencode:latest",
          resources: {
            memory: 2048,
            cpus: 2,
            timeout: 1800,
          },
          network: {
            enabled: false,
          },
          security: {
            readOnly: true,
            dropCapabilities: true,
            seccompProfile: "strict",
          },
        },
        workspace: {
          basePath: "/tmp/opencode",
          allowedProjects: {
            mode: "all",
            whitelist: [],
          },
          protectedPatterns: [],
        },
        security: {
          approvalMode: "on-miss",
          autoApproveSafe: true,
          commands: {
            allowlist: {
              enabled: false,
              commands: [],
            },
            blocklist: {
              enabled: false,
              commands: [],
            },
          },
          paths: {
            whitelist: [],
            blacklist: [],
          },
        },
        notifications: {
          desktop: true,
          mobile: false,
          email: false,
        },
        audit: {
          enabled: true,
          retentionDays: 30,
          logLevel: "info",
        },
      },
    };

    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects invalid approval mode", () => {
    const config = {
      opencode: {
        enabled: true,
        container: {
          runtime: "docker",
          image: "opencode:latest",
          resources: {
            memory: 2048,
            cpus: 2,
            timeout: 1800,
          },
          network: {
            enabled: false,
          },
          security: {
            readOnly: true,
            dropCapabilities: true,
            seccompProfile: "strict",
          },
        },
        workspace: {
          basePath: "/tmp/opencode",
          allowedProjects: {
            mode: "all",
            whitelist: [],
          },
          protectedPatterns: [],
        },
        security: {
          approvalMode: "invalid-mode",
          autoApproveSafe: true,
          commands: {
            allowlist: {
              enabled: false,
              commands: [],
            },
            blocklist: {
              enabled: false,
              commands: [],
            },
          },
          paths: {
            whitelist: [],
            blacklist: [],
          },
        },
        notifications: {
          desktop: true,
          mobile: false,
          email: false,
        },
        audit: {
          enabled: true,
          retentionDays: 30,
          logLevel: "info",
        },
      },
    };

    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("rejects negative resource values", () => {
    const config = {
      opencode: {
        enabled: true,
        container: {
          runtime: "docker",
          image: "opencode:latest",
          resources: {
            memory: -1,
            cpus: 2,
            timeout: 1800,
          },
          network: {
            enabled: false,
          },
          security: {
            readOnly: true,
            dropCapabilities: true,
            seccompProfile: "strict",
          },
        },
        workspace: {
          basePath: "/tmp/opencode",
          allowedProjects: {
            mode: "all",
            whitelist: [],
          },
          protectedPatterns: [],
        },
        security: {
          approvalMode: "on-miss",
          autoApproveSafe: true,
          commands: {
            allowlist: {
              enabled: false,
              commands: [],
            },
            blocklist: {
              enabled: false,
              commands: [],
            },
          },
          paths: {
            whitelist: [],
            blacklist: [],
          },
        },
        notifications: {
          desktop: true,
          mobile: false,
          email: false,
        },
        audit: {
          enabled: true,
          retentionDays: 30,
          logLevel: "info",
        },
      },
    };

    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it("validates opencode config is optional", () => {
    const config = {};
    const result = OpenClawSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it("validates all required fields are present when enabled", () => {
    const incompleteConfig = {
      opencode: {
        enabled: true,
        container: {
          runtime: "docker",
          // Missing required fields
        },
      },
    };

    const result = OpenClawSchema.safeParse(incompleteConfig);
    expect(result.success).toBe(false);
  });
});
