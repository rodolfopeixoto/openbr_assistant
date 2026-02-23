# Spec Driven Development: Chat UX Improvements

## Status: DRAFT → READY FOR IMPLEMENTATION

---

## 1. VISÃO GERAL

### 1.1 Objetivo
Melhorar a experiência do chat no Control UI com duas features:
1. **Botão Scroll-to-Bottom**: Quando usuário scrolla para cima, mostrar botão para voltar ao fim da conversa
2. **Indicador Visual de Thinking**: Feedback claro quando modelo está "pensando" nos diferentes níveis (Off, Minimum, Low, Medium, High)

### 1.2 Problemas Identificados
- ✅ Usuário scrolla para cima e não consegue voltar facilmente ao final
- ❌ Nível de thinking selecionado não parece fazer diferença na resposta
- ❌ Sem feedback visual quando modelo está processando/pensando
- ❌ Tempo de resposta longo sem indicação do que está acontecendo
- ❌ Sem indicador de qual nível de thinking está ativo no momento

### 1.3 Solução Proposta
```
┌─────────────────────────────────────────────────────────────────┐
│  Chat Interface                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ [Messages scroll area]                                   │    │
│  │                                                          │    │
│  │  User: Hello!                                            │    │
│  │                                                          │    │
│  │  Assistant: [THINKING...] ◀── Visual indicator          │    │
│  │             ┌─────────────────────────┐                  │    │
│  │             │ 🧠 Thinking mode: Low   │ ◀── Badge       │    │
│  │             │ Processing your request │                  │    │
│  │             └─────────────────────────┘                  │    │
│  │                                                          │    │
│  │  [User scrolls up ↑]                                     │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────┐                        │    │
│  │  │  ↓ Scroll to bottom         │ ◀── Button aparece    │    │
│  │  └──────────────────────────────┘                        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [Input area with thinking level selector: Off | Min | Low | Med | High]
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. FEATURE 1: BOTÃO SCROLL-TO-BOTTOM

### 2.1 Comportamento Esperado

#### Estado Inicial
- Usuário está no final do chat (scroll posicionado embaixo)
- Botão NÃO está visível

#### Quando Usuário Scrola Para Cima
- Detectar quando scroll position > 100px do final
- Mostrar botão flutuante no canto inferior direito
- Botão deve ter animação suave de entrada

#### Quando Clica no Botão
- Scroll suave até o final da conversa
- Botão desaparece com animação
- Foco volta para área de mensagens

#### Quando Nova Mensagem Chega
- Se usuário estiver no final: scroll automático
- Se usuário estiver no topo: mostrar badge "Nova mensagem" + botão scroll

### 2.2 Design do Botão

```css
.scroll-to-bottom-btn {
  position: fixed;
  bottom: 100px;  /* Acima do input area */
  right: 24px;
  
  /* Estilo */
  background: var(--accent, #6366f1);
  color: white;
  border: none;
  border-radius: 50%;
  width: 48px;
  height: 48px;
  
  /* Sombra */
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  
  /* Animação */
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.scroll-to-bottom-btn.visible {
  opacity: 1;
  transform: translateY(0);
}

.scroll-to-bottom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
}

/* Badge de nova mensagem */
.new-message-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  animation: pulse 2s infinite;
}
```

### 2.3 Implementação

#### Componente: ScrollToBottomButton
```typescript
// ui/src/components/ScrollToBottomButton.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('scroll-to-bottom-button')
export class ScrollToBottomButton extends LitElement {
  static styles = css`
    :host {
      display: block;
      position: fixed;
      bottom: 100px;
      right: 24px;
      z-index: 100;
    }
    
    .btn {
      background: var(--accent, #6366f1);
      color: white;
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      opacity: 0;
      transform: translateY(10px) scale(0.9);
      pointer-events: none;
    }
    
    .btn.visible {
      opacity: 1;
      transform: translateY(0) scale(1);
      pointer-events: auto;
    }
    
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5);
    }
    
    .badge {
      position: absolute;
      top: -4px;
      right: -4px;
      background: #ef4444;
      color: white;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 6px;
      border-radius: 10px;
      min-width: 18px;
      text-align: center;
    }
    
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.1); }
    }
    
    .badge.pulse {
      animation: pulse 2s ease-in-out infinite;
    }
  `;
  
