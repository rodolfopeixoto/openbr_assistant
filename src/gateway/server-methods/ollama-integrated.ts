import type { GatewayRequestHandlers } from "./types.js";
import {
  getOllamaService,
  OLLAMA_MODELS,
  type ModelKey,
} from "../../services/ollama-integrated.js";

export const ollamaIntegratedHandlers: GatewayRequestHandlers = {
  // Status check
  "ollama.status": async ({ respond }) => {
    try {
      const service = getOllamaService();
      const status = await service.checkStatus();
      respond(true, status);
    } catch (error) {
      respond(false, {
        available: false,
        installed: false,
        running: false,
        error: error instanceof Error ? error.message : "Unknown error",
        models: [],
      });
    }
  },

  // Auto-start Ollama
  "ollama.autostart": async ({ respond }) => {
    try {
      const service = getOllamaService();
      const started = await service.autoStart();
      respond(started, { started });
    } catch (error) {
      respond(false, {
        started: false,
        error: error instanceof Error ? error.message : "Auto-start failed",
      });
    }
  },

  // Install Ollama
  "ollama.install": async ({ respond }) => {
    try {
      const service = getOllamaService();
      const result = await service.install();
      respond(result.success, result);
    } catch (error) {
      respond(false, {
        success: false,
        message: error instanceof Error ? error.message : "Installation failed",
      });
    }
  },

  // Pull model
  "ollama.pull": async ({ params, respond }) => {
    try {
      const { model } = params as { model: string };
      if (!model || !(model in OLLAMA_MODELS)) {
        respond(false, { error: "Invalid model" });
        return;
      }

      const service = getOllamaService();

      // Start pull in background
      service.pullModel(model as ModelKey).catch((err) => {
        console.error("[Ollama] Pull failed:", err);
      });

      respond(true, { message: "Pull started" });
    } catch (error) {
      respond(false, {
        error: error instanceof Error ? error.message : "Pull failed",
      });
    }
  },

  // Delete model
  "ollama.delete": async ({ params, respond }) => {
    try {
      const { model } = params as { model: string };
      if (!model || !(model in OLLAMA_MODELS)) {
        respond(false, { error: "Invalid model" });
        return;
      }

      const service = getOllamaService();
      await service.deleteModel(model as ModelKey);
      respond(true, { message: "Model deleted" });
    } catch (error) {
      respond(false, {
        error: error instanceof Error ? error.message : "Delete failed",
      });
    }
  },

  // Generate text
  "ollama.generate": async ({ params, respond }) => {
    try {
      const { model, prompt, options } = params as {
        model: string;
        prompt: string;
        options?: Record<string, any>;
      };

      if (!model || !(model in OLLAMA_MODELS)) {
        respond(false, { error: "Invalid model" });
        return;
      }

      const service = getOllamaService();
      const response = await service.generate(model as ModelKey, prompt, options);
      respond(true, { response });
    } catch (error) {
      respond(false, {
        error: error instanceof Error ? error.message : "Generation failed",
      });
    }
  },

  // List available models with status
  "ollama.models": async ({ respond }) => {
    try {
      const service = getOllamaService();
      const status = await service.checkStatus();

      const models = Object.entries(OLLAMA_MODELS).map(([key, model]) => {
        const installedModel = status.models.find((m) => m.name === model.name);
        return {
          key,
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          size: model.size,
          tags: model.tags,
          recommended: model.recommended,
          installed: installedModel?.installed || false,
          installedSize: installedModel?.size,
        };
      });

      respond(true, { models, available: status.available });
    } catch (error) {
      respond(false, {
        error: error instanceof Error ? error.message : "Failed to list models",
        models: [],
      });
    }
  },
};
