import { html, nothing } from "lit";
import { icons } from "../icons";
import type { AppViewState } from "../app-view-state";

// Channel Setup Wizard Component
export function renderChannelWizard(state: AppViewState) {
  const wizard = state.channelWizardState;
  if (!wizard?.isOpen) return nothing;

  const currentStep = wizard.currentStep;
  const totalSteps = wizard.totalSteps;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return html`
    <div class="modal-overlay wizard-overlay" @click=${(e: Event) => {
      if (e.target === e.currentTarget) state.handleChannelWizardClose();
    }}>
      <div class="modal wizard-modal" @click=${(e: Event) => e.stopPropagation()}>
        ${renderWizardHeader(wizard, state)}
        ${renderProgressBar(progress, currentStep, totalSteps)}
        <div class="wizard-content">
          ${renderWizardStep(state)}
        </div>
        
        ${renderWizardFooter(state)}
      </div>
    </div>
  `;
}

function renderWizardHeader(wizard: NonNullable<AppViewState['channelWizardState']>, state: AppViewState) {
  const stepTitles = ['Bem-vindo', 'Token do Bot', 'Configurações', 'Testar', 'Revisar'];
  
  return html`
    <div class="wizard-header">
      <div class="wizard-title">
        <div class="wizard-icon telegram">${icons.send}</div>
        <div class="wizard-title-text">
          <h2>Configurar ${wizard.channelName}</h2>
          <span class="wizard-step-indicator">Passo ${wizard.currentStep + 1} de ${wizard.totalSteps}: ${stepTitles[wizard.currentStep]}</span>
        </div>
      </div>
      <button class="wizard-close" @click=${() => state.handleChannelWizardClose()}>${icons.x}</button>
    </div>
  `;
}

function renderProgressBar(progress: number, currentStep: number, totalSteps: number) {
  return html`
    <div class="wizard-progress">
      <div class="wizard-progress-bar">
        <div class="wizard-progress-fill" style="width: ${progress}%"></div>
      </div>
      <div class="wizard-progress-steps">
        ${Array.from({ length: totalSteps }, (_, i) => html`
          <div class="wizard-step-dot ${i <= currentStep ? 'active' : ''} ${i === currentStep ? 'current' : ''}"></div>
        `)}
      </div>
    </div>
  `;
}

function renderWizardStep(state: AppViewState) {
  const wizard = state.channelWizardState!;
  
  switch (wizard.currentStep) {
    case 0:
      return renderWelcomeStep();
    case 1:
      return renderTokenStep(state);
    case 2:
      return renderSettingsStep(state);
    case 3:
      return renderTestStep(state);
    case 4:
      return renderReviewStep(state);
    default:
      return nothing;
  }
}

function renderWelcomeStep() {
  return html`
    <div class="wizard-step welcome-step">
      <div class="welcome-icon">${icons.messageSquare}</div>
      <h3>Conecte seu Bot do Telegram</h3>
      <p class="welcome-description">Configure seu bot do Telegram para receber e enviar mensagens através do OpenClaw.</p>
      <div class="welcome-features">
        <div class="feature"><span class="check">✓</span> Receba mensagens em tempo real</div>
        <div class="feature"><span class="check">✓</span> Responda automaticamente com IA</div>
        <div class="feature"><span class="check">✓</span> Suporte a grupos e DMs</div>
      </div>
      <div class="welcome-time">⏱️ Tempo estimado: <strong>2-3 minutos</strong></div>
    </div>
  `;
}

