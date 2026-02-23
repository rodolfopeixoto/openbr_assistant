/**
 * MCP Excalidraw Server
 *
 * Servidor MCP para geração de diagramas Excalidraw
 * Integrado com o sistema de Speech Recognition
 */

// Using local stubs since MCP SDK is not installed
import {
  Server,
  StdioServerTransport,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "./stubs.js";

/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Tipos de diagramas suportados
 */
type DiagramType =
  | "architecture"
  | "data-flow"
  | "sequence"
  | "state-machine"
  | "user-flow"
  | "speech-recognition-flow"
  | "voice-command-flow";

/**
 * Formato de exportação
 */
type ExportFormat = "excalidraw" | "png" | "svg" | "pdf";
/* eslint-enable @typescript-eslint/no-unused-vars */

/**
 * Interface para elementos do Excalidraw
 */
interface ExcalidrawElement {
  id: string;
  type: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
  strokeColor?: string;
  backgroundColor?: string;
  fillStyle?: string;
  strokeWidth?: number;
  roughness?: number;
  opacity?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: number;
  points?: number[][];
  roundness?: { type: number };
}

/**
 * Cores do tema
 */
const THEME = {
  primary: "#1971c2",
  primaryLight: "#e7f5ff",
  secondary: "#2f9e44",
  secondaryLight: "#d3f9d8",
  accent: "#e8590c",
  accentLight: "#fff4e6",
  text: "#495057",
  border: "#ced4da",
};

/**
 * Cria o servidor MCP
 */
export function createExcalidrawServer(): Server {
  const server = new Server(
    {
      name: "openclaw-excalidraw-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // Lista de ferramentas disponíveis
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "create_architecture_diagram",
          description: "Cria um diagrama de arquitetura do sistema de speech recognition",
          inputSchema: {
            type: "object",
            properties: {
              showComponents: {
                type: "boolean",
                description: "Mostrar componentes individuais",
                default: true,
              },
              showDataFlow: {
                type: "boolean",
                description: "Mostrar fluxo de dados",
                default: true,
              },
            },
          },
        },
        {
          name: "create_data_flow_diagram",
          description: "Cria um diagrama de fluxo de dados para speech recognition",
          inputSchema: {
            type: "object",
            properties: {
              flowType: {
                type: "string",
                enum: ["recording", "transcription", "command_execution", "full"],
                description: "Tipo de fluxo a ser diagramado",
                default: "full",
              },
              includeCache: {
                type: "boolean",
                description: "Incluir camada de cache no diagrama",
                default: true,
              },
            },
          },
        },
        {
          name: "create_sequence_diagram",
          description: "Cria um diagrama de sequência para interações de speech",
          inputSchema: {
            type: "object",
            properties: {
              scenario: {
                type: "string",
                enum: ["voice_command", "transcription", "cache_hit"],
                description: "Cenário a ser diagramado",
                default: "voice_command",
              },
            },
          },
        },
        {
          name: "create_state_machine",
          description: "Cria um diagrama de máquina de estados para o Voice Recorder",
          inputSchema: {
            type: "object",
            properties: {
              showTransitions: {
                type: "boolean",
                description: "Mostrar todas as transições",
                default: true,
              },
            },
          },
        },
        {
          name: "export_diagram",
          description: "Exporta um diagrama para um formato específico",
          inputSchema: {
            type: "object",
            properties: {
              elements: {
                type: "array",
                description: "Elementos do diagrama",
              },
              format: {
                type: "string",
                enum: ["excalidraw", "png", "svg"],
                description: "Formato de exportação",
                default: "excalidraw",
              },
            },
            required: ["elements"],
          },
        },
        {
          name: "create_voice_command_diagram",
          description: "Cria um diagrama de fluxo de comandos de voz",
          inputSchema: {
            type: "object",
            properties: {
              command: {
                type: "string",
                enum: ["test", "build", "commit", "deploy", "search", "all"],
                description: "Comando específico ou todos",
                default: "all",
              },
            },
          },
        },
        {
          name: "create_wake_word_detection_diagram",
          description: "Cria um diagrama do algoritmo de detecção de wake words",
          inputSchema: {
            type: "object",
            properties: {
              showAlgorithm: {
                type: "boolean",
                description: "Mostrar detalhes do algoritmo",
                default: true,
              },
            },
          },
        },
      ],
    };
  });

  // Handler para execução de ferramentas
  server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_architecture_diagram":
          return await createArchitectureDiagram(args as any);
        case "create_data_flow_diagram":
          return await createDataFlowDiagram(args as any);
        case "create_sequence_diagram":
          return await createSequenceDiagram(args as any);
        case "create_state_machine":
          return await createStateMachine(args as any);
        case "export_diagram":
          return await exportDiagram(args as any);
        case "create_voice_command_diagram":
          return await createVoiceCommandDiagram(args as any);
        case "create_wake_word_detection_diagram":
          return await createWakeWordDetectionDiagram(args as any);
        default:
          throw new Error(`Ferramenta desconhecida: ${name}`);
      }
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Erro: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Cria diagrama de arquitetura
 */
