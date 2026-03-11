/**
 * Provider Management Components
 * 
 * A collection of Lit-based components for managing AI provider configurations.
 */

// Types
export type {
  Provider,
  ProviderModel,
  ProviderCredential,
  ProviderConfiguration,
  TestConnectionResult,
  SaveProviderResponse,
  ProvidersListResponse,
  ProviderModelsResponse,
  ProviderStatus,
  CredentialType,
} from "./types/providers.js";

export {
  PROVIDER_BRANDS,
  PROVIDER_LETTERS,
  getProviderBrand,
  getProviderLetter,
  getStatusLabel,
  getCredentialTypeLabel,
} from "./types/providers.js";

// Components
export { ProvidersCard } from "./components/ProviderCard.js";
export { ProvidersConfigModal } from "./components/ProviderConfigModal.js";
export { ProvidersList } from "./components/ProviderList.js";

// Services
export { 
  ProviderAPI, 
  ProviderAPIError, 
  providerAPI, 
  createProviderAPI 
} from "./services/provider-api.js";
