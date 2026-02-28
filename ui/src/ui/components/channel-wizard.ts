import { html, nothing } from "lit";
import { icons } from "../icons";
import type { AppViewState } from "../app-view-state";

type ChannelKey = 'telegram' | 'discord' | 'slack' | 'whatsapp' | 'signal' | 'imessage' | 'googlechat' | 'nostr';

interface ChannelConfig {
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
  tokenFields: Array<{
    key: string;
    label: string;
    placeholder: string;
    required: boolean;
    validation?: (value: string) => boolean;
    helpText?: string;
  }>;
  tokenInstructions: Array<{
    text: string;
    isCode?: boolean;
    isBold?: boolean;
    isLink?: { text: string; url: string };
  }>;
  settingsFields: Array<{
    key: string;
    type: 'range' | 'checkbox';
    label: string;
    min?: number;
    max?: number;
    step?: number;
    helpText?: string;
    defaultValue?: unknown;
  }>;
  testEndpoint?: (config: Record<string, unknown>) => Promise<{ success: boolean; botInfo?: { username: string; first_name?: string; id: number }; error?: string }>;
  configPath: string[];
  configMapping: Record<string, string>;
}

const CHANNEL_CONFIGS: Record<ChannelKey, ChannelConfig> = {
  telegram: {
    name: 'Telegram',
    icon: 'send',
    color: '#0088cc',
    description: 'Configure seu bot do Telegram para receber e enviar mensagens através do OpenClaw.',
    features: [
      'Receba mensagens em tempo real',
      'Responda automaticamente com IA',
      'Suporte a grupos e DMs'
    ],
    tokenFields: [
      {
        key: 'token',
        label: 'Token do Bot',
        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
        required: true,
        validation: (value) => /^\d+:[\w-]+$/.test(value),
        helpText: 'O token deve ter o formato: números:letras'
      }
    ],
    tokenInstructions: [
      { text: 'Abra o Telegram e procure por ' },
      { text: '@BotFather', isBold: true },
      { text: 'Envie o comando ' },
      { text: '/newbot', isCode: true },
      { text: 'Escolha um nome e username para seu bot' },
      { text: 'Copie o ', isBold: false },
      { text: 'token', isBold: true },
      { text: ' recebido' }
    ],
    settingsFields: [
      {
        key: 'timeoutSeconds',
        type: 'range',
        label: 'Timeout da Conexão',
        min: 30,
        max: 600,
        step: 10,
        helpText: 'Aumente se tiver uma conexão de internet lenta',
        defaultValue: 60
      },
      {
        key: 'allowDMs',
        type: 'checkbox',
        label: 'Permitir mensagens diretas (DMs)',
        helpText: 'Se desmarcado, o bot só responderá em grupos',
        defaultValue: true
      },
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar bot automaticamente',
        helpText: 'O bot será iniciado assim que salvar a configuração',
        defaultValue: true
      }
    ],
    testEndpoint: async (config) => {
      try {
        const token = config.token as string;
        const response = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const data = await response.json();
        if (data.ok) {
          return { success: true, botInfo: data.result };
        } else {
          return { success: false, error: data.description || 'Token inválido' };
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
      }
    },
    configPath: ['channels', 'telegram'],
    configMapping: {
      token: 'token',
      timeoutSeconds: 'timeoutSeconds',
      allowDMs: 'allowDMs',
      autoStart: 'autoStart'
    }
  },
  discord: {
    name: 'Discord',
    icon: 'hash',
    color: '#5865F2',
    description: 'Conecte seu bot do Discord para integração com servidores e DMs.',
    features: [
      'Integração com servidores Discord',
      'Suporte a canais e DMs',
      'Reconhecimento de menções e comandos'
    ],
    tokenFields: [
      {
        key: 'token',
        label: 'Bot Token',
        placeholder: 'MTAxMDEwMTAxMDEwMTAxMDEw.XXXXXXXX.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        required: true,
        validation: (value) => value.length >= 50 && value.includes('.'),
        helpText: 'O token do bot Discord começa com MT e contém pontos'
      }
    ],
    tokenInstructions: [
      { text: 'Acesse o ' },
      { text: 'Discord Developer Portal', isLink: { text: 'Abrir Portal', url: 'https://discord.com/developers/applications' } },
      { text: 'Clique em ' },
      { text: 'New Application', isBold: true },
      { text: 'Vá em ' },
      { text: 'Bot', isBold: true },
      { text: ' no menu lateral' },
      { text: 'Clique em ' },
      { text: 'Add Bot', isBold: true },
      { text: 'Em ' },
      { text: 'Token', isBold: true },
      { text: ', clique em ' },
      { text: 'Copy', isBold: true }
    ],
    settingsFields: [
      {
        key: 'allowDMs',
        type: 'checkbox',
        label: 'Permitir mensagens diretas (DMs)',
        helpText: 'Permite receber mensagens em DMs privadas',
        defaultValue: true
      },
      {
        key: 'allowBots',
        type: 'checkbox',
        label: 'Permitir mensagens de outros bots',
        helpText: 'Permite que outros bots interajam com este bot',
        defaultValue: false
      },
      {
        key: 'requireMention',
        type: 'checkbox',
        label: 'Exigir menção em canais',
        helpText: 'O bot só responderá quando for mencionado (@BotName)',
        defaultValue: true
      },
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar bot automaticamente',
        helpText: 'O bot será iniciado assim que salvar a configuração',
        defaultValue: true
      }
    ],
    testEndpoint: async (config) => {
      try {
        const token = config.token as string;
        const response = await fetch('https://discord.com/api/v10/users/@me', {
          headers: { 'Authorization': `Bot ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          return { success: true, botInfo: { username: data.username, first_name: data.global_name || data.username, id: data.id } };
        } else {
          const errorData = await response.json().catch(() => ({}));
          return { success: false, error: errorData.message || `HTTP ${response.status}` };
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
      }
    },
    configPath: ['channels', 'discord'],
    configMapping: {
      token: 'token',
      allowDMs: 'dm.enabled',
      allowBots: 'allowBots',
      requireMention: 'requireMention',
      autoStart: 'enabled'
    }
  },
  slack: {
    name: 'Slack',
    icon: 'slack',
    color: '#4A154B',
    description: 'Conecte seu workspace do Slack para integração com canais e DMs.',
    features: [
      'Integração com workspace Slack',
      'Suporte a canais públicos e privados',
      'Comandos slash e menções'
    ],
    tokenFields: [
      {
        key: 'botToken',
        label: 'Bot Token (xoxb-)',
        placeholder: 'xoxb-YOUR-BOT-TOKEN-HERE-EXAMPLE123',
        required: true,
        validation: (value) => value.startsWith('xoxb-'),
        helpText: 'Deve começar com xoxb-'
      },
      {
        key: 'appToken',
        label: 'App Token (xapp-) - Opcional',
        placeholder: 'xapp-1-XXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
        required: false,
        validation: (value) => !value || value.startsWith('xapp-'),
        helpText: 'Para modo Socket (opcional). Deve começar com xapp-'
      }
    ],
    tokenInstructions: [
      { text: 'Acesse ' },
      { text: 'api.slack.com/apps', isLink: { text: 'Abrir Slack API', url: 'https://api.slack.com/apps' } },
      { text: 'Clique em ' },
      { text: 'Create New App', isBold: true },
      { text: 'Vá em ' },
      { text: 'OAuth & Permissions', isBold: true },
      { text: 'Adicione scopes: ' },
      { text: 'chat:write, channels:read, im:read', isCode: true },
      { text: 'Clique em ' },
      { text: 'Install to Workspace', isBold: true },
      { text: 'Copie o ', isBold: false },
      { text: 'Bot User OAuth Token', isBold: true }
    ],
    settingsFields: [
      {
        key: 'allowDMs',
        type: 'checkbox',
        label: 'Permitir mensagens diretas (DMs)',
        helpText: 'Permite receber mensagens em DMs privadas',
        defaultValue: true
      },
      {
        key: 'requireMention',
        type: 'checkbox',
        label: 'Exigir menção em canais',
        helpText: 'O bot só responderá quando for mencionado (@BotName)',
        defaultValue: true
      },
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar bot automaticamente',
        helpText: 'O bot será iniciado assim que salvar a configuração',
        defaultValue: true
      }
    ],
    testEndpoint: async (config) => {
      try {
        const botToken = config.botToken as string;
        const response = await fetch('https://slack.com/api/auth.test', {
          headers: { 'Authorization': `Bearer ${botToken}` }
        });
        const data = await response.json();
        if (data.ok) {
          return { success: true, botInfo: { username: data.user, first_name: data.user, id: data.user_id } };
        } else {
          return { success: false, error: data.error || 'Token inválido' };
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
      }
    },
    configPath: ['channels', 'slack'],
    configMapping: {
      botToken: 'botToken',
      appToken: 'appToken',
      allowDMs: 'dm.enabled',
      requireMention: 'requireMention',
      autoStart: 'enabled'
    }
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: 'messageSquare',
    color: '#25D366',
    description: 'Conecte via WhatsApp Web QR code.',
    features: [
      'Integração com WhatsApp Web',
      'Leitura de QR Code',
      'Suporte a grupos e chats'
    ],
    tokenFields: [],
    tokenInstructions: [],
    settingsFields: [
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar automaticamente',
        helpText: 'Iniciar WhatsApp automaticamente',
        defaultValue: true
      }
    ],
    configPath: ['channels', 'whatsapp'],
    configMapping: {
      autoStart: 'enabled'
    }
  },
  signal: {
    name: 'Signal',
    icon: 'shield',
    color: '#3A76F0',
    description: 'Mensagens seguras via Signal.',
    features: [
      'Mensagens criptografadas',
      'Alta privacidade',
      'Suporte a grupos'
    ],
    tokenFields: [],
    tokenInstructions: [],
    settingsFields: [
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar automaticamente',
        helpText: 'Iniciar Signal automaticamente',
        defaultValue: true
      }
    ],
    configPath: ['channels', 'signal'],
    configMapping: {
      autoStart: 'enabled'
    }
  },
  imessage: {
    name: 'iMessage',
    icon: 'messageSquare',
    color: '#34C759',
    description: 'Apple Messages (Mac only).',
    features: [
      'Integração nativa com macOS',
      'Suporte a iMessage',
      'Apenas Mac'
    ],
    tokenFields: [],
    tokenInstructions: [],
    settingsFields: [
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar automaticamente',
        helpText: 'Iniciar iMessage automaticamente',
        defaultValue: true
      }
    ],
    configPath: ['channels', 'imessage'],
    configMapping: {
      autoStart: 'enabled'
    }
  },
  googlechat: {
    name: 'Google Chat',
    icon: 'messageSquare',
    color: '#00832d',
    description: 'Google Workspace messaging.',
    features: [
      'Integração com Google Workspace',
      'Suporte a salas do Chat',
      'Mensagens diretas'
    ],
    tokenFields: [],
    tokenInstructions: [],
    settingsFields: [
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar automaticamente',
        helpText: 'Iniciar Google Chat automaticamente',
        defaultValue: true
      }
    ],
    configPath: ['channels', 'googlechat'],
    configMapping: {
      autoStart: 'enabled'
    }
  },
  nostr: {
    name: 'Nostr',
    icon: 'zap',
    color: '#8e44ad',
    description: 'Protocolo social descentralizado.',
    features: [
      'Protocolo descentralizado',
      'Sem servidor central',
      'Privacidade garantida'
    ],
    tokenFields: [],
    tokenInstructions: [],
    settingsFields: [
      {
        key: 'autoStart',
        type: 'checkbox',
        label: 'Iniciar automaticamente',
        helpText: 'Iniciar Nostr automaticamente',
        defaultValue: true
      }
    ],
    configPath: ['channels', 'nostr'],
    configMapping: {
      autoStart: 'enabled'
    }
  }
};

// Channel Setup Wizard Component
export function renderChannelWizard(state: AppViewState) {
  const wizard = state.channelWizardState;
  if (!wizard?.isOpen) return nothing;

  const currentStep = wizard.currentStep;
  const totalSteps = wizard.totalSteps;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const channelConfig = CHANNEL_CONFIGS[wizard.channelKey as ChannelKey] || CHANNEL_CONFIGS.telegram;

  return html`
    <div class="modal-overlay wizard-overlay" @click=${(e: Event) => {
      if (e.target === e.currentTarget) state.handleChannelWizardClose();
    }}>
      <div class="modal wizard-modal" @click=${(e: Event) => e.stopPropagation()}>
        ${renderWizardHeader(wizard, state, channelConfig)}
        ${renderProgressBar(progress, currentStep, totalSteps)}
        <div class="wizard-content">
          ${renderWizardStep(state, channelConfig)}
        </div>
        
        ${renderWizardFooter(state, channelConfig)}
      </div>
    </div>
  `;
}

function renderWizardHeader(wizard: NonNullable<AppViewState['channelWizardState']>, state: AppViewState, channelConfig: ChannelConfig) {
  const stepTitles = ['Bem-vindo', 'Credenciais', 'Configurações', 'Testar', 'Revisar'];
  const icon = (icons as Record<string, typeof icons.settings>)[channelConfig.icon] || icons.settings;
  
  return html`
    <div class="wizard-header">
      <div class="wizard-title">
        <div class="wizard-icon ${wizard.channelKey}" style="--channel-color: ${channelConfig.color}">${icon}</div>
        <div class="wizard-title-text">
          <h2>Configurar ${channelConfig.name}</h2>
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

function renderWizardStep(state: AppViewState, channelConfig: ChannelConfig) {
  const wizard = state.channelWizardState!;
  
  switch (wizard.currentStep) {
    case 0:
      return renderWelcomeStep(channelConfig);
    case 1:
      return renderTokenStep(state, channelConfig);
    case 2:
      return renderSettingsStep(state, channelConfig);
    case 3:
      return renderTestStep(state, channelConfig);
    case 4:
      return renderReviewStep(state, channelConfig);
    default:
      return nothing;
  }
}

function renderWelcomeStep(channelConfig: ChannelConfig) {
  return html`
    <div class="wizard-step welcome-step">
      <div class="welcome-icon" style="color: ${channelConfig.color}">${(icons as Record<string, typeof icons.settings>)[channelConfig.icon] || icons.settings}</div>
      <h3>Conecte seu ${channelConfig.name}</h3>
      <p class="welcome-description">${channelConfig.description}</p>
      <div class="welcome-features">
        ${channelConfig.features.map(feature => html`<div class="feature"><span class="check">✓</span> ${feature}</div>`)}
      </div>
      <div class="welcome-time">⏱️ Tempo estimado: <strong>2-3 minutos</strong></div>
    </div>
  `;
}

function renderTokenStep(state: AppViewState, channelConfig: ChannelConfig) {
  const wizard = state.channelWizardState!;
  
  // If no token fields defined, show info message
  if (channelConfig.tokenFields.length === 0) {
    return html`
      <div class="wizard-step token-step">
        <div class="no-token-message">
          <div class="info-icon">ℹ️</div>
          <h4>${channelConfig.name} não requer token</h4>
          <p>Este canal usa um método diferente de autenticação (ex: QR Code, par de chaves).</p>
          <p>Clique em "Próximo" para continuar com as configurações.</p>
        </div>
      </div>
    `;
  }
  
  return html`
    <div class="wizard-step token-step">
      <div class="step-instructions">
        <h4>Como obter suas credenciais:</h4>
        <ol>
          ${channelConfig.tokenInstructions.map(inst => html`
            <li>
              ${inst.isLink 
                ? html`${inst.text}<a href="${inst.isLink.url}" target="_blank" class="btn-link">${inst.isLink.text}</a>`
                : inst.isCode 
                  ? html`<code>${inst.text}</code>`
                  : inst.isBold
                    ? html`<strong>${inst.text}</strong>`
                    : inst.text
              }
            </li>
          `)}
        </ol>
      </div>
      
      ${channelConfig.tokenFields.map(field => {
        const value = (wizard.config[field.key] as string) || '';
        const isValid = field.validation ? field.validation(value) : true;
        const showValidation = value.length > 0;
        
        return html`
          <div class="step-input">
            <label>${field.label}${field.required ? html` <span class="required">*</span>` : nothing}</label>
            <input
              type="password"
              .value="${value}"
              placeholder="${field.placeholder}"
              @input="${(e: InputEvent) => {
                state.handleChannelWizardUpdate({ [field.key]: (e.target as HTMLInputElement).value });
              }}"
            />
            ${field.helpText ? html`
              <div class="token-validation ${showValidation ? (isValid ? 'valid' : 'invalid') : ''}">
                ${showValidation 
                  ? (isValid ? '✓ Válido' : '✗ ' + field.helpText)
                  : field.helpText
                }
              </div>
            ` : nothing}
          </div>
        `;
      })}
    </div>
  `;
}

function renderSettingsStep(state: AppViewState, channelConfig: ChannelConfig) {
  const config = state.channelWizardState?.config || {};
  
  return html`
    <div class="wizard-step settings-step">
      ${channelConfig.settingsFields.map(field => {
        const value = config[field.key] !== undefined ? config[field.key] : field.defaultValue;
        
        if (field.type === 'range') {
          return html`
            <div class="form-group">
              <label>${field.label}: <strong>${value}${field.key === 'timeoutSeconds' ? 's' : ''}</strong></label>
              <input
                type="range"
                min="${field.min}"
                max="${field.max}"
                step="${field.step}"
                .value="${value}"
                @input="${(e: InputEvent) => state.handleChannelWizardUpdate({ [field.key]: parseInt((e.target as HTMLInputElement).value) })}"
              />
              ${field.helpText ? html`<div class="input-help">${field.helpText}</div>` : nothing}
            </div>
          `;
        } else if (field.type === 'checkbox') {
          return html`
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input
                  type="checkbox"
                  .checked="${value !== false}"
                  @change="${(e: InputEvent) => state.handleChannelWizardUpdate({ [field.key]: (e.target as HTMLInputElement).checked })}"
                />
                <div class="checkbox-text">
                  <strong>${field.label}</strong>
                  ${field.helpText ? html`<span>${field.helpText}</span>` : nothing}
                </div>
              </label>
            </div>
          `;
        }
        return nothing;
      })}
    </div>
  `;
}

function renderTestStep(state: AppViewState, channelConfig: ChannelConfig) {
  const wizard = state.channelWizardState!;
  
  // If no test endpoint, show info
  if (!channelConfig.testEndpoint) {
    return html`
      <div class="wizard-step test-step">
        <div class="test-prompt">
          <div class="prompt-icon">⚡</div>
          <h4>Teste não disponível</h4>
          <p>A conexão será testada automaticamente quando você ativar o canal.</p>
          <p>Clique em "Próximo" para revisar e ativar.</p>
        </div>
      </div>
    `;
  }
  
  if (wizard.isTesting) {
    return html`
      <div class="wizard-step test-step">
        <div class="test-loading">
          <div class="spinner"></div>
          <p>Testando conexão com ${channelConfig.name}...</p>
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
              <div class="info-row"><span>Nome:</span> <strong>${wizard.testResult.botInfo?.first_name || wizard.testResult.botInfo?.username}</strong></div>
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
              <p><strong>Erro:</strong> ${translateError(wizard.channelKey, wizard.testResult.error || '')}</p>
              <div class="error-solution">
                <strong>Solução:</strong><p>${getErrorSolution(wizard.channelKey, wizard.testResult.error || '')}</p>
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
        <p>Verificaremos se as credenciais são válidas e se conseguimos conectar ao ${channelConfig.name}.</p>
        <button class="btn-primary" @click=${() => state.handleChannelWizardTest()}>▶ Testar Conexão</button>
      </div>
    </div>
  `;
}

function renderReviewStep(state: AppViewState, channelConfig: ChannelConfig) {
  const wizard = state.channelWizardState!;
  const config = wizard.config;
  
  // Build review items based on config mapping
  const reviewItems: Array<{ label: string; value: string }> = [];
  
  channelConfig.tokenFields.forEach(field => {
    const token = config[field.key] as string;
    if (token) {
      reviewItems.push({
        label: field.label,
        value: `${token.slice(0, 10)}...${token.slice(-5)}`
      });
    }
  });
  
  channelConfig.settingsFields.forEach(field => {
    const value = config[field.key];
    if (value !== undefined) {
      let displayValue: string;
      if (field.type === 'checkbox') {
        displayValue = value !== false ? 'Sim' : 'Não';
      } else if (field.type === 'range') {
        displayValue = `${value}${field.key === 'timeoutSeconds' ? 's' : ''}`;
      } else {
        displayValue = String(value);
      }
      reviewItems.push({
        label: field.label,
        value: displayValue
      });
    }
  });
  
  return html`
    <div class="wizard-step review-step">
      <h4>Revise sua configuração:</h4>
      
      <div class="review-card">
        ${reviewItems.map(item => html`
          <div class="review-item"><span>${item.label}:</span> <span class="masked">${item.value}</span></div>
        `)}
      </div>
      
      ${wizard.testResult?.success 
        ? html`<div class="test-success">✓ Conexão testada com sucesso!</div>`
        : html`<div class="test-warning">⚠ A conexão não foi testada. Recomendamos testar antes de ativar.</div>`
      }
    </div>
  `;
}

function renderWizardFooter(state: AppViewState, channelConfig: ChannelConfig) {
  const wizard = state.channelWizardState!;
  const isFirst = wizard.currentStep === 0;
  const isLast = wizard.currentStep === wizard.totalSteps - 1;
  const canProceed = canGoToNext(wizard, channelConfig);

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
              ${wizard.isSaving ? 'Salvando...' : `✓ Ativar ${channelConfig.name}`}
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

function canGoToNext(wizard: NonNullable<AppViewState['channelWizardState']>, channelConfig: ChannelConfig): boolean {
  switch (wizard.currentStep) {
    case 1: // Token step
      // Check all required token fields
      return channelConfig.tokenFields.every(field => {
        if (!field.required) return true;
        const value = wizard.config[field.key] as string;
        if (!value) return false;
        if (field.validation) return field.validation(value);
        return true;
      });
    default:
      return true;
  }
}

function translateError(channelKey: string, error: string): string {
  if (channelKey === 'telegram') {
    if (error.includes('Unauthorized')) return 'Token não autorizado ou revogado';
    if (error.includes('Not Found')) return 'Bot não encontrado';
    if (error.includes('Conflict')) return 'Conflito - outra instância está usando este token';
  } else if (channelKey === 'discord') {
    if (error.includes('Unauthorized') || error.includes('401')) return 'Token inválido ou não autorizado';
    if (error.includes('Forbidden') || error.includes('403')) return 'Permissões insuficientes para o bot';
  } else if (channelKey === 'slack') {
    if (error.includes('invalid_auth') || error.includes('account_inactive')) return 'Token inválido ou expirado';
    if (error.includes('missing_scope')) return 'Scopes insuficientes no token';
  }
  
  if (error.includes('Timeout')) return 'Timeout na conexão';
  if (error.includes('Network')) return 'Erro de rede';
  return error || 'Erro desconhecido';
}

function getErrorSolution(channelKey: string, error: string): string {
  if (channelKey === 'telegram') {
    if (error.includes('Unauthorized')) {
      return 'O token pode ter sido revogado. Vá ao @BotFather, envie /revoke e depois /token para obter um novo token.';
    }
    if (error.includes('Not Found')) {
      return 'Verifique se o token está completo e correto. O formato deve ser: números:letras';
    }
  } else if (channelKey === 'discord') {
    if (error.includes('Unauthorized') || error.includes('401')) {
      return 'Verifique se o token foi copiado corretamente do Discord Developer Portal. O token deve começar com caracteres aleatórios longos.';
    }
    if (error.includes('Forbidden') || error.includes('403')) {
      return 'O bot pode não ter as permissões necessárias. Vá em OAuth2 > URL Generator e adicione scopes: bot, applications.commands. Depois em Bot > Privileged Gateway Intents, habilite as intents necessárias.';
    }
  } else if (channelKey === 'slack') {
    if (error.includes('invalid_auth') || error.includes('account_inactive')) {
      return 'O token pode estar expirado ou foi revogado. Gere um novo token em api.slack.com/apps > OAuth & Permissions > Reinstall to Workspace.';
    }
    if (error.includes('missing_scope')) {
      return 'O token não tem os scopes necessários. Adicione em OAuth & Permissions > Scopes: chat:write, channels:read, im:read, groups:read.';
    }
  }
  
  if (error.includes('Timeout') || error.includes('Network')) {
    return 'Verifique sua conexão com a internet. Se estiver atrás de um firewall, pode ser necessário configurar um proxy.';
  }
  return 'Verifique se as credenciais estão corretas e tente novamente.';
}

// Export config mapping for use in app.ts
export function getChannelConfig(channelKey: string): ChannelConfig | undefined {
  return CHANNEL_CONFIGS[channelKey as ChannelKey];
}

export function buildChannelConfig(channelKey: string, wizardConfig: Record<string, unknown>): Record<string, unknown> {
  const config = getChannelConfig(channelKey);
  if (!config) return {};
  
  const result: Record<string, unknown> = {
    enabled: wizardConfig.autoStart !== false,
  };
  
  // Map config fields according to configMapping
  Object.entries(config.configMapping).forEach(([wizardKey, configPath]) => {
    if (wizardConfig[wizardKey] !== undefined) {
      const value = wizardConfig[wizardKey];
      // Handle nested paths like 'dm.enabled'
      const parts = configPath.split('.');
      let current: Record<string, unknown> = result;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) current[parts[i]] = {};
        current = current[parts[i]] as Record<string, unknown>;
      }
      current[parts[parts.length - 1]] = value;
    }
  });
  
  return result;
}

export async function testChannelConnection(channelKey: string, config: Record<string, unknown>): Promise<{ success: boolean; botInfo?: { username: string; first_name?: string; id: number }; error?: string }> {
  const channelConfig = getChannelConfig(channelKey);
  if (!channelConfig?.testEndpoint) {
    return { success: false, error: 'Teste não disponível para este canal' };
  }
  return channelConfig.testEndpoint(config);
}
