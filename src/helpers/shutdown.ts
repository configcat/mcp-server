const SHUTDOWN_TIMEOUT_MS = 10_000;

export interface ShutdownRuntime {
  on(signal: "SIGINT" | "SIGTERM", listener: () => void): unknown;
  exit(code: number): never;
}

interface ShutdownOptions {
  forceClose?: () => void;
  timeoutMs?: number;
  runtime?: ShutdownRuntime;
}

export function handleShutdown(
  closeResources: () => Promise<void>,
  { forceClose, timeoutMs = SHUTDOWN_TIMEOUT_MS, runtime = process }: ShutdownOptions = {}
): () => Promise<void> {
  let shutdownPromise: Promise<void> | undefined;
  const shutdown = (): Promise<void> => {
    if (shutdownPromise) {
      return shutdownPromise;
    }

    shutdownPromise = (async (): Promise<void> => {
      const forceExit = setTimeout(() => {
        console.error("Shutdown timed out, forcing process exit");
        forceClose?.();
        runtime.exit(1);
      }, timeoutMs);

      let exitCode = 0;
      try {
        await closeResources();
      } catch (err) {
        exitCode = 1;
        console.error("Error during shutdown", err);
      } finally {
        clearTimeout(forceExit);
      }

      runtime.exit(exitCode);
    })();

    return shutdownPromise;
  };

  runtime.on("SIGINT", () => void shutdown());
  runtime.on("SIGTERM", () => void shutdown());

  return shutdown;
}
