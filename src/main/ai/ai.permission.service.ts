import { PermissionDecision } from "../../shared/ai.types";
import { ChatMessage } from "../../shared/chat.types";
import { createPermissionRequestSystemMessage, createPermissionResolutionSystemMessage } from "./ai.message-factory";
import { Emit } from "./ai.orchestrator.types";
import { clearPendingPermissionRequest, setPendingPermissionRequest, throwIfTurnStopped } from "./ai.turn-registry";
import { FileWritePreview } from "../../shared/ael-file.types";
import { createFileWritePermissionMessage, createSystemMessage } from "./ai.message-factory.system";

type InternalPermissionDecision = PermissionDecision | "cancel";

type PendingPermissionRequest = {
  conversationId: string;
  messageId: string;
  requestId: string;
  resolve: (decision: InternalPermissionDecision) => void;
  turnId: string;
  oneTimeOnly: boolean;
};

const pendingPermissionRequests = new Map<string, PendingPermissionRequest>();
const activeConversationRequests = new Map<string, string>();

export async function requestAELPermission(
  conversationId: string,
  command: string,
  emit: Emit,
  turnId: string,
  summary?: string,
  fileWritePreview?: FileWritePreview,
): Promise<{ decision: InternalPermissionDecision; requestMessage: ChatMessage }> {
  if (activeConversationRequests.has(conversationId)) {
    throw new Error("Une demande de permission est deja en attente pour cette conversation.");
  }

  throwIfTurnStopped(turnId);
  const requestId = crypto.randomUUID();
  const requestMessage = fileWritePreview
    ? createFileWritePermissionMessage(fileWritePreview, requestId)
    : createPermissionRequestSystemMessage(command, requestId, summary);
  const decisionPromise = new Promise<InternalPermissionDecision>((resolve) => {
    pendingPermissionRequests.set(requestId, {
      conversationId,
      messageId: requestMessage.id,
      requestId,
      resolve,
      turnId,
      oneTimeOnly: Boolean(fileWritePreview),
    });
    activeConversationRequests.set(conversationId, requestId);
    setPendingPermissionRequest(turnId, requestId);
  });
  try {
    emit({ conversationId, messages: [requestMessage], type: "append-messages" });
  } catch (error) {
    cancelPermissionRequest(requestId);
    throw error;
  }
  const decision = await decisionPromise;

  emit({
    conversationId,
    messageId: requestMessage.id,
    type: "remove-message",
  });
  if (decision !== "cancel") {
    const resolutionMessage = fileWritePreview
      ? { ...createSystemMessage(`${decision === "allow" ? "Creation autorisee une fois" : "Creation refusee"} : ${fileWritePreview.path}`), status: "idle" as const }
      : createPermissionResolutionSystemMessage(decision, command, summary);
    emit({
      conversationId,
      messages: [resolutionMessage],
      type: "append-messages",
    });
    if (decision === "allow" || decision === "allow-always") {
      setTimeout(() => {
        emit({
          conversationId,
          messageId: resolutionMessage.id,
          type: "remove-message",
        });
      }, 2200);
    }
  }

  return {
    decision,
    requestMessage,
  };
}

export function resolvePermissionRequest(requestId: string, decision: PermissionDecision): boolean {
  return settlePermissionRequest(requestId, decision);
}

export function cancelPermissionRequest(requestId: string): boolean {
  return settlePermissionRequest(requestId, "cancel");
}

function settlePermissionRequest(
  requestId: string,
  decision: InternalPermissionDecision,
): boolean {
  const pendingRequest = pendingPermissionRequests.get(requestId);
  if (!pendingRequest) return false;
  if (pendingRequest.oneTimeOnly && decision !== "cancel" && decision !== "allow" && decision !== "deny") return false;
  pendingPermissionRequests.delete(requestId);
  if (activeConversationRequests.get(pendingRequest.conversationId) === requestId) {
    activeConversationRequests.delete(pendingRequest.conversationId);
  }
  clearPendingPermissionRequest(pendingRequest.turnId, requestId);
  pendingRequest.resolve(decision);
  return true;
}
