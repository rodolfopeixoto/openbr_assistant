#!/usr/bin/env node
/**
 * Setup inicial do OpenClaw - Configuração de segurança
 * Este script configura a chave de criptografia automaticamente
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

const execFileAsync = promisify(execFile);

const KEYRING_SERVICE = "com.openclaw.agent";
const KEYRING_ACCOUNT = "master-key";
const ENV_FILE = path.join(process.env.HOME || "~", ".openclaw", ".env");

async function setupKeychain() {
  console.log("🔐 Configuração de Segurança do OpenClaw\n");

  // 1. Verificar se já existe chave no keychain
  console.log("1️⃣  Verificando keychain...");
  let existingKey = null;
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s", KEYRING_SERVICE,
      "-a", KEYRING_ACCOUNT,
      "-w"
    ]);
    existingKey = stdout.trim();
    console.log("✅ Chave encontrada no keychain!");
    console.log(`   Preview: ${existingKey.substring(0, 8)}...${existingKey.substring(existingKey.length - 8)}`);
    return existingKey;
  } catch {
    console.log("ℹ️  Nenhuma chave encontrada. Criando nova...");
  }

  // 2. Gerar nova chave
  console.log("\n2️⃣  Gerando chave de criptografia segura...");
  const newKey = crypto.randomBytes(32).toString("hex");
  console.log("✅ Chave gerada!");
  console.log(`   Preview: ${newKey.substring(0, 8)}...${newKey.substring(newKey.length - 8)}`);

  // 3. Salvar no keychain
  console.log("\n3️⃣  Salvando no macOS Keychain...");
  try {
    await execFileAsync("security", [
      "add-generic-password",
      "-s", KEYRING_SERVICE,
      "-a", KEYRING_ACCOUNT,
      "-w", newKey,
      "-U" // Update if exists
    ]);
    console.log("✅ Chave salva no keychain com sucesso!");
  } catch (error: any) {
    console.error("❌ Erro ao salvar no keychain:", error.message);
    console.log("\n⚠️  Tentando fallback para arquivo...");
    
    // Fallback para arquivo
    const openclawDir = path.join(process.env.HOME || "~", ".openclaw");
    if (!fs.existsSync(openclawDir)) {
      fs.mkdirSync(openclawDir, { recursive: true, mode: 0o700 });
    }
    
    const keyFile = path.join(openclawDir, ".master-key");
    fs.writeFileSync(keyFile, newKey, { mode: 0o600 });
    console.log(`✅ Chave salva em: ${keyFile}`);
    console.log("⚠️  AVISO: Armazenamento em arquivo é menos seguro!");
  }

  // 4. Configurar variável de ambiente
  console.log("\n4️⃣  Configurando variável de ambiente...");
  
  // Criar/atualizar arquivo .env
  let envContent = "";
  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, "utf-8");
    // Remover linha antiga se existir
    envContent = envContent.split("\n").filter(line => 
      !line.startsWith("OPENCLAW_ENV_ENCRYPTION_KEY=")
    ).join("\n");
  }
  
  // Adicionar nova chave
  if (envContent && !envContent.endsWith("\n")) {
    envContent += "\n";
  }
  envContent += `OPENCLAW_ENV_ENCRYPTION_KEY=${newKey}\n`;
  
  fs.writeFileSync(ENV_FILE, envContent, { mode: 0o600 });
  console.log(`✅ Variável configurada em: ${ENV_FILE}`);

  // 5. Testar
  console.log("\n5️⃣  Testando configuração...");
  try {
    const { stdout } = await execFileAsync("security", [
      "find-generic-password",
      "-s", KEYRING_SERVICE,
      "-a", KEYRING_ACCOUNT,
      "-w"
    ]);
    const retrieved = stdout.trim();
    if (retrieved === newKey) {
      console.log("✅ Teste passou! Chave pode ser recuperada do keychain.");
    } else {
      console.error("❌ Teste falhou! Chave recuperada não corresponde.");
    }
  } catch (error) {
    console.warn("⚠️  Não foi possível verificar via keychain, mas arquivo .env foi criado.");
  }

  console.log("\n✨ Configuração completa!");
  console.log("\nPróximos passos:");
  console.log("  1. Adicione ao seu ~/.zshrc ou ~/.bashrc:");
  console.log(`     export OPENCLAW_ENV_ENCRYPTION_KEY=${newKey}`);
  console.log("  2. Ou use o arquivo .env:");
  console.log(`     source ${ENV_FILE}`);
  console.log("  3. Teste o OpenClaw:");
  console.log("     pnpm openclaw config get");

  return newKey;
}

// Verificar se é macOS
if (process.platform !== "darwin") {
  console.log("⚠️  Este script é otimizado para macOS.");
  console.log("   Para outras plataformas, configure manualmente:");
  console.log("   export OPENCLAW_ENV_ENCRYPTION_KEY=$(openssl rand -hex 32)");
  process.exit(0);
}

setupKeychain().catch(err => {
  console.error("Erro inesperado:", err);
  process.exit(1);
});