  @property({ type: Boolean }) visible = false;
  @property({ type: Number }) newMessageCount = 0;
  
  render() {
    return html`
      <button 
        class="btn ${this.visible ? 'visible' : ''}"
        @click=${this.handleClick}
        aria-label="Scroll to bottom"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
        
        ${this.newMessageCount > 0 ? html`
          <span class="badge ${this.newMessageCount > 0 ? 'pulse' : ''}">
            ${this.newMessageCount > 9 ? '9+' : this.newMessageCount}
          </span>
        ` : null}
      </button>
    `;
  }
  
  private handleClick() {
    this.dispatchEvent(new CustomEvent('scroll-to-bottom', {
      bubbles: true,
      composed: true,
    }));
  }
}
```

#### Hook: useScrollPosition
```typescript
// ui/src/hooks/useScrollPosition.ts
import { useState, useEffect, useCallback } from 'lit';

interface ScrollPosition {
  scrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  isAtBottom: boolean;
  scrollProgress: number;
}

export function useScrollPosition(
  containerRef: HTMLElement | null,
  threshold: number = 100
): ScrollPosition {
  const [position, setPosition] = useState<ScrollPosition>({
    scrollTop: 0,
    scrollHeight: 0,
    clientHeight: 0,
    isAtBottom: true,
    scrollProgress: 1,
  });
  
  const updatePosition = useCallback(() => {
    if (!containerRef) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom <= threshold;
    const scrollProgress = scrollTop / (scrollHeight - clientHeight);
    
    setPosition({
      scrollTop,
      scrollHeight,
      clientHeight,
      isAtBottom,
      scrollProgress: Math.min(Math.max(scrollProgress, 0), 1),
    });
  }, [containerRef, threshold]);
  
  useEffect(() => {
    if (!containerRef) return;
    
    containerRef.addEventListener('scroll', updatePosition, { passive: true });
    updatePosition();
    
    return () => {
      containerRef.removeEventListener('scroll', updatePosition);
    };
  }, [containerRef, updatePosition]);
  
  return position;
}

export function scrollToBottom(
  container: HTMLElement,
  behavior: ScrollBehavior = 'smooth'
): void {
  container.scrollTo({
    top: container.scrollHeight,
    behavior,
  });
}
```

#### Uso no Chat
```typescript
// No componente principal do chat
@state() private chatContainerRef: HTMLElement | null = null;
@state() private newMessageCount = 0;
@state() private lastScrollPosition = 0;

// Detectar scroll
connectedCallback() {
  super.connectedCallback();
  this.setupScrollListener();
}

private setupScrollListener() {
  if (!this.chatContainerRef) return;
  
  this.chatContainerRef.addEventListener('scroll', () => {
    const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef!;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    
    // Resetar contador de novas mensagens se usuário scrollou para baixo
    if (isAtBottom) {
      this.newMessageCount = 0;
    }
  });
}

// Quando nova mensagem chega
private handleNewMessage() {
  const { scrollTop, scrollHeight, clientHeight } = this.chatContainerRef!;
  const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
  
  if (isAtBottom) {
    // Usuário está no final, scroll automático
    scrollToBottom(this.chatContainerRef!);
  } else {
    // Usuário está em outro lugar, incrementar contador
    this.newMessageCount++;
  }
}

