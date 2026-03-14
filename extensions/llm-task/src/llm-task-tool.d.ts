import type { OpenClawPluginApi } from "../../../src/plugins/types.js";
export declare function createLlmTaskTool(api: OpenClawPluginApi): {
    name: string;
    description: string;
    parameters: import("@sinclair/typebox").TObject<{
        prompt: import("@sinclair/typebox").TString;
        input: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
        schema: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnknown>;
        provider: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        model: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        authProfileId: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        temperature: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        maxTokens: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        timeoutMs: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>;
    execute(_id: string, params: Record<string, unknown>): Promise<{
        content: {
            type: string;
            text: string;
        }[];
        details: {
            json: unknown;
            provider: string;
            model: string;
        };
    }>;
};
