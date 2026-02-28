import { html, nothing } from "lit";
import type { AppViewState } from "../app-view-state.js";
import { icons } from "../icons.js";

// Spec O1: Onboarding Wizard - Frontend

export function renderOnboardingWizard(state: AppViewState) {
  const step = state.onboardingStep || 'welcome';
  const progress = state.onboardingProgress || 0;
  
  return html`
    <div class="onboarding-wizard">
      ${renderProgressBar(progress)}
      <div class="wizard-content">
        ${step === 'welcome' ? renderWelcomeStep(state) :
          step === 'auth' ? renderAuthStep(state) :
          step === 'channels' ? renderChannelsStep(state) :
          step === 'features' ? renderFeaturesStep(state) :
          step === 'complete' ? renderCompleteStep(state) :
          nothing}
      </div>
      ${renderNavigation(state)}
    </div>
  `;
}

function renderProgressBar(progress: number) {
  return html`
    <div class="onboarding-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="progress-text">${progress}% completo</div>
    </div>
  `;
}

function renderWelcomeStep(state: AppViewState) {
  return html`
    <div class="wizard-step welcome">
      <div class="step-icon">🦞</div>
      <h1>Bem-vindo ao OpenClaw!</h1>
      <p class="step-description">
        Seu assistente de IA pessoal que roda em seus próprios dispositivos.
        Vamos configurar tudo em poucos passos.
      </p>
      <div class="step-features">
        <div class="feature-item">
          <span class="feature-icon">💬</span>
          <span>Chat inteligente</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">${icons.lock}</span>
          <span>Privacidade total</span>
        </div>
        <div class="feature-item">
          <span class="feature-icon">${icons.zap}</span>
          <span>Integrações poderosas</span>
        </div>
      </div>
    </div>
  `;
}

function renderAuthStep(state: AppViewState) {
  const selectedProvider = state.onboardingAuthProvider || '';
  
  return html`
    <div class="wizard-step auth">
      <div class="step-icon">🔐</div>
      <h2>Configure sua Autenticação</h2>
      <p class="step-description">Escolha seu modelo de IA e forneça a API key</p>
      
      <div class="auth-options">
        <div 
          class="auth-option ${selectedProvider === 'anthropic' ? 'selected' : ''}"
          @click="${() => state.setOnboardingAuthProvider('anthropic')}"
        >
          <div class="option-header">
            <input type="radio" ?checked="${selectedProvider === 'anthropic'}" />
            <span class="option-name">Claude (Anthropic)</span>
          </div>
          <div class="option-description">Recomendado - Melhor performance</div>
        </div>
        
        <div 
          class="auth-option ${selectedProvider === 'openai' ? 'selected' : ''}"
          @click="${() => state.setOnboardingAuthProvider('openai')}"
        >
          <div class="option-header">
            <input type="radio" ?checked="${selectedProvider === 'openai'}" />
            <span class="option-name">GPT-4 (OpenAI)</span>
          </div>
          <div class="option-description">Alternativa popular</div>
        </div>
        
        <div 
          class="auth-option ${selectedProvider === 'ollama' ? 'selected' : ''}"
          @click="${() => state.setOnboardingAuthProvider('ollama')}"
        >
          <div class="option-header">
            <input type="radio" ?checked="${selectedProvider === 'ollama'}" />
            <span class="option-name">Ollama (Local)</span>
          </div>
          <div class="option-description">Gratuito - Roda localmente</div>
        </div>
      </div>
      
      ${selectedProvider ? html`
        <div class="api-key-input">
          <label>API Key</label>
          <input 
            type="password" 
            placeholder="${selectedProvider === 'anthropic' ? 'sk-ant-...' : 
                        selectedProvider === 'openai' ? 'sk-...' : 
                        'http://localhost:11434'}"
            .value="${state.onboardingApiKey || ''}"
            @input="${(e: InputEvent) => state.setOnboardingApiKey((e.target as HTMLInputElement).value)}"
          />
          <div class="input-hint">
            ${selectedProvider === 'ollama' 
              ? 'Ollama deve estar rodando em sua máquina'
              : 'Sua API key é armazenada localmente e criptografada'}
          </div>
        </div>
      ` : nothing}
    </div>
  `;
}

function renderChannelsStep(state: AppViewState) {
  const selectedChannels = state.onboardingChannels || [];
  
  return html`
    <div class="wizard-step channels">
      <div class="step-icon">💬</div>
      <h2>Configure seus Canais</h2>
      <p class="step-description">Escolha onde quer receber mensagens</p>
      
      <div class="channels-grid">
        ${renderChannelOption('whatsapp', 'WhatsApp', 'messageSquare', selectedChannels.includes('whatsapp'), state)}
        ${renderChannelOption('telegram', 'Telegram', 'send', selectedChannels.includes('telegram'), state)}
        ${renderChannelOption('discord', 'Discord', 'hash', selectedChannels.includes('discord'), state)}
        ${renderChannelOption('slack', 'Slack', 'messageSquare', selectedChannels.includes('slack'), state)}
      </div>
    </div>
  `;
}

