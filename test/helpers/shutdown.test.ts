import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handleShutdown, type ShutdownRuntime } from "../../src/helpers/shutdown.js";

type Signal = "SIGINT" | "SIGTERM";

function createRuntime() {
  const listeners = new Map<Signal, () => void>();
  const exit = vi.fn((_: number) => null as never);
  const runtime: ShutdownRuntime = {
    on: vi.fn((signal, listener) => listeners.set(signal, listener)),
    exit,
  };

  return { listeners, runtime, exit };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("handleShutdown", () => {
  it("closes resources once when either shutdown signal is received", async () => {
    const closeResources = vi.fn(async () => {});
    const { listeners, runtime, exit } = createRuntime();
    const shutdown = handleShutdown(closeResources, { runtime });

    expect(listeners.has("SIGINT")).toBe(true);
    expect(listeners.has("SIGTERM")).toBe(true);
    listeners.get("SIGTERM")!();
    listeners.get("SIGINT")!();

    await shutdown();
    expect(exit).toHaveBeenCalledWith(0);
    expect(closeResources).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("exits with failure when resource cleanup rejects", async () => {
    const error = new Error("close failed");
    const closeResources = vi.fn().mockRejectedValue(error);
    const { runtime, exit } = createRuntime();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const shutdown = handleShutdown(closeResources, { runtime });

    await shutdown();

    expect(exit).toHaveBeenCalledWith(1);
    expect(logError).toHaveBeenCalledWith("Error during shutdown", error);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("force-closes resources and exits when cleanup times out", async () => {
    const closeResources = vi.fn(() => new Promise<void>(() => {}));
    const forceClose = vi.fn();
    const { runtime, exit } = createRuntime();
    const logError = vi.spyOn(console, "error").mockImplementation(() => {});
    const shutdown = handleShutdown(closeResources, { forceClose, timeoutMs: 100, runtime });

    void shutdown();
    await vi.advanceTimersByTimeAsync(100);

    expect(forceClose).toHaveBeenCalledOnce();
    expect(exit).toHaveBeenCalledWith(1);
    expect(logError).toHaveBeenCalledWith("Shutdown timed out, forcing process exit");
    expect(vi.getTimerCount()).toBe(0);
  });
});
