# Spec F1: Cache Manager

## 🎯 Objetivo
Gerenciamento centralizado de todos os caches do sistema com visualização de status, limpeza e configuração.

## 🔧 Backend

### Gateway Handlers
- `cache.status` - Status de todos os caches
- `cache.clear` - Limpar cache específico ou todos
- `cache.config` - Configurar TTL, max size

### Cache Registry
```typescript
interface CacheStatus {
  caches: Array<{
    name: string;
    type: 'memory' | 'sqlite' | 'file';
    size: number;           // Items ou bytes
    maxSize: number;
    hitRate: number;        // Percentage
    missRate: number;
    ttl: number;            // Segundos
    lastCleared?: string;
  }>;
}

// Caches existentes:
// - Config cache
// - Session store cache
// - Embedding cache
// - STT cache
// - Cost usage cache
// - Model selection cache
```

## 🎨 Frontend

### View: Cache Manager
```typescript
// Header: Total cache size, Global hit rate

// Lista de Caches:
// - Config Cache | 150 items | 95% hit | TTL: 300s | Clear button
// - Session Cache | 45 items | 80% hit | TTL: 45s | Clear button
// - Embedding Cache | 1.2MB | 90% hit | TTL: 3600s | Clear button
// - STT Cache | 50 items | 85% hit | TTL: 3600s | Clear button
// - etc.

// Cada item mostra:
// - Nome do cache
// - Tamanho (items ou MB)
// - Hit/Miss rate (progress bar)
// - TTL configurado
// - Última limpeza
// - Botão "Clear" individual

// Actions:
// - "Clear All Caches" (com confirmação)
// - "Warm Cache" (pré-carregar dados frequentes)

// Settings:
// - TTL configuration per cache type
// - Max size limits
// - Auto-cleanup policies
```

## 📊 Critérios
- [ ] Listar todos os caches ativos
- [ ] Mostrar hit/miss rates
- [ ] Clear individual/all
- [ ] Configurar TTL
- [ ] Visualização de tamanho
- [ ] Warm cache option

## ⏱️ Estimativa: 2 dias
