# OpenClaw UI Redesign - Especificações Completas

## Visão Geral
Redesign visual completo da interface OpenClaw para criar uma experiência mais moderna, profissional e agradável, mantendo todas as funcionalidades existentes.

## Objetivos
1. **Eliminar a cor vermelha agressiva** - Substituir por indigo moderno
2. **Melhorar legibilidade** - Trocar Space Grotesk por Inter
3. **Padronizar espaçamento** - Sistema de 8px grid
4. **Modernizar componentes** - Botões, inputs, cards, chat bubbles
5. **Corrigir elementos específicos** - Diff panel, status dots, etc.

---

## Fase 1: Paleta de Cores (IMPACTO MÁXIMO)

### Alterações em `base.css`

#### Nova Cor Primária (Indigo)
```css
/* SUBSTITUIR */
--accent: #6366f1;              /* Indigo 500 */
--accent-hover: #818cf8;        /* Indigo 400 */
--accent-muted: #a5b4fc;        /* Indigo 300 */
--accent-subtle: rgba(99, 102, 241, 0.15);
--accent-glow: rgba(99, 102, 241, 0.3);
--accent-foreground: #ffffff;
--primary: #6366f1;
--primary-foreground: #ffffff;

--ring: #6366f1;

--focus: rgba(99, 102, 241, 0.25);
--focus-ring: 0 0 0 2px var(--bg), 0 0 0 4px var(--ring);
--focus-glow: 0 0 0 2px var(--bg), 0 0 0 4px var(--ring), 0 0 20px var(--accent-glow);
```

#### Cores de Fundo Melhoradas
```css
/* Dark Mode - Mais profundo */
--bg: #0a0a0f;                  /* Era #12141a */
--bg-accent: #12121a;           /* Era #14161d */
--bg-elevated: #1a1a24;         /* Era #1a1d25 */
--bg-hover: #252532;            /* Era #262a35 */
--bg-muted: #2a2a3a;            /* Era #262a35 */

/* Card - Melhor contraste */
--card: #161620;                /* Era #181b22 */
--card-foreground: #f4f4f5;
--card-highlight: rgba(255, 255, 255, 0.04);

--popover: #1e1e2a;
--popover-foreground: #f4f4f5;

/* Panel */
--panel: #0a0a0f;
--panel-strong: #12121a;
--panel-hover: #1a1a24;
```

#### Cores de Texto
```css
--text: #e2e2e8;                /* Era #e4e4e7 */
--text-strong: #ffffff;
--chat-text: #e2e2e8;
--muted: #6b6b78;               /* Era #71717a */
--muted-strong: #8a8a98;        /* Era #52525b */
--muted-foreground: #6b6b78;
```

#### Cores de Borda
```css
--border: #2a2a38;              /* Era #27272a */
--border-strong: #3d3d50;       /* Era #3f3f46 */
--border-hover: #52526b;        /* Era #52525b */
--input: #2a2a38;
```

#### Cores Semânticas (Manter)
```css
--ok: #10b981;                  /* Emerald - calmer */
--ok-muted: rgba(16, 185, 129, 0.75);
--ok-subtle: rgba(16, 185, 129, 0.12);

--destructive: #ef4444;         /* Red for errors only */
--destructive-foreground: #fafafa;

--warn: #f59e0b;                /* Amber */
--warn-muted: rgba(245, 158, 11, 0.75);
--warn-subtle: rgba(245, 158, 11, 0.12);

--danger: #ef4444;
--danger-muted: rgba(239, 68, 68, 0.75);
--danger-subtle: rgba(239, 68, 68, 0.12);

--info: #3b82f6;                /* Blue */
```

#### Sombras Refinadas
```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.02);
--shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.02);
--shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.02);
--shadow-glow: 0 0 30px var(--accent-glow);
```

### Modo Claro (`[data-theme="light"]`)

