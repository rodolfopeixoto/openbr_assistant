# Spec-Driven Development: Config UI Improvements

## Documento de Especificação Técnica

### 1. Visão Geral

**Objetivo:** Transformar a tela de configuração atual em uma interface intuitiva com selects, autocomplete, validação inline e feedback visual claro.

**Escopo:** 
- Backend: APIs para schema aprimorado, autocomplete e validação
- Frontend: Componentes de campo reutilizáveis
- Integração: Fluxo de dados entre backend e frontend

**Critérios de Sucesso:**
- 70+ campos enum convertidos para selects
- 15+ campos com autocomplete funcional
- Validação em tempo real (≤300ms feedback)
- 0 breaking changes na API existente

---

### 2. Backend Specifications

#### 2.1 Schema Hints Enhancement API

**Endpoint:** `config.schema` (existente, retorna schema + hints aprimorados)

**Response Schema:**

```typescript
interface ConfigSchemaResponse {
  schema: JsonSchema;
  version: string;
  uiHints: EnhancedConfigUiHints;
}

interface EnhancedConfigUiHints {
  [path: string]: {
    // Existing fields
    label?: string;
    help?: string;
    placeholder?: string;
    order?: number;
    sensitive?: boolean;
    
    // NEW FIELDS
    
    /**
     * Tipo de widget a ser renderizado
     * Se omitido, inferir do schema
     */
    widget?: 'select' | 'autocomplete' | 'toggle' | 'number' | 'text' | 'password' | 'textarea' | 'json';
    
    /**
     * Opções para select widget
     * Pode ser array estático ou referência dinâmica
     */
    options?: SelectOption[] | { source: string; valueKey: string; labelKey: string };
    
    /**
     * Configuração de autocomplete
     */
    autocomplete?: {
      source: 'agents' | 'models' | 'channels' | 'skills' | 'tools' | 'profiles' | 'custom';
      searchEndpoint?: string; // Se source for 'custom'
      minChars?: number; // Mínimo de caracteres para buscar (default: 2)
      maxResults?: number; // Máximo de resultados (default: 10)
      allowCreate?: boolean; // Permitir criar novos valores
    };
    
    /**
     * Validação inline
     */
    validation?: {
      required?: boolean;
      pattern?: string; // Regex
      min?: number;
      max?: number;
      minLength?: number;
      maxLength?: number;
      format?: 'email' | 'url' | 'duration' | 'path' | 'color';
      customMessage?: string; // Mensagem de erro customizada
    };
    
    /**
     * Campo avançado (escondido por padrão)
     */
    advanced?: boolean;
    
    /**
     * Grupos condicionais
     * Só mostrar se outro campo tiver determinado valor
     */
    showIf?: {
      path: string;
      equals?: unknown;
      notEquals?: unknown;
      contains?: unknown;
    };
    
    /**
     * Organização visual
     */
    section?: string; // Sub-seção dentro do grupo
    columns?: 1 | 2 | 3; // Largura do campo (grid)
  };
}

interface SelectOption {
  value: string | number | boolean;
  label: string;
  description?: string; // Tooltip no option
  disabled?: boolean;
}
```

**Exemplo de Resposta:**

```json
{
  "schema": { /* schema existente */ },
  "version": "1.0.0",
  "uiHints": {
    "gateway.bind": {
      "label": "Bind Mode",
      "help": "How the gateway should bind to network interfaces",
      "widget": "select",
      "options": [
        { "value": "auto", "label": "Auto", "description": "Automatically detect best interface" },
        { "value": "lan", "label": "LAN", "description": "Bind to all LAN interfaces" },
        { "value": "loopback", "label": "Loopback", "description": "Localhost only" },
        { "value": "custom", "label": "Custom", "description": "Specify custom interface" },
        { "value": "tailnet", "label": "Tailnet", "description": "Bind to Tailscale interface" }
      ]
    },
    "agents.defaults.model": {
      "label": "Default Model",
      "help": "Model to use when not specified",
      "widget": "autocomplete",
      "autocomplete": {
        "source": "models",
        "minChars": 1,
        "maxResults": 20
      }
    },
    "channels.telegram.botToken": {
      "label": "Bot Token",
      "widget": "password",
      "validation": {
        "pattern": "^\\d+:[\\w-]+$",
        "customMessage": "Formato inválido. Use: números:letras"
      }
    }
  }
}
```

