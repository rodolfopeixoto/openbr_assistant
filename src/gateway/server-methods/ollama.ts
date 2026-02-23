import type { GatewayRequestHandlers } from "./types.js";

export interface OllamaConfig {
  enabled: boolean;
  host: string;
  port: number;
  defaultModel: string;
  autoStart: boolean;
}

export interface OllamaModel {
  name: string;
  size: string;
  digest: string;
  modifiedAt: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameterSize: string;
    quantizationLevel: string;
  };
}

export interface OllamaStatus {
  installed: boolean;
  running: boolean;
  version: string | null;
  config: OllamaConfig;
  models: OllamaModel[];
  currentModel: string | null;
}

let config: OllamaConfig = {
  enabled: true,
  host: "localhost",
  port: 11434,
  defaultModel: "llama3.2:3b",
  autoStart: true,
};

let status: OllamaStatus = {
  installed: false,
  running: false,
  version: null,
  config,
  models: [],
  currentModel: null,
};

export const ollamaHandlers: GatewayRequestHandlers = {
  "ollama.status": async ({ respond }) => {
    respond(true, status);
  },

  "ollama.install": async ({ respond }) => {
    status.installed = true;
    status.version = "0.3.0";
    respond(true, { ok: true, installed: true });
  },

  "ollama.models": async ({ respond }) => {
    const models: OllamaModel[] = [
      {
        name: "llama3.2:3b",
        size: "1.9GB",
        digest: "sha256:abc123",
        modifiedAt: new Date().toISOString(),
        details: {
          format: "gguf",
          family: "llama",
          families: ["llama"],
          parameterSize: "3.2B",
          quantizationLevel: "Q4_0",
        },
      },
      {
        name: "llama3.2:8b",
        size: "4.9GB",
        digest: "sha256:def456",
        modifiedAt: new Date().toISOString(),
        details: {
          format: "gguf",
          family: "llama",
          families: ["llama"],
          parameterSize: "8B",
          quantizationLevel: "Q4_0",
        },
      },
      {
        name: "mistral:7b",
        size: "4.1GB",
        digest: "sha256:ghi789",
        modifiedAt: new Date().toISOString(),
        details: {
          format: "gguf",
          family: "mistral",
          families: ["mistral"],
          parameterSize: "7B",
          quantizationLevel: "Q4_0",
        },
      },
    ];
    status.models = models;
    respond(true, { models });
  },

  "ollama.pull": async ({ params, respond }) => {
    const { model } = params as { model: string };
    respond(true, { ok: true, model, status: "downloading", progress: 0 });
  },

  "ollama.remove": async ({ params, respond }) => {
    const { model } = params as { model: string };
    status.models = status.models.filter((m) => m.name !== model);
    respond(true, { ok: true, model });
  },

  "ollama.configure": async ({ params, respond }) => {
    const { host, port, defaultModel, autoStart } = params as Partial<OllamaConfig>;
    if (host) {
      config.host = host;
    }
    if (port) {
      config.port = port;
    }
    if (defaultModel) {
      config.defaultModel = defaultModel;
    }
    if (autoStart !== undefined) {
      config.autoStart = autoStart;
    }
    status.config = config;
    respond(true, { ok: true, config });
  },

  "ollama.start": async ({ respond }) => {
    status.running = true;
    respond(true, { ok: true, running: true });
  },

  "ollama.stop": async ({ respond }) => {
    status.running = false;
    respond(true, { ok: true, running: false });
  },
};
