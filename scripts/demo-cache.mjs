#!/usr/bin/env node
/**
 * Demo: Group History Cache com Rust
 * Compara performance entre Map JS (ilimitado) vs Cache Rust (bounded)
 */

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

console.log('🚀 Demo: Group History Cache - Rust vs JavaScript\n');

// Carregar módulo Rust
let rustModule;
try {
  const mod = { exports: {} };
  process.dlopen(mod, join(__dirname, '../rust/target/release/libopenclaw_core.dylib'));
  rustModule = mod.exports;
  console.log('✅ Módulo Rust carregado\n');
} catch (e) {
  console.error('❌ Falha ao carregar Rust:', e.message);
  process.exit(1);
}

// Configuração
const MAX_HISTORY = 100;
const NUM_GROUPS = 1000;
const MESSAGES_PER_GROUP = 200;

console.log(`Configuração:`);
console.log(`  Grupos: ${NUM_GROUPS}`);
console.log(`  Mensagens por grupo: ${MESSAGES_PER_GROUP}`);
console.log(`  Limite de histórico: ${MAX_HISTORY}`);
console.log();

// Teste 1: JavaScript Map (ilimitado - problema de memória)
console.log('1️⃣ JavaScript Map (ilimitado)');
const jsCache = new Map();
const jsStart = process.hrtime.bigint();

for (let g = 0; g < NUM_GROUPS; g++) {
  const groupId = `group_${g}`;
  const history = [];
  
  for (let m = 0; m < MESSAGES_PER_GROUP; m++) {
    history.push({
      timestamp: Date.now(),
      content: `Message ${m} from group ${g}`,
    });
  }
  
  jsCache.set(groupId, history);
}

const jsEnd = process.hrtime.bigint();
console.log(`   Tempo: ${Number(jsEnd - jsStart) / 1000000}ms`);
console.log(`   Total de mensagens: ${NUM_GROUPS * MESSAGES_PER_GROUP}`);
console.log(`   Memória usada: ~${Math.round(NUM_GROUPS * MESSAGES_PER_GROUP * 50 / 1024 / 1024)}MB (estimada)`);
console.log(`   ❌ Problema: Sem limite de tamanho, memória cresce indefinidamente\n`);

// Teste 2: JavaScript Map (com limite manual)
console.log('2️⃣ JavaScript Map (com limite manual)');
const jsLimitedCache = new Map();
const jsLimitedStart = process.hrtime.bigint();

for (let g = 0; g < NUM_GROUPS; g++) {
  const groupId = `group_${g}`;
  
  for (let m = 0; m < MESSAGES_PER_GROUP; m++) {
    let history = jsLimitedCache.get(groupId) || [];
    history.push({
      timestamp: Date.now(),
      content: `Message ${m} from group ${g}`,
    });
    
    // Manter apenas últimos N
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
    
    jsLimitedCache.set(groupId, history);
  }
}

const jsLimitedEnd = process.hrtime.bigint();
console.log(`   Tempo: ${Number(jsLimitedEnd - jsLimitedStart) / 1000000}ms`);
console.log(`   Total de mensagens: ${NUM_GROUPS * MAX_HISTORY}`);
console.log(`   ✅ Com limite, mas implementação manual\n`);

// Teste 3: Rust GroupHistoryCache (otimizado)
console.log('3️⃣ Rust GroupHistoryCache (otimizado)');
const rustCache = new rustModule.GroupHistoryCache(MAX_HISTORY);
const rustStart = process.hrtime.bigint();

for (let g = 0; g < NUM_GROUPS; g++) {
  const groupId = `group_${g}`;
  
  for (let m = 0; m < MESSAGES_PER_GROUP; m++) {
    rustCache.add(groupId, {
      timestamp: Date.now(),
      content: `Message ${m} from group ${g}`,
    });
  }
}

const rustEnd = process.hrtime.bigint();
console.log(`   Tempo: ${Number(rustEnd - rustStart) / 1000000}ms`);
console.log(`   Total de mensagens: ${NUM_GROUPS * MAX_HISTORY}`);
console.log(`   ✅ Cache nativo, automático, thread-safe\n`);

// Comparação
console.log('📊 Comparação de Performance:');
const jsTime = Number(jsLimitedEnd - jsLimitedStart);
const rustTime = Number(rustEnd - rustStart);
const speedup = (jsTime / rustTime).toFixed(2);

console.log(`   JavaScript (limited): ${jsTime / 1000000}ms`);
console.log(`   Rust (optimized):     ${rustTime / 1000000}ms`);
console.log(`   Speedup: ${speedup}x`);
console.log();

// Teste de acesso
console.log('4️⃣ Teste de Acesso (leitura)');
const testGroupId = 'group_500';

const jsReadStart = process.hrtime.bigint();
const jsHistory = jsLimitedCache.get(testGroupId);
const jsReadEnd = process.hrtime.bigint();

const rustReadStart = process.hrtime.bigint();
const rustHistory = rustCache.get(testGroupId);
const rustReadEnd = process.hrtime.bigint();

console.log(`   JS read:   ${Number(jsReadEnd - jsReadStart)}ns`);
console.log(`   Rust read: ${Number(rustReadEnd - rustReadStart)}ns`);
console.log(`   Histórico recuperado: ${rustHistory.length} mensagens`);
console.log();

console.log('✅ Demo completo!');
console.log();
console.log('💡 Benefícios do Rust GroupHistoryCache:');
console.log('   • Limite automático de entradas');
console.log('   • Thread-safe (Mutex)');
console.log('   • Memória contígua (mais eficiente)');
console.log('   • Zero overhead de GC');
console.log('   • Sem vazamentos de memória');
console.log();
console.log('📝 Como usar no código:');
console.log('   import { createGroupHistoryCache } from "./ultra.js";');
console.log('   const cache = createGroupHistoryCache(100);');
console.log('   cache.add(groupId, { timestamp: Date.now(), content: msg });');