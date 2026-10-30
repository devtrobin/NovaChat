# Guide de Test - Providers NovaChat

## 📌 Introduction

Ce document fournit un **guide complet pour tester** l'implémentation des providers dans NovaChat, avec un focus particulier sur **Mistral AI (Cloud et Ollama)**.

**Objectif** : Garantir que chaque provider fonctionne correctement, que l'UI est réactive, et que les erreurs sont gérées proprement.

---

## 🎯 Stratégie de Test

### 1. Approche
- **Tests unitaires** : Tester chaque fonction individuellement
- **Tests d'intégration** : Tester l'interaction entre composants
- **Tests E2E** : Tester l'expérience utilisateur complète
- **Tests manuels** : Validation finale avant livraison

### 2. Outils utilisés
| Outil | Usage | Commande |
|-------|-------|----------|
| **Vitest** | Tests unitaires et d'intégration | `npm test` |
| **Electron** | Tests E2E | `npm run package` + test manuel |
| **Postman** | Tester les APIs externes | Tests manuels |
| **Ollama CLI** | Tester Ollama localement | `ollama list`, `ollama pull` |

---

## 🧪 Tests Unitaires

### 1. Structure des tests

```
tests/
├── providers/
│   ├── provider-manager.test.ts       # Tests du Provider Manager
│   ├── openai-provider.test.ts        # Tests OpenAI (existants)
│   ├── mistral-cloud-provider.test.ts # Tests Mistral Cloud
│   └── mistral-ollama-provider.test.ts # Tests Mistral Ollama
│
├── renderer/
│   └── components/
│       └── settings/
│           ├── ProvidersSettingsPage.test.tsx
│           ├── MistralCloudSettingsTab.test.tsx
│           └── MistralOllamaSettingsTab.test.tsx
│
└── integration/
    └── providers.integration.test.ts   # Tests d'intégration
```

---

### 2. Tests du Provider Manager

#### Fichier : `tests/providers/provider-manager.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProviderManager } from '../../src/main/providers/provider-manager';
import { OpenAIProvider } from '../../src/main/providers/openai-provider';
import { MistralCloudProvider } from '../../src/main/providers/mistral-cloud-provider';
import { MistralOllamaProvider } from '../../src/main/providers/mistral-ollama-provider';

describe('ProviderManager', () => {
  let providerManager: ProviderManager;

  beforeEach(() => {
    providerManager = new ProviderManager();
  });

  describe('Initialization', () => {
    it('should register built-in providers', () => {
      const providers = providerManager.getRegisteredProviders();
      expect(providers).toContain('openai');
      expect(providers).toContain('mistral-cloud');
      expect(providers).toContain('mistral-ollama');
    });

    it('should have openai as default active provider', () => {
      expect(providerManager.getActiveProviderId()).toBe('openai');
    });
  });

  describe('Provider Selection', () => {
    it('should allow changing active provider', () => {
      providerManager.setActiveProvider('mistral-ollama');
      expect(providerManager.getActiveProviderId()).toBe('mistral-ollama');
    });

    it('should throw error for unregistered provider', () => {
      expect(() => {
        providerManager.setActiveProvider('unknown-provider');
      }).toThrow('Provider unknown-provider non enregistré');
    });
  });

  describe('Provider Validation', () => {
    it('should validate OpenAI configuration', () => {
      const config = {
        apiKey: 'sk-test-key',
        baseUrl: 'https://api.openai.com/v1',
        modelId: 'gpt-4o-mini'
      };
      const result = providerManager.validateConfig('openai', config);
      expect(result.valid).toBe(true);
    });

    it('should validate Mistral Cloud configuration', () => {
      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const result = providerManager.validateConfig('mistral-cloud', config);
      expect(result.valid).toBe(true);
    });

    it('should validate Mistral Ollama configuration', () => {
      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const result = providerManager.validateConfig('mistral-ollama', config);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid configuration', () => {
      const config = {
        baseUrl: 'invalid-url',
        modelId: 'invalid-model'
      };
      const result = providerManager.validateConfig('mistral-ollama', config);
      expect(result.valid).toBe(false);
    });
  });
});
```

---

### 3. Tests du Mistral Cloud Provider

#### Fichier : `tests/providers/mistral-cloud-provider.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MistralCloudProvider } from '../../src/main/providers/mistral-cloud-provider';
import { fetch } from 'cross-fetch';