function renderTokenStep(state: AppViewState) {
  const token = state.channelWizardState?.config?.token as string || '';
  const isValid = /^\d+:[\w-]+$/.test(token);
  
  return html`
    <div class="wizard-step token-step">
      <div class="step-instructions">
        <h4>Como obter seu token:</h4>
        <ol>
          <li>Abra o Telegram e procure por <strong>@BotFather</strong></li>
          <li>Envie o comando <code>/newbot</code></li>
          <li>Escolha um nome e username para seu bot</li>
          <li>Copie o <strong>token</strong> recebido</li>
        </ol>
        <a href="https://t.me/botfather" target="_blank" class="btn-telegram">${icons.externalLink} Abrir @BotFather</a>
      </div>
      
      <div class="step-input">
        <label>Token do Bot <span class="required">*</span></label>
        <input
          type="password"
          .value="${token}"
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          @input="${(e: InputEvent) => {
            state.handleChannelWizardUpdate({ token: (e.target as HTMLInputElement).value });
          }}"
        />
        <div class="token-validation ${token ? (isValid ? 'valid' : 'invalid') : ''}">
          ${token 
            ? (isValid ? '✓ Formato válido' : '✗ Formato inválido. Use: números:letras')
            : 'O token deve ter o formato: números:letras'
          }
        </div>
      </div>
    </div>
  `;
}

function renderSettingsStep(state: AppViewState) {
  const config = state.channelWizardState?.config || {};
  
  return html`
    <div class="wizard-step settings-step">
      <div class="form-group">
        <label>Timeout da Conexão: <strong>${config.timeoutSeconds || 60}s</strong></label>
        <input
          type="range"
          min="30"
          max="600"
          step="10"
          .value="${config.timeoutSeconds || 60}"
          @input="${(e: InputEvent) => state.handleChannelWizardUpdate({ timeoutSeconds: parseInt((e.target as HTMLInputElement).value) })}"
        />
        <div class="input-help">Aumente se tiver uma conexão de internet lenta</div>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            .checked="${config.allowDMs !== false}"
            @change="${(e: InputEvent) => state.handleChannelWizardUpdate({ allowDMs: (e.target as HTMLInputElement).checked })}"
          />
          <div class="checkbox-text">
            <strong>Permitir mensagens diretas (DMs)</strong>
            <span>Se desmarcado, o bot só responderá em grupos</span>
          </div>
        </label>
      </div>
      
      <div class="form-group checkbox-group">
        <label class="checkbox-label">
          <input
            type="checkbox"
            .checked="${config.autoStart !== false}"
            @change="${(e: InputEvent) => state.handleChannelWizardUpdate({ autoStart: (e.target as HTMLInputElement).checked })}"
          />
          <div class="checkbox-text">
            <strong>Iniciar bot automaticamente</strong>
            <span>O bot será iniciado assim que salvar a configuração</span>
          </div>
        </label>
      </div>
    </div>
  `;
}

function renderTestStep(state: AppViewState) {
  const wizard = state.channelWizardState!;
  
  if (wizard.isTesting) {
    return html`
      <div class="wizard-step test-step">
        <div class="test-loading">
          <div class="spinner"></div>
          <p>Testando conexão com o Telegram...</p>
        </div>
      </div>
    `;
  }
  
  if (wizard.testResult) {
    if (wizard.testResult.success) {
      return html`
        <div class="wizard-step test-step">
          <div class="test-result success">
            <div class="result-icon">✓</div>
            <h4>Conectado com sucesso!</h4>
            <div class="bot-info">
              <div class="info-row"><span>Bot:</span> <strong>@${wizard.testResult.botInfo?.username}</strong></div>
              <div class="info-row"><span>Nome:</span> <strong>${wizard.testResult.botInfo?.first_name}</strong></div>
              <div class="info-row"><span>ID:</span> <code>${wizard.testResult.botInfo?.id}</code></div>
            </div>
          </div>
        </div>
      `;
    } else {
      return html`
        <div class="wizard-step test-step">
          <div class="test-result error">
            <div class="result-icon">✗</div>
            <h4>Falha na conexão</h4>
            <div class="error-details">
              <p><strong>Erro:</strong> ${translateError(wizard.testResult.error || '')}</p>
              <div class="error-solution">
                <strong>Solução:</strong><p>${getErrorSolution(wizard.testResult.error || '')}</p>
              </div>
            </div>
            <button class="btn-secondary" @click=${() => state.handleChannelWizardTest()}>🔄 Tentar novamente</button>
          </div>
        </div>
      `;
    }
  }
  
  return html`
    <div class="wizard-step test-step">
      <div class="test-prompt">
        <div class="prompt-icon">⚡</div>
        <h4>Teste a conexão antes de ativar</h4>
        <p>Verificaremos se o token é válido e se conseguimos conectar ao Telegram.</p>
        <button class="btn-primary" @click=${() => state.handleChannelWizardTest()}>▶ Testar Conexão</button>
      </div>
    </div>
  `;
}

