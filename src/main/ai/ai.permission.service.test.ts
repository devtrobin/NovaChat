import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cancelPermissionRequest,
  requestAELPermission,
  resolvePermissionRequest,
} from "./ai.permission.service";
import { finishTurn, startTurn } from "./ai.turn-registry";

const activeTurnIds: string[] = [];

afterEach(() => {
  vi.useRealTimers();
  for (const turnId of activeTurnIds.splice(0)) {
    finishTurn(turnId);
  }
});

describe("ael permission workflow", () => {
  it("permits synchronous resolution and refuses permanent grants for a file preview", async () => {
    vi.useFakeTimers();
    const turnId = startTestTurn("file-permission");
    const preview = { path: "C:\\Desktop\\coucou.py", content: 'print("coucou")\n', byteLength: 16, sha256: "test" };
    const permission = requestAELPermission("file-permission", "write-file", (event) => {
      if (event.type !== "append-messages") return;
      const request = event.messages.find((message) => message.fileWritePreview);
      if (!request) return;
      const id = request.actions?.[0].payload?.requestId ?? "";
      expect(resolvePermissionRequest(id, "allow-always")).toBe(false);
      expect(resolvePermissionRequest(id, "deny-always")).toBe(false);
      expect(resolvePermissionRequest(id, "allow")).toBe(true);
    }, turnId, undefined, preview);
    await expect(permission).resolves.toMatchObject({ decision: "allow" });
  });
  it("settles an allowed request once and removes the transient resolution", async () => {
    vi.useFakeTimers();
    const events: Array<Record<string, unknown>> = [];
    const turnId = startTestTurn("conversation-allow");
    const permission = requestAELPermission(
      "conversation-allow",
      "npm test",
      (event) => events.push(event),
      turnId,
    );
    const requestId = getRequestId(events);

    expect(resolvePermissionRequest(requestId, "allow")).toBe(true);
    expect(resolvePermissionRequest(requestId, "deny")).toBe(false);
    await expect(permission).resolves.toMatchObject({ decision: "allow" });
    expect(events.map((event) => event.type)).toEqual([
      "append-messages",
      "remove-message",
      "append-messages",
    ]);

    await vi.advanceTimersByTimeAsync(2200);
    expect(events[events.length - 1]?.type).toBe("remove-message");
  });

  it("cancels a pending request without publishing a false decision", async () => {
    const events: Array<Record<string, unknown>> = [];
    const turnId = startTestTurn("conversation-cancel");
    const permission = requestAELPermission(
      "conversation-cancel",
      "npm test",
      (event) => events.push(event),
      turnId,
    );
    const requestId = getRequestId(events);

    expect(cancelPermissionRequest(requestId)).toBe(true);
    await expect(permission).resolves.toMatchObject({ decision: "cancel" });
    expect(events.map((event) => event.type)).toEqual([
      "append-messages",
      "remove-message",
    ]);
  });

  it("rejects two simultaneous permission prompts in one conversation", async () => {
    const events: Array<Record<string, unknown>> = [];
    const turnId = startTestTurn("conversation-race");
    const firstPermission = requestAELPermission(
      "conversation-race",
      "npm test",
      (event) => events.push(event),
      turnId,
    );

    await expect(requestAELPermission(
      "conversation-race",
      "npm run lint",
      () => undefined,
      turnId,
    )).rejects.toThrow("deja en attente");

    expect(cancelPermissionRequest(getRequestId(events))).toBe(true);
    await firstPermission;
  });
});

function startTestTurn(conversationId: string): string {
  const turnId = startTurn(conversationId);
  activeTurnIds.push(turnId);
  return turnId;
}

function getRequestId(events: Array<Record<string, unknown>>): string {
  const requestEvent = events[0] as {
    messages?: Array<{
      actions?: Array<{ payload?: { requestId?: string } }>;
    }>;
  };
  const requestId = requestEvent.messages?.[0]?.actions?.[0]?.payload?.requestId;
  if (!requestId) throw new Error("Permission request id missing from emitted event.");
  return requestId;
}