// Mock de fetch
global.fetch = vi.fn();

describe('MistralCloudProvider', () => {
  let provider: MistralCloudProvider;

  beforeEach(() => {
    provider = new MistralCloudProvider();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct provider metadata', () => {
      expect(provider.id).toBe('mistral-cloud');
      expect(provider.displayName).toBe('Mistral Cloud');
      expect(provider.type).toBe('cloud');
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration', () => {
      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject missing apiKey', () => {
      const config = {
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('apiKey');
    });

    it('should reject invalid apiKey format', () => {
      const config = {
        apiKey: 'invalid-key',
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('format');
    });

    it('should reject invalid baseUrl', () => {
      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'invalid-url',
        modelId: 'mistral-medium'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('URL');
    });
  });

  describe('Connection Test', () => {
    it('should succeed with valid API key', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'mistral-tiny' },
            { id: 'mistral-small' },
            { id: 'mistral-medium' }
          ]
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1'
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(true);
      expect(result.models).toContain('mistral-medium');
    });

    it('should fail with invalid API key', async () => {
      const mockResponse = {
        ok: false,
        status: 401
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        apiKey: 'invalid-key',
        baseUrl: 'https://api.mistral.ai/v1'
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('401');
    });

    it('should fail with network error', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1'
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('network');
    });
  });

  describe('Send Request', () => {
    it('should send request and parse response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          id: 'resp-test',
          model: 'mistral-medium',
          created: 1700000000,
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Bonjour !'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15
          }
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user', content: 'Bonjour' }
      ];
      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const response = await provider.sendRequest(messages, { config });
      expect(response.status).toBe('success');
      expect(response.content).toBe('Bonjour !');
      expect(response.modelId).toBe('mistral-medium');
      expect(response.metadata.usage?.promptTokens).toBe(10);
    });

    it('should handle API errors', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        json: () => Promise.resolve({
          error: {
            message: 'Invalid request',
            type: 'BadRequestError'
          }
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user', content: 'Test' }
      ];
      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1',
        modelId: 'mistral-medium'
      };
      const response = await provider.sendRequest(messages, { config });
      expect(response.status).toBe('error');
      expect(response.metadata.error).toBeDefined();
    });
  });

  describe('Get Available Models', () => {
    it('should return list of models', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          data: [
            { id: 'mistral-tiny' },
            { id: 'mistral-small' },
            { id: 'mistral-medium' }
          ]
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        apiKey: 'mst-test-key',
        baseUrl: 'https://api.mistral.ai/v1'
      };
      const models = await provider.getAvailableModels(config);
      expect(models.length).toBe(3);
      expect(models[0].id).toBe('mistral-tiny');
    });
  });
});
```

---

### 4. Tests du Mistral Ollama Provider

#### Fichier : `tests/providers/mistral-ollama-provider.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MistralOllamaProvider } from '../../src/main/providers/mistral-ollama-provider';

global.fetch = vi.fn();