---

#### 2.2 Autocomplete API

**Endpoint:** `config.autocomplete`

**Method:** POST

**Request:**

```typescript
interface AutocompleteRequest {
  source: 'agents' | 'models' | 'channels' | 'skills' | 'tools' | 'profiles';
  query: string;
  limit?: number;
  context?: {
    path: string[]; // Caminho do campo sendo editado
    currentConfig: Record<string, unknown>; // Config atual
  };
}
```

**Response:**

```typescript
interface AutocompleteResponse {
  results: AutocompleteResult[];
  hasMore: boolean;
  total: number;
}

interface AutocompleteResult {
  value: string;
  label: string;
  description?: string;
  category?: string; // Agrupamento visual
  icon?: string; // Nome do ícone Lucide
  metadata?: Record<string, unknown>; // Dados extras
}
```

**Exemplo:**

Request:
```json
{
  "source": "models",
  "query": "gpt",
  "limit": 5
}
```

Response:
```json
{
  "results": [
    { 
      "value": "openai/gpt-4", 
      "label": "GPT-4", 
      "description": "OpenAI GPT-4",
      "category": "OpenAI"
    },
    { 
      "value": "openai/gpt-4-turbo", 
      "label": "GPT-4 Turbo", 
      "description": "OpenAI GPT-4 Turbo",
      "category": "OpenAI"
    }
  ],
  "hasMore": false,
  "total": 2
}
```

---

#### 2.3 Config Validation API

**Endpoint:** `config.validate`

**Method:** POST

**Request:**

```typescript
interface ConfigValidateRequest {
  path: string[]; // Caminho específico para validar (opcional)
  value: unknown; // Valor a ser validado
  currentConfig?: Record<string, unknown>; // Config completo para contexto
}
```

**Response:**

```typescript
interface ConfigValidateResponse {
  valid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationWarning[];
  suggestions?: ValidationSuggestion[];
}

interface ValidationError {
  message: string;
  code: string;
  path?: string[];
  severity: 'error' | 'warning' | 'info';
}

interface ValidationWarning {
  message: string;
  code: string;
  suggestion?: string;
}

interface ValidationSuggestion {
  value: unknown;
  label: string;
  reason: string;
}
```

---

### 3. Frontend Specifications

#### 3.1 SelectField Component

**Arquivo:** `ui/src/ui/components/select-field.ts`

**Interface:**

```typescript
interface SelectFieldProps {
  label: string;
  value: string | number | boolean | undefined;
  options: SelectOption[];
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  searchable?: boolean; // Se true, permite digitar para filtrar
  clearable?: boolean; // Se true, permite limpar seleção
  onChange: (value: string | number | boolean | undefined) => void;
}
```

**Comportamento:**

1. **Renderização:**
   - Mostrar label + campo estilo dropdown
   - Se `searchable=true`, input text dentro do dropdown
   - Se `clearable=true`, botão X para limpar

2. **Interações:**
   - Click: abre dropdown com opções
   - Type (searchable): filtra opções em tempo real
   - Arrow keys: navegação entre opções
   - Enter: seleciona opção focada
   - Escape: fecha dropdown

3. **Estados Visuais:**
   - Default: borda cinza
   - Focus: borda azul + shadow
   - Disabled: opacidade 0.5, cursor not-allowed
   - Error: borda vermelha + ícone de erro

4. **Acessibilidade:**
   - ARIA: `role="combobox"`, `aria-expanded`, `aria-selected`
   - Keyboard navigation completa
   - Screen reader announcements

---

#### 3.2 AutocompleteField Component

**Arquivo:** `ui/src/ui/components/autocomplete-field.ts`

**Interface:**

```typescript
interface AutocompleteFieldProps {
  label: string;
  value: string | undefined;
  source: 'agents' | 'models' | 'channels' | 'skills' | 'tools' | 'profiles' | 'custom';
  searchEndpoint?: string; // Se source for 'custom'
  placeholder?: string;
  help?: string;
  disabled?: boolean;
  minChars?: number;
  maxResults?: number;
  allowCreate?: boolean;
  debounceMs?: number; // Default: 150ms
  onChange: (value: string | undefined) => void;
}
```

**Comportamento:**

