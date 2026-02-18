export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public metadata?: { docsUrl?: string },
  ) {
    super(message);
    this.name = "SecurityError";
  }
}