describe('MistralOllamaProvider', () => {
  let provider: MistralOllamaProvider;

  beforeEach(() => {
    provider = new MistralOllamaProvider();
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should have correct provider metadata', () => {
      expect(provider.id).toBe('mistral-ollama');
      expect(provider.displayName).toBe('Mistral Ollama');
      expect(provider.type).toBe('local');
    });
  });

  describe('Configuration Validation', () => {
    it('should accept valid configuration', () => {
      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });

    it('should reject missing baseUrl', () => {
      const config = {
        modelId: 'mistral:7b-instruct'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('baseUrl');
    });

    it('should reject missing modelId', () => {
      const config = {
        baseUrl: 'http://localhost:11434'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('modelId');
    });

    it('should accept custom port', () => {
      const config = {
        baseUrl: 'http://localhost:11435',
        modelId: 'mistral:latest'
      };
      const result = provider.validateConfig(config);
      expect(result.valid).toBe(true);
    });
  });

  describe('Connection Test', () => {
    it('should succeed when Ollama is running with model', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'mistral:7b-instruct' }
          ]
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(true);
      expect(result.models).toContain('mistral:7b-instruct');
    });

    it('should fail when Ollama is not running', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Connection refused'));

      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('OLLAMA_NOT_RUNNING');
    });

    it('should fail when model is not found', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'mistral:latest' }
          ]
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'  // Not in the list
      };
      const result = await provider.testConnection(config);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('MODEL_NOT_FOUND');
    });
  });

  describe('Send Request', () => {
    it('should send request and parse response', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          model: 'mistral:7b-instruct',
          created_at: '2024-01-01T00:00:00Z',
          message: {
            role: 'assistant',
            content: 'Bonjour !'
          },
          done: true,
          total_duration: 5000,
          load_duration: 1000,
          prompt_eval_count: 10,
          eval_count: 5
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user', content: 'Bonjour' }
      ];
      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const response = await provider.sendRequest(messages, { config });
      expect(response.status).toBe('success');
      expect(response.content).toBe('Bonjour !');
      expect(response.modelId).toBe('mistral:7b-instruct');
      expect(response.metadata.usage?.promptTokens).toBe(10);
      expect(response.metadata.usage?.completionTokens).toBe(5);
    });

    it('should handle Ollama errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        json: () => Promise.resolve({
          error: 'Model not loaded'
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const messages = [
        { role: 'user', content: 'Test' }
      ];
      const config = {
        baseUrl: 'http://localhost:11434',
        modelId: 'mistral:7b-instruct'
      };
      const response = await provider.sendRequest(messages, { config });
      expect(response.status).toBe('error');
    });
  });

  describe('Get Available Models', () => {
    it('should return list of installed models', async () => {
      const mockResponse = {
        ok: true,
        json: () => Promise.resolve({
          models: [
            { name: 'mistral:latest', size: 14000000000 },
            { name: 'mistral:7b-instruct', size: 7000000000 },
            { name: 'codestral:latest', size: 22000000000 }
          ]
        })
      };
      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const config = {
        baseUrl: 'http://localhost:11434'
      };
      const models = await provider.getAvailableModels(config);
      expect(models.length).toBe(3);
      expect(models[0].id).toBe('mistral:latest');
    });
  });
});
```

---

## 🧩 Tests d'Intégration

### 1. Tests de l'UI

#### Fichier : `tests/renderer/components/settings/ProvidersSettingsPage.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProvidersSettingsPage } from '../../../../src/renderer/components/settings/ProvidersSettingsPage';

// Mock des hooks et fonctions
vi.mock('../../../../src/renderer/hooks/useProviders', () => ({
  useProviders: () => ({
    providers: [
      { id: 'openai', displayName: 'OpenAI', enabled: true },
      { id: 'mistral-ollama', displayName: 'Mistral Ollama', enabled: true },
      { id: 'mistral-cloud', displayName: 'Mistral Cloud', enabled: false }
    ],
    activeProviderId: 'openai',
    setActiveProvider: vi.fn(),
    testConnection: vi.fn(),
    refreshModels: vi.fn()
  })
}));

