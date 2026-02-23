# Spec E2: Budget Controls

## 🎯 Objetivo
Controle de orçamento com limites diários/mensais e alertas configuráveis.

## 📋 Requisitos
```
Daily budget: $5 (warning at 75%)
Monthly budget: $200 (warning at 75%)
Hard stop option: parar quando atingir limite
```

## 🔧 Backend

### Gateway Handlers
- `budget.config.get` - Obter configuração de budgets
- `budget.config.set` - Definir budgets e alertas
- `budget.status` - Status atual (gasto, restante, projeção)
- `budget.history` - Histórico de gastos

### Budget Tracker
```typescript
interface BudgetConfig {
  daily: {
    limit: number;        // Default: 5
    alertThresholds: number[];  // [0.75] = 75%
    hardStop: boolean;    // Parar ao atingir limite
  };
  monthly: {
    limit: number;        // Default: 200
    alertThresholds: number[];  // [0.75] = 75%
    hardStop: boolean;
  };
  notifications: {
    desktop: boolean;
    email: boolean;
    emailAddress?: string;
  };
}

interface BudgetStatus {
  daily: {
    spent: number;
    limit: number;
    remaining: number;
    percentage: number;
    projected: number;    // Projeção até final do dia
  };
  monthly: {
    spent: number;
    limit: number;
    remaining: number;
    percentage: number;
    projected: number;
  };
  alerts: {
    triggered: boolean;
    type: 'daily' | 'monthly';
    threshold: number;
    message: string;
  }[];
}
```

### Tracking
- Track por: provider, model, session
- Atualizar em tempo real (ou quase)
- Salvar histórico para analytics

## 🎨 Frontend

### View: Budget
```typescript
// Header: Toggle enable/disable

// Cards com Gauges:
// - Daily: Progress bar (verde <75%, amarelo <100%, vermelho >=100%)
//   - Spent: $3.75 / $5.00
//   - Remaining: $1.25
//   - Projected: $4.50 (on track)
//
// - Monthly: Progress bar
//   - Spent: $150.00 / $200.00
//   - Remaining: $50.00
//   - Projected: $180.00

// Settings:
// - Daily limit input
// - Monthly limit input
// - Alert thresholds (checkboxes: 50%, 75%, 90%, 100%)
// - Hard stop toggle
// - Notification preferences

// Breakdown:
// - Por modelo: tabela com gastos
// - Por provider: pie chart
// - Por dia: line chart (últimos 30 dias)

// History:
// - Lista de transações
// - Export CSV
```

## 📊 Critérios
- [ ] Budget diário e mensal
- [ ] Alertas em thresholds configuráveis
- [ ] Hard stop opcional
- [ ] Projeção de gastos
- [ ] Breakdown por modelo/provider
- [ ] Notificações desktop/email
- [ ] Export CSV

## ⏱️ Estimativa: 3 dias
