import { ChatMessage } from "../../renderer/types/chat.types";
import { appendLifecycleLog } from "./ai.orchestrator.runtime";
import { Emit } from "./ai.orchestrator.types";

export function emitDeviceProgress(
  emit: Emit,
  conversationId: string,
  messageId: string,
  initialMessage: ChatMessage,
  onProgressStateChange?: (status: "running" | "waiting-input") => void,
) {
  return (progress: {
    awaitingInput: boolean;
    commandId: string;
    inputPlaceholder?: string;
    inputSecret?: boolean;
    output: string;
  }) => {
    if (progress.awaitingInput && !initialMessage.lifecycleLog?.some((entry) => entry.event === "device-waiting-input")) {
      appendLifecycleLog(
        initialMessage,
        "device-waiting-input",
        "La commande attend une saisie utilisateur.",
        {
          inputPlaceholder: progress.inputPlaceholder,
          inputSecret: progress.inputSecret,
        },
      );
    }
    onProgressStateChange?.(progress.awaitingInput ? "waiting-input" : "running");

    emit({
      conversationId,
      message: {
        ...initialMessage,
        commandId: progress.commandId,
        inputPlaceholder: progress.inputPlaceholder,
        inputRequested: progress.awaitingInput,
        inputSecret: progress.inputSecret,
        result: progress.output,
        status: progress.awaitingInput ? "waiting-input" : "running",
      },
      messageId,
      type: "replace-message",
    });
  };
}

export function emitDeviceStart(
  emit: Emit,
  conversationId: string,
  messageId: string,
  initialMessage: ChatMessage,
  startedCommand: {
    commandId: string;
    cwd: string;
    normalizedCommand: string;
    shell: string;
  },
): void {
  initialMessage.commandId = startedCommand.commandId;
  appendLifecycleLog(initialMessage, "device-started", "Execution de la commande device.", {
    commandId: startedCommand.commandId,
    cwd: startedCommand.cwd,
    normalizedCommand: startedCommand.normalizedCommand,
    shell: startedCommand.shell,
  });
  emit({
    conversationId,
    message: {
      ...initialMessage,
      commandId: startedCommand.commandId,
    },
    messageId,
    type: "replace-message",
  });
}