describe('ProvidersSettingsPage', () => {
  beforeEach(() => {
    render(<ProvidersSettingsPage />);
  });

  it('should display all providers in the selector', () => {
    const selector = screen.getByLabelText(/Provider actif/i);
    expect(selector).toBeInTheDocument();
    
    // Vérifier que les providers sont dans le dropdown
    const openaiOption = screen.getByText('OpenAI');
    const mistralOllamaOption = screen.getByText('Mistral Ollama');
    const mistralCloudOption = screen.getByText('Mistral Cloud');
    
    expect(openaiOption).toBeInTheDocument();
    expect(mistralOllamaOption).toBeInTheDocument();
    expect(mistralCloudOption).toBeInTheDocument();
  });

  it('should display the active provider', () => {
    const activeProviderDisplay = screen.getByText(/OpenAI/i);
    expect(activeProviderDisplay).toBeInTheDocument();
  });

  it('should allow changing active provider', () => {
    const selector = screen.getByLabelText(/Provider actif/i);
    fireEvent.change(selector, { target: { value: 'mistral-ollama' } });
    
    // Vérifier que l'onglet Mistral Ollama est affiché
    const mistralOllamaTab = screen.getByText(/Mistral Ollama/i);
    expect(mistralOllamaTab).toBeInTheDocument();
  });

  it('should display tabs for each provider', () => {
    const openAITab = screen.getByText(/OpenAI/i);
    const mistralOllamaTab = screen.getByText(/Mistral Ollama/i);
    const mistralCloudTab = screen.getByText(/Mistral Cloud/i);
    
    expect(openAITab).toBeInTheDocument();
    expect(mistralOllamaTab).toBeInTheDocument();
    expect(mistralCloudTab).toBeInTheDocument();
  });
});
```

---

### 2. Tests de l'onglet Mistral Ollama

#### Fichier : `tests/renderer/components/settings/MistralOllamaSettingsTab.test.tsx`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MistralOllamaSettingsTab } from '../../../../src/renderer/components/settings/MistralOllamaSettingsTab';

// Mock des hooks
vi.mock('../../../../src/renderer/hooks/useMistralOllamaConfig', () => ({
  useMistralOllamaConfig: () => ({
    config: {
      baseUrl: 'http://localhost:11434',
      modelId: 'mistral:7b-instruct',
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.9,
        topK: 50
      }
    },
    setConfig: vi.fn(),
    testConnection: vi.fn().mockResolvedValue({
      success: true,
      models: ['mistral:latest', 'mistral:7b-instruct']
    }),
    refreshModels: vi.fn().mockResolvedValue([
      { id: 'mistral:latest' },
      { id: 'mistral:7b-instruct' }
    ])
  })
}));

describe('MistralOllamaSettingsTab', () => {
  beforeEach(() => {
    render(<MistralOllamaSettingsTab />);
  });

  it('should display all configuration fields', () => {
    const baseUrlInput = screen.getByLabelText(/Base URL/i);
    const modelSelect = screen.getByLabelText(/Modèle/i);
    const temperatureInput = screen.getByLabelText(/Température/i);
    const maxTokensInput = screen.getByLabelText(/Max Tokens/i);
    const topPInput = screen.getByLabelText(/Top P/i);
    const topKInput = screen.getByLabelText(/Top K/i);
    
    expect(baseUrlInput).toBeInTheDocument();
    expect(modelSelect).toBeInTheDocument();
    expect(temperatureInput).toBeInTheDocument();
    expect(maxTokensInput).toBeInTheDocument();
    expect(topPInput).toBeInTheDocument();
    expect(topKInput).toBeInTheDocument();
  });

  it('should display default values', () => {
    const baseUrlInput = screen.getByLabelText(/Base URL/i) as HTMLInputElement;
    const modelSelect = screen.getByLabelText(/Modèle/i) as HTMLSelectElement;
    const temperatureInput = screen.getByLabelText(/Température/i) as HTMLInputElement;
    
    expect(baseUrlInput.value).toBe('http://localhost:11434');
    expect(modelSelect.value).toBe('mistral:7b-instruct');
    expect(temperatureInput.value).toBe('0.7');
  });

  it('should allow changing configuration values', () => {
    const baseUrlInput = screen.getByLabelText(/Base URL/i);
    const temperatureInput = screen.getByLabelText(/Température/i);
    
    fireEvent.change(baseUrlInput, { target: { value: 'http://localhost:11435' } });
    fireEvent.change(temperatureInput, { target: { value: '0.9' } });
    
    expect(baseUrlInput).toHaveValue('http://localhost:11435');
    expect(temperatureInput).toHaveValue('0.9');
  });

  it('should display test connection button', () => {
    const testButton = screen.getByText(/Tester la connexion/i);
    expect(testButton).toBeInTheDocument();
  });

  it('should display refresh models button', () => {
    const refreshButton = screen.getByText(/Rafraîchir la liste des modèles/i);
    expect(refreshButton).toBeInTheDocument();
  });

  it('should display available models in select', () => {
    const modelSelect = screen.getByLabelText(/Modèle/i);
    const mistralLatestOption = screen.getByText('mistral:latest');
    const mistral7bOption = screen.getByText('mistral:7b-instruct');
    
    expect(mistralLatestOption).toBeInTheDocument();
    expect(mistral7bOption).toBeInTheDocument();
  });
});
```

