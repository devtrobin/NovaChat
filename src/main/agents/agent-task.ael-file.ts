import { app } from "electron";
import path from "node:path";
import { createHash } from "node:crypto";
import { AELWriteFileOperation } from "../../shared/ael-file.types";
import { ApiRequestRecord } from "../../shared/chat.types";
import { AELFileWriteError, executeFileWrite, prepareFileWrite } from "../filesystem/ael-file-write";
import { requestAELPermission } from "../ai/ai.permission.service";
import {
  registerAbortController, unregisterAbortController, throwIfTurnStopped,
  TurnStoppedError, updateActiveAgentTaskStatus, setAgentConversationId,
} from "../ai/ai.turn-registry";
import { recordAgentCommandExchange } from "./agent-storage.service";
import { createAgentResultMessage } from "./agent-task.messages";
import { AgentTaskExecutionResult, RunAgentTaskArgs } from "./agent-task.types";

export async function runAELFileWriteTask(
  args: RunAgentTaskArgs, activeTaskId: string, currentAgentConversationId: string | null,
  operation: AELWriteFileOperation, apiRecords: ApiRequestRecord[],
): Promise<AgentTaskExecutionResult> {
  const { settings, task, turnId, emit, conversationId, onPipelineStageChange } = args;
  const controller = new AbortController();
  registerAbortController(turnId, controller);
  const action = `Creer ${operation.target.directory}/${operation.target.name}`;
  let status: "success" | "partial-success" | "error" | "denied" = "error";
  let fileCreated = false;
  let output: string;
  try {
    throwIfTurnStopped(turnId);
    const workspace = process.cwd();
    const preview = await prepareFileWrite(operation, {
      desktop: app.getPath("desktop"), workspace,
      protectedPaths: [
        app.getPath("userData"), settings.localFiles.agentsDirectory,
        settings.localFiles.conversationsDirectory, settings.localFiles.settingsPath,
        ...[".git", ".codex", ".agents", "node_modules", "settings.json", "conversations.json", "conversations", "agents", ".webpack", "out"]
          .map((name) => path.join(workspace, name)),
      ],
    });
    throwIfTurnStopped(turnId);
    updateActiveAgentTaskStatus(activeTaskId, "waiting-permission");
    onPipelineStageChange?.("waiting-permission", "agent-ael");
    const { decision } = await requestAELPermission(conversationId, action, emit, turnId, undefined, preview);
    updateActiveAgentTaskStatus(activeTaskId, "running");
    if (decision === "cancel") throw new TurnStoppedError();
    throwIfTurnStopped(turnId);
    if (decision !== "allow") {
      status = "denied";
      output = `Creation refusee : ${preview.path}. Aucun fichier cree.`;
    } else {
      onPipelineStageChange?.("writing-file", "agent-ael");
      const result = await executeFileWrite(preview, controller.signal);
      fileCreated = true;
      status = result.warnings.length ? "partial-success" : "success";
      output = [
        `Fichier cree et contenu verifie : ${result.path}`,
        `Taille UTF-8 : ${result.byteLength} octets`, `SHA-256 : ${result.sha256}`,
        ...result.warnings,
      ].join("\n");
    }
  } catch (error) {
    if (error instanceof TurnStoppedError || (error instanceof DOMException && error.name === "AbortError")) throw error;
    status = error instanceof AELFileWriteError && error.createdPath ? "partial-success" : "error";
    fileCreated = status === "partial-success";
    output = `${error instanceof Error ? error.message : "Creation impossible."}${error instanceof AELFileWriteError && error.createdPath ? `\nFichier cree : ${error.createdPath}` : ""}`;
  } finally {
    unregisterAbortController(turnId, controller);
  }

  let agentConversationId = currentAgentConversationId ?? "";
  try {
    const record = await recordAgentCommandExchange({
      agentId: "agent-ael", agentConversationId: currentAgentConversationId,
      operation: "write-file", apiTraceSettings: settings.apiTrace, apiRequests: apiRecords,
      assistantRequest: task.request, command: action, result: { output, status },
      rootDirectory: settings.localFiles.agentsDirectory, triggerMessageId: task.triggerMessageId,
      userAssistantConversationId: task.userAssistantConversationId, userPrompt: task.userPrompt,
    });
    agentConversationId = record.agentConversationId;
    setAgentConversationId(turnId, "agent-ael", agentConversationId);
  } catch {
    // Preserve evidence of an effect already committed even if history storage fails.
    if (fileCreated) status = "partial-success";
    output += "\nJournal agent non enregistre. Ne repetez pas une creation deja effectuee.";
  }
  const message = createAgentResultMessage("agent-ael", output);
  message.status = status === "denied" ? "error" : status;
  message.apiRequests = [...apiRecords];
  message.lifecycleLog?.push({
    at: new Date().toISOString(), event: "file-write-result", metadata: {
      action: "write-file", status,
      actionSignature: createHash("sha256").update(JSON.stringify(operation)).digest("hex"),
    },
  });
  return {
    aelMessage: message,
    result: status === "denied"
      ? { kind: "permission-denied", agentConversationId, output, request: task.request, resolvedCommand: action }
      : { kind: "completed", agentConversationId, output, request: task.request, resolvedCommand: action, status },
  };
}
