# Spec E3: Token & Cost Metrics Dashboard

## 🎯 Objetivo
Dashboard centralizado de métricas: tokens, custos, uso por modelo, com gráficos e exportação.

## 🔧 Backend

### Gateway Handlers
- `metrics.usage` - Uso de tokens por período
- `metrics.costs` - Custos detalhados
- `metrics.models` - Uso por modelo específico
- `metrics.sessions` - Custos por sessão
- `metrics.export` - Exportar CSV/JSON

### Data Aggregation
```typescript
interface MetricsQuery {
  period: '1h' | '24h' | '7d' | '30d' | 'custom';
  startDate?: string;
  endDate?: string;
  groupBy?: 'hour' | 'day' | 'week';
  filters?: {
    models?: string[];
    providers?: string[];
    sessions?: string[];
  };
}

interface MetricsResponse {
  summary: {
    totalTokens: number;
    totalCost: number;
    totalRequests: number;
    avgTokensPerRequest: number;
    avgCostPerRequest: number;
  };
  timeSeries: Array<{
    timestamp: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
  byModel: Array<{
    model: string;
    provider: string;
    tokens: number;
    cost: number;
    requests: number;
    avgLatency: number;
  }>;
  byProvider: Array<{
    provider: string;
    tokens: number;
    cost: number;
    requests: number;
  }>;
}
```

## 🎨 Frontend

### View: Metrics Dashboard
```typescript
// Header: Time range selector (1h, 24h, 7d, 30d, custom)

// Summary Cards:
// - Total Tokens hoje
// - Total Cost hoje
// - Active Sessions
// - Avg tokens/call

// Charts:
// - Token usage over time (line chart)
// - Cost by model (pie/donut chart)
// - Calls by hour (bar chart)
// - Latency trends (line chart)

// Table: Por modelo
// - Modelo | Provider | Calls | Input Tokens | Output Tokens | Cost | Avg Latency
// - Sortable columns
// - Filterable

// Filters:
// - Por provider (checkboxes)
// - Por modelo (multiselect)
// - Por período

// Export:
// - Botão "Export CSV"
// - Botão "Export JSON"
```

## 📊 Critérios
- [ ] Time series de tokens/costs
- [ ] Gráficos visuais (line, pie, bar)
- [ ] Tabela detalhada por modelo
- [ ] Filtros dinâmicos
- [ ] Export CSV/JSON
- [ ] Real-time updates (WebSocket)
- [ ] Mobile responsive

## ⏱️ Estimativa: 4 dias