---

## 🖥 Tests E2E (End-to-End)

### 1. Préparation

#### Installer les dépendances de test
```bash
npm install -D @playwright/test
```

#### Créer un fichier de configuration Playwright
```javascript
// tests/e2e/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ]
});
```

---

### 2. Tests E2E pour les Providers

#### Fichier : `tests/e2e/providers.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright-electron';

let electronApp: ElectronApplication;

test.beforeAll(async () => {
  electronApp = await electron.launch({
    args: ['main.js'] // Chemin vers le fichier main d'Electron
  });
});

test.afterAll(async () => {
  await electronApp.close();
});

test.describe('Providers Settings', () => {
  test('should open NovaChat', async () => {
    const window = await electronApp.firstWindow();
    await expect(window).toHaveTitle(/NovaChat/);
  });

  test('should navigate to providers settings', async () => {
    const window = await electronApp.firstWindow();
    
    // Cliquer sur le bouton Paramètres (à adapter selon votre UI)
    await window.getByRole('button', { name: /Paramètres|Settings/i }).click();
    
    // Attendre que la page des paramètres charge
    await expect(window.getByText(/Providers/)).toBeVisible();
  });

  test('should display provider selector', async () => {
    const window = await electronApp.firstWindow();
    
    // Naviguer vers les paramètres des providers
    await window.getByText(/Providers/).click();
    
    // Vérifier que le sélecteur est affiché
    const selector = window.getByLabelText(/Provider actif|Active Provider/i);
    await expect(selector).toBeVisible();
    
    // Vérifier que les options sont présentes
    await expect(window.getByText('OpenAI')).toBeVisible();
    await expect(window.getByText('Mistral Ollama')).toBeVisible();
    await expect(window.getByText('Mistral Cloud')).toBeVisible();
  });

  test('should allow selecting Mistral Ollama', async () => {
    const window = await electronApp.firstWindow();
    
    // Sélectionner Mistral Ollama
    const selector = window.getByLabelText(/Provider actif|Active Provider/i);
    await selector.selectOption('mistral-ollama');
    
    // Vérifier que l'onglet Mistral Ollama est affiché
    await expect(window.getByText(/Mistral Ollama/i)).toBeVisible();
    
    // Vérifier que les champs de configuration sont affichés
    await expect(window.getByLabelText(/Base URL/i)).toBeVisible();
    await expect(window.getByLabelText(/Modèle/i)).toBeVisible();
  });

  test('should test Mistral Ollama connection', async () => {
    const window = await electronApp.firstWindow();
    
    // Sélectionner Mistral Ollama
    const selector = window.getByLabelText(/Provider actif|Active Provider/i);
    await selector.selectOption('mistral-ollama');
    
    // Cliquer sur le bouton "Tester la connexion"
    const testButton = window.getByRole('button', { name: /Tester la connexion|Test Connection/i });
    await testButton.click();
    
    // Attendre le résultat (à adapter selon votre implémentation)
    // Si Ollama est démarré avec un modèle Mistral :
    await expect(window.getByText(/Connexion réussie|Connection successful/)).toBeVisible();
    
    // Si Ollama n'est pas démarré :
    // await expect(window.getByText(/Ollama non trouvé|Ollama not found/)).toBeVisible();
  });

  test('should save Mistral Ollama configuration', async () => {
    const window = await electronApp.firstWindow();
    
    // Sélectionner Mistral Ollama
    const selector = window.getByLabelText(/Provider actif|Active Provider/i);
    await selector.selectOption('mistral-ollama');
    
    // Modifier la configuration
    const baseUrlInput = window.getByLabelText(/Base URL/i);
    await baseUrlInput.fill('http://localhost:11435');
    
    const temperatureInput = window.getByLabelText(/Température|Temperature/i);
    await temperatureInput.fill('0.9');
    
    // Sauvegarder (à adapter selon votre UI)
    // Par exemple, cliquer sur un bouton "Sauvegarder" ou la sauvegarde est automatique
    
    // Redémarrer l'application et vérifier que la configuration est conservée
    // (ce test nécessiterait une logique plus complexe)
  });

  test('should start a conversation with Mistral Ollama', async () => {
    const window = await electronApp.firstWindow();
    
    // Sélectionner Mistral Ollama comme provider actif
    const selector = window.getByLabelText(/Provider actif|Active Provider/i);
    await selector.selectOption('mistral-ollama');
    
    // Retourner à la page principale
    await window.getByRole('button', { name: /Retour|Back|Close/i }).click();
    
    // Démarrer une nouvelle conversation
    await window.getByRole('button', { name: /Nouvelle conversation|New Chat/i }).click();
    
    // Envoyer un message
    const messageInput = window.getByPlaceholder(/Tapez un message|Type a message/i);
    await messageInput.fill('Bonjour, comment ça va ?');
    await messageInput.press('Enter');
    
    // Attendre la réponse
    // Note: Ce test dépend de l'implémentation complète et d'Ollama en cours d'exécution
    // await expect(window.getByText(/Bien|Bon|Salut/)).toBeVisible({ timeout: 30000 });
  });
});
```

---

## 🧪 Tests Manuels

### 1. Checklist de tests manuels

#### Pour chaque provider
- [ ] Sélectionner le provider comme actif
- [ ] Accéder à l'onglet de configuration
- [ ] Vérifier que les champs de configuration sont affichés
- [ ] Modifier les valeurs de configuration
- [ ] Tester la connexion (avec succès)
- [ ] Tester la connexion (avec échec) - ex: clés invalides, Ollama non démarré
- [ ] Démarrer une conversation
- [ ] Envoyer un message
- [ ] Recevoir une réponse
- [ ] Changer de modèle
- [ ] Rafraîchir la liste des modèles

#### Scénarios spécifiques
- [ ] Basculer entre providers pendant une conversation
- [ ] Redémarrer NovaChat et vérifier que la configuration est conservée
- [ ] Tester avec une mauvaise configuration (URL invalide, modèle inexistant)
- [ ] Tester avec une connexion internet interrompue (pour Mistral Cloud)
- [ ] Tester avec Ollama non démarré (pour Mistral Ollama)

---

### 2. Scénarios de test détaillés

#### Scénario 1 : Première utilisation de Mistral Ollama

**Prérequis** :
- Ollama installé et démarré
- Modèle Mistral installé (`ollama pull mistral:7b-instruct`)

**Étapes** :
1. Ouvrir NovaChat
2. Aller dans **Paramètres > Providers**
3. Sélectionner **Mistral Ollama** comme provider actif
4. Vérifier que la **Base URL** est `http://localhost:11434`
5. Sélectionner **mistral:7b-instruct** comme modèle
6. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : "Connexion réussie"
7. Retourner à la page principale
8. Démarrer une nouvelle conversation
9. Envoyer un message simple (ex: "Bonjour")
   - ✅ **Attendu** : Réponse du modèle

