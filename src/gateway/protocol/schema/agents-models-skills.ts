import { Type } from "@sinclair/typebox";
import { NonEmptyString } from "./primitives.js";

export const ModelChoiceSchema = Type.Object(
  {
    id: NonEmptyString,
    name: NonEmptyString,
    provider: NonEmptyString,
    contextWindow: Type.Optional(Type.Integer({ minimum: 1 })),
    reasoning: Type.Optional(Type.Boolean()),
  },
  { additionalProperties: false },
);

export const AgentSummarySchema = Type.Object(
  {
    id: NonEmptyString,
    name: Type.Optional(NonEmptyString),
    identity: Type.Optional(
      Type.Object(
        {
          name: Type.Optional(NonEmptyString),
          theme: Type.Optional(NonEmptyString),
          emoji: Type.Optional(NonEmptyString),
          avatar: Type.Optional(NonEmptyString),
          avatarUrl: Type.Optional(NonEmptyString),
        },
        { additionalProperties: false },
      ),
    ),
  },
  { additionalProperties: false },
);

export const AgentsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const AgentsListResultSchema = Type.Object(
  {
    defaultId: NonEmptyString,
    mainKey: NonEmptyString,
    scope: Type.Union([Type.Literal("per-sender"), Type.Literal("global")]),
    agents: Type.Array(AgentSummarySchema),
  },
  { additionalProperties: false },
);

export const ModelsListParamsSchema = Type.Object({}, { additionalProperties: false });

export const ModelsListResultSchema = Type.Object(
  {
    models: Type.Array(ModelChoiceSchema),
  },
  { additionalProperties: false },
);

export const SkillsStatusParamsSchema = Type.Object({}, { additionalProperties: false });

export const SkillsBinsParamsSchema = Type.Object({}, { additionalProperties: false });

export const SkillsBinsResultSchema = Type.Object(
  {
    bins: Type.Array(NonEmptyString),
  },
  { additionalProperties: false },
);

export const SkillsInstallParamsSchema = Type.Object(
  {
    name: NonEmptyString,
    installId: NonEmptyString,
    timeoutMs: Type.Optional(Type.Integer({ minimum: 1000 })),
  },
  { additionalProperties: false },
);

export const SkillsUpdateParamsSchema = Type.Object(
  {
    skillKey: NonEmptyString,
    enabled: Type.Optional(Type.Boolean()),
    apiKey: Type.Optional(Type.String()),
    env: Type.Optional(Type.Record(NonEmptyString, Type.String())),
  },
  { additionalProperties: false },
);

export const SkillsAnalyzeParamsSchema = Type.Object(
  {
    skillKey: NonEmptyString,
    filePath: NonEmptyString,
  },
  { additionalProperties: false },
);

export const SkillsAnalyzeResultSchema = Type.Object(
  {
    securityScan: Type.Object({
      score: Type.Number(),
      level: Type.Union([
        Type.Literal("safe"),
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("critical"),
      ]),
      lastScan: Type.String(),
      issues: Type.Array(
        Type.Object({
          type: Type.String(),
          severity: Type.Union([
            Type.Literal("critical"),
            Type.Literal("high"),
            Type.Literal("medium"),
            Type.Literal("low"),
            Type.Literal("info"),
          ]),
          message: Type.String(),
          line: Type.Optional(Type.Number()),
          column: Type.Optional(Type.Number()),
          context: Type.Optional(Type.String()),
        }),
      ),
      permissions: Type.Object({
        filesystem: Type.Boolean(),
        network: Type.Boolean(),
        execution: Type.Boolean(),
        env: Type.Boolean(),
        elevated: Type.Boolean(),
      }),
      checks: Type.Object({
        hasHttpsDownloads: Type.Boolean(),
        hasSignedBinaries: Type.Boolean(),
        usesTrustedPackageManager: Type.Boolean(),
        hasDangerousCommands: Type.Boolean(),
        requiresRoot: Type.Boolean(),
      }),
    }),
    richDescription: Type.Object({
      short: Type.String(),
      full: Type.String(),
      whatIs: Type.String(),
      capabilities: Type.Array(Type.String()),
      examples: Type.Array(Type.String()),
      requirements: Type.Array(Type.String()),
      securityNotes: Type.Array(Type.String()),
    }),
  },
  { additionalProperties: false },
);