1. **Renderização:**
   - Input text com ícone de busca (🔍)
   - Dropdown com resultados (posicionado absoluto)
   - Indicador de loading (spinner)

2. **Fluxo de Busca:**
   ```
   User types → Debounce (150ms) → Call API → Show results
   ```

3. **Interações:**
   - Type: inicia busca após `minChars`
   - Click em resultado: seleciona valor
   - Arrow keys: navega resultados
   - Escape: fecha dropdown
   - Blur: fecha dropdown (sem selecionar)

4. **Categorias:**
   - Agrupar resultados por categoria
   - Mostrar header de categoria

5. **Criação:**
   - Se `allowCreate=true` e query não encontrada:
   - Opção "Create: [query]" no final

---

#### 3.3 Enhanced Config Form

**Modificações em:** `ui/src/ui/views/config-form.node.ts`

**Renderização por Tipo de Widget:**

```typescript
function renderNode(params: RenderNodeParams): TemplateResult {
  const { schema, value, path, hints } = params;
  const hint = hintForPath(path, hints);
  
  // Determinar widget
  const widget = hint?.widget ?? inferWidgetFromSchema(schema);
  
  switch (widget) {
    case 'select':
      return renderSelectField({ ...params, options: hint.options });
    case 'autocomplete':
      return renderAutocompleteField({ ...params, config: hint.autocomplete });
    case 'toggle':
      return renderToggleField(params);
    case 'number':
      return renderNumberField(params);
    case 'password':
      return renderPasswordField(params);
    case 'textarea':
      return renderTextareaField(params);
    case 'json':
      return renderJsonField(params);
    default:
      return renderTextField(params);
  }
}
```

**Inferência de Widget:**

```typescript
function inferWidgetFromSchema(schema: JsonSchema): WidgetType {
  // Enum com ≤5 opções → segmented (botões)
  // Enum com >5 opções → select
  // String com format específico → widget especializado
  // Boolean → toggle
  // Number → number input
  // String + sensitive path → password
  
  if (schema.enum) {
    return schema.enum.length <= 5 ? 'segmented' : 'select';
  }
  
  if (schema.type === 'boolean') return 'toggle';
  if (schema.type === 'number' || schema.type === 'integer') return 'number';
  
  if (schema.format === 'password') return 'password';
  if (schema.format === 'email') return 'text'; // Com validação
  if (schema.format === 'uri') return 'text'; // Com validação
  
  return 'text';
}
```

---

### 4. Integration Specifications

#### 4.1 Data Flow

```
1. User opens Config page
   ↓
2. Frontend calls: config.schema + config.get
   ↓
3. Backend returns: schema + uiHints + current config
   ↓
4. Frontend renders form using widget hints
   ↓
5. User interacts with field
   ↓
6. Case A: Select field
   - User clicks option
   - Frontend updates local state
   - Optional: call config.validate for feedback
   ↓
6. Case B: Autocomplete field
   - User types (debounced)
   - Frontend calls: config.autocomplete
   - Backend queries data sources
   - Frontend shows results
   - User selects result
   - Frontend updates local state
   ↓
7. User clicks Save
   - Frontend calls: config.set
   - Backend validates + saves
   - Frontend shows success/error
```

#### 4.2 State Management

**Extensão do AppState:**

```typescript
interface ConfigState {
  // Existing...
  
  // NEW
  configAutocompleteCache: Map<string, AutocompleteResult[]>;
  configValidationErrors: Map<string, ValidationError[]>;
  configIsValidating: boolean;
}
```

---

### 5. Testing Specifications

#### 5.1 Backend Tests

**Schema Hints:**
- Test: `config.schema` returns enhanced hints for all enum fields
- Test: Each hint has correct widget type
- Test: Options arrays are populated correctly

**Autocomplete:**
- Test: Search by partial match
- Test: Limit results
- Test: Handle empty query
- Test: Handle special characters
- Test: Return categories correctly

**Validation:**
- Test: Validate required fields
- Test: Validate patterns (regex)
- Test: Validate min/max for numbers
- Test: Return appropriate error messages

#### 5.2 Frontend Tests

**SelectField:**
- Test: Renders all options
- Test: Selects value on click
- Test: Searchable filters options
- Test: Keyboard navigation
- Test: Disabled state