**Critères de succès** :
- [ ] Connexion réussie
- [ ] Réponse reçue
- [ ] Pas d'erreurs dans la console

---

#### Scénario 2 : Configuration incorrecte

**Étapes** :
1. Ouvrir NovaChat
2. Aller dans **Paramètres > Providers > Mistral Ollama**
3. Changer la **Base URL** en `http://localhost:9999` (port invalide)
4. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : Erreur "Ollama non trouvé" ou similaire
5. Changer le **Modèle** en `mistral:invalid-model`
6. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : Erreur "Modèle non trouvé" ou similaire

**Critères de succès** :
- [ ] Messages d'erreur clairs
- [ ] Pas de crash de l'application

---

#### Scénario 3 : Mistral Cloud avec clé API invalide

**Prérequis** :
- Compte Mistral avec clé API

**Étapes** :
1. Ouvrir NovaChat
2. Aller dans **Paramètres > Providers > Mistral Cloud**
3. Entrer une **clé API invalide** (ex: "invalid-key")
4. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : Erreur "Clé API invalide" ou "401 Unauthorized"
5. Entrer une **clé API valide**
6. Cliquer sur **"Tester la connexion"**
   - ✅ **Attendu** : "Connexion réussie"

**Critères de succès** :
- [ ] Gestion correcte des erreurs d'authentification
- [ ] Connexion réussie avec clé valide