```css
/* Backgrounds */
--bg: #fafafa;
--bg-accent: #f5f5f7;
--bg-elevated: #ffffff;
--bg-hover: #f0f0f2;
--bg-muted: #f0f0f2;

/* Card */
--card: #ffffff;
--card-foreground: #18181b;
--card-highlight: rgba(0, 0, 0, 0.02);

--popover: #ffffff;
--popover-foreground: #18181b;

/* Text */
--text: #27272a;
--text-strong: #09090b;
--chat-text: #27272a;
--muted: #52525b;
--muted-strong: #71717a;
--muted-foreground: #52525b;

/* Borders */
--border: #e4e4e7;
--border-strong: #d4d4d8;
--border-hover: #a1a1aa;
--input: #e4e4e7;

/* Accent - Indigo mais escuro para contraste */
--accent: #4f46e5;              /* Indigo 600 */
--accent-hover: #6366f1;
--accent-muted: #818cf8;
--accent-subtle: rgba(79, 70, 229, 0.12);
--accent-foreground: #ffffff;
--accent-glow: rgba(79, 70, 229, 0.2);
--primary: #4f46e5;
--primary-foreground: #ffffff;

--ring: #4f46e5;
--focus: rgba(79, 70, 229, 0.2);

/* Sombras sutis */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(0, 0, 0, 0.02);
--shadow-lg: 0 12px 28px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(0, 0, 0, 0.02);
--shadow-xl: 0 24px 48px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.02);
--shadow-glow: 0 0 24px var(--accent-glow);

/* Semantic colors */
--ok: #10b981;
--destructive: #dc2626;
--warn: #d97706;
--danger: #dc2626;
--info: #2563eb;
```

---

## Fase 2: Sistema Tipográfico

### Nova Fonte (Inter)
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap");

--font-body: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-display: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;
```

### Escala Tipográfica
```css
--text-xs: 11px;        /* Captions, timestamps */
--text-sm: 13px;        /* Labels, small text */
--text-base: 15px;      /* Body text (+1px) */
--text-lg: 17px;        /* Card titles */
--text-xl: 21px;        /* Section headers */
--text-2xl: 26px;       /* Page titles */

/* Line heights */
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### Aplicação no Body
```css
body {
  margin: 0;
  font: 400 15px/1.5 var(--font-body);  /* Era 14px/1.55 */
  letter-spacing: normal;                  /* Era -0.02em */
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Fase 3: Sistema de Espaçamento (8px Grid)

### Variáveis de Espaço
```css
--space-0: 0;
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
```

### Utilitários de Espaçamento
```css
/* Gap utilities */
.gap-1 { gap: var(--space-1); }
.gap-2 { gap: var(--space-2); }
.gap-3 { gap: var(--space-3); }
.gap-4 { gap: var(--space-4); }
.gap-5 { gap: var(--space-5); }
.gap-6 { gap: var(--space-6); }

/* Vertical spacing */
.space-y-1 > * + * { margin-top: var(--space-1); }
.space-y-2 > * + * { margin-top: var(--space-2); }
.space-y-3 > * + * { margin-top: var(--space-3); }
.space-y-4 > * + * { margin-top: var(--space-4); }
.space-y-5 > * + * { margin-top: var(--space-5); }
.space-y-6 > * + * { margin-top: var(--space-6); }

/* Padding utilities */
.p-4 { padding: var(--space-4); }
.p-5 { padding: var(--space-5); }
.p-6 { padding: var(--space-6); }

/* Margin utilities */
.mt-4 { margin-top: var(--space-4); }
.mt-5 { margin-top: var(--space-5); }
.mt-6 { margin-top: var(--space-6); }
```

---

## Fase 4: Botões Modernizados

### Base Button (sem translateY)
```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent;
  padding: 10px 18px;
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  transition:
    background-color var(--duration-fast) ease,
    color var(--duration-fast) ease,
    box-shadow var(--duration-fast) ease,
    border-color var(--duration-fast) ease;
}
```

### Variantes

**Primary (Filled)**
```css
.btn-primary {
  background: var(--accent);
  color: var(--accent-foreground);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 12px var(--accent-glow);
  transform: none;  /* Remover translateY */
}

.btn-primary:active {
  background: var(--accent);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}
```

**Secondary (Outline)**
```css
.btn-secondary {
  background: var(--bg-elevated);
  color: var(--text);
  border-color: var(--border);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}
```

**Ghost**
```css
.btn-ghost {
  background: transparent;
  color: var(--muted);
}

.btn-ghost:hover {
  background: var(--bg-hover);
  color: var(--text);
}
```

**Danger (Apenas para ações destrutivas)**
```css
.btn-danger {
  background: var(--danger-subtle);
  color: var(--danger);
}

.btn-danger:hover {
  background: rgba(239, 68, 68, 0.2);
}
```

**Sizes**
```css
.btn-sm { padding: 6px 10px; font-size: 12px; }
.btn-md { padding: 10px 18px; font-size: 13px; }  /* Default */
.btn-lg { padding: 12px 20px; font-size: 14px; }
```

---

## Fase 5: Inputs Modernizados

### Campo de Input
```css
.field input,
.field textarea,
.field select {
  width: 100%;
  padding: 11px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 10px;  /* Era 8px */
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  color: var(--text);
  transition:
    background-color var(--duration-fast) ease,
    border-color var(--duration-fast) ease,
    box-shadow var(--duration-fast) ease;
  /* REMOVER: box-shadow: inset 0 1px 0 var(--card-highlight); */
}

