import { ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { submitInputToCommand } from "./ael.service";
import {
  bindCommandLifecycle,
  bindProgressTracking,
  createRunningCommand,
} from "./ael.runtime";

afterEach(() => {
  vi.useRealTimers();
});

describe("ael command interactive lifecycle", () => {
  it("pauses the timeout while input is awaited and rearms it after submission", async () => {
    vi.useFakeTimers();
    const child = createFakeChild();
    const commandId = "command-1";
    const runningCommand = createRunningCommand(
      child,
      process.cwd(),
      "interactive-command",
      "test-shell",
      commandId,
      {
        maxOutputCharacters: 10_000,
        timeoutMs: 100,
      },
    );

    bindProgressTracking(commandId, runningCommand);
    bindCommandLifecycle(commandId, runningCommand);
    expect(runningCommand.timeoutHandle).toBeDefined();

    child.stdout?.emit("data", Buffer.from("Password: "));
    expect(runningCommand.awaitingInput).toBe(true);
    expect(runningCommand.timeoutHandle).toBeUndefined();

    await vi.advanceTimersByTimeAsync(500);
    expect(child.kill).not.toHaveBeenCalled();

    await expect(submitInputToCommand(commandId, "secret")).resolves.toBe(true);
    expect(runningCommand.awaitingInput).toBe(false);
    expect(runningCommand.timeoutHandle).toBeDefined();

    child.emit("close", 0, null);
    await expect(runningCommand.promise).resolves.toMatchObject({ code: 0, ok: true });
    expect(runningCommand.timeoutHandle).toBeUndefined();
  });

  it("terminates the command when its configurable active timeout expires", async () => {
    vi.useFakeTimers();
    const child = createFakeChild();
    const runningCommand = createRunningCommand(
      child,
      process.cwd(),
      "slow-command",
      "test-shell",
      "command-timeout",
      {
        maxOutputCharacters: 10_000,
        timeoutMs: 75,
      },
    );

    bindCommandLifecycle("command-timeout", runningCommand);
    await vi.advanceTimersByTimeAsync(76);

    expect(runningCommand.timedOut).toBe(true);
    expect(runningCommand.wasKilled).toBe(true);
    expect(child.kill).toHaveBeenCalledOnce();

    child.emit("close", 1, null);
    await expect(runningCommand.promise).resolves.toMatchObject({
      code: 130,
      errorType: "timeout",
      ok: false,
    });
  });
});

function createFakeChild(): ChildProcess {
  const child = new EventEmitter() as ChildProcess;
  Object.assign(child, {
    exitCode: null,
    kill: vi.fn(() => true),
    killed: false,
    pid: undefined,
    stderr: new PassThrough(),
    stdin: new PassThrough(),
    stdout: new PassThrough(),
  });
  return child;
}
