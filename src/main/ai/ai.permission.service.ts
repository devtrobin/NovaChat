import { PermissionDecision } from "../../shared/ai.types";
import { ChatMessage } from "../../renderer/types/chat.types";
import { createPermissionRequestSystemMessage } from "./ai.message-factory";
import { Emit } from "./ai.orchestrator.types";

type PendingPermissionRequest = {
  conversationId: string;
  messageId: string;
  requestId: string;
  resolve: (decision: PermissionDecision) => void;
};

const pendingPermissionRequests = new Map<string, PendingPermissionRequest>();
const activeConversationRequests = new Map<string, string>();

export async function requestDevicePermission(
  conversationId: string,
  command: string,
  emit: Emit,
): Promise<{ decision: PermissionDecision; requestMessage: ChatMessage }> {
  if (activeConversationRequests.has(conversationId)) {
    throw new Error("Une demande de permission est deja en attente pour cette conversation.");
  }

  const requestId = crypto.randomUUID();
  const requestMessage = createPermissionRequestSystemMessage(command, requestId);

  emit({
    conversationId,
    messages: [requestMessage],
    type: "append-messages",
  });

  const decision = await new Promise<PermissionDecision>((resolve) => {
    pendingPermissionRequests.set(requestId, {
      conversationId,
      messageId: requestMessage.id,
      requestId,
      resolve,
    });
    activeConversationRequests.set(conversationId, requestId);
  });

  pendingPermissionRequests.delete(requestId);
  activeConversationRequests.delete(conversationId);
  emit({
    conversationId,
    messageId: requestMessage.id,
    type: "remove-message",
  });

  return {
    decision,
    requestMessage,
  };
}

export function resolvePermissionRequest(requestId: string, decision: PermissionDecision): boolean {
  const pendingRequest = pendingPermissionRequests.get(requestId);
  if (!pendingRequest) return false;
  pendingRequest.resolve(decision);
  return true;
}