---

#### Scénario 4 : Basculer entre providers

**Prérequis** :
- OpenAI configuré
- Mistral Ollama configuré (Ollama + modèle installé)

**Étapes** :
1. Ouvrir NovaChat
2. Sélectionner **OpenAI** comme provider actif
3. Démarrer une conversation et envoyer un message
   - ✅ **Attendu** : Réponse via OpenAI
4. Aller dans **Paramètres > Providers**
5. Sélectionner **Mistral Ollama** comme provider actif
6. Retourner à la conversation et envoyer un nouveau message
   - ✅ **Attendu** : Réponse via Mistral Ollama

**Critères de succès** :
- [ ] Changement de provider fonctionnel
- [ ] Nouveaux messages utilisent le nouveau provider

---

### 3. Template de rapport de test

```markdown
# Rapport de Test - Providers NovaChat

**Date** : [YYYY-MM-DD]
**Testeur** : [Nom]
**Version** : [Version de NovaChat]

## Environnement
- **OS** : [Windows/macOS/Linux]
- **Node.js** : [version]
- **Electron** : [version]
- **Ollama** : [version] (si applicable)
- **Modèles installés** : [liste des modèles]

## Résultats des Tests

### Tests Unitaires
| Test | Statut | Notes |
|------|--------|-------|
| ProviderManager - Initialisation | ✅/❌ | |
| ProviderManager - Changement de provider | ✅/❌ | |
| MistralCloudProvider - Validation | ✅/❌ | |
| MistralCloudProvider - Test connexion | ✅/❌ | |
| MistralOllamaProvider - Validation | ✅/❌ | |
| MistralOllamaProvider - Test connexion | ✅/❌ | |

### Tests d'Intégration
| Test | Statut | Notes |
|------|--------|-------|
| UI - Sélecteur de provider | ✅/❌ | |
| UI - Onglet Mistral Ollama | ✅/❌ | |
| UI - Onglet Mistral Cloud | ✅/❌ | |
| Intégration Nova - Mistral Ollama | ✅/❌ | |
| Intégration Nova - Mistral Cloud | ✅/❌ | |

### Tests E2E
| Test | Statut | Notes |
|------|--------|-------|
| Sélection de Mistral Ollama | ✅/❌ | |
| Test de connexion Mistral Ollama | ✅/❌ | |
| Conversation avec Mistral Ollama | ✅/❌ | |
| Sélection de Mistral Cloud | ✅/❌ | |
| Test de connexion Mistral Cloud | ✅/❌ | |
| Conversation avec Mistral Cloud | ✅/❌ | |

### Tests Manuels
| Scénario | Statut | Notes |
|----------|--------|-------|
| Première utilisation Mistral Ollama | ✅/❌ | |
| Configuration incorrecte | ✅/❌ | |
| Mistral Cloud avec clé invalide | ✅/❌ | |
| Basculer entre providers | ✅/❌ | |

## Problèmes Rencontrés

### Problème 1
- **Description** : [description du problème]
- **Étapes pour reproduire** : [étapes]
- **Sévérité** : [Critique/Élevée/Moyenne/Faible]
- **Statut** : [Ouvert/En cours/Résolu]

### Problème 2
- **Description** : [description du problème]
- **Étapes pour reproduire** : [étapes]
- **Sévérité** : [Critique/Élevée/Moyenne/Faible]
- **Statut** : [Ouvert/En cours/Résolu]

## Recommandations
- [Recommandation 1]
- [Recommandation 2]
- [Recommandation 3]

## Conclusion
**Statut global** : ✅ Passé / ⚠️ Partiellement passé / ❌ Échec

**Prochaines étapes** :
- [Action 1]
- [Action 2]
```

---

## 📊 Métriques de Qualité

### Couverture de code
**Objectif** : 90%+ de couverture pour les nouveaux providers.

```bash
# Exécuter les tests avec couverture
npm run test:coverage
```

