# Spec E1: Rate Limiting Controls

## 🎯 Objetivo
Controle granular de rate limits com configurações específicas por tipo de operação.

## 📋 Requisitos Específicos
```
DEFAULT:
- 5 seconds minimum entre API calls
- 10 seconds entre web searches
- Max 5 searches per batch → 2 minute break
- Batch similar work (one request for 10 leads, not 10 requests)
- On 429 error: stop, wait 5min, retry
```

## 🔧 Backend

### Gateway Handlers
- `rate-limits.config.get` - Obter configuração
- `rate-limits.config.set` - Atualizar configuração
- `rate-limits.status` - Status atual, throttling ativo

### Rate Limiter Service
```typescript
interface RateLimitConfig {
  global: {
    minTimeBetweenCalls: number;  // ms (default: 5000)
  };
  perTool: {
    [toolName: string]: {
      minDelay: number;           // ms entre calls
      maxBatchSize: number;       // Máximo antes de cooldown
      cooldownDuration: number;   // ms de cooldown
      batchSimilarWork: boolean;  // Agrupar requests similares
    }
  };
  errorHandling: {
    on429: {
      waitTime: number;           // ms (default: 300000 = 5min)
      retryAttempts: number;      // (default: 3)
      exponentialBackoff: boolean;
    }
  };
}

// Tools defaults:
// web_search: { minDelay: 10000, maxBatchSize: 5, cooldownDuration: 120000 }
// browser: { minDelay: 5000 }
// memory_search: { minDelay: 0 } // No limit
```

## 🎨 Frontend

### View: Rate Limits
```typescript
// Header: Status (enabled/disabled), Current throttle level

// Section: Global Limits
// - Min time between calls (slider: 0-30s)

// Section: Per-Tool Limits
// - Tabela: Tool | Min Delay | Max Batch | Cooldown
// - Editable cells

// Section: Batch Configuration
// - Toggle: "Batch similar work"
// - Explanation: "One request for 10 leads, not 10 requests"

// Section: Error Handling
// - On 429: Wait time (default 5min)
// - Retry attempts (default 3)
// - Exponential backoff toggle

// Section: Current Status
// - Recent rate limit hits
// - Current throttle state
// - Queue size (se aplicável)
```

## 📊 Critérios
- [ ] Rate limit por tool
- [ ] Batch work configuration
- [ ] 429 error handling
- [ ] Throttling visual feedback
- [ ] Queue management

## ⏱️ Estimativa: 3 dias