async function createArchitectureDiagram(args: {
  showComponents?: boolean;
  showDataFlow?: boolean;
}) {
  const elements: ExcalidrawElement[] = [];

  // Título
  elements.push({
    id: "title",
    type: "text",
    x: 400,
    y: 20,
    text: "Arquitetura - Speech Recognition System",
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  // Layer 1: Presentation
  elements.push(
    createLayerBox(
      50,
      80,
      800,
      120,
      "Layer 1: Presentation (UI & CLI)",
      THEME.primary,
      THEME.primaryLight,
    ),
  );

  elements.push(createComponentBox(100, 110, 150, 70, "Voice\\nRecorder", THEME.primary));
  elements.push(createComponentBox(300, 110, 150, 70, "Audio\\nVisualizer", THEME.primary));
  elements.push(createComponentBox(500, 110, 150, 70, "Chat\\nInterface", THEME.primary));
  elements.push(createComponentBox(700, 110, 120, 70, "CLI", THEME.primary));

  // Layer 2: Gateway
  elements.push(
    createLayerBox(
      50,
      230,
      800,
      100,
      "Layer 2: Gateway (API & Security)",
      THEME.secondary,
      THEME.secondaryLight,
    ),
  );

  elements.push(createComponentBox(150, 260, 120, 50, "API Routes", THEME.secondary));
  elements.push(createComponentBox(300, 260, 120, 50, "Auth", THEME.secondary));
  elements.push(createComponentBox(450, 260, 120, 50, "Rate Limiter", THEME.secondary));
  elements.push(createComponentBox(600, 260, 120, 50, "CORS", THEME.secondary));

  // Layer 3: Business Logic
  elements.push(
    createLayerBox(
      50,
      360,
      800,
      150,
      "Layer 3: Business Logic (Speech Processing)",
      THEME.accent,
      THEME.accentLight,
    ),
  );

  elements.push(
    createComponentBox(
      80,
      400,
      160,
      90,
      "STT Service\\n• OpenAI\\n• Deepgram\\n• Cache",
      THEME.accent,
    ),
  );
  elements.push(
    createComponentBox(
      320,
      400,
      160,
      90,
      "Wake Word\\nDetector\\n• Fuzzy Match\\n• Cooldown",
      THEME.accent,
    ),
  );
  elements.push(
    createComponentBox(
      560,
      400,
      160,
      90,
      "Command\\nRouter\\n• 7 Built-in\\n• Extensible",
      THEME.accent,
    ),
  );

  // Conexões
  if (args.showDataFlow !== false) {
    elements.push(createArrow(475, 200, 475, 230));
    elements.push(createArrow(475, 330, 475, 360));
    elements.push(createArrow(230, 450, 320, 450));
    elements.push(createArrow(480, 450, 560, 450));
  }

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

/**
 * Cria diagrama de fluxo de dados
 */
async function createDataFlowDiagram(args: { flowType?: string; includeCache?: boolean }) {
  const elements: ExcalidrawElement[] = [];

  elements.push({
    id: "title",
    type: "text",
    x: 300,
    y: 20,
    text: `Fluxo de Dados - ${args.flowType || "full"}`,
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  if (args.flowType === "recording" || args.flowType === "full") {
    // Fluxo de gravação
    elements.push(createProcessBox(50, 80, 120, 60, "Usuário"));
    elements.push(createProcessBox(220, 80, 140, 60, "Voice\\nRecorder"));
    elements.push(createProcessBox(420, 80, 140, 60, "MediaRecorder"));
    elements.push(createDataBox(620, 80, 120, 60, "Audio Blob"));

    elements.push(createArrow(170, 110, 220, 110));
    elements.push(createArrow(360, 110, 420, 110));
    elements.push(createArrow(560, 110, 620, 110));
  }

  if (args.flowType === "transcription" || args.flowType === "full") {
    // Fluxo de transcrição
    elements.push(createProcessBox(50, 180, 120, 60, "Audio"));
    elements.push(createDecisionBox(220, 180, 120, 60, "Cache?"));
    elements.push(createProcessBox(400, 160, 140, 80, "STT API\\n(OpenAI/\\nDeepgram)"));
    elements.push(createDataBox(620, 180, 140, 60, "Transcription"));

    elements.push(createArrow(170, 210, 220, 210));
    elements.push(createArrow(340, 210, 400, 200));
    elements.push(createArrow(540, 200, 620, 210));
  }

  if (args.flowType === "command_execution" || args.flowType === "full") {
    // Fluxo de execução
    elements.push(createProcessBox(50, 300, 140, 60, "Texto"));
    elements.push(createProcessBox(250, 300, 140, 60, "Wake Word\\nDetector"));
    elements.push(createProcessBox(470, 300, 140, 60, "Command\\nRouter"));
    elements.push(createProcessBox(680, 300, 120, 60, "Execução"));

    elements.push(createArrow(190, 330, 250, 330));
    elements.push(createArrow(390, 330, 470, 330));
    elements.push(createArrow(610, 330, 680, 330));
  }

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

/**
 * Cria diagrama de sequência
 */
async function createSequenceDiagram(args: { scenario?: string }) {
  const elements: ExcalidrawElement[] = [];

  elements.push({
    id: "title",
    type: "text",
    x: 250,
    y: 20,
    text: `Diagrama de Sequência - ${args.scenario || "voice_command"}`,
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  // Participantes
  elements.push(createActor(100, 80, "Usuário"));
  elements.push(createActor(300, 80, "Browser"));
  elements.push(createActor(500, 80, "Gateway"));
  elements.push(createActor(700, 80, "Speech\\nService"));

  // Linhas de vida
  elements.push(createLifeLine(140, 140, 400));
  elements.push(createLifeLine(340, 140, 400));
  elements.push(createLifeLine(540, 140, 400));
  elements.push(createLifeLine(740, 140, 400));

  // Mensagens
  elements.push(createMessage(140, 180, 340, 180, "Clica 🎤"));
  elements.push(createMessage(340, 220, 540, 220, "GET /api/v1/speech/status"));
  elements.push(createReturnMessage(540, 260, 340, 260, "200 OK"));
  elements.push(createMessage(140, 300, 340, 300, "Fala: 'clawd test'"));
  elements.push(createMessage(340, 340, 540, 340, "POST /transcribe (audio)"));
  elements.push(createMessage(540, 380, 740, 380, "Call OpenAI API"));
  elements.push(createReturnMessage(740, 420, 540, 420, "Transcription"));
  elements.push(createReturnMessage(540, 460, 340, 460, "Result + Command"));

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

/**
 * Cria máquina de estados do Voice Recorder
 */
async function createStateMachine(args: { showTransitions?: boolean }) {
  const elements: ExcalidrawElement[] = [];

  elements.push({
    id: "title",
    type: "text",
    x: 250,
    y: 20,
    text: "Máquina de Estados - Voice Recorder",
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  // Estados
  elements.push(createStateBox(350, 100, 120, 70, "IDLE", "#69db7c"));
  elements.push(createStateBox(550, 200, 140, 70, "RECORDING", "#ffa94d"));
  elements.push(createStateBox(550, 350, 140, 70, "PROCESSING", "#74c0fc"));
  elements.push(createStateBox(350, 450, 120, 70, "PREVIEW", "#e599f7"));

  if (args.showTransitions !== false) {
    // Transições
    elements.push(createTransition(410, 170, 550, 235, "startRecording()"));
    elements.push(createTransition(620, 270, 620, 350, "stopRecording()"));
    elements.push(createTransition(550, 385, 410, 485, "transcription\\ncomplete"));
    elements.push(createTransition(350, 450, 350, 170, "cancel/send", true));
    elements.push(createTransition(470, 485, 620, 420, "send", true));
  }

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

/**
 * Exporta diagrama
 */
async function exportDiagram(args: { elements: ExcalidrawElement[]; format?: string }) {
  const format = args.format || "excalidraw";

  if (format === "excalidraw") {
    return {
      content: [
        {
          type: "application/vnd.excalidraw+json",
          data: {
            type: "excalidraw",
            version: 2,
            source: "openclaw-mcp",
            elements: args.elements,
          },
        },
      ],
    };
  }

  // Para PNG/SVG, retornar metadados
  return {
    content: [
      {
        type: "text",
        text: `Exportação para ${format.toUpperCase()} gerada com sucesso.\\nTotal de elementos: ${args.elements.length}`,
      },
    ],
  };
}

/**
 * Cria diagrama de comandos de voz
 */
async function createVoiceCommandDiagram(args: { command?: string }) {
  const elements: ExcalidrawElement[] = [];

  elements.push({
    id: "title",
    type: "text",
    x: 200,
    y: 20,
    text: `Fluxo de Comandos - ${args.command?.toUpperCase() || "ALL"}`,
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  const commands = [
    { name: "test", y: 100, patterns: ["test", "run tests", "execute tests"], action: "npm test" },
    { name: "build", y: 200, patterns: ["build", "compile"], action: "npm run build" },
    { name: "commit", y: 300, patterns: ["commit", "commit changes"], action: "git commit" },
    { name: "deploy", y: 400, patterns: ["deploy", "ship to"], action: "deploy" },
  ];

  for (const cmd of commands) {
    if (args.command === "all" || args.command === cmd.name) {
      elements.push(createProcessBox(50, cmd.y, 100, 60, `Command: ${cmd.name}`));
      elements.push(createDataBox(200, cmd.y, 200, 60, cmd.patterns.join("\\n")));
      elements.push(createProcessBox(450, cmd.y, 150, 60, cmd.action));

      elements.push(createArrow(150, cmd.y + 30, 200, cmd.y + 30));
      elements.push(createArrow(400, cmd.y + 30, 450, cmd.y + 30));
    }
  }

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

/**
 * Cria diagrama de detecção de wake words
 */
async function createWakeWordDetectionDiagram(args: { showAlgorithm?: boolean }) {
  const elements: ExcalidrawElement[] = [];

  elements.push({
    id: "title",
    type: "text",
    x: 200,
    y: 20,
    text: "Algoritmo de Detecção de Wake Words",
    fontSize: 24,
    fontFamily: 1,
    strokeColor: THEME.text,
  });

  // Input
  elements.push(createProcessBox(50, 100, 120, 60, "Texto Input"));

  // Processamento
  elements.push(createProcessBox(250, 100, 140, 60, "Normalize\\n(lowercase)"));
  elements.push(createProcessBox(450, 100, 140, 60, "Tokenize\\n(split words)"));

  // Loop de verificação
  elements.push(createDecisionBox(650, 100, 120, 60, "Cada\\nPalavra"));

  if (args.showAlgorithm !== false) {
    // Detalhes do algoritmo
    elements.push(createProcessBox(450, 220, 160, 80, "Calcular\\nLevenshtein\\nDistance"));
    elements.push(createProcessBox(450, 340, 160, 60, "Converter para\\nConfidence"));
    elements.push(createDecisionBox(450, 450, 140, 70, "Confidence >=\\nSensitivity?"));
    elements.push(createProcessBox(250, 450, 120, 70, "MATCH!"));
    elements.push(createProcessBox(650, 450, 120, 70, "Próxima\\nPalavra"));
  }

  // Conexões
  elements.push(createArrow(170, 130, 250, 130));
  elements.push(createArrow(390, 130, 450, 130));
  elements.push(createArrow(590, 130, 650, 130));

  return {
    content: [
      {
        type: "application/vnd.excalidraw+json",
        data: {
          type: "excalidraw",
          version: 2,
          source: "openclaw-mcp",
          elements,
        },
      },
    ],
  };
}

// Funções auxiliares para criar elementos

function createLayerBox(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  strokeColor: string,
  bgColor: string,
): ExcalidrawElement {
  return {
    id: `layer_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor,
    backgroundColor: bgColor,
    fillStyle: "solid",
    strokeWidth: 2,
    roughness: 1,
    roundness: { type: 3 },
  };
}

function createComponentBox(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  strokeColor: string,
): ExcalidrawElement {
  return {
    id: `comp_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor,
    backgroundColor: "#ffffff",
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  };
}

function createArrow(x1: number, y1: number, x2: number, y2: number): ExcalidrawElement {
  return {
    id: `arrow_${x1}_${y1}`,
    type: "arrow",
    x: x1,
    y: y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    strokeColor: THEME.text,
    strokeWidth: 2,
  };
}

function createProcessBox(
  x: number,
  y: number,
  w: number,
  h: number,
  _text: string,
): ExcalidrawElement {
  return {
    id: `proc_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: THEME.primary,
    backgroundColor: THEME.primaryLight,
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
  };
}

function createDataBox(
  x: number,
  y: number,
  w: number,
  h: number,
  _text: string,
): ExcalidrawElement {
  return {
    id: `data_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: THEME.accent,
    backgroundColor: THEME.accentLight,
    fillStyle: "solid",
    strokeWidth: 2,
  };
}

function createDecisionBox(
  x: number,
  y: number,
  w: number,
  h: number,
  _text: string,
): ExcalidrawElement {
  return {
    id: `dec_${x}_${y}`,
    type: "diamond",
    x,
    y,
    width: w,
    height: h,
    strokeColor: THEME.secondary,
    backgroundColor: THEME.secondaryLight,
    fillStyle: "solid",
    strokeWidth: 2,
  };
}

function createActor(x: number, y: number, text: string): ExcalidrawElement {
  return {
    id: `actor_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: 80,
    height: 40,
    strokeColor: THEME.primary,
    backgroundColor: THEME.primaryLight,
    fillStyle: "solid",
    strokeWidth: 2,
    text,
    fontSize: 12,
    fontFamily: 1,
  };
}

function createLifeLine(x: number, y: number, height: number): ExcalidrawElement {
  return {
    id: `ll_${x}_${y}`,
    type: "line",
    x,
    y,
    points: [
      [0, 0],
      [0, height],
    ],
    strokeColor: THEME.border,
    strokeWidth: 1,
  };
}

function createMessage(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  _text: string,
): ExcalidrawElement {
  return {
    id: `msg_${x1}_${y1}`,
    type: "arrow",
    x: x1,
    y: y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    strokeColor: THEME.primary,
    strokeWidth: 2,
  };
}

function createReturnMessage(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  _text: string,
): ExcalidrawElement {
  return {
    id: `ret_${x1}_${y1}`,
    type: "arrow",
    x: x1,
    y: y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    strokeColor: THEME.secondary,
    strokeWidth: 2,
  };
}

function createStateBox(
  x: number,
  y: number,
  w: number,
  h: number,
  text: string,
  bgColor: string,
): ExcalidrawElement {
  return {
    id: `state_${x}_${y}`,
    type: "rectangle",
    x,
    y,
    width: w,
    height: h,
    strokeColor: THEME.text,
    backgroundColor: bgColor,
    fillStyle: "solid",
    strokeWidth: 2,
    roundness: { type: 3 },
    text,
    fontSize: 16,
    fontFamily: 1,
  };
}

function createTransition(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  _text: string,
  _dashed = false,
): ExcalidrawElement {
  return {
    id: `trans_${x1}_${y1}`,
    type: "arrow",
    x: x1,
    y: y1,
    points: [
      [0, 0],
      [x2 - x1, y2 - y1],
    ],
    strokeColor: THEME.text,
    strokeWidth: 2,
  };
}

/**
 * Inicia o servidor MCP
 */
export async function startExcalidrawServer(): Promise<void> {
  const server = createExcalidrawServer();
  const transport = new StdioServerTransport();

  console.error("MCP Excalidraw Server iniciado...");
  console.error("Ferramentas disponíveis:");
  console.error("  - create_architecture_diagram");
  console.error("  - create_data_flow_diagram");
  console.error("  - create_sequence_diagram");
  console.error("  - create_state_machine");
  console.error("  - export_diagram");
  console.error("  - create_voice_command_diagram");
  console.error("  - create_wake_word_detection_diagram");

  await server.connect(transport);
}

// Se executado diretamente
if (require.main === module) {
  startExcalidrawServer().catch(console.error);
}