Exemple de sortie :
```
-------------------|---------|----------|---------|---------|------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|------------------
All files          |   92.34 |    85.71 |   95.23 |   91.87 |
 src/main/providers|
  provider-manager.ts |   95.45 |    88.88 |     100 |   95.23 |
  mistral-cloud.ts  |   98.21 |    90.90 |     100 |   97.82 |
  mistral-ollama.ts |   96.55 |    87.50 |     100 |   96.36 |
-------------------|---------|----------|---------|---------|------------------
```

---

### Performances
**Objectifs** :
- Temps de réponse < 5s pour une requête simple
- Temps de test de connexion < 2s
- Consommation mémoire < 50 Mo pour le Provider Manager

---

## 🛠 Outils de Débogage

### 1. Logging

#### Activer le logging des providers
```typescript
// Dans src/main/providers/provider-manager.ts
const providerManager = new ProviderManager({
  debug: true  // Active le logging détaillé
});
```

#### Niveaux de log
| Niveau | Description | Exemple |
|--------|-------------|---------|
| `debug` | Informations détaillées | Requêtes/réponses complètes |
| `info` | Informations importantes | Connexion réussie, changement de provider |
| `warn` | Avertissements | Configuration non optimale |
| `error` | Erreurs | Échec de connexion, erreurs API |

---

### 2. Outils externes

#### Pour tester les APIs
- **Postman** : [postman.com](https://www.postman.com/)
  - Collection Mistral : [Mistral AI Postman](https://www.postman.com/mistralai)
- **cURL** : Outil en ligne de commande
  ```bash
  # Tester Mistral Cloud
  curl -X POST https://api.mistral.ai/v1/chat/completions \
    -H "Authorization: Bearer <VOTRE_CLE_API>" \
    -H "Content-Type: application/json" \
    -d '{"model": "mistral-medium", "messages": [{"role": "user", "content": "Bonjour"}]}'
  
  # Tester Ollama
  curl -X POST http://localhost:11434/api/chat \
    -H "Content-Type: application/json" \
    -d '{"model": "mistral:7b-instruct", "messages": [{"role": "user", "content": "Bonjour"}]}'
  ```

#### Pour monitorer les requêtes
- **Fiddler** : [fiddlerweb.com](https://www.fiddlerweb.com/) (Windows)
- **Charles Proxy** : [charlesproxy.com](https://www.charlesproxy.com/) (Cross-platform)
- **Wireshark** : [wireshark.org](https://www.wireshark.org/) (Avancé)

---

## 📚 Bonnes Pratiques de Test

### 1. Isolation des tests
- Chaque test doit être **indépendant** des autres
- **Nettoyer** l'état entre les tests (`beforeEach`, `afterEach`)
- **Mock** les dépendances externes (APIs, filesystem)

### 2. Nommage des tests
- **Format** : `should <comportement attendu> when <condition>`
- **Exemple** : `should return error when API key is invalid`

### 3. Tests des edge cases
- **Inputs invalides** : Clés API vides, URLs mal formées
- **Échecs réseau** : Timeouts, connexions interrompues
- **Réponses inattendues** : Formats JSON invalides, champs manquants
- **Limites** : Très longues réponses, modèles très grands

### 4. Tests de performance
- Mesurer le **temps de réponse**
- Mesurer la **consommation mémoire**
- Tester avec des **charges élevées** (si applicable)

---

## 🎯 Prochaines Étapes

1. **Implémenter** les providers selon le [plan d'implémentation](MISTRAL_IMPLEMENTATION_PLAN.md)
2. **Écrire** les tests unitaires pour chaque provider
3. **Écrire** les tests d'intégration
4. **Exécuter** les tests manuels
5. **Corriger** les problèmes identifiés
6. **Valider** avec les tests E2E

---

## 📞 Support

- **Problèmes avec Mistral Cloud** : [support@mistral.ai](mailto:support@mistral.ai)
- **Problèmes avec Ollama** : [GitHub Ollama Issues](https://github.com/ollama/ollama/issues)
- **Problèmes avec NovaChat** : Voir la [documentation principale](../../README.md)

---

**Statut** : ⏳ En attente d'implémentation
**Version** : 1.0
**Date** : 30 octobre 2026
