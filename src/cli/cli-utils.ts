export type ManagerLookupResult<T> = {
  manager: T | null;
  error?: string;
};

export function formatErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

export async function runCommandWithRuntime<T>(
  runtime: { error?: (msg: string) => void },
  action: () => Promise<T>,
  onError?: (err: unknown) => void,
): Promise<T | undefined> {
  try {
    return await action();
  } catch (err) {
    if (onError) {
      onError(err);
    } else if (runtime.error) {
      runtime.error(formatErrorMessage(err));
    }
    return undefined;
  }
}

export function resolveOptionFromCommand<T>(
  command: { opts?: () => Record<string, unknown> },
  optionName: string,
): T | undefined {
  const opts = command.opts?.();
  return opts?.[optionName] as T | undefined;
}

export async function withManager<T>(params: {
  getManager: () => Promise<ManagerLookupResult<T>>;
  onMissing: (error?: string) => void;
  run: (manager: T) => Promise<void>;
  close: (manager: T) => Promise<void>;
  onCloseError?: (err: unknown) => void;
}): Promise<void> {
  const { manager, error } = await params.getManager();
  if (!manager) {
    params.onMissing(error);
    return;
  }
  try {
    await params.run(manager);
  } finally {
    try {
      await params.close(manager);
    } catch (err) {
      params.onCloseError?.(err);
    }
  }
}
