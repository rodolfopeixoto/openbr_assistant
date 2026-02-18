export interface KeyringAdapter {
  isAvailable(): Promise<boolean>;
  getPassword(service?: string, account?: string): Promise<string | null>;
  setPassword(service?: string, account?: string, password?: string): Promise<boolean>;
  deletePassword(service?: string, account?: string): Promise<boolean>;
  diagnose(): Promise<{
    available: boolean;
    canRead: boolean;
    canWrite: boolean;
    existingPassword: boolean;
    errors: string[];
  }>;
}