// Render
render() {
  const isScrolledUp = !this.isAtBottom;
  
  return html`
    <div class="chat-container" ${ref(this.setChatContainerRef)}>
      <!-- Messages -->
      ${this.messages.map(msg => this.renderMessage(msg))}
    </div>
    
    <scroll-to-bottom-button
      .visible=${isScrolledUp || this.newMessageCount > 0}
      .newMessageCount=${this.newMessageCount}
      @scroll-to-bottom=${() => scrollToBottom(this.chatContainerRef!)}
    ></scroll-to-bottom-button>
  `;
}
```

---

## 3. FEATURE 2: INDICADOR VISUAL DE THINKING

### 3.1 Problema Atual
```
❌ Nível de thinking selecionado no dropdown
❌ Mensagem enviada
❌ ... (tempo longo sem feedback)
❌ Resposta aparece de uma vez

PROBLEMA: Usuário não sabe:
- Se o thinking está funcionando
- Qual nível está sendo usado
- Se o modelo está processando
- Por que demora tanto
```

### 3.2 Solução Proposta

#### Estados Visuais do Thinking
```
┌─────────────────────────────────────────────────────┐
│ Estado: Off                                         │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Assistant                                       │ │
│ │                                                 │ │
│ │ Resposta direta sem thinking...                 │ │
│ │                                                 │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Estado: Thinking Ativo (Low/Medium/High)           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Assistant                    🧠 Thinking: Low  │ │
│ │                                                 │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ 🧠 Processing...                         │   │ │
│ │ │                                          │   │ │
│ │ │ Step 1: Analyzing the problem... ✓      │   │ │
│ │ │ Step 2: Gathering information...        │   │ │
│ │ │                                          │   │ │
│ │ │ [Progress bar: ▓▓▓▓▓▓░░░░░░░░] 40%     │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ (Tempo estimado: ~15 seconds)                   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Estado: Thinking Completo                          │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Assistant                    🧠 Thinking: Low  │ │
│ │                                                 │ │
│ │ ┌───────────────────────────────────────────┐   │ │
│ │ │ 🧠 Thinking Process (3.2s)              │   │ │
│ │ │                                          │   │ │
│ │ │ 1. Analyzed user intent                 │   │ │
│ │ │ 2. Retrieved relevant context           │   │ │
│ │ │ 3. Formulated response strategy         │   │ │
│ │ └───────────────────────────────────────────┘   │ │
│ │                                                 │ │
│ │ Resposta final aqui...                          │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3.3 Design do Indicador

```css
/* Badge de thinking no header da mensagem */
.thinking-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 500;
  animation: fadeIn 0.3s ease;
}

.thinking-badge.off {
  display: none;
}

.thinking-badge.minimum {
  background: rgba(107, 114, 128, 0.2);
  color: #9ca3af;
}

.thinking-badge.low {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
}

.thinking-badge.medium {
  background: rgba(168, 85, 247, 0.2);
  color: #c084fc;
}

.thinking-badge.high {
  background: rgba(236, 72, 153, 0.2);
  color: #f472b6;
}

/* Spinner animado */
@keyframes thinking-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.05); }
}

.thinking-spinner {
  animation: thinking-pulse 1.5s ease-in-out infinite;
}

/* Container de thinking em progresso */
.thinking-container {
  background: rgba(99, 102, 241, 0.05);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 12px;
  padding: 16px;
  margin: 12px 0;
}

.thinking-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--accent, #6366f1);
  margin-bottom: 12px;
}

.thinking-steps {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.thinking-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text, #fff);
}

.thinking-step.completed {
  color: #22c55e;
}

.thinking-step.active {
  color: var(--accent, #6366f1);
}

.thinking-step.pending {
  color: var(--muted, #666);
}

/* Progress bar */
.thinking-progress {
  height: 4px;
  background: rgba(99, 102, 241, 0.2);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 12px;
}

.thinking-progress-bar {
  height: 100%;
  background: var(--accent, #6366f1);
  border-radius: 2px;
  transition: width 0.3s ease;
}
```

### 3.4 Implementação