.field input:hover,
.field textarea:hover,
.field select:hover {
  background: var(--bg-hover);
  border-color: var(--border-strong);
}

.field input:focus,
.field textarea:focus,
.field select:focus {
  background: var(--bg-elevated);
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-subtle);
  outline: none;
}
```

### Modo Claro
```css
:root[data-theme="light"] .field input,
:root[data-theme="light"] .field textarea,
:root[data-theme="light"] .field select {
  background: #ffffff;
  border-color: var(--border-strong);
}

:root[data-theme="light"] .field input:focus,
:root[data-theme="light"] .field textarea:focus,
:root[data-theme="light"] .field select:focus {
  background: #ffffff;
}
```

---

## Fase 6: Cards Modernizados

### Card Base
```css
.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 14px;  /* Era 12px */
  padding: var(--space-5);
  transition:
    border-color var(--duration-normal) ease,
    box-shadow var(--duration-normal) ease;
  /* REMOVER: box-shadow: inset 0 1px 0 var(--card-highlight); */
  box-shadow: var(--shadow-sm);
}

.card:hover {
  border-color: var(--border-strong);
  box-shadow: var(--shadow-md);
}
```

### Variantes
```css
.card-elevated {
  box-shadow: var(--shadow-md);
}

.card-interactive {
  cursor: pointer;
}

.card-interactive:hover {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent-subtle), var(--shadow-md);
}

/* Card com seções */
.card__header {
  padding: var(--space-5);
  border-bottom: 1px solid var(--border);
}

.card__body {
  padding: var(--space-5);
}

.card__footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border);
  background: var(--bg-accent);
  border-radius: 0 0 14px 14px;
}
```

### Títulos de Card
```css
.card-title {
  font-size: var(--text-lg);  /* Era 15px */
  font-weight: 600;
  color: var(--text-strong);
  letter-spacing: normal;  /* Era -0.02em */
}

.card-sub {
  color: var(--muted);
  font-size: var(--text-sm);
  margin-top: var(--space-1);
  line-height: var(--leading-normal);
}
```

---

## Fase 7: Chat Bubbles Redesenhadas

### Bubble Base
```css
.chat-bubble {
  position: relative;
  display: inline-block;
  max-width: 100%;
  padding: 12px 16px;
  border-radius: 18px;  /* Mais arredondado, amigável */
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  word-wrap: break-word;
  transition: background-color 150ms ease;
}
```

### User Bubble (Indigo em vez de vermelho)
```css
.chat-line.user .chat-bubble {
  background: var(--accent);  /* Indigo */
  color: white;
  border: none;
}

.chat-line.user .chat-bubble:hover {
  background: var(--accent-hover);
}

/* REMOVER versões light mode com vermelho */
```

### Assistant Bubble
```css
.chat-line.assistant .chat-bubble {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
}

.chat-line.assistant .chat-bubble:hover {
  border-color: var(--border-strong);
}
```

### Light Mode
```css
:root[data-theme="light"] .chat-line.user .chat-bubble {
  background: var(--accent);  /* Indigo */
  color: white;
  border: none;
}

:root[data-theme="light"] .chat-line.assistant .chat-bubble {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text);
}
```

---

## Fase 8: Elementos Específicos

### Status Dots (Remover animação pulsing)
```css
.statusDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  /* REMOVER: box-shadow: 0 0 8px rgba(239, 68, 68, 0.5); */
  /* REMOVER: animation: pulse-subtle 2s ease-in-out infinite; */
}

.statusDot.ok {
  background: var(--ok);
  /* REMOVER: box-shadow e animação */
}
```

### Config Diff Panel (Remover borda vermelha)
```css
.config-diff {
  margin: var(--space-4) var(--space-5);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: transparent;
  overflow: hidden;
}

.config-diff:not([open]) {
  border-color: var(--border-strong);
}

.config-diff[open] {
  border-color: var(--accent);  /* Indigo em vez de vermelho */
}

/* REMOVER: border: 1px solid rgba(255, 77, 77, 0.25) */
```

### Callouts (Bordas menos agressivas)
```css
.callout.danger {
  border-color: rgba(239, 68, 68, 0.15);  /* Era 0.25 */
  background: rgba(239, 68, 68, 0.05);    /* Menos intenso */
  color: var(--danger);
}

.callout.info {
  border-color: rgba(59, 130, 246, 0.15);
  background: rgba(59, 130, 246, 0.05);
  color: var(--info);
}

