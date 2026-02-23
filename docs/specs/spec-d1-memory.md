# Spec D1: Memory Management UI

## 🎯 Objetivo
Interface para gerenciar memória do agente: carregamento seletivo, sumarização automática, busca semântica.

## 🔧 Backend

### Gateway Handlers
- `memory.session.files` - Listar SOUL.md, USER.md, IDENTITY.md, memory/*.md
- `memory.session.file.get` - Obter conteúdo
- `memory.session.file.save` - Salvar conteúdo
- `memory.session.summary.generate` - Gerar sumário com LLM
- `memory.session.summary.save` - Salvar em memory/YYYY-MM-DD.md
- `memory.session.search` - Busca semântica (usar existente)
- `memory.session.config` - Configurar auto-load, summarization

### Session Hook Integration
```typescript
// On session start:
// 1. Carregar: SOUL.md, USER.md, IDENTITY.md
// 2. NÃO carregar: Memory.md, histórico completo
// 3. Quando usuário perguntar: usar memory_search on-demand

// On session end:
// 1. LLM gera sumário automático
// 2. Salva em memory/2024-03-15.md com:
//    - What you worked on
//    - Decisions made
//    - Leads generated
//    - Blockers
//    - Next steps
```

### Configuração
```typescript
interface MemorySessionConfig {
  autoLoad: {
    soul: boolean;
    user: boolean;
    identity: boolean;
    recentDays: number;  // Quantos dias de memory/*.md carregar
  };
  autoSummarize: boolean;
  summaryTemplate: string[];  // [workedOn, decisions, leads, blockers, nextSteps]
  retentionDays: number;  // Manter sumários por N dias
}
```

## 🎨 Frontend

### View: Memory Management
```typescript
// Header: Toggle "Enable Smart Memory", Espaço usado

// Section: Core Files
// - SOUL.md: Editor inline ou abrir workspace
// - USER.md: Editor inline
// - IDENTITY.md: Editor inline

// Section: Session Memories
// - Lista por data (cards)
// - Preview: O que foi trabalhado
// - Actions: View, Delete
// - Search: Buscar em todas as memórias

// Section: Search
// - Input de busca
// - Resultados com contexto
// - Snippets relevantes

// Section: Settings
// - Auto-load on session start (toggle)
// - Auto-summarize at end (toggle)
// - Max memory files to keep
// - Retention period

// Button: "Generate Session Summary" (manual)
```

## 📊 Critérios
- [ ] Carregamento seletivo de arquivos
- [ ] Sumarização automática no fim da sessão
- [ ] Busca semântica integrada
- [ ] Visualização de memórias por data
- [ ] Configuração de auto-load
- [ ] Economia de 80% de contexto

## ⏱️ Estimativa: 4 dias