#### Componente: ThinkingIndicator
```typescript
// ui/src/components/ThinkingIndicator.ts
import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type ThinkingLevel = 'off' | 'minimum' | 'low' | 'medium' | 'high';

interface ThinkingStep {
  id: string;
  label: string;
  status: 'pending' | 'active' | 'completed';
  duration?: number;
}

@customElement('thinking-indicator')
export class ThinkingIndicator extends LitElement {
  static styles = css`
    :host {
      display: block;
    }
    
    /* Badge no header */
    .thinking-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      font-weight: 500;
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .thinking-badge.off { display: none; }
    
    .thinking-badge.minimum {
      background: rgba(107, 114, 128, 0.2);
      color: #9ca3af;
    }
    
    .thinking-badge.low {
      background: rgba(59, 130, 246, 0.2);
      color: #60a5fa;
    }
    
    .thinking-badge.medium {
      background: rgba(168, 85, 247, 0.2);
      color: #c084fc;
    }
    
    .thinking-badge.high {
      background: rgba(236, 72, 153, 0.2);
      color: #f472b6;
    }
    
    .thinking-icon {
      animation: thinking-pulse 1.5s ease-in-out infinite;
    }
    
    @keyframes thinking-pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.1); }
    }
    
    /* Container de thinking em progresso */
    .thinking-container {
      background: rgba(99, 102, 241, 0.05);
      border: 1px solid rgba(99, 102, 241, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin: 12px 0;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    
    .thinking-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
    }
    
    .thinking-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: var(--accent, #6366f1);
    }
    
    .thinking-timer {
      font-size: 12px;
      color: var(--muted, #888);
      font-variant-numeric: tabular-nums;
    }
    
    .thinking-steps {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .thinking-step {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      transition: all 0.3s ease;
    }
    
    .thinking-step.completed {
      color: #22c55e;
    }
    
    .thinking-step.active {
      color: var(--accent, #6366f1);
    }
    
    .thinking-step.pending {
      color: var(--muted, #666);
    }
    
    .step-icon {
      width: 16px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .thinking-progress {
      height: 4px;
      background: rgba(99, 102, 241, 0.2);
      border-radius: 2px;
      overflow: hidden;
      margin-top: 12px;
    }
    
    .thinking-progress-bar {
      height: 100%;
      background: var(--accent, #6366f1);
      border-radius: 2px;
      transition: width 0.3s ease;
    }
    
    /* Resumo após completar */
    .thinking-summary {
      background: rgba(34, 197, 94, 0.05);
      border: 1px solid rgba(34, 197, 94, 0.2);
      border-radius: 8px;
      padding: 12px;
      margin-top: 12px;
      font-size: 13px;
    }
    
    .thinking-summary-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 600;
      color: #22c55e;
      margin-bottom: 8px;
    }
    
    .thinking-summary-steps {
      display: flex;
      flex-direction: column;
      gap: 4px;
      color: var(--text, #fff);
    }
  `;
  
  @property({ type: String }) level: ThinkingLevel = 'off';
  @property({ type: Boolean }) isThinking = false;
  @property({ type: Number }) elapsedTime = 0;
  @property({ type: Array }) steps: ThinkingStep[] = [];
  @property({ type: Number }) progress = 0;
  @property({ type: Boolean }) showSummary = false;
  
  private timerInterval?: number;
  
  connectedCallback() {
    super.connectedCallback();
    if (this.isThinking) {
      this.startTimer();
    }
  }
  
  disconnectedCallback() {
    super.disconnectedCallback();
    this.stopTimer();
  }
  
  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('isThinking')) {
      if (this.isThinking) {
        this.startTimer();
      } else {
        this.stopTimer();
      }
    }
  }
  
  private startTimer() {
    this.timerInterval = window.setInterval(() => {
      this.elapsedTime += 0.1;
    }, 100);
  }
  
  private stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }
  
  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  
  private get levelLabel(): string {
    const labels: Record<ThinkingLevel, string> = {
      'off': 'Off',
      'minimum': 'Min',
      'low': 'Low',
      'medium': 'Medium',
      'high': 'High',
    };
    return labels[this.level];
  }
  
  render() {
    if (this.level === 'off') {
      return null;
    }
    
    // Badge compacto para header de mensagem
    if (!this.isThinking && !this.showSummary) {
      return html`
        <span class="thinking-badge ${this.level}">
          <svg class="thinking-icon" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          Thinking: ${this.levelLabel}
        </span>
      `;
    }
    
    // Indicador completo durante thinking
    if (this.isThinking) {
      return html`
        <div class="thinking-container">
          <div class="thinking-header">
            <div class="thinking-title">
              <svg class="thinking-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              Processing (Level: ${this.levelLabel})
            </div>
            <span class="thinking-timer">${this.formatTime(this.elapsedTime)}</span>
          </div>
          
          <div class="thinking-steps">
            ${this.steps.map(step => html`
              <div class="thinking-step ${step.status}">
                <span class="step-icon">
                  ${step.status === 'completed' ? html`
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ` : step.status === 'active' ? html`
                    <div class="thinking-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="12" cy="12" r="10" opacity="0.3"/>
                        <path d="M12 2a10 10 0 0 1 10 10" fill="none" stroke="currentColor" stroke-width="2">
                          <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/>
                        </path>
                      </svg>
                    </div>
                  ` : html`
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.5">
                      <circle cx="12" cy="12" r="10"/>
                    </svg>
                  `}
                </span>
                ${step.label}
                ${step.duration ? html`<span style="color: var(--muted); margin-left: auto;">${step.duration.toFixed(1)}s</span>` : null}
              </div>
            `)}
          </div>
          
          <div class="thinking-progress">
            <div class="thinking-progress-bar" style="width: ${this.progress}%"></div>
          </div>
        </div>
      `;
    }
    
    // Resumo após completar
    if (this.showSummary) {
      return html`
        <div class="thinking-summary">
          <div class="thinking-summary-header">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Thinking Complete (${this.formatTime(this.elapsedTime)})
          </div>
          <div class="thinking-summary-steps">
            ${this.steps.filter(s => s.status === 'completed').map(step => html`
              <div>✓ ${step.label}${step.duration ? ` (${step.duration.toFixed(1)}s)` : ''}</div>
            `)}
          </div>
        </div>
      `;
    }
    
    return null;
  }
}
```

#### Integração com Chat Stream
```typescript
// ui/src/services/chat-stream.ts

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  thinking?: {
    level: ThinkingLevel;
    steps: ThinkingStep[];
    elapsedTime: number;
    inProgress: boolean;
  };
  timestamp: Date;
}

class ChatStreamManager {
  private currentMessage: ChatMessage | null = null;
  private thinkingStartTime: number = 0;
  private thinkingSteps: ThinkingStep[] = [];
  
  async sendMessage(content: string, thinkingLevel: ThinkingLevel) {
    // Criar mensagem vazia do assistant
    this.currentMessage = {
      id: generateUUID(),
      role: 'assistant',
      content: '',
      thinking: thinkingLevel !== 'off' ? {
        level: thinkingLevel,
        steps: this.generateThinkingSteps(thinkingLevel),
        elapsedTime: 0,
        inProgress: true,
      } : undefined,
      timestamp: new Date(),
    };
    
    this.thinkingStartTime = Date.now();
    
    // Emitir evento para UI mostrar thinking
    this.emit('message-start', this.currentMessage);
    
    // Iniciar stream
    const response = await fetch('/api/v1/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: content,
        thinking: thinkingLevel,
      }),
    });
    
    // Processar stream
    const reader = response.body?.getReader();
    if (!reader) return;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = new TextDecoder().decode(value);
      const events = chunk.split('\n\n').filter(Boolean);
      
      for (const event of events) {
        const data = JSON.parse(event.replace('data: ', ''));
        
        // Atualizar thinking steps se fornecido
        if (data.thinkingStep) {
          this.updateThinkingStep(data.thinkingStep);
        }
        
        // Atualizar conteúdo
        if (data.content) {
          this.currentMessage.content += data.content;
          this.emit('message-update', this.currentMessage);
        }
      }
    }
    
    // Finalizar thinking
    if (this.currentMessage.thinking) {
      this.currentMessage.thinking.inProgress = false;
      this.currentMessage.thinking.elapsedTime = (Date.now() - this.thinkingStartTime) / 1000;
    }
    
    this.emit('message-complete', this.currentMessage);
  }
  
  private generateThinkingSteps(level: ThinkingLevel): ThinkingStep[] {
    const stepsByLevel: Record<ThinkingLevel, string[]> = {
      'off': [],
      'minimum': ['Processing request'],
      'low': ['Analyzing request', 'Formulating response'],
      'medium': ['Understanding context', 'Analyzing requirements', 'Planning response', 'Generating output'],
      'high': ['Deep context analysis', 'Multi-step reasoning', 'Evaluating approaches', 'Synthesizing information', 'Crafting detailed response'],
    };
    
    return stepsByLevel[level].map((label, index) => ({
      id: `step-${index}`,
      label,
      status: index === 0 ? 'active' : 'pending',
    }));
  }
  
  private updateThinkingStep(stepUpdate: { id: string; status: string; duration?: number }) {
    const step = this.thinkingSteps.find(s => s.id === stepUpdate.id);
    if (step) {
      step.status = stepUpdate.status as 'pending' | 'active' | 'completed';
      if (stepUpdate.duration) {
        step.duration = stepUpdate.duration;
      }
    }
    
    // Atualizar próximo step para active
    const currentIndex = this.thinkingSteps.findIndex(s => s.id === stepUpdate.id);
    if (currentIndex < this.thinkingSteps.length - 1) {
      this.thinkingSteps[currentIndex + 1].status = 'active';
    }
    
    if (this.currentMessage?.thinking) {
      this.currentMessage.thinking.steps = [...this.thinkingSteps];
      this.emit('thinking-update', this.currentMessage.thinking);
    }
  }
  
  private emit(event: string, data: unknown) {
    // Emitir evento para componentes
    window.dispatchEvent(new CustomEvent(event, { detail: data }));
  }
}
```

### 3.5 Backend: Suporte a Thinking Steps

```typescript
// src/gateway/server-methods/chat.ts

interface ChatRequest {
  message: string;
  thinking?: 'off' | 'minimum' | 'low' | 'medium' | 'high';
  model?: string;
}

async function handleChatStream(req: ChatRequest, res: Response) {
  const { message, thinking = 'off', model } = req;
  
  // Configurar thinking baseado no nível
  const thinkingConfig = getThinkingConfig(thinking);
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Se thinking está ativado, enviar steps primeiro
  if (thinkingConfig.enabled) {
    for (let i = 0; i < thinkingConfig.steps.length; i++) {
      const step = thinkingConfig.steps[i];
      const startTime = Date.now();
      
      // Simular/anunciar step
      res.write(`data: ${JSON.stringify({
        type: 'thinking-step',
        step: {
          id: step.id,
          label: step.label,
          status: 'active',
        },
      })}\n\n`);
      
      // Esperar tempo proporcional ao nível de thinking
      await delay(step.duration);
      
      // Completar step
      res.write(`data: ${JSON.stringify({
        type: 'thinking-step',
        step: {
          id: step.id,
          status: 'completed',
          duration: (Date.now() - startTime) / 1000,
        },
      })}\n\n`);
    }
  }
  
  // Iniciar resposta real do modelo
  const completion = await callModel({
    model,
    messages: [{ role: 'user', content: message }],
    stream: true,
    ...thinkingConfig.modelParams,
  });
  
  for await (const chunk of completion) {
    res.write(`data: ${JSON.stringify({
      type: 'content',
      content: chunk.content,
    })}\n\n`);
  }
  
  res.write('data: [DONE]\n\n');
  res.end();
}

function getThinkingConfig(level: string) {
  const configs = {
    'off': { enabled: false, steps: [], modelParams: {} },
    'minimum': {
      enabled: true,
      steps: [{ id: '1', label: 'Processing', duration: 500 }],
      modelParams: { temperature: 0.7 },
    },
    'low': {
      enabled: true,
      steps: [
        { id: '1', label: 'Analyzing request', duration: 800 },
        { id: '2', label: 'Formulating response', duration: 1200 },
      ],
      modelParams: { temperature: 0.8, top_p: 0.9 },
    },
    'medium': {
      enabled: true,
      steps: [
        { id: '1', label: 'Understanding context', duration: 1000 },
        { id: '2', label: 'Analyzing requirements', duration: 1500 },
        { id: '3', label: 'Planning response', duration: 1200 },
        { id: '4', label: 'Generating output', duration: 1000 },
      ],
      modelParams: { temperature: 0.9, top_p: 0.95 },
    },
    'high': {
      enabled: true,
      steps: [
        { id: '1', label: 'Deep context analysis', duration: 1500 },
        { id: '2', label: 'Multi-step reasoning', duration: 2000 },
        { id: '3', label: 'Evaluating approaches', duration: 1500 },
        { id: '4', label: 'Synthesizing information', duration: 1800 },
        { id: '5', label: 'Crafting detailed response', duration: 1500 },
      ],
      modelParams: { temperature: 1.0, top_p: 1.0 },
    },
  };
  
  return configs[level] || configs['off'];
}
```

---

## 4. INTEGRAÇÃO COM CHAT EXISTENTE

### 4.1 Modificações no Componente Principal

```typescript
// ui/src/views/chat.ts

export class ChatView extends LitElement {
  @state() private messages: ChatMessage[] = [];
  @state() private chatContainerRef: HTMLElement | null = null;
  @state() private isScrolledUp = false;
  @state() private newMessageCount = 0;
  @state() private currentThinkingLevel: ThinkingLevel = 'low';
  
  // Feature 1: Scroll position tracking
  private scrollObserver?: IntersectionObserver;
  
  connectedCallback() {
    super.connectedCallback();
    this.setupScrollObserver();
  }
  
  private setupScrollObserver() {
    if (!this.chatContainerRef) return;
    
    // Criar elemento sentinela no final do chat
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.height = '1px';
    this.chatContainerRef.appendChild(sentinel);
    
    this.scrollObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          this.isScrolledUp = !entry.isIntersecting;
        });
      },
      {
        root: this.chatContainerRef,
        threshold: 0,
      }
    );
    
    this.scrollObserver.observe(sentinel);
  }
  
  // Feature 2: Thinking level selector
  private renderThinkingSelector() {
    const levels: { value: ThinkingLevel; label: string; color: string }[] = [
      { value: 'off', label: 'Off', color: '#6b7280' },
      { value: 'minimum', label: 'Min', color: '#9ca3af' },
      { value: 'low', label: 'Low', color: '#60a5fa' },
      { value: 'medium', label: 'Medium', color: '#c084fc' },
      { value: 'high', label: 'High', color: '#f472b6' },
    ];
    
    return html`
      <div class="thinking-selector">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
        
        ${levels.map(level => html`
          <button
            class="thinking-option ${this.currentThinkingLevel === level.value ? 'active' : ''}"
            style="--thinking-color: ${level.color}"
            @click=${() => this.currentThinkingLevel = level.value}
            title="Thinking level: ${level.label}"
          >
            ${level.label}
          </button>
        `)}
      </div>
    `;
  }
  
  // Render mensagem com thinking indicator
  private renderMessage(message: ChatMessage) {
    return html`
      <div class="message ${message.role}">
        <div class="message-header">
          <span class="message-author">${message.role === 'assistant' ? 'Assistant' : 'You'}</span>
          
          ${message.role === 'assistant' && message.thinking ? html`
            <thinking-indicator
              .level=${message.thinking.level}
              .isThinking=${message.thinking.inProgress}
              .steps=${message.thinking.steps}
              .elapsedTime=${message.thinking.elapsedTime}
              .showSummary=${!message.thinking.inProgress}
            ></thinking-indicator>
          ` : null}
        </div>
        
        <div class="message-content">${message.content}</div>
      </div>
    `;
  }
  
  render() {
    return html`
      <div class="chat-view">
        <div class="messages-container" ${ref(this.setChatContainerRef)}>
          ${this.messages.map(msg => this.renderMessage(msg))}
          <div id="scroll-sentinel"></div>
        </div>
        
        <!-- Feature 1: Scroll to bottom button -->
        <scroll-to-bottom-button
          .visible=${this.isScrolledUp || this.newMessageCount > 0}
          .newMessageCount=${this.newMessageCount}
          @scroll-to-bottom=${this.handleScrollToBottom}
        ></scroll-to-bottom-button>
        
        <div class="input-area">
          ${this.renderThinkingSelector()}
          
          <textarea
            .value=${this.inputValue}
            @keydown=${this.handleKeydown}
            placeholder="Type your message..."
          ></textarea>
          
          <button @click=${this.sendMessage}>Send</button>
        </div>
      </div>
    `;
  }
}
```

---

## 5. CHECKLIST DE IMPLEMENTAÇÃO

### Componentes Frontend
- [ ] `ScrollToBottomButton.ts` - Botão flutuante
- [ ] `useScrollPosition.ts` - Hook de scroll
- [ ] `ThinkingIndicator.ts` - Indicador de thinking
- [ ] `ChatStreamManager.ts` - Gerenciamento de stream
- [ ] Modificar `chat.ts` - Integração

### Backend
- [ ] Modificar endpoint de chat
- [ ] Adicionar thinking steps ao stream
- [ ] Configurar parâmetros por nível

### Estilos
- [ ] Animações de scroll
- [ ] Estilos do thinking indicator
- [ ] Cores por nível de thinking
- [ ] Responsividade

### Testes
- [ ] Teste scroll com muitas mensagens
- [ ] Teste thinking em cada nível
- [ ] Teste novo botão de mensagem
- [ ] Teste performance

### Documentação
- [ ] Atualizar user guide
- [ ] Documentar níveis de thinking
- [ ] Exemplos de uso

---

## 6. EXEMPLO DE USO FINAL

### Cenário 1: Scrollando em Conversa Longa
```
Usuário: Tem 50 mensagens no chat
Ação: Scrolla para cima para ver mensagem antiga
Resultado: 
  ✓ Botão "↓" aparece no canto inferior direito
  ✓ Badge mostra "3" novas mensagens chegaram
Ação: Clica no botão
Resultado:
  ✓ Scroll suave até o final
  ✓ Badge some
  ✓ Input fica em foco
```

### Cenário 2: Thinking Mode Medium
```
Usuário: Seleciona "Medium" no thinking selector
Ação: Envia mensagem complexa
Resultado:
  ✓ Mostra "🧠 Processing (Level: Medium)"
  ✓ Mostra steps animados:
     1. Understanding context... (loading)
     2. Analyzing requirements... (pending)
     3. Planning response... (pending)
     4. Generating output... (pending)
  ✓ Progress bar avança
  ✓ Timer mostra tempo decorrido
  
Após 6.5s:
  ✓ Steps completam
  ✓ Mostra resumo "✓ Thinking Complete (6.5s)"
  ✓ Resposta começa a aparecer
```

---

**Status:** ✅ SPEC PRONTA PARA IMPLEMENTAÇÃO

**Features:**
1. ✅ Scroll-to-bottom button
2. ✅ Thinking indicator visual

**Estimativa:** 3-4 dias

**Pronto para implementar!** 🚀