.callout.success {
  border-color: rgba(16, 185, 129, 0.15);
  background: rgba(16, 185, 129, 0.05);
  color: var(--ok);
}
```

### Number Input Buttons (Menores)
```css
.cfg-number__btn {
  width: 32px;        /* Era 44px */
  height: 32px;
  font-size: 16px;
}
```

---

## Fase 9: Layout e Responsividade

### Raio de Borda Aumentado
```css
--radius-sm: 6px;
--radius-md: 10px;   /* Era 8px */
--radius-lg: 14px;   /* Era 12px */
--radius-xl: 20px;   /* Era 16px */
--radius-full: 9999px;
```

### Shell Layout
```css
.shell {
  --shell-pad: 16px;
  --shell-gap: 16px;
  --shell-nav-width: 240px;  /* Era 220px */
  --shell-topbar-height: 60px;  /* Era 56px */
}
```

### Content Area
```css
.content {
  padding: var(--space-4) var(--space-6) var(--space-8);
  gap: var(--space-6);
}
```

---

## Fase 10: Animações e Transições

### Transições Mais Suaves
```css
--duration-fast: 150ms;    /* Era 120ms */
--duration-normal: 200ms;
--duration-slow: 300ms;    /* Era 350ms */

--ease-out: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
```

### Remover Animações Intrusivas
```css
/* REMOVER glow-pulse keyframes que usam vermelho */
/* REMOVER pulse-subtle de statusDot */
/* Manter: rise, fade-in, scale-in, shimmer */
```

---

## Checklist de Implementação

### Prioridade 1 (Máximo Impacto Visual)
- [ ] Alterar cor primária vermelha → indigo em `base.css`
- [ ] Trocar fonte Space Grotesk → Inter
- [ ] Aumentar fonte base 14px → 15px
- [ ] Remover letter-spacing negativo do body

### Prioridade 2 (Componentes Base)
- [ ] Redesenhar botões (sem translateY)
- [ ] Redesenhar inputs (sem inset shadow)
- [ ] Redesenhar cards (sem inset shadow)
- [ ] Atualizar raio de bordas

### Prioridade 3 (Chat)
- [ ] Redesenhar chat bubbles (indigo em vez de vermelho)
- [ ] Aumentar border-radius das bubbles
- [ ] Atualizar light mode do chat

### Prioridade 4 (Correções Específicas)
- [ ] Corrigir config diff panel (remover borda vermelha)
- [ ] Corrigir status dots (remover animação)
- [ ] Corrigir callouts (bordas menos agressivas)
- [ ] Reduzir botões de número

### Prioridade 5 (Polimento)
- [ ] Adicionar utility classes de espaçamento
- [ ] Ajustar layout shell
- [ ] Testar modo claro/escuro
- [ ] Verificar responsividade

---

## Resultado Esperado

### Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Cor primária** | 🔴 Vermelho agressivo | 🔵 Indigo profissional |
| **Fonte** | Space Grotesk (difícil ler) | Inter (legível) |
| **Tamanho fonte** | 14px pequeno | 15px confortável |
| **Botões** | Pulam no hover | Sombra suave no hover |
| **Inputs** | Afundados (inset) | Limpos, modernos |
| **Cards** | Bordas duplas, inset | Clean, sombra suave |
| **Chat usuário** | Fundo vermelho | Fundo indigo |
| **Diff panel** | Borda vermelha gritante | Borda indigo sutil |
| **Status dots** | Pulsação vermelha | Estática, calma |

### Screenshots Esperados

**Dashboard (Overview):**
- Cards com sombra suave indigo
- Estatísticas com números grandes, labels pequenos
- Botões indigo ao invés de vermelho

**Chat:**
- User bubbles: indigo sólido, texto branco
- Assistant bubbles: cinza claro com borda
- Input limpo, sem sombra interna

**Config:**
- Formulários com inputs modernos
- Diff panel sem borda vermelha alarmante
- Seções com header organizado

---

## Notas de Implementação

1. **Backup:** Fazer backup dos arquivos CSS originais antes de modificar
2. **Testes:** Testar em ambos os modos (claro/escuro)
3. **Browsers:** Verificar compatibilidade (Chrome, Firefox, Safari)
4. **Performance:** As novas sombras são mais suaves (melhor performance)
5. **Acessibilidade:** Manter contraste WCAG AA em todos os elementos

---

## Arquivos a Modificar

1. `ui/src/styles/base.css` - Cores, fontes, variáveis base
2. `ui/src/styles/components.css` - Botões, inputs, cards, chat
3. `ui/src/styles/layout.css` - Layout shell, espaçamentos
4. `ui/src/styles/config.css` - Formulários, diff panel (se existir)

---

**Status:** Pronto para implementação
**Estimativa:** 20-25 horas de trabalho
**Complexidade:** Média (mudanças principalmente em CSS)