function renderReviewStep(state: AppViewState) {
  const wizard = state.channelWizardState!;
  const config = wizard.config;
  const token = config.token as string;
  
  return html`
    <div class="wizard-step review-step">
      <h4>Revise sua configuração:</h4>
      
      <div class="review-card">
        <div class="review-item"><span>Bot Token:</span> <span class="masked">${token ? `${token.slice(0, 10)}...${token.slice(-5)}` : 'Não configurado'}</span></div>
        <div class="review-item"><span>Timeout:</span> <span>${config.timeoutSeconds || 60}s</span></div>
        <div class="review-item"><span>Permitir DMs:</span> <span>${config.allowDMs !== false ? 'Sim' : 'Não'}</span></div>
        <div class="review-item"><span>Iniciar automaticamente:</span> <span>${config.autoStart !== false ? 'Sim' : 'Não'}</span></div>
      </div>
      
      ${wizard.testResult?.success 
        ? html`<div class="test-success">✓ Conexão testada com sucesso!</div>`
        : html`<div class="test-warning">⚠ A conexão não foi testada. Recomendamos testar antes de ativar.</div>`
      }
    </div>
  `;
}

function renderWizardFooter(state: AppViewState) {
  const wizard = state.channelWizardState!;
  const isFirst = wizard.currentStep === 0;
  const isLast = wizard.currentStep === wizard.totalSteps - 1;
  const canProceed = canGoToNext(wizard);

  return html`
    <div class="wizard-footer">
      <div class="wizard-footer-left">
        ${!isFirst ? html`<button class="btn-secondary" @click=${() => state.handleChannelWizardPrev()}>← Voltar</button>` : nothing}
      </div>
      
      <div class="wizard-footer-right">
        <button class="btn-secondary" @click=${() => state.handleChannelWizardClose()}>Cancelar</button>
        
        ${isLast 
          ? html`
            <button 
              class="btn-primary ${wizard.isSaving ? 'loading' : ''}"
              @click=${() => state.handleChannelWizardSave()}
              ?disabled=${wizard.isSaving}
            >
              ${wizard.isSaving ? 'Salvando...' : '✓ Ativar Telegram'}
            </button>
          `
          : html`
            <button 
              class="btn-primary"
              @click=${() => state.handleChannelWizardNext()}
              ?disabled=${!canProceed}
            >
              Próximo →
            </button>
          `
        }
      </div>
    </div>
  `;
}

function canGoToNext(wizard: NonNullable<AppViewState['channelWizardState']>): boolean {
  switch (wizard.currentStep) {
    case 1: // Token step
      const token = wizard.config.token as string;
      return /^\d+:[\w-]+$/.test(token);
    default:
      return true;
  }
}

function translateError(error: string): string {
  if (error.includes('Unauthorized')) return 'Token não autorizado ou revogado';
  if (error.includes('Not Found')) return 'Bot não encontrado';
  if (error.includes('Conflict')) return 'Conflito - outra instância está usando este token';
  if (error.includes('Timeout')) return 'Timeout na conexão';
  if (error.includes('Network')) return 'Erro de rede';
  return error || 'Erro desconhecido';
}

function getErrorSolution(error: string): string {
  if (error.includes('Unauthorized')) {
    return 'O token pode ter sido revogado. Vá ao @BotFather, envie /revoke e depois /token para obter um novo token.';
  }
  if (error.includes('Not Found')) {
    return 'Verifique se o token está completo e correto. O formato deve ser: números:letras';
  }
  if (error.includes('Timeout') || error.includes('Network')) {
    return 'Verifique sua conexão com a internet. Se estiver atrás de um firewall, pode ser necessário configurar um proxy.';
  }
  return 'Verifique se o token está correto e tente novamente.';
}