function renderChannelOption(id: string, name: string, icon: string, selected: boolean, state: AppViewState) {
  return html`
    <div 
      class="channel-option ${selected ? 'selected' : ''}"
      @click="${() => state.toggleOnboardingChannel(id)}"
    >
      <div class="channel-checkbox">
        <input type="checkbox" ?checked="${selected}" />
      </div>
      <div class="channel-icon">${(icons as any)[icon] || icons.messageSquare}</div>
      <div class="channel-name">${name}</div>
    </div>
  `;
}

function renderFeaturesStep(state: AppViewState) {
  const selectedFeatures = state.onboardingFeatures || [];
  
  return html`
    <div class="wizard-step features">
      <div class="step-icon">${icons.zap}</div>
      <h2>Ative suas Features</h2>
      <p class="step-description">Recomendamos começar com:</p>
      
      <div class="features-list">
        ${renderFeatureOption('voice_recorder', 'Voice Recorder', 'Grave e transcreva áudio', 'mic', selectedFeatures.includes('voice_recorder'), state)}
        ${renderFeatureOption('tts', 'Text-to-Speech', 'IA fala as respostas', 'volume', selectedFeatures.includes('tts'), state)}
        ${renderFeatureOption('web_search', 'Web Search', 'Busque informações na web', 'search', selectedFeatures.includes('web_search'), state)}
        ${renderFeatureOption('browser', 'Browser Automation', 'Controle o navegador', 'globe', selectedFeatures.includes('browser'), state)}
      </div>
    </div>
  `;
}

function renderFeatureOption(id: string, name: string, description: string, icon: string, selected: boolean, state: AppViewState) {
  return html`
    <div 
      class="feature-option ${selected ? 'selected' : ''}"
      @click="${() => state.toggleOnboardingFeature(id)}"
    >
      <div class="feature-checkbox">
        <input type="checkbox" ?checked="${selected}" />
      </div>
      <div class="feature-icon">${(icons as any)[icon] || icons.settings}</div>
      <div class="feature-info">
        <div class="feature-name">${name}</div>
        <div class="feature-description">${description}</div>
      </div>
    </div>
  `;
}

function renderCompleteStep(state: AppViewState) {
  return html`
    <div class="wizard-step complete">
      <div class="step-icon success">${icons.check}</div>
      <h1>Tudo Pronto! ${icons.sparkles}</h1>
      <p class="step-description">Seu OpenClaw está configurado e pronto para usar.</p>
      
      <div class="setup-summary">
        <div class="summary-item">
          <span class="summary-label">Modelo:</span>
          <span class="summary-value">${state.onboardingAuthProvider || 'Não configurado'}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Canais:</span>
          <span class="summary-value">${(state.onboardingChannels || []).length} ativos</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">Features:</span>
          <span class="summary-value">${(state.onboardingFeatures || []).length} ativas</span>
        </div>
      </div>
      
      <div class="next-actions">
        <p>O que fazer agora?</p>
        <ul>
          <li>💬 Comece um chat na aba "Chat"</li>
          <li>${icons.settings} Ajuste configurações em "Settings"</li>
          <li>📖 Leia a documentação para mais recursos</li>
        </ul>
      </div>
    </div>
  `;
}

function renderNavigation(state: AppViewState) {
  const step = state.onboardingStep || 'welcome';
  const isFirstStep = step === 'welcome';
  const isLastStep = step === 'complete';
  
  return html`
    <div class="wizard-navigation">
      ${!isFirstStep ? html`
        <button 
          class="btn-secondary"
          @click="${() => state.onboardingPrevStep()}"
        >
          ← Voltar
        </button>
      ` : html`<div></div>`}
      
      ${isLastStep ? html`
        <button 
          class="btn-primary"
          @click="${() => state.completeOnboarding()}"
        >
          Abrir Chat →
        </button>
      ` : html`
        <button 
          class="btn-primary"
          ?disabled="${!canProceed(step, state)}"
          @click="${() => state.onboardingNextStep()}"
        >
          ${step === 'features' ? 'Concluir' : 'Próximo'} →
        </button>
      `}
    </div>
  `;
}

function canProceed(step: string, state: AppViewState): boolean {
  switch (step) {
    case 'welcome':
      return true;
    case 'auth':
      return !!state.onboardingAuthProvider && !!state.onboardingApiKey;
    case 'channels':
      return true; // Optional
    case 'features':
      return (state.onboardingFeatures || []).length > 0;
    default:
      return true;
  }
}