**AutocompleteField:**
- Test: Debounces API calls
- Test: Shows loading state
- Test: Renders results
- Test: Selects on click
- Test: Handles API errors gracefully

**Integration:**
- Test: Form renders with new widgets
- Test: Saving works end-to-end
- Test: Validation feedback displays correctly

---

### 6. Implementation Phases

#### Fase 1: Backend Schema Hints (2 dias)

**Tarefas:**
1. Atualizar `ConfigUiHints` type com novos campos
2. Criar função `generateEnhancedHints(schema)`
3. Mapear todos os enums do schema para hints
4. Adicionar validação aos hints
5. Testes unitários

**Arquivos:**
- `src/config/types.ts` - Adicionar tipos
- `src/gateway/server-methods/config.ts` - Gerar hints
- `src/gateway/server-methods/config.test.ts` - Testes

---

#### Fase 2: Backend Autocomplete (1 dia)

**Tarefas:**
1. Criar endpoint `config.autocomplete`
2. Implementar handlers para cada source type
3. Adicionar caching
4. Testes

**Arquivos:**
- `src/gateway/server-methods/config.ts` - Novo método
- `src/gateway/server-methods/config.test.ts` - Testes

---

#### Fase 3: Frontend Components (3 dias)

**Tarefas:**
1. Criar `SelectField` component
2. Criar `AutocompleteField` component
3. Atualizar `config-form.node.ts` para usar novos widgets
4. Adicionar estilos CSS
5. Testes de componente

**Arquivos:**
- `ui/src/ui/components/select-field.ts`
- `ui/src/ui/components/autocomplete-field.ts`
- `ui/src/ui/views/config-form.node.ts`
- `ui/src/styles/config.css`

---

#### Fase 4: Frontend Integration (2 dias)

**Tarefas:**
1. Atualizar tipos TypeScript
2. Integrar autocomplete API calls
3. Adicionar validação inline
4. Testes de integração

**Arquivos:**
- `ui/src/ui/types.ts`
- `ui/src/ui/controllers/config.ts`
- `ui/src/ui/app.ts`

---

#### Fase 5: Polish & Testing (2 dias)

**Tarefas:**
1. Testes end-to-end
2. Acessibilidade
3. Performance tuning
4. Documentação

---

### 7. API Examples

#### Exemplo Completo: Configurar Gateway

**1. Carregar Schema:**

```http
GET /api/config/schema
Authorization: Bearer <token>

Response:
{
  "schema": { ... },
  "uiHints": {
    "gateway.bind": {
      "widget": "select",
      "options": [
        { "value": "auto", "label": "Auto" },
        { "value": "loopback", "label": "Loopback Only" }
      ]
    },
    "gateway.port": {
      "widget": "number",
      "validation": { "min": 1024, "max": 65535 }
    }
  }
}
```

**2. Validar Campo:**

```http
POST /api/config/validate
Authorization: Bearer <token>
Content-Type: application/json

{
  "path": ["gateway", "port"],
  "value": 8080
}

Response:
{
  "valid": true
}
```

**3. Salvar Config:**

```http
POST /api/config/set
Authorization: Bearer <token>
Content-Type: application/json

{
  "raw": "{ gateway: { bind: 'auto', port: 8080 } }",
  "baseHash": "abc123"
}
```

---

### 8. Edge Cases

1. **Schema Mismatch:** Se schema mudar, hints devem ser regenerados automaticamente
2. **Autocomplete Fail:** Se API falhar, mostrar campo como text input normal
3. **Validation Lag:** Debounce validação para não sobrecarregar backend
4. **Large Configs:** Paginar ou lazy-load hints para configs muito grandes
5. **Concurrent Edits:** Detectar hash mismatch ao salvar

---

### 9. Rollout Plan

1. **Feature Flag:** Adicionar flag `enhancedConfigUI` (default: false)
2. **Beta Testing:** Habilitar para usuários específicos
3. **Gradual Rollout:** 10% → 50% → 100%
4. **Fallback:** Se novos widgets falharem, usar widgets antigos

---

## Aprovação

- [ ] Tech Lead
- [ ] Product Owner
- [ ] Backend Lead
- [ ] Frontend Lead

---

**Versão:** 1.0  
**Data:** 2025-02-28  
**Autor:** Assistant
