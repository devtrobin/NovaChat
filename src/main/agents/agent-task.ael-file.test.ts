import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RuntimeAppSettings } from "../../shared/settings.types";
import { AELWriteFileOperation } from "../../shared/ael-file.types";
import { runAELAgentTask } from "./agent-task.ael";
import { resolvePermissionRequest } from "../ai/ai.permission.service";
import { finishTurn, startTurn, stopTurnByConversation } from "../ai/ai.turn-registry";
import { RunAgentTaskArgs } from "./agent-task.types";

const mocks = vi.hoisted(() => ({
  desktop: "", userData: "", recordAgentCommandExchange: vi.fn(), loadAgentWorkspace: vi.fn(),
  getAgentPermission: vi.fn(), saveAgentPermission: vi.fn(), executeAELCommand: vi.fn(), generateAELAgentCommand: vi.fn(),
}));
vi.mock("electron", () => ({ app: { getPath: (name: string) => name === "desktop" ? mocks.desktop : mocks.userData } }));
vi.mock("./agent-storage.service", () => mocks);
vi.mock("../ai/ai.ael-flow", () => ({ executeAELCommand: mocks.executeAELCommand }));
vi.mock("../ai/openai.service", () => ({ generateAELAgentCommand: mocks.generateAELAgentCommand }));

let root: string;
let turnId: string;
const file: AELWriteFileOperation = { action: "write-file", target: { directory: "desktop", name: "coucou.py" }, content: 'print("coucou")\n', overwrite: false };
let args: RunAgentTaskArgs;
beforeEach(async () => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  root = await mkdtemp(path.join(os.tmpdir(), "novachat-file-flow-"));
  mocks.desktop = path.join(root, "Desktop");
  mocks.userData = path.join(root, "private");
  await mkdir(mocks.desktop);
  turnId = startTurn("file-conversation");
  const settings: RuntimeAppSettings = {
    activeProvider: "openai", agents: { "agent-ael": { enabled: true }, "agent-acp": { enabled: true } },
    apiTrace: { enabled: false, maxEntriesPerMessage: 10, redactSensitiveData: true, retentionDays: 30 },
    aelExecution: { maxOutputCharacters: 20000, timeoutMs: 15000 }, hideInternalConversations: true,
    localFiles: { agentsDirectory: path.join(root, "agents"), conversationsDirectory: path.join(root, "conversations"), settingsPath: path.join(root, "settings.json") },
    openai: { apiKey: "test-key", apiKeyConfigured: true, baseUrl: "https://api.openai.com/v1", model: "test-model", provider: "openai" }, previewMode: false,
  };
  args = {
    conversationId: "file-conversation", emit: vi.fn(), messageId: "delegation", settings, turnId,
    task: { agentId: "agent-ael", mode: "write-file", fileOperation: file, request: "Creer coucou.py sur le Bureau", turnId, triggerMessageId: "user", userAssistantConversationId: "file-conversation", userPrompt: "Ecris un programme Python qui affiche coucou sur le Bureau" },
  };
  mocks.recordAgentCommandExchange.mockResolvedValue({ agentConversationId: "agent-history" });
  mocks.loadAgentWorkspace.mockResolvedValue({ context: { name: "AEL", description: "", instructions: "" } });
});
afterEach(async () => {
  finishTurn(turnId);
  vi.useRealTimers();
  await rm(root, { recursive: true, force: true });
});

function permission(decision: "allow" | "deny" | "cancel", before?: () => Promise<void>) {
  args.emit = async (event) => {
    if (event.type !== "append-messages") return;
    const message = event.messages.find((entry) => entry.fileWritePreview);
    if (!message) return;
    expect(await readdir(mocks.desktop)).toEqual([]);
    expect(message.fileWritePreview?.content).toBe(file.content);
    expect(message.actions?.map((entry) => entry.id)).toEqual(["permission-allow", "permission-deny"]);
    await before?.();
    if (decision === "cancel") await stopTurnByConversation(args.conversationId);
    else expect(resolvePermissionRequest(message.actions?.[0].payload?.requestId ?? "", decision)).toBe(true);
  };
}

describe("structured AEL file task", () => {
  it("reports a created file even when history storage fails afterwards", async () => {
    mocks.recordAgentCommandExchange.mockRejectedValueOnce(new Error("storage unavailable"));
    permission("allow");
    const execution = await runAELAgentTask(args, "task", null);
    expect(execution.result).toMatchObject({ status: "partial-success" });
    expect(execution.aelMessage.content).toContain("Fichier cree et contenu verifie");
    expect(execution.aelMessage.content).toContain("Journal agent non enregistre");
    expect(await readFile(path.join(mocks.desktop, "coucou.py"), "utf8")).toBe(file.content);
  });
  it("creates only after permission, records verification and never calls the shell or provider", async () => {
    permission("allow");
    const execution = await runAELAgentTask(args, "task", null);
    expect(await readFile(path.join(mocks.desktop, "coucou.py"), "utf8")).toBe(file.content);
    expect(execution.result).toMatchObject({ status: "success" });
    expect(execution.aelMessage.content).toContain("contenu verifie");
    expect(execution.aelMessage.content).toContain("SHA-256");
    expect(mocks.recordAgentCommandExchange).toHaveBeenCalledWith(expect.objectContaining({ operation: "write-file", result: expect.objectContaining({ status: "success" }) }));
    expect(mocks.executeAELCommand).not.toHaveBeenCalled();
    expect(mocks.getAgentPermission).not.toHaveBeenCalled();
    expect(mocks.saveAgentPermission).not.toHaveBeenCalled();
    expect(mocks.generateAELAgentCommand).not.toHaveBeenCalled();
  });

  it("denies without creating a file", async () => {
    permission("deny");
    const execution = await runAELAgentTask(args, "task", null);
    expect(execution.result.kind).toBe("permission-denied");
    expect(await readdir(mocks.desktop)).toEqual([]);
  });

  it("cancels the permission on Stop without creating a file", async () => {
    permission("cancel");
    await expect(runAELAgentTask(args, "task", null)).rejects.toThrow("interrompue");
    expect(await readdir(mocks.desktop)).toEqual([]);
  });

  it("preserves a file introduced while permission is pending", async () => {
    permission("allow", () => writeFile(path.join(mocks.desktop, "coucou.py"), "keep"));
    const execution = await runAELAgentTask(args, "task", null);
    expect(execution.result).toMatchObject({ status: "error" });
    expect(await readFile(path.join(mocks.desktop, "coucou.py"), "utf8")).toBe("keep");
  });

  it("supports an ACP goal producing the same file action instead of a shell command", async () => {
    args.task = { ...args.task, mode: "goal", fileOperation: undefined };
    mocks.generateAELAgentCommand.mockResolvedValue({ apiRecords: [], command: JSON.stringify(file) });
    permission("allow");
    const execution = await runAELAgentTask(args, "task", null);
    expect(execution.result).toMatchObject({ status: "success" });
    expect(mocks.executeAELCommand).not.toHaveBeenCalled();
  });

  it("fails closed on a malformed structured provider action", async () => {
    args.task = { ...args.task, mode: "goal", fileOperation: undefined };
    mocks.generateAELAgentCommand.mockResolvedValue({ apiRecords: [], command: JSON.stringify({ ...file, overwrite: true }) });
    await expect(runAELAgentTask(args, "task", null)).rejects.toThrow();
    expect(args.emit).not.toHaveBeenCalled();
    expect(mocks.executeAELCommand).not.toHaveBeenCalled();
    expect(await readdir(mocks.desktop)).toEqual([]);
  });
});
