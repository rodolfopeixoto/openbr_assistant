/**
 * Stubs para MCP SDK (quando o pacote não está disponível)
 */

// Stub para Server
export class Server {
  constructor(
    private info: { name: string; version: string },
    private capabilities: any,
  ) {}

  setRequestHandler(_schema: any, handler: Function) {
    // Stub implementation
  }

  async connect(_transport: any) {
    console.log(`Server ${this.info.name} v${this.info.version} connected`);
  }
}

// Stub para transport
export class StdioServerTransport {
  // Stub implementation
}

// Stubs para schemas
export const CallToolRequestSchema = {};
export const ListToolsRequestSchema = {};
