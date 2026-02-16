#!/usr/bin/env node
// Script temporário para rodar o gateway sem checagem de versão do Node

import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock runtime guard para ignorar a checagem
process.env.OPENCLAW_SKIP_RUNTIME_CHECK = "1";

// Importa e executa o gateway diretamente
const { main } = await import("../src/cli/gateway.js");

// Configuração de argumentos
const args = process.argv.slice(2);
if (args.length === 0) {
  args.push("run", "--bind", "loopback", "--port", "18789", "--force");
}

await main(args);
