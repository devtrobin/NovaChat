import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  cancelPermissionRequest: vi.fn(() => true),
  killDeviceCommand: vi.fn(async () => undefined),
}));

vi.mock("../device/device.service", () => ({
  killDeviceCommand: mocks.killDeviceCommand,
}));
vi.mock("./ai.permission.service", () => ({
  cancelPermissionRequest: mocks.cancelPermissionRequest,
}));

import {
  finishTurn,
  getActiveAgentTasks,
  isTurnStopped,
  registerAbortController,
  registerActiveAgentTask,
  registerTurnCommand,
  setPendingPermissionRequest,
  startTurn,
  stopTurnByAgentTask,
  stopTurnByConversation,
  throwIfTurnStopped,
} from "./ai.turn-registry";

const activeTurnIds: string[] = [];

afterEach(() => {
  for (const turnId of activeTurnIds.splice(0)) {
    finishTurn(turnId);
  }
  vi.clearAllMocks();
});

describe("turn cancellation registry", () => {
  it("aborts providers, permissions and device commands atomically", async () => {
    const turnId = startTestTurn("conversation-stop");
    const controller = new AbortController();
    registerAbortController(turnId, controller);
    registerTurnCommand(turnId, "command-1");
    setPendingPermissionRequest(turnId, "permission-1");

    await expect(stopTurnByConversation("conversation-stop")).resolves.toBe(true);

    expect(controller.signal.aborted).toBe(true);
    expect(mocks.cancelPermissionRequest).toHaveBeenCalledWith("permission-1");
    expect(mocks.killDeviceCommand).toHaveBeenCalledWith("command-1");
    expect(isTurnStopped(turnId)).toBe(true);
    expect(() => throwIfTurnStopped(turnId)).toThrow("interrompue");
    await expect(stopTurnByConversation("conversation-stop")).resolves.toBe(false);
  });

  it("stops an entire turn from one active agent task and clears it on finish", async () => {
    const turnId = startTestTurn("conversation-agent");
    const task = registerActiveAgentTask(turnId, {
      agentId: "agent-planner",
      conversationId: "conversation-agent",
      request: "Planifier",
      startedAt: "2026-07-19T10:00:00.000Z",
      status: "running",
      title: "Plan",
    });

    expect(getActiveAgentTasks("agent-planner")).toEqual([task]);
    await expect(stopTurnByAgentTask(task.taskId)).resolves.toBe(true);
    finishTurn(turnId);
    activeTurnIds.splice(activeTurnIds.indexOf(turnId), 1);
    expect(getActiveAgentTasks("agent-planner")).toEqual([]);
  });
});

function startTestTurn(conversationId: string): string {
  const turnId = startTurn(conversationId);
  activeTurnIds.push(turnId);
  return turnId;
}
